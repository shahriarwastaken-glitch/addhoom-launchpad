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
    const { impersonation_token } = await req.json();

    if (!impersonation_token) {
      return new Response(JSON.stringify({ success: false, message: 'Impersonation token is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find and invalidate the session
    const { data: session, error } = await supabase
      .from('admin_verification_codes')
      .select('*')
      .eq('code', impersonation_token)
      .eq('action_type', 'impersonation')
      .eq('admin_id', admin.id)
      .is('used_at', null)
      .single();

    if (error || !session) {
      return new Response(JSON.stringify({ success: false, message: 'Impersonation session not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Mark as used
    await supabase.from('admin_verification_codes').update({ used_at: new Date().toISOString() }).eq('id', session.id);

    const payload = session.action_payload as any;
    const startedAt = new Date(session.created_at!);
    const duration = Math.round((Date.now() - startedAt.getTime()) / 1000 / 60);

    // Audit log
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'user_impersonation_ended',
      target_user_id: payload?.target_user_id,
      new_value: JSON.stringify({ duration_minutes: duration }),
    });

    return new Response(JSON.stringify({ success: true, duration_minutes: duration }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const code = err.code || 500;
    return new Response(JSON.stringify({ success: false, message: err.message_en || err.message || 'Server error' }), { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
