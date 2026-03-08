import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, checkPlanLimit, logUsage,
  errorResponse, jsonResponse,
} from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();

    const limitCheck = await checkPlanLimit(supabase, user.id, "account_doctor", profile?.plan || "pro");
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const { workspace_id } = await req.json();
    if (!workspace_id) return errorResponse(400, "ওয়ার্কস্পেস দিন।", "Workspace ID required.");

    // Gather account data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [campaignsRes, creativesRes, usageRes] = await Promise.all([
      supabase.from("campaigns").select("*").eq("workspace_id", workspace_id),
      supabase.from("ad_creatives").select("*").eq("workspace_id", workspace_id).gte("created_at", thirtyDaysAgo),
      supabase.from("usage_logs").select("*").eq("workspace_id", workspace_id).gte("created_at", thirtyDaysAgo),
    ]);

    const campaigns = campaignsRes.data || [];
    const creatives = creativesRes.data || [];

    const summary = {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter((c: any) => c.status === "active").length,
      paused_campaigns: campaigns.filter((c: any) => c.status === "paused").length,
      draft_campaigns: campaigns.filter((c: any) => c.status === "draft").length,
      total_creatives_30d: creatives.length,
      avg_dhoom_score: creatives.length > 0
        ? Math.round(creatives.reduce((sum: number, c: any) => sum + (c.dhoom_score || 0), 0) / creatives.length)
        : 0,
      winner_count: creatives.filter((c: any) => c.is_winner).length,
      usage_count_30d: (usageRes.data || []).length,
    };

    const prompt = `You are auditing a Bangladesh e-commerce ad account. Here is the account data:
${JSON.stringify(summary, null, 2)}

Generate a health report with:
- health_score (0-100)
- good_items (array of what's working well, each with title and description in Bangla)
- warning_items (array of concerns, each with title and description in Bangla)
- critical_items (array of urgent issues, each with title and description in Bangla)

If there's little data, still provide helpful recommendations for a new BD shop.
Return ONLY valid JSON: {"health_score":0,"good_items":[{"title":"...","description":"..."}],"warning_items":[...],"critical_items":[...]}`;

    const aiResponse = await callGemini(prompt);

    let report: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : { health_score: 50, good_items: [], warning_items: [], critical_items: [] };
    } catch {
      report = { health_score: 50, good_items: [], warning_items: [{ title: "ডেটা বিশ্লেষণ", description: "যথেষ্ট ডেটা নেই" }], critical_items: [] };
    }

    const { data: saved } = await supabase.from("account_health_reports").insert({
      workspace_id,
      health_score: report.health_score,
      good_items: report.good_items,
      warning_items: report.warning_items,
      critical_items: report.critical_items,
    }).select().single();

    await logUsage(supabase, user.id, workspace_id, "account_doctor");

    return jsonResponse({ report: saved || report });
  } catch (e) {
    console.error("account-doctor error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
