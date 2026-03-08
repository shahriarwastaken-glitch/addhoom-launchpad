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

    const { workspace_id, competitor_name, competitor_page_url, language } = await req.json();
    if (!workspace_id || !competitor_name) {
      return errorResponse(400, "প্রতিযোগীর নাম দিন।", "Competitor name is required.");
    }

    // Fetch workspace shop DNA
    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();

    const lang = language || "bn";

    // STEP 2 — Try Meta Ad Library API (Graph API v21.0)
    let ads: any[] = [];
    let adsFetched = false;

    try {
      const metaToken = Deno.env.get("META_ACCESS_TOKEN");
      if (!metaToken) {
        console.warn("META_ACCESS_TOKEN not configured, skipping Ad Library fetch");
      } else {
        const encodedName = encodeURIComponent(competitor_name);
        const fields = "ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_delivery_start_time,page_name,ad_snapshot_url";
        const adsApiUrl = `https://graph.facebook.com/v21.0/ads_archive?search_terms=${encodedName}&ad_type=ALL&ad_reached_countries=["BD"]&limit=20&fields=${fields}&access_token=${metaToken}`;

        console.log("Fetching Meta Ad Library via Graph API...");
        const adsResponse = await fetch(adsApiUrl);
        const adsData = await adsResponse.json();

        if (!adsResponse.ok) {
          console.warn("Meta Graph API error:", JSON.stringify(adsData?.error || adsData));
        } else if (Array.isArray(adsData?.data) && adsData.data.length > 0) {
          ads = adsData.data;
          adsFetched = true;
          console.log(`Found ${ads.length} ads from Meta Ad Library`);
        } else {
          console.warn("Meta Ad Library returned empty results");
        }
      }
    } catch (e) {
      console.warn("Meta Ad Library fetch failed, using fallback:", e);
    }

    // STEP 3 — Build analysis prompt
    const shopContext = workspace ? `
MY SHOP:
Name: ${workspace.shop_name || "N/A"}
Industry: ${workspace.industry || "N/A"}
Target audience: ${workspace.target_audience || "N/A"}
Unique selling point: ${workspace.unique_selling || "N/A"}
Key products: ${workspace.key_products || "N/A"}
Price range: ${workspace.price_range || "N/A"}` : "";

    let adsContext = "";
    if (adsFetched && ads.length > 0) {
      adsContext = `\n\nTHEIR ACTIVE ADS:\n${ads.slice(0, 10).map((ad: any, i: number) => `
Ad ${i + 1} (Running since: ${ad.ad_delivery_start_time || "Unknown"}):
Page: ${ad.page_name || "N/A"}
Headline: ${(ad.ad_creative_link_titles || [])[0] || "N/A"}
Body: ${(ad.ad_creative_bodies || [])[0] || "N/A"}
Caption: ${(ad.ad_creative_link_captions || [])[0] || "N/A"}`).join("\n")}`;
    } else {
      adsContext = `\n\nNOTE: Could not fetch live ads. Analyze based on your knowledge of this competitor and their likely strategies in the Bangladesh e-commerce market. The competitor page URL is: ${competitor_page_url || "not provided"}.`;
    }

    const prompt = `Analyze the following competitor in Bangladesh e-commerce and provide a detailed counter-strategy for my shop.
${shopContext}

COMPETITOR: ${competitor_name}
${adsContext}

PROVIDE A COMPLETE ANALYSIS:

1. THEIR STRATEGY: What copywriting approach are they likely using? (FOMO? Price anchoring? Social proof? Authority?)
2. THEIR STRENGTHS: What are they doing well?
3. THEIR WEAKNESSES: Where are they leaving money on the table?
4. TOP PATTERNS: The 3 most common patterns across their ads
5. THREE COUNTER-STRATEGIES for my shop — each must be specific, actionable, and different from what the competitor is doing. Include example hook text.

Language: ${lang === "bn" ? "Respond in Bangla" : "Respond in English"}

Return ONLY valid JSON:
{
  "strategy_type": "what overall strategy the competitor uses",
  "strengths": ["array of 2-3 things they do well"],
  "weaknesses": ["array of 2-3 gaps or weaknesses"],
  "top_patterns": ["array of 3 identified patterns with brief explanation each"],
  "counter_strategies": [
    {
      "title": "strategy name",
      "description": "what to do and why it will beat the competitor",
      "example_hook": "example opening line for an ad using this strategy"
    }
  ],
  "ads_analyzed": ${ads.length}
}`;

    const aiResponse = await callGemini(prompt);

    let parsed: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        strategy_type: "Unknown",
        strengths: [],
        weaknesses: [],
        top_patterns: [],
        counter_strategies: [],
        ads_analyzed: 0,
      };
    } catch {
      parsed = {
        strategy_type: "Unknown",
        strengths: [],
        weaknesses: [],
        top_patterns: [],
        counter_strategies: [],
        ads_analyzed: 0,
      };
    }

    // Format ads for storage and frontend
    const formattedAds = ads.slice(0, 10).map((ad: any) => ({
      page_name: ad.page_name || competitor_name,
      headline: ad.ad_creative_link_title || "",
      body: ad.ad_creative_body || "",
      caption: ad.ad_creative_link_caption || "",
      running_since: ad.ad_delivery_start_time || "",
    }));

    // STEP 4 — Save
    const { data: saved } = await supabase.from("competitor_analyses").insert({
      workspace_id,
      competitor_name,
      competitor_url: competitor_page_url || null,
      ai_analysis: JSON.stringify(parsed),
      counter_strategy: JSON.stringify(parsed.counter_strategies || []),
      ads_found: formattedAds,
    }).select().single();

    await logUsage(supabase, user.id, workspace_id, "competitor_intel");

    return jsonResponse({
      analysis: parsed,
      ads: formattedAds,
      ads_fetched: adsFetched,
      saved_id: saved?.id,
    });
  } catch (e) {
    console.error("competitor-intel error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
