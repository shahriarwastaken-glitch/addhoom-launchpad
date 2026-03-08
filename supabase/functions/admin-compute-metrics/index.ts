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

    await verifyAdmin(req, supabase);

    const today = new Date().toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      totalUsersRes,
      newUsersTodayRes,
      proUsersRes,
      agencyUsersRes,
      totalAdsRes,
      adsTodayRes,
      avgDhoomRes,
      totalRevenueRes,
      revenueTodayRes,
      usageLogsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'agency'),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('ad_creatives').select('dhoom_score').not('dhoom_score', 'is', null),
      supabase.from('payments').select('amount_bdt').eq('status', 'success'),
      supabase.from('payments').select('amount_bdt').eq('status', 'success').gte('created_at', today),
      supabase.from('usage_logs').select('user_id').gte('created_at', today),
    ]);

    // Calculate metrics
    const scores = avgDhoomRes.data?.map(a => a.dhoom_score) || [];
    const avgDhoomScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0;

    const totalRevenue = totalRevenueRes.data?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;
    const revenueToday = revenueTodayRes.data?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;
    const activeUsersToday = new Set(usageLogsRes.data?.map(l => l.user_id) || []).size;

    // Upsert metrics cache
    const { error: upsertError } = await supabase
      .from('platform_metrics_cache')
      .upsert({
        metric_date: today,
        total_users: totalUsersRes.count || 0,
        new_users_today: newUsersTodayRes.count || 0,
        active_users_today: activeUsersToday,
        pro_users: proUsersRes.count || 0,
        agency_users: agencyUsersRes.count || 0,
        total_ads_generated: totalAdsRes.count || 0,
        ads_generated_today: adsTodayRes.count || 0,
        total_revenue_bdt: totalRevenue,
        revenue_today_bdt: revenueToday,
        avg_dhoom_score: avgDhoomScore,
        total_ai_calls: usageLogsRes.data?.length || 0,
        computed_at: new Date().toISOString(),
      }, { onConflict: 'metric_date' });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        success: true,
        computed_at: new Date().toISOString(),
        metric_date: today,
        message_bn: 'মেট্রিক্স ক্যাশ সফলভাবে আপডেট হয়েছে।',
        message_en: 'Metrics cache updated successfully.',
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
