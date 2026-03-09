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
    const { id } = await req.json();

    if (!id) {
      return new Response(JSON.stringify({ success: false, message: 'Plan ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get plan details
    const { data: plan, error: fetchErr } = await supabase.from('plans').select('*').eq('id', id).single();
    if (fetchErr || !plan) {
      return new Response(JSON.stringify({ success: false, message: 'Plan not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check for active subscribers
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('plan_key', plan.plan_key);

    if (count && count > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `This plan has ${count} active subscribers. Move them to another plan first.`,
        subscriber_count: count,
      }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Archive instead of hard delete
    const { error } = await supabase.from('plans').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;

    // Audit log
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'plan_archived',
      old_value: JSON.stringify({ plan_key: plan.plan_key, name: plan.name }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const code = err.code || 500;
    return new Response(JSON.stringify({ success: false, message: err.message_en || err.message || 'Server error' }), { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
