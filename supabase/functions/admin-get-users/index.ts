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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const plan = url.searchParams.get('plan') || 'all';
    const search = url.searchParams.get('search') || '';
    const sort = url.searchParams.get('sort') || 'newest';

    const offset = (page - 1) * limit;

    // Build base query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply plan filter
    if (plan !== 'all') {
      query = query.eq('plan', plan);
    }

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) throw profilesError;

    // Get additional stats for each user in parallel
    const userIds = profiles?.map(p => p.id) || [];
    
    const [adsData, workspacesData, paymentsData, usageData] = await Promise.all([
      // Ads count per user
      supabase
        .from('ad_creatives')
        .select('workspace_id, workspaces!inner(owner_id)')
        .in('workspaces.owner_id', userIds),
      
      // Workspaces per user
      supabase
        .from('workspaces')
        .select('owner_id')
        .in('owner_id', userIds),
      
      // Payments per user
      supabase
        .from('payments')
        .select('user_id, amount_bdt')
        .in('user_id', userIds)
        .eq('status', 'success'),
      
      // Last active from usage logs
      supabase
        .from('usage_logs')
        .select('user_id, created_at')
        .in('user_id', userIds)
        .order('created_at', { ascending: false }),
    ]);

    // Calculate stats per user
    const adsCounts: Record<string, number> = {};
    const workspaceCounts: Record<string, number> = {};
    const totalSpent: Record<string, number> = {};
    const lastActive: Record<string, string> = {};

    // Count ads (need to map through workspace ownership)
    adsData.data?.forEach((ad: any) => {
      const ownerId = ad.workspaces?.owner_id;
      if (ownerId) {
        adsCounts[ownerId] = (adsCounts[ownerId] || 0) + 1;
      }
    });

    workspacesData.data?.forEach(w => {
      workspaceCounts[w.owner_id] = (workspaceCounts[w.owner_id] || 0) + 1;
    });

    paymentsData.data?.forEach(p => {
      totalSpent[p.user_id] = (totalSpent[p.user_id] || 0) + Number(p.amount_bdt);
    });

    // Get most recent activity per user
    const seenUsers = new Set<string>();
    usageData.data?.forEach(u => {
      if (!seenUsers.has(u.user_id)) {
        lastActive[u.user_id] = u.created_at;
        seenUsers.add(u.user_id);
      }
    });

    // Enrich profiles with stats
    const enrichedProfiles = profiles?.map(profile => ({
      ...profile,
      ads_count: adsCounts[profile.id] || 0,
      workspace_count: workspaceCounts[profile.id] || 0,
      total_spent_bdt: totalSpent[profile.id] || 0,
      last_active: lastActive[profile.id] || null,
    })) || [];

    // Sort by additional fields if needed
    if (sort === 'most_active') {
      enrichedProfiles.sort((a, b) => b.ads_count - a.ads_count);
    } else if (sort === 'highest_value') {
      enrichedProfiles.sort((a, b) => b.total_spent_bdt - a.total_spent_bdt);
    }

    return new Response(
      JSON.stringify({
        users: enrichedProfiles,
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
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
