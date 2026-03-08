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
    const workspace_id = url.searchParams.get("workspace_id");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    if (!workspace_id) return errorResponse(400, "workspace_id প্রয়োজন।", "workspace_id is required.");

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

    const offset = (page - 1) * limit;

    // Get analyses with count
    const { data: analyses, error: listErr } = await supabase
      .from("competitor_analyses")
      .select("id, competitor_name, competitor_url, ai_analysis, ads_found, created_at")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (listErr) {
      console.error("list error:", listErr);
      return errorResponse(500, "ডেটা লোড ব্যর্থ।", "Failed to load data.");
    }

    // Get total count
    const { count } = await supabase
      .from("competitor_analyses")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);

    // Extract top_patterns and ads_count from stored data
    const formatted = (analyses || []).map((a: any) => {
      let topPatterns: string[] = [];
      try {
        const parsed = typeof a.ai_analysis === "string" ? JSON.parse(a.ai_analysis) : a.ai_analysis;
        topPatterns = parsed?.top_patterns || [];
      } catch { /* ignore */ }

      const adsCount = Array.isArray(a.ads_found) ? a.ads_found.length : 0;

      return {
        id: a.id,
        competitor_name: a.competitor_name,
        competitor_url: a.competitor_url,
        top_patterns: topPatterns,
        ads_count: adsCount,
        created_at: a.created_at,
      };
    });

    return jsonResponse({
      success: true,
      analyses: formatted,
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    console.error("get-competitor-history error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
