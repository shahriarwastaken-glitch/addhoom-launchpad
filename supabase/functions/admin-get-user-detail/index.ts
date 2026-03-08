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

    const { user_id } = await req.json();

    if (!user_id) {
      throw { code: 400, message_bn: 'user_id প্রয়োজন।', message_en: 'user_id is required.' };
    }

    // Fetch all data in parallel
    const [
      profileRes,
      workspacesRes,
      adsRes,
      paymentsRes,
      usageRes,
      conversationsRes,
      healthReportRes,
    ] = await Promise.all([
      // Profile
      supabase.from('profiles').select('*').eq('id', user_id).single(),
      
      // Workspaces with shop DNA
      supabase.from('workspaces').select('*').eq('owner_id', user_id),
      
      // Last 10 ads
      supabase
        .from('ad_creatives')
        .select('*, workspaces!inner(owner_id)')
        .eq('workspaces.owner_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Payment history
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false }),
      
      // Usage logs summary
      supabase
        .from('usage_logs')
        .select('feature, created_at')
        .eq('user_id', user_id),
      
      // Conversation count
      supabase
        .from('ai_conversations')
        .select('id', { count: 'exact', head: true })
        .in('workspace_id', 
          (await supabase.from('workspaces').select('id').eq('owner_id', user_id)).data?.map(w => w.id) || []
        ),
      
      // Health report
      supabase
        .from('account_health_reports')
        .select('*')
        .in('workspace_id',
          (await supabase.from('workspaces').select('id').eq('owner_id', user_id)).data?.map(w => w.id) || []
        )
        .order('generated_at', { ascending: false })
        .limit(1),
    ]);

    if (profileRes.error || !profileRes.data) {
      throw { code: 404, message_bn: 'ব্যবহারকারী পাওয়া যায়নি।', message_en: 'User not found.' };
    }

    // Calculate feature usage breakdown
    const featureUsage: Record<string, number> = {};
    let lastActive: string | null = null;
    
    usageRes.data?.forEach(log => {
      featureUsage[log.feature] = (featureUsage[log.feature] || 0) + 1;
      if (!lastActive || log.created_at > lastActive) {
        lastActive = log.created_at;
      }
    });

    // Calculate avg dhoom score
    const scores = adsRes.data?.filter(a => a.dhoom_score != null).map(a => a.dhoom_score) || [];
    const avgDhoomScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : null;

    // Winner count
    const winnerCount = adsRes.data?.filter(a => a.is_winner).length || 0;

    return new Response(
      JSON.stringify({
        profile: profileRes.data,
        workspaces: workspacesRes.data || [],
        recent_ads: adsRes.data?.map(ad => ({
          id: ad.id,
          headline: ad.headline,
          dhoom_score: ad.dhoom_score,
          copy_score: ad.copy_score,
          framework: ad.framework,
          platform: ad.platform,
          is_winner: ad.is_winner,
          created_at: ad.created_at,
        })) || [],
        payments: paymentsRes.data || [],
        usage_summary: {
          by_feature: featureUsage,
          total_uses: usageRes.data?.length || 0,
        },
        ai_conversation_count: conversationsRes.count || 0,
        health_report: healthReportRes.data?.[0] || null,
        stats: {
          joined_date: profileRes.data.created_at,
          last_active: lastActive,
          total_ads: adsRes.data?.length || 0,
          winner_count: winnerCount,
          avg_dhoom_score: avgDhoomScore,
          workspace_count: workspacesRes.data?.length || 0,
        },
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
