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

    const { creative_id, rating } = await req.json()

    if (!creative_id || !rating || !['good', 'neutral', 'poor'].includes(rating)) {
      return new Response('Invalid input', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get user's workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.user.id)
      .single()

    if (!workspace) {
      return new Response('Workspace not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Verify ad belongs to user and update rating
    const { data: updatedAd, error } = await supabase
      .from('ad_creatives')
      .update({
        performance_rating: rating,
        rated_at: new Date().toISOString()
      })
      .eq('id', creative_id)
      .eq('workspace_id', workspace.id)
      .select('framework, platform')
      .single()

    if (error || !updatedAd) {
      return new Response('Ad not found or unauthorized', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Generate personalized insight
    let insight = ''
    
    if (rating === 'good') {
      // Get framework performance for this user
      const { data: frameworkStats } = await supabase
        .from('ad_creatives')
        .select('performance_rating')
        .eq('workspace_id', workspace.id)
        .eq('framework', updatedAd.framework)
        .not('performance_rating', 'is', null)

      if (frameworkStats && frameworkStats.length > 0) {
        const goodCount = frameworkStats.filter(ad => ad.performance_rating === 'good').length
        const totalCount = frameworkStats.length
        const successRate = Math.round((goodCount / totalCount) * 100)
        
        insight = `${updatedAd.framework} বিজ্ঞাপনে আপনার ${successRate}% ভালো ফলাফল`
      } else {
        insight = `${updatedAd.framework} কৌশল আপনার জন্য কার্যকর হতে পারে`
      }
    } else if (rating === 'poor') {
      // Suggest trying different framework
      const { data: bestFramework } = await supabase
        .from('ad_creatives')
        .select('framework')
        .eq('workspace_id', workspace.id)
        .eq('performance_rating', 'good')
        .limit(1)

      if (bestFramework && bestFramework.length > 0) {
        insight = `${bestFramework[0].framework} কৌশল চেষ্টা করে দেখুন`
      } else {
        insight = 'বিভিন্ন কৌশল পরীক্ষা করে দেখুন'
      }
    } else {
      insight = 'আরো ফলাফল জানান, AI আরো ভালো হবে'
    }

    return new Response(JSON.stringify({
      success: true,
      insight
    }), {
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