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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data in parallel
    const [
      allAdsRes,
      recentAdsRes,
      worstAdsRes,
      bestAdsRes,
    ] = await Promise.all([
      // All ads for grouping
      supabase
        .from('ad_creatives')
        .select('framework, occasion, platform, language, dhoom_score, copy_score, created_at'),
      
      // Last 30 days for trend
      supabase
        .from('ad_creatives')
        .select('dhoom_score, created_at')
        .gte('created_at', thirtyDaysAgo)
        .not('dhoom_score', 'is', null),
      
      // Worst ads last 7 days
      supabase
        .from('ad_creatives')
        .select('id, headline, dhoom_score, framework, occasion, platform, created_at')
        .gte('created_at', sevenDaysAgo)
        .not('dhoom_score', 'is', null)
        .order('dhoom_score', { ascending: true })
        .limit(5),
      
      // Best ads all time
      supabase
        .from('ad_creatives')
        .select('id, headline, dhoom_score, framework, occasion, platform, created_at')
        .not('dhoom_score', 'is', null)
        .order('dhoom_score', { ascending: false })
        .limit(5),
    ]);

    const allAds = allAdsRes.data || [];

    // Calculate group averages
    const calculateGroupStats = (data: any[], groupKey: string) => {
      const groups: Record<string, { dhoom_total: number; copy_total: number; count: number; copy_count: number }> = {};
      
      data.forEach(item => {
        const key = item[groupKey];
        if (!key) return;
        
        if (!groups[key]) {
          groups[key] = { dhoom_total: 0, copy_total: 0, count: 0, copy_count: 0 };
        }
        
        if (item.dhoom_score != null) {
          groups[key].dhoom_total += item.dhoom_score;
          groups[key].count++;
        }
        if (item.copy_score != null) {
          groups[key].copy_total += item.copy_score;
          groups[key].copy_count++;
        }
      });

      return Object.entries(groups).map(([name, stats]) => ({
        name,
        avg_dhoom_score: stats.count > 0 ? Math.round(stats.dhoom_total / stats.count) : 0,
        avg_copy_score: stats.copy_count > 0 ? Math.round(stats.copy_total / stats.copy_count) : 0,
        count: stats.count,
      })).sort((a, b) => b.count - a.count);
    };

    const byFramework = calculateGroupStats(allAds, 'framework');
    const byOccasion = calculateGroupStats(allAds, 'occasion');
    const byPlatform = calculateGroupStats(allAds, 'platform');
    const byLanguage = calculateGroupStats(allAds, 'language');

    // Daily trend for last 30 days
    const dailyTrend: Record<string, { total: number; count: number }> = {};
    recentAdsRes.data?.forEach(ad => {
      const date = ad.created_at.split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { total: 0, count: 0 };
      }
      dailyTrend[date].total += ad.dhoom_score;
      dailyTrend[date].count++;
    });

    const dailyTrendArray = Object.entries(dailyTrend)
      .map(([date, data]) => ({
        date,
        avg_dhoom_score: Math.round(data.total / data.count),
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Overall stats
    const allScores = allAds.filter(a => a.dhoom_score != null);
    const allCopyScores = allAds.filter(a => a.copy_score != null);
    const avgDhoomScore = allScores.length > 0 
      ? Math.round(allScores.reduce((sum, a) => sum + a.dhoom_score, 0) / allScores.length)
      : 0;
    const avgCopyScore = allCopyScores.length > 0
      ? Math.round(allCopyScores.reduce((sum, a) => sum + a.copy_score, 0) / allCopyScores.length)
      : 0;

    return new Response(
      JSON.stringify({
        overall: {
          avg_dhoom_score: avgDhoomScore,
          avg_copy_score: avgCopyScore,
          total_ads: allAds.length,
        },
        by_framework: byFramework,
        by_occasion: byOccasion,
        by_platform: byPlatform,
        by_language: byLanguage,
        daily_trend: dailyTrendArray,
        worst_ads: worstAdsRes.data || [],
        best_ads: bestAdsRes.data || [],
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
