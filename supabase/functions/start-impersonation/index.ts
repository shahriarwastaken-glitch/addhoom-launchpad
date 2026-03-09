import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifySuperAdmin } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(JSON.stringify({ success: false, message: 'Target user ID is required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check feature flag
    const { data: flag } = await supabase.from('feature_flags').select('global_enabled').eq('flag_key', 'user_impersonation').maybeSingle();
    if (!flag?.global_enabled) {
      return new Response(JSON.stringify({ success: false, message: 'User impersonation is disabled.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get target user profile
    const { data: targetProfile, error: profileErr } = await supabase.from('profiles').select('id, full_name, email').eq('id', target_user_id).single();
    if (profileErr || !targetProfile) {
      return new Response(JSON.stringify({ success: false, message: 'User not found.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate a magic link for the target user using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: targetProfile.email!,
    });

    if (linkError || !linkData) {
      console.error('Magic link error:', linkError);
      return new Response(JSON.stringify({ success: false, message: 'Failed to generate impersonation session.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract the OTP token from the generated link properties
    const otpToken = linkData.properties?.hashed_token;
    const emailOtp = linkData.properties?.email_otp;

    // Generate impersonation tracking token
    const trackingToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Store in admin_verification_codes as impersonation session
    await supabase.from('admin_verification_codes').insert({
      admin_id: admin.id,
      action_type: 'impersonation',
      code: trackingToken,
      expires_at: expiresAt,
      action_payload: { target_user_id, target_name: targetProfile.full_name, target_email: targetProfile.email },
    });

    // Audit log
    await supabase.from('admin_actions').insert({
      admin_id: admin.id,
      action: 'user_impersonation_started',
      target_user_id,
      new_value: JSON.stringify({ target_name: targetProfile.full_name, target_email: targetProfile.email }),
    });

    return new Response(JSON.stringify({
      success: true,
      impersonation_token: trackingToken,
      email_otp: emailOtp,
      target_email: targetProfile.email,
      target_user: { id: targetProfile.id, name: targetProfile.full_name, email: targetProfile.email },
      expires_at: expiresAt,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const code = err.code || 500;
    return new Response(JSON.stringify({ success: false, message: err.message_en || err.message || 'Server error' }), { status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
