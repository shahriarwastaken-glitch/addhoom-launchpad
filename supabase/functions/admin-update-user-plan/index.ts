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

    const { user_id, new_plan, reason } = await req.json();

    if (!user_id || !new_plan) {
      throw { code: 400, message_bn: 'user_id এবং new_plan প্রয়োজন।', message_en: 'user_id and new_plan are required.' };
    }

    if (!['free', 'pro', 'agency'].includes(new_plan)) {
      throw { code: 400, message_bn: 'অবৈধ প্ল্যান।', message_en: 'Invalid plan.' };
    }

    // Get current plan
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', user_id)
      .single();

    if (profileError || !currentProfile) {
      throw { code: 404, message_bn: 'ব্যবহারকারী পাওয়া যায়নি।', message_en: 'User not found.' };
    }

    const oldPlan = currentProfile.plan;

    // Update profile
    const updateData: any = { plan: new_plan };
    
    // If downgrading, set subscription to inactive
    const planOrder = { free: 0, pro: 1, agency: 2 };
    if (planOrder[new_plan as keyof typeof planOrder] < planOrder[oldPlan as keyof typeof planOrder]) {
      updateData.subscription_status = 'inactive';
    } else {
      updateData.subscription_status = 'active';
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user_id);

    if (updateError) throw updateError;

    // Log the action
    const { error: logError } = await supabase
      .from('admin_actions')
      .insert({
        admin_id: admin.id,
        action: 'plan_change',
        target_user_id: user_id,
        old_value: oldPlan,
        new_value: new_plan,
        reason: reason || null,
      });

    if (logError) {
      console.error('Failed to log admin action:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        old_plan: oldPlan,
        new_plan,
        message_bn: 'প্ল্যান সফলভাবে আপডেট হয়েছে।',
        message_en: 'Plan updated successfully.',
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
