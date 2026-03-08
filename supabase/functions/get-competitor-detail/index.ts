import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const url = new URL(req.url);
    const analysis_id = url.searchParams.get("analysis_id");
    const workspace_id = url.searchParams.get("workspace_id");

    if (!analysis_id || !workspace_id) {
      return errorResponse(400, "analysis_id এবং workspace_id প্রয়োজন।", "analysis_id and workspace_id are required.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify workspace ownership
    const { data: ws } = await supabase
      .from("workspaces").select("owner_id").eq("id", workspace_id).single();
    if (!ws || ws.owner_id !== user.id) {
      return errorResponse(403, "অনুমতি নেই।", "Unauthorized.");
    }

    const { data: analysis, error: fetchErr } = await supabase
      .from("competitor_analyses")
      .select("*")
      .eq("id", analysis_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchErr || !analysis) {
      return errorResponse(404, "বিশ্লেষণ পাওয়া যায়নি।", "Analysis not found.");
    }

    // Parse ai_analysis and counter_strategy from JSON strings
    let parsedAnalysis: any = {};
    try {
      parsedAnalysis = typeof analysis.ai_analysis === "string"
        ? JSON.parse(analysis.ai_analysis)
        : analysis.ai_analysis || {};
    } catch { /* ignore */ }

    let parsedCounter: any[] = [];
    try {
      parsedCounter = typeof analysis.counter_strategy === "string"
        ? JSON.parse(analysis.counter_strategy)
        : analysis.counter_strategy || [];
    } catch { /* ignore */ }

    return jsonResponse({
      success: true,
      analysis: {
        id: analysis.id,
        workspace_id: analysis.workspace_id,
        competitor_name: analysis.competitor_name,
        competitor_url: analysis.competitor_url,
        ads_found: analysis.ads_found || [],
        ai_analysis: parsedAnalysis,
        counter_strategies: parsedCounter,
        created_at: analysis.created_at,
      },
    });
  } catch (e) {
    console.error("get-competitor-detail error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
