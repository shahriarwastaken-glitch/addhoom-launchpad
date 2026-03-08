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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Run all queries in parallel
    const [
      totalUsersRes,
      newUsersTodayRes,
      newUsersWeekRes,
      newUsersMonthRes,
      proUsersRes,
      agencyUsersRes,
      onboardingCompleteRes,
      totalAdsRes,
      adsTodayRes,
      adsWeekRes,
      avgDhoomRes,
      winnerAdsRes,
      totalConversationsRes,
      totalCompetitorRes,
      totalCalendarRes,
      totalRevenueRes,
      revenueMonthRes,
      revenueTodayRes,
      revenueByMethodRes,
      successfulPaymentsRes,
      failedPaymentsRes,
      platformScoresRes,
      occasionScoresRes,
      languageScoresRes,
      frameworkScoresRes,
      topWorkspaceRes,
      industryBreakdownRes,
      recentPaymentsRes,
      usageLogsRes,
    ] = await Promise.all([
      // User metrics
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'agency'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('onboarding_complete', true),
      
      // Usage metrics
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('ad_creatives').select('dhoom_score'),
      supabase.from('ad_creatives').select('id', { count: 'exact', head: true }).eq('is_winner', true),
      supabase.from('ai_conversations').select('id, messages'),
      supabase.from('competitor_analyses').select('id', { count: 'exact', head: true }),
      supabase.from('content_calendar').select('id', { count: 'exact', head: true }),
      
      // Revenue metrics
      supabase.from('payments').select('amount_bdt').eq('status', 'success'),
      supabase.from('payments').select('amount_bdt').eq('status', 'success').gte('created_at', monthAgo),
      supabase.from('payments').select('amount_bdt').eq('status', 'success').gte('created_at', today),
      supabase.from('payments').select('method, amount_bdt').eq('status', 'success'),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'success'),
      supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      
      // AI Performance
      supabase.from('ad_creatives').select('platform, dhoom_score').not('platform', 'is', null),
      supabase.from('ad_creatives').select('occasion, dhoom_score').not('occasion', 'is', null),
      supabase.from('ad_creatives').select('language, dhoom_score').not('language', 'is', null),
      supabase.from('ad_creatives').select('framework, dhoom_score').not('framework', 'is', null),
      
      // Platform health
      supabase.from('ad_creatives').select('workspace_id').limit(1000),
      supabase.from('workspaces').select('industry'),
      
      // Recent payments for dashboard
      supabase.from('payments').select('*, profiles(email)').order('created_at', { ascending: false }).limit(10),
      
      // Active users today
      supabase.from('usage_logs').select('user_id').gte('created_at', today),
    ]);

    // Calculate user metrics
    const totalUsers = totalUsersRes.count || 0;
    const newUsersToday = newUsersTodayRes.count || 0;
    const newUsersWeek = newUsersWeekRes.count || 0;
    const newUsersMonth = newUsersMonthRes.count || 0;
    const proUsers = proUsersRes.count || 0;
    const agencyUsers = agencyUsersRes.count || 0;
    const onboardingComplete = onboardingCompleteRes.count || 0;
    
    // Active users today
    const activeUsersToday = new Set(usageLogsRes.data?.map(l => l.user_id) || []).size;

    // Calculate usage metrics
    const totalAds = totalAdsRes.count || 0;
    const adsToday = adsTodayRes.count || 0;
    const adsWeek = adsWeekRes.count || 0;
    const winnerAds = winnerAdsRes.count || 0;
    
    // Average dhoom score
    const scores = avgDhoomRes.data?.filter(a => a.dhoom_score != null).map(a => a.dhoom_score) || [];
    const avgDhoomScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Total AI messages
    const totalAiMessages = totalConversationsRes.data?.reduce((sum, conv) => {
      const messages = Array.isArray(conv.messages) ? conv.messages.length : 0;
      return sum + messages;
    }, 0) || 0;

    // Revenue calculations
    const totalRevenue = totalRevenueRes.data?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;
    const revenueMonth = revenueMonthRes.data?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;
    const revenueToday = revenueTodayRes.data?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;
    
    // Revenue by method
    const revenueByMethod: Record<string, number> = {};
    revenueByMethodRes.data?.forEach(p => {
      const method = p.method || 'unknown';
      revenueByMethod[method] = (revenueByMethod[method] || 0) + Number(p.amount_bdt);
    });
    
    // MRR calculation
    const mrr = (proUsers * 2999) + (agencyUsers * 7999);
    
    // Payment stats
    const successfulPayments = successfulPaymentsRes.count || 0;
    const failedPayments = failedPaymentsRes.count || 0;
    const failedPaymentRate = (successfulPayments + failedPayments) > 0 
      ? Math.round((failedPayments / (successfulPayments + failedPayments)) * 100) 
      : 0;

    // AI Performance by category
    const calculateAvgByGroup = (data: any[] | null, groupKey: string) => {
      const groups: Record<string, { total: number; count: number }> = {};
      data?.forEach(item => {
        const key = item[groupKey] || 'unknown';
        if (item.dhoom_score != null) {
          if (!groups[key]) groups[key] = { total: 0, count: 0 };
          groups[key].total += item.dhoom_score;
          groups[key].count++;
        }
      });
      return Object.entries(groups).map(([name, { total, count }]) => ({
        name,
        avg_score: Math.round(total / count),
        count,
      })).sort((a, b) => b.count - a.count);
    };

    const platformPerformance = calculateAvgByGroup(platformScoresRes.data, 'platform');
    const occasionPerformance = calculateAvgByGroup(occasionScoresRes.data, 'occasion');
    const languagePerformance = calculateAvgByGroup(languageScoresRes.data, 'language');
    const frameworkPerformance = calculateAvgByGroup(frameworkScoresRes.data, 'framework');

    // Most used framework/occasion/platform
    const mostUsedFramework = frameworkPerformance[0]?.name || 'N/A';
    const mostUsedOccasion = occasionPerformance[0]?.name || 'N/A';
    const mostUsedPlatform = platformPerformance[0]?.name || 'N/A';

    // Platform health
    const workspaceAdCounts: Record<string, number> = {};
    topWorkspaceRes.data?.forEach(a => {
      workspaceAdCounts[a.workspace_id] = (workspaceAdCounts[a.workspace_id] || 0) + 1;
    });
    const topWorkspaceId = Object.entries(workspaceAdCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Industry breakdown
    const industryCounts: Record<string, number> = {};
    industryBreakdownRes.data?.forEach(w => {
      const industry = w.industry || 'unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });
    const topIndustries = Object.entries(industryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Bangla vs English ratio
    const banglaAds = languagePerformance.find(l => l.name === 'bn')?.count || 0;
    const englishAds = languagePerformance.find(l => l.name === 'en')?.count || 0;
    const banglaRatio = totalAds > 0 ? Math.round((banglaAds / totalAds) * 100) : 0;

    // Winner rate
    const winnerRate = totalAds > 0 ? Math.round((winnerAds / totalAds) * 100) : 0;

    // Onboarding rate
    const onboardingRate = totalUsers > 0 ? Math.round((onboardingComplete / totalUsers) * 100) : 0;

    return new Response(
      JSON.stringify({
        users: {
          total: totalUsers,
          new_today: newUsersToday,
          new_week: newUsersWeek,
          new_month: newUsersMonth,
          pro: proUsers,
          agency: agencyUsers,
          onboarding_complete: onboardingComplete,
          active_today: activeUsersToday,
        },
        usage: {
          total_ads: totalAds,
          ads_today: adsToday,
          ads_week: adsWeek,
          avg_dhoom_score: avgDhoomScore,
          winner_ads: winnerAds,
          total_ai_messages: totalAiMessages,
          total_competitor_analyses: totalCompetitorRes.count || 0,
          total_content_calendars: totalCalendarRes.count || 0,
        },
        revenue: {
          total: totalRevenue,
          this_month: revenueMonth,
          today: revenueToday,
          by_method: revenueByMethod,
          mrr,
          successful_payments: successfulPayments,
          failed_payments: failedPayments,
          failed_rate: failedPaymentRate,
        },
        ai_performance: {
          by_platform: platformPerformance,
          by_occasion: occasionPerformance,
          by_language: languagePerformance,
          by_framework: frameworkPerformance,
          most_used_framework: mostUsedFramework,
          most_used_occasion: mostUsedOccasion,
          most_used_platform: mostUsedPlatform,
        },
        platform_health: {
          top_workspace_id: topWorkspaceId,
          top_industries: topIndustries,
          bangla_ratio: banglaRatio,
          winner_rate: winnerRate,
          onboarding_rate: onboardingRate,
          failed_payment_rate: failedPaymentRate,
        },
        recent_payments: recentPaymentsRes.data || [],
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
