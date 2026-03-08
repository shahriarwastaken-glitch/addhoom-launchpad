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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await verifyAdmin(req, supabase);
    const { action_type, action_payload } = await req.json();

    if (!action_type) {
      throw { code: 400, message_bn: 'action_type প্রয়োজন।', message_en: 'action_type is required.' };
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store verification code
    const { error: insertError } = await supabase
      .from('admin_verification_codes')
      .insert({
        admin_id: admin.id,
        code,
        action_type,
        action_payload: action_payload || null,
      });

    if (insertError) throw insertError;

    // Send email with code
    const actionLabels: Record<string, string> = {
      'plan_change': 'প্ল্যান পরিবর্তন',
      'add_admin': 'নতুন অ্যাডমিন যোগ',
      'remove_admin': 'অ্যাডমিন সরানো',
      'critical_action': 'গুরুত্বপূর্ণ পরিবর্তন',
    };

    const actionLabel = actionLabels[action_type] || action_type;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Using Resend's default sender until addhoom.com domain is verified
        from: 'AdDhoom Admin <onboarding@resend.dev>',
        to: admin.email,
        subject: `🔐 AdDhoom Admin Verification Code - ${actionLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h1 style="color: #F97316; font-size: 24px; margin-bottom: 16px;">AdDhoom Admin</h1>
            <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">
              আপনি <strong>${actionLabel}</strong> করতে চাইছেন। নিচের কোডটি ব্যবহার করুন:
            </p>
            <div style="background: #F3F4F6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">${code}</span>
            </div>
            <p style="color: #6B7280; font-size: 14px;">
              এই কোডটি ৫ মিনিটের মধ্যে মেয়াদ শেষ হবে।
            </p>
            <p style="color: #6B7280; font-size: 14px; margin-top: 16px;">
              আপনি এই অনুরোধ না করে থাকলে, এই ইমেইল উপেক্ষা করুন।
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.text();
      console.error('Email send error:', emailError);
      throw { code: 500, message_bn: 'ইমেইল পাঠাতে সমস্যা হয়েছে।', message_en: 'Failed to send email.' };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_bn: 'ভেরিফিকেশন কোড আপনার ইমেইলে পাঠানো হয়েছে।',
        message_en: 'Verification code sent to your email.',
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
