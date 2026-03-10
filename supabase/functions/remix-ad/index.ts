import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, getSystemPrompt } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function errorResponse(code: number, messageBn: string, messageEn: string) {
  return new Response(
    JSON.stringify({ error: true, code, message_bn: messageBn, message_en: messageEn }),
    { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const { data: targetAd } = await supabase
      .from("ad_creatives").select("*").eq("id", ad_id).single();
    if (!targetAd) return errorResponse(404, "অ্যাড পাওয়া যায়নি।", "Ad not found.");

    const { data: winners } = await supabase
      .from("ad_creatives")
      .select("headline, body, cta, dhoom_score, framework")
      .eq("workspace_id", workspace_id)
      .eq("is_winner", true)
      .order("dhoom_score", { ascending: false })
      .limit(10);

    const { data: workspace } = await supabase
      .from("workspaces").select("shop_name, industry, brand_tone").eq("id", workspace_id).single();

    const shopName = workspace?.shop_name || "Shop";
    const industry = workspace?.industry || "general";
    const brandTone = workspace?.brand_tone || "friendly";

    let prompt: string;

    if (winners && winners.length > 0) {
      const winnersText = winners.map((w: any, i: number) =>
        `Winner ${i + 1} (Dhoom Score: ${w.dhoom_score}):\nHeadline: ${w.headline}\nBody: ${w.body}\nCTA: ${w.cta}\nFramework: ${w.framework}`
      ).join("\n\n");

      prompt = `You are improving an ad using proven winner patterns from the same shop.

SHOP CONTEXT:
${shopName} | ${industry} | Tone: ${brandTone}

WINNING ADS FROM THIS SHOP:

${winnersText}

AD TO IMPROVE:
Headline: ${targetAd.headline}
Body: ${targetAd.body}
CTA: ${targetAd.cta}
Language: ${targetAd.language || "bn"}
Platform: ${targetAd.platform || "facebook"}

Generate ${num_variations} improved variations. Apply winner patterns. Make each one genuinely different.

Return ONLY valid JSON array:
[{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"...","improvement_note":"..."}]`;
    } else {
      prompt = `Generate ${num_variations} improved variations of this ad for a Bangladesh e-commerce shop.

SHOP: ${shopName} | ${industry} | Tone: ${brandTone}

ORIGINAL AD:
Headline: ${targetAd.headline}
Body: ${targetAd.body}
CTA: ${targetAd.cta}
Language: ${targetAd.language || "bn"}

Make each variation genuinely better. Try different frameworks: AIDA, PAS, FOMO, Social Proof.

Return ONLY valid JSON array:
[{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"...","improvement_note":"..."}]`;
    }

    const finalPrompt = custom_prompt || prompt;
    const systemPrompt = await getSystemPrompt();
    const aiResponse = await callGemini(finalPrompt, systemPrompt, true);

    if (!aiResponse) {
      return errorResponse(503, "AI এখন ব্যস্ত।", "AI is busy right now.");
    }

    let ads: any[];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      ads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return errorResponse(500, "AI থেকে সঠিক উত্তর আসেনি।", "Could not parse AI response.");
    }

    if (!Array.isArray(ads) || ads.length === 0) {
      return errorResponse(500, "AI কোনো বিজ্ঞাপন তৈরি করেনি।", "AI did not generate any ads.");
    }

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
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      workspace_id,
      feature: "ad_remix",
      tokens_used: 0,
    });

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
