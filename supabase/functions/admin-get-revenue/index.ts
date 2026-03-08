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
    const period = url.searchParams.get('period') || 'month';

    // Calculate date range
    let startDate: Date;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Fetch all payments in range
    let query = supabase
      .from('payments')
      .select('*, profiles(email)')
      .eq('status', 'success')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const { data: payments, error } = await query;

    if (error) throw error;

    // Calculate daily revenue for chart
    const dailyRevenue: Record<string, { amount_bdt: number; count: number }> = {};
    const byPlan: Record<string, number> = { pro: 0, agency: 0 };
    const byMethod: Record<string, number> = {};
    const byCycle: Record<string, number> = { monthly: 0, annual: 0 };
    const userTotals: Record<string, { email: string; total: number; plan: string }> = {};

    payments?.forEach(payment => {
      const date = payment.created_at.split('T')[0];
      
      // Daily revenue
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { amount_bdt: 0, count: 0 };
      }
      dailyRevenue[date].amount_bdt += Number(payment.amount_bdt);
      dailyRevenue[date].count++;

      // By plan
      const plan = payment.plan_purchased || 'unknown';
      byPlan[plan] = (byPlan[plan] || 0) + Number(payment.amount_bdt);

      // By method
      const method = payment.method || 'unknown';
      byMethod[method] = (byMethod[method] || 0) + Number(payment.amount_bdt);

      // By cycle
      const cycle = payment.billing_cycle || 'monthly';
      byCycle[cycle] = (byCycle[cycle] || 0) + Number(payment.amount_bdt);

      // Per user totals
      const userId = payment.user_id;
      if (!userTotals[userId]) {
        userTotals[userId] = { 
          email: (payment as any).profiles?.email || 'Unknown', 
          total: 0, 
          plan: plan 
        };
      }
      userTotals[userId].total += Number(payment.amount_bdt);
    });

    // Convert daily revenue to array
    const dailyRevenueArray = Object.entries(dailyRevenue)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top 10 users by revenue
    const topUsers = Object.entries(userTotals)
      .map(([user_id, data]) => ({ user_id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Calculate totals
    const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount_bdt), 0) || 0;

    return new Response(
      JSON.stringify({
        period,
        total_revenue: totalRevenue,
        transaction_count: payments?.length || 0,
        daily_revenue: dailyRevenueArray,
        by_plan: byPlan,
        by_method: byMethod,
        by_cycle: byCycle,
        top_users: topUsers,
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
