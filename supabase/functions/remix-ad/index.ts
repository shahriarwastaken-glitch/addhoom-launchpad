import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, errorResponse, jsonResponse,
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

    const { workspace_id, ad_id, num_variations } = await req.json();
    if (!workspace_id || !ad_id) {
      return errorResponse(400, "অ্যাড আইডি দিন।", "Ad ID is required.");
    }

    // Fetch target ad
    const { data: targetAd } = await supabase
      .from("ad_creatives").select("*").eq("id", ad_id).single();

    if (!targetAd) return errorResponse(404, "অ্যাড পাওয়া যায়নি।", "Ad not found.");

    // Fetch winners
    const { data: winners } = await supabase
      .from("ad_creatives").select("headline, body, cta, dhoom_score")
      .eq("workspace_id", workspace_id).eq("is_winner", true)
      .order("created_at", { ascending: false }).limit(20);

    const prompt = `Here are winning ads from this shop:
${JSON.stringify(winners || [], null, 2)}

Here is an ad to improve:
${JSON.stringify({ headline: targetAd.headline, body: targetAd.body, cta: targetAd.cta, dhoom_score: targetAd.dhoom_score })}

Generate ${num_variations || 5} improved variations that apply patterns from the winners.
Language: ${targetAd.language || "bn"}
Return ONLY a valid JSON array: [{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"..."}]`;

    const aiResponse = await callGemini(prompt);

    let ads: any[];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      ads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return errorResponse(500, "AI এখন ব্যস্ত।", "AI is busy.");
    }

    const creatives = ads.map((ad: any) => ({
      workspace_id,
      headline: ad.headline,
      body: ad.body,
      cta: ad.cta,
      language: targetAd.language || "bn",
      platform: targetAd.platform,
      framework: targetAd.framework,
      occasion: targetAd.occasion,
      dhoom_score: ad.dhoom_score,
      copy_score: ad.copy_score,
      score_reason: ad.score_reason,
    }));

    const { data: saved } = await supabase.from("ad_creatives").insert(creatives).select();

    return jsonResponse({
      ads: (saved || creatives).sort((a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)),
    });
  } catch (e) {
    console.error("remix-ad error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
