import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAdmin } from '../_shared/adminAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await verifyAdmin(req, supabase);
    const { code, action_type } = await req.json();

    if (!code || !action_type) {
      throw { code: 400, message_bn: 'code এবং action_type প্রয়োজন।', message_en: 'code and action_type are required.' };
    }

    // Find valid verification code
    const { data: verification, error: findError } = await supabase
      .from('admin_verification_codes')
      .select('*')
      .eq('admin_id', admin.id)
      .eq('code', code)
      .eq('action_type', action_type)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !verification) {
      throw { 
        code: 400, 
        message_bn: 'অবৈধ বা মেয়াদোত্তীর্ণ কোড।', 
        message_en: 'Invalid or expired code.' 
      };
    }

    // Mark as used
    const { error: updateError } = await supabase
      .from('admin_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verification.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        action_payload: verification.action_payload,
        message_bn: 'কোড যাচাই সফল।',
        message_en: 'Code verified successfully.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const status = error.code || 500;
    return new Response(
      JSON.stringify({
        error: true,
        code: status,
        message_bn: error.message_bn || 'কিছু একটা সমস্যা হয়েছে।',
        message_en: error.message_en || error.message || 'Something went wrong.',
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
