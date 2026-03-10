import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabase.auth.getUser(token)

    if (!user.user) {
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'month'

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, industry')
      .eq('owner_id', user.user.id)
      .single()

    if (!workspace) {
      return new Response('Workspace not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Calculate date range
    let dateFilter = new Date()
    switch (period) {
      case 'week':
        dateFilter.setDate(dateFilter.getDate() - 7)
        break
      case 'month':
        dateFilter.setMonth(dateFilter.getMonth() - 1)
        break
      case '3month':
        dateFilter.setMonth(dateFilter.getMonth() - 3)
        break
      case 'all':
      default:
        dateFilter = new Date('2020-01-01')
    }

    // Get all analytics data in parallel
    const [
      totalAdsResult,
      avgScoreResult,
      winnersResult,
      frameworkStatsResult,
      platformStatsResult,
      scoreTrendResult,
      topAdsResult,
      unratedAdsResult,
      occasionHeatmapResult,
      languageStatsResult
    ] = await Promise.all([
      // Total ads
      supabase
        .from('ad_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString()),

      // Average dhoom score
      supabase
        .from('ad_creatives')
        .select('dhoom_score')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .not('dhoom_score', 'is', null),

      // Winners count
      supabase
        .from('ad_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('is_winner', true)
        .gte('created_at', dateFilter.toISOString()),

      // Framework breakdown
      supabase
        .from('ad_creatives')
        .select('framework, dhoom_score, performance_rating')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .not('framework', 'is', null),

      // Platform breakdown
      supabase
        .from('ad_creatives')
        .select('platform, dhoom_score, framework')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .not('platform', 'is', null),

      // Score trend (last 30 days)
      supabase
        .from('ad_creatives')
        .select('created_at, dhoom_score')
        .eq('workspace_id', workspace.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .not('dhoom_score', 'is', null)
        .order('created_at', { ascending: true }),

      // Top ads (by score, winners, good performance)
      supabase
        .from('ad_creatives')
        .select('id, headline, platform, framework, dhoom_score, is_winner, performance_rating, created_at')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .order('dhoom_score', { ascending: false, nullsLast: true })
        .limit(20),

      // Unrated ads for feedback queue
      supabase
        .from('ad_creatives')
        .select('id, headline, platform, created_at, dhoom_score')
        .eq('workspace_id', workspace.id)
        .is('performance_rating', null)
        .eq('is_winner', false)
        .order('created_at', { ascending: false })
        .limit(10),

      // Occasion heatmap
      supabase
        .from('ad_creatives')
        .select('occasion, created_at, dhoom_score')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .not('occasion', 'is', null),

      // Language comparison
      supabase
        .from('ad_creatives')
        .select('language, dhoom_score')
        .eq('workspace_id', workspace.id)
        .gte('created_at', dateFilter.toISOString())
        .not('language', 'is', null)
    ])

    // Process framework stats
    const frameworkMap = new Map()
    frameworkStatsResult.data?.forEach(ad => {
      const fw = ad.framework
      if (!frameworkMap.has(fw)) {
        frameworkMap.set(fw, { 
          scores: [], 
          goodRatings: 0, 
          totalRated: 0 
        })
      }
      const fwData = frameworkMap.get(fw)
      if (ad.dhoom_score) fwData.scores.push(ad.dhoom_score)
      if (ad.performance_rating) {
        fwData.totalRated++
        if (ad.performance_rating === 'good') fwData.goodRatings++
      }
    })

    const frameworkBreakdown = Array.from(frameworkMap.entries()).map(([fw, data]) => ({
      framework: fw,
      count: data.scores.length,
      avg_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length || 0,
      good_performance_rate: data.totalRated > 0 ? data.goodRatings / data.totalRated : 0
    })).sort((a, b) => b.avg_score - a.avg_score)

    // Process platform stats
    const platformMap = new Map()
    platformStatsResult.data?.forEach(ad => {
      const platform = ad.platform
      if (!platformMap.has(platform)) {
        platformMap.set(platform, { 
          scores: [], 
          frameworks: new Map() 
        })
      }
      const platformData = platformMap.get(platform)
      if (ad.dhoom_score) platformData.scores.push(ad.dhoom_score)
      if (ad.framework) {
        const fw = ad.framework
        if (!platformData.frameworks.has(fw)) {
          platformData.frameworks.set(fw, [])
        }
        if (ad.dhoom_score) platformData.frameworks.get(fw).push(ad.dhoom_score)
      }
    })

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => {
      let bestFramework = null
      let bestScore = 0
      for (const [fw, scores] of data.frameworks) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
        if (avgScore > bestScore) {
          bestScore = avgScore
          bestFramework = fw
        }
      }
      return {
        platform,
        count: data.scores.length,
        avg_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length || 0,
        best_framework: bestFramework
      }
    })

    // Process score trend
    const trendMap = new Map()
    scoreTrendResult.data?.forEach(ad => {
      const date = ad.created_at.split('T')[0]
      if (!trendMap.has(date)) {
        trendMap.set(date, [])
      }
      trendMap.get(date).push(ad.dhoom_score)
    })

    const scoreTrend = Array.from(trendMap.entries()).map(([date, scores]) => ({
      date,
      avg_score: scores.reduce((a, b) => a + b, 0) / scores.length
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Process top ads
    const topAds = {
      by_score: topAdsResult.data?.slice(0, 5) || [],
      winners: topAdsResult.data?.filter(ad => ad.is_winner).slice(0, 5) || [],
      good_performance: topAdsResult.data?.filter(ad => ad.performance_rating === 'good').slice(0, 5) || []
    }

    // Process occasion heatmap
    const occasionMap = new Map()
    occasionHeatmapResult.data?.forEach(ad => {
      const month = new Date(ad.created_at).getMonth() + 1
      const key = `${ad.occasion}-${month}`
      if (!occasionMap.has(key)) {
        occasionMap.set(key, { count: 0, scores: [] })
      }
      const data = occasionMap.get(key)
      data.count++
      if (ad.dhoom_score) data.scores.push(ad.dhoom_score)
    })

    const occasionHeatmap = Array.from(occasionMap.entries()).map(([key, data]) => {
      const [occasion, month] = key.split('-')
      return {
        occasion,
        month: parseInt(month),
        count: data.count,
        avg_score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length || 0
      }
    })

    // Process language comparison
    const languageMap = new Map()
    languageStatsResult.data?.forEach(ad => {
      const lang = ad.language
      if (!languageMap.has(lang)) {
        languageMap.set(lang, [])
      }
      if (ad.dhoom_score) languageMap.get(lang).push(ad.dhoom_score)
    })

    const languageComparison = {
      bn: {
        count: languageMap.get('bn')?.length || 0,
        avg_score: languageMap.get('bn') ? 
          languageMap.get('bn').reduce((a, b) => a + b, 0) / languageMap.get('bn').length : 0
      },
      en: {
        count: languageMap.get('en')?.length || 0,
        avg_score: languageMap.get('en') ? 
          languageMap.get('en').reduce((a, b) => a + b, 0) / languageMap.get('en').length : 0
      }
    }

    // Calculate averages and totals
    const avgDhoomScore = avgScoreResult.data?.reduce((sum, ad) => sum + (ad.dhoom_score || 0), 0) / (avgScoreResult.data?.length || 1) || 0
    const bestFramework = frameworkBreakdown.length > 0 ? frameworkBreakdown[0] : null

    const response = {
      total_ads: totalAdsResult.count || 0,
      avg_dhoom_score: Math.round(avgDhoomScore),
      winner_count: winnersResult.count || 0,
      best_framework: bestFramework,
      framework_breakdown: frameworkBreakdown,
      platform_breakdown: platformBreakdown,
      score_trend: scoreTrend,
      top_ads: topAds,
      occasion_heatmap: occasionHeatmap,
      language_comparison: languageComparison,
      unrated_ads: unratedAdsResult.data || [],
      workspace_industry: workspace.industry
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})