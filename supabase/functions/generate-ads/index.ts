import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, checkPlanLimit, logUsage,
  errorResponse, jsonResponse, ADDHOOM_SYSTEM_PROMPT,
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

    const { data: { user }, error: authError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();

    const plan = profile?.plan || "pro";

    const limitCheck = await checkPlanLimit(supabase, user.id, "ad_generator", plan);
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const body = await req.json();
    const {
      workspace_id, product_name, description, price_bdt,
      target_audience, platform, language, framework,
      occasion, num_variations, tone,
    } = body;

    if (!workspace_id || !product_name) {
      return errorResponse(400, "পণ্যের নাম দিন।", "Product name is required.");
    }

    const prompt = `Generate ${num_variations || 5} ad variations for ${(platform || ["facebook"]).join(", ")} using ${framework || "AIDA"} framework.
Product: ${product_name}
Description: ${description || "N/A"}
Price: ৳${price_bdt || "N/A"}
Audience: ${target_audience || "General Bangladesh audience"}
Occasion: ${occasion || "general"}
Tone: ${tone || "friendly"}
Language: ${language || "bn"}

For each ad give a dhoom_score (0-100 predicted performance), copy_score (0-100 copy quality), and score_reason (one sentence in ${language || "bn"}).
Return ONLY a valid JSON array: [{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"..."}]`;

    const aiResponse = await callGemini(prompt);

    // Extract JSON from response
    let ads: any[];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      ads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse Gemini response:", aiResponse);
      return errorResponse(500, "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।", "AI is busy. Please try again.");
    }

    // Save to database
    const creatives = ads.map((ad: any) => ({
      workspace_id,
      headline: ad.headline,
      body: ad.body,
      cta: ad.cta,
      language: language || "bn",
      platform: (platform || ["facebook"])[0],
      framework: framework || "AIDA",
      occasion: occasion || "general",
      dhoom_score: ad.dhoom_score,
      copy_score: ad.copy_score,
      score_reason: ad.score_reason,
    }));

    const { data: saved, error: saveError } = await supabase
      .from("ad_creatives").insert(creatives).select();

    if (saveError) console.error("Save error:", saveError);

    await logUsage(supabase, user.id, workspace_id, "ad_generator");

    // Sort by dhoom_score descending
    const sorted = (saved || creatives).sort(
      (a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)
    );

    return jsonResponse({ ads: sorted });
  } catch (e) {
    console.error("generate-ads error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
