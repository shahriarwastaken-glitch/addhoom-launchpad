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
    const { plan_key, name, description, color, is_popular, status, price_monthly_bdt, price_annual_bdt, trial_days, sslcommerz_plan_code, limits, features, grandfather_policy, display_order } = body;

    if (!name?.trim() || !plan_key?.trim()) {
      return new Response(JSON.stringify({ success: false, message: 'Plan name and key are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for duplicate plan_key
    const { data: existing } = await supabase.from('plans').select('id').eq('plan_key', plan_key).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ success: false, message: 'Plan key already exists.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If is_popular, unset other plans
    if (is_popular) {
      await supabase.from('plans').update({ is_popular: false }).eq('is_popular', true);
    }

    const { data: plan, error } = await supabase.from('plans').insert({
      plan_key,
      name,
      description: description || null,
      color: color || '#FF5100',
      is_popular: is_popular || false,
      status: status || 'active',
      price_monthly_bdt: price_monthly_bdt || 0,
      price_annual_bdt: price_annual_bdt || null,
      trial_days: trial_days || 0,
      sslcommerz_plan_code: sslcommerz_plan_code || null,
      limits: limits || {},
      features: features || [],
      grandfather_policy: grandfather_policy || 'next_cycle',
      display_order: display_order || 0,
      created_by: admin.id,
    }).select().single();

    if (error) throw error;

    // Audit log
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'plan_created',
      new_value: JSON.stringify({ plan_key, name, price_monthly_bdt }),
    });

    return new Response(JSON.stringify({ success: true, plan }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const code = err.code || 500;
    return new Response(JSON.stringify({ success: false, message: err.message_en || err.message || 'Server error' }), { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
