import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySuperAdmin } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const admin = await verifySuperAdmin(req, supabase);
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'Plan ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get current plan for audit
    const { data: currentPlan, error: fetchErr } = await supabase.from('plans').select('*').eq('id', id).single();
    if (fetchErr || !currentPlan) {
      return new Response(JSON.stringify({ success: false, message: 'Plan not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If is_popular toggled on, unset others
    if (updates.is_popular && !currentPlan.is_popular) {
      await supabase.from('plans').update({ is_popular: false }).eq('is_popular', true);
    }

    // Get subscriber count for grandfather policy enforcement
    const { count: subscriberCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan_key', currentPlan.plan_key);

    // Build update object (only include provided fields)
    const allowedFields = ['name', 'description', 'color', 'is_popular', 'status', 'price_monthly_bdt', 'price_annual_bdt', 'trial_days', 'sslcommerz_plan_code', 'limits', 'features', 'grandfather_policy', 'display_order'];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updates) updateData[key] = updates[key];
    }
    updateData.updated_at = new Date().toISOString();

    const { data: plan, error } = await supabase.from('plans').update(updateData).eq('id', id).select().single();
    if (error) throw error;

    // Build audit diff
    const changes: string[] = [];
    if (updates.name && updates.name !== currentPlan.name) changes.push(`name: ${currentPlan.name} → ${updates.name}`);
    if (updates.price_monthly_bdt !== undefined && updates.price_monthly_bdt !== currentPlan.price_monthly_bdt) changes.push(`price: ৳${currentPlan.price_monthly_bdt} → ৳${updates.price_monthly_bdt}`);
    if (updates.status && updates.status !== currentPlan.status) changes.push(`status: ${currentPlan.status} → ${updates.status}`);

    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'plan_updated',
      old_value: JSON.stringify({ name: currentPlan.name, price_monthly_bdt: currentPlan.price_monthly_bdt, status: currentPlan.status }),
      new_value: JSON.stringify(changes.length > 0 ? changes : updateData),
      reason: `${subscriberCount || 0} subscribers affected. Policy: ${updates.grandfather_policy || currentPlan.grandfather_policy}`,
    });

    return new Response(JSON.stringify({ success: true, plan, subscribers_affected: subscriberCount || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const code = err.code || 500;
    return new Response(JSON.stringify({ success: false, message: err.message_en || err.message || 'Server error' }), { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
