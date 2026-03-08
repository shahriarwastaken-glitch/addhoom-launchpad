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
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const admin = await verifyAdmin(req, supabase);

    const { title, message, target_type, target_user_ids } = await req.json();

    if (!title || !message) {
      throw { code: 400, message_en: 'Title and message required.' };
    }

    // Insert notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        title,
        message,
        sent_by: admin.id,
        target_type: target_type || 'all',
        target_user_ids: target_user_ids || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Get target users for email
    let emailQuery = supabase.from('profiles').select('id, email, full_name, phone, plan');

    switch (target_type) {
      case 'specific':
        if (target_user_ids?.length) {
          emailQuery = emailQuery.in('id', target_user_ids);
        }
        break;
      case 'group_has_phone':
        emailQuery = emailQuery.not('phone', 'is', null).neq('phone', '');
        break;
      case 'group_plan_pro':
        emailQuery = emailQuery.eq('plan', 'pro');
        break;
      case 'group_plan_agency':
        emailQuery = emailQuery.eq('plan', 'agency');
        break;
      case 'group_plan_free':
        emailQuery = emailQuery.eq('plan', 'free');
        break;
      // 'all' - no filter needed
    }

    const { data: users } = await emailQuery;
    const recipients = users?.filter(u => u.email) || [];

    // Send emails via Resend if API key exists
    let emailsSent = 0;
    if (resendApiKey && recipients.length > 0) {
      // Send in batches of 50
      const batches = [];
      for (let i = 0; i < recipients.length; i += 50) {
        batches.push(recipients.slice(i, i + 50));
      }

      for (const batch of batches) {
        const emailPromises = batch.map(user =>
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'AdDhoom <notifications@addhoom.com>',
              to: user.email,
              subject: `🔔 ${title}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">AdDhoom</h1>
                  </div>
                  <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
                    <p style="color: #4b5563; line-height: 1.6;">${message}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                      আপনি এই ইমেইল পাচ্ছেন কারণ আপনি AdDhoom এ রেজিস্টার্ড।
                    </p>
                  </div>
                </div>
              `,
            }),
          }).then(r => r.text()).then(() => { emailsSent++; }).catch(() => {})
        );
        await Promise.all(emailPromises);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        emails_sent: emailsSent,
        total_recipients: recipients.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const status = error.code || 500;
    return new Response(
      JSON.stringify({
        error: true,
        message_bn: error.message_bn || 'সমস্যা হয়েছে।',
        message_en: error.message_en || error.message || 'Something went wrong.',
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
