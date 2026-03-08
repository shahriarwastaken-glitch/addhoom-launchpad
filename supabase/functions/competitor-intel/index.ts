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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();

    const limitCheck = await checkPlanLimit(supabase, user.id, "competitor_intel", profile?.plan || "pro");
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const { workspace_id, competitor_url, competitor_name } = await req.json();
    if (!workspace_id || !competitor_url) {
      return errorResponse(400, "প্রতিযোগীর URL দিন।", "Competitor URL is required.");
    }

    const prompt = `Analyze this competitor in Bangladesh e-commerce: ${competitor_name || "Unknown"} (${competitor_url}).

Based on common patterns for Bangladesh e-commerce competitors, analyze:
1. Their likely main marketing strategy
2. Common copywriting patterns they would use
3. Their probable targeting approach
4. Strengths and weaknesses
5. Suggest 3 specific counter-strategies for a competing shop

Respond in Bangla. Return valid JSON:
{"analysis":"...detailed analysis...", "counter_strategy":"...3 counter strategies...", "top_patterns":["pattern1","pattern2","pattern3"]}`;

    const aiResponse = await callGemini(prompt);

    let parsed: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: aiResponse, counter_strategy: "", top_patterns: [] };
    } catch {
      parsed = { analysis: aiResponse, counter_strategy: "", top_patterns: [] };
    }

    const { data: saved } = await supabase.from("competitor_analyses").insert({
      workspace_id,
      competitor_name: competitor_name || "Unknown",
      competitor_url,
      ai_analysis: parsed.analysis,
      counter_strategy: parsed.counter_strategy,
      ads_found: parsed.top_patterns || [],
    }).select().single();

    await logUsage(supabase, user.id, workspace_id, "competitor_intel");

    return jsonResponse({ analysis: saved || parsed });
  } catch (e) {
    console.error("competitor-intel error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
