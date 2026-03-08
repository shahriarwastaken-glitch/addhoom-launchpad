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

    const { workspace_id, url, platform, language } = await req.json();
    if (!workspace_id || !url) {
      return errorResponse(400, "URL দিন।", "URL is required.");
    }

    // Fetch the URL
    let pageContent: string;
    try {
      const pageRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AdDhoom/1.0)" },
      });
      pageContent = await pageRes.text();
      // Truncate to avoid token limits
      pageContent = pageContent.substring(0, 15000);
    } catch {
      return errorResponse(400, "URL থেকে তথ্য পাওয়া যায়নি।", "Could not fetch URL.");
    }

    // Extract product info
    const extractPrompt = `Extract product information from this page HTML. Return ONLY valid JSON: {"product_name":"...","description":"...","price_bdt":0}

HTML (truncated):
${pageContent}`;

    const extractResponse = await callGemini(extractPrompt);
    let productInfo: any;
    try {
      const jsonMatch = extractResponse.match(/\{[\s\S]*\}/);
      productInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : { product_name: "Unknown Product", description: "", price_bdt: 0 };
    } catch {
      productInfo = { product_name: "Unknown Product", description: "", price_bdt: 0 };
    }

    // Now generate ads with extracted info
    const adPrompt = `Generate 5 ad variations for ${(platform || ["facebook"]).join(", ")} using AIDA framework.
Product: ${productInfo.product_name}
Description: ${productInfo.description}
Price: ৳${productInfo.price_bdt}
Language: ${language || "bn"}
Occasion: general

For each ad give dhoom_score (0-100), copy_score (0-100), score_reason (one sentence in ${language || "bn"}).
Return ONLY a valid JSON array: [{"headline":"...","body":"...","cta":"...","dhoom_score":0,"copy_score":0,"score_reason":"..."}]`;

    const aiResponse = await callGemini(adPrompt);

    let ads: any[];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      ads = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return errorResponse(500, "AI এখন ব্যস্ত।", "AI is busy.");
    }

    // Save
    const creatives = ads.map((ad: any) => ({
      workspace_id,
      headline: ad.headline,
      body: ad.body,
      cta: ad.cta,
      language: language || "bn",
      platform: (platform || ["facebook"])[0],
      framework: "AIDA",
      occasion: "general",
      dhoom_score: ad.dhoom_score,
      copy_score: ad.copy_score,
      score_reason: ad.score_reason,
    }));

    const { data: saved } = await supabase.from("ad_creatives").insert(creatives).select();

    return jsonResponse({
      product_info: productInfo,
      ads: (saved || creatives).sort((a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)),
    });
  } catch (e) {
    console.error("generate-ads-from-url error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
