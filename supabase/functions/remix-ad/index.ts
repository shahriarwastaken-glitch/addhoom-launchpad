import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, errorResponse, jsonResponse, logUsage, ADDHOOM_SYSTEM_PROMPT,
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

    const { workspace_id, ad_id, num_variations = 3, custom_prompt } = await req.json();
    if (!workspace_id || !ad_id) {
      return errorResponse(400, "অ্যাড আইডি দিন।", "Ad ID is required.");
    }

    // STEP 1 — Fetch target ad
    const { data: targetAd } = await supabase
      .from("ad_creatives").select("*").eq("id", ad_id).single();

    if (!targetAd) return errorResponse(404, "অ্যাড পাওয়া যায়নি।", "Ad not found.");

    // STEP 2 — Fetch winner ads
    const { data: winners } = await supabase
      .from("ad_creatives")
      .select("headline, body, cta, dhoom_score, framework")
      .eq("workspace_id", workspace_id)
      .eq("is_winner", true)
      .order("dhoom_score", { ascending: false })
      .limit(10);

    // STEP 3 — Fetch workspace shop DNA
    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();

    const shopName = workspace?.shop_name || "Shop";
    const industry = workspace?.industry || "general";
    const brandTone = workspace?.brand_tone || "friendly";

    // STEP 4 — Build prompt
    let prompt: string;

    if (winners && winners.length > 0) {
      const winnersText = winners.map((w: any, i: number) =>
        `Winner ${i + 1} (Dhoom Score: ${w.dhoom_score}):
Headline: ${w.headline}
Body: ${w.body}
CTA: ${w.cta}
Framework: ${w.framework}`
      ).join("\n\n");

      prompt = `You are improving an ad using proven winner patterns from the same shop.

SHOP CONTEXT:
${shopName} | ${industry} | Tone: ${brandTone}

WINNING ADS FROM THIS SHOP (these actually performed best — study their patterns):

${winnersText}

PATTERNS IDENTIFIED: Look at the winners above. What makes them work? Apply those same patterns — the hook style, the tone, the urgency level, the framework structure — to create improved variations of the ad below.

AD TO IMPROVE:
Headline: ${targetAd.headline}
Body: ${targetAd.body}
CTA: ${targetAd.cta}
Language: ${targetAd.language || "bn"}
Platform: ${targetAd.platform || "facebook"}

Generate ${num_variations} improved variations. Apply winner patterns. Make each one genuinely different — vary the hook angle, the emotional appeal, the urgency level.

Return ONLY valid JSON array:
[{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"...","improvement_note":"one sentence on what was improved vs original"}]`;
    } else {
      prompt = `Generate ${num_variations} improved variations of this ad for a Bangladesh e-commerce shop.

SHOP: ${shopName} | ${industry} | Tone: ${brandTone}

ORIGINAL AD:
Headline: ${targetAd.headline}
Body: ${targetAd.body}
CTA: ${targetAd.cta}
Language: ${targetAd.language || "bn"}

Make each variation genuinely better — stronger hook, clearer benefit, more compelling CTA. Try different frameworks: AIDA, PAS, FOMO, Social Proof.

Return ONLY valid JSON array:
[{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"...","improvement_note":"one sentence on what was improved vs original"}]`;
    }

    // STEP 5 — Call Gemini with custom prompt or generated prompt
    const finalPrompt = custom_prompt || prompt;
    let aiResponse: string;
    try {
      aiResponse = await callGemini(finalPrompt, ADDHOOM_SYSTEM_PROMPT);
    } catch (e) {
      console.error("Gemini error:", e);
      return errorResponse(503, "AI এখন ব্যস্ত।", "AI is busy right now.");
    }

    // Parse response
    let ads: any[];
    try {
      const cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      ads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return errorResponse(500, "AI থেকে সঠিক উত্তর আসেনি।", "Could not parse AI response.");
    }

    if (!Array.isArray(ads) || ads.length === 0) {
      return errorResponse(500, "AI কোনো বিজ্ঞাপন তৈরি করেনি।", "AI did not generate any ads.");
    }

    // Save to database
    const creatives = ads.map((ad: any) => ({
      workspace_id,
      headline: ad.headline,
      body: ad.body,
      cta: ad.cta,
      language: targetAd.language || "bn",
      platform: targetAd.platform || "facebook",
      framework: targetAd.framework || "AIDA",
      occasion: targetAd.occasion || "general",
      tone: targetAd.tone || null,
      dhoom_score: ad.dhoom_score,
      copy_score: ad.copy_score,
      score_reason: ad.score_reason,
      improvement_note: ad.improvement_note || null,
      remixed_from_id: ad_id,
      ai_generated: true,
    }));

    const { data: saved } = await supabase.from("ad_creatives").insert(creatives).select();

    // Log usage
    await logUsage(supabase, user.id, workspace_id, "ad_remix");

    const resultAds = (saved || creatives).sort(
      (a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)
    );

    return jsonResponse({
      success: true,
      ads: resultAds,
      count: resultAds.length,
      has_winners: !!(winners && winners.length > 0),
      message: winners && winners.length > 0
        ? `Winner pattern থেকে ${resultAds.length}টি রিমিক্স তৈরি হয়েছে ⚡`
        : `${resultAds.length}টি উন্নত ভার্সন তৈরি হয়েছে`,
    });
  } catch (e) {
    console.error("remix-ad error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
