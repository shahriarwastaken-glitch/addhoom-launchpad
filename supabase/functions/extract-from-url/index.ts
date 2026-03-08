import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, errorResponse, jsonResponse, ADDHOOM_SYSTEM_PROMPT,
} from "../_shared/addhoom.ts";

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

    const { url, workspace_id, language = "bn" } = await req.json();
    if (!url || !workspace_id) {
      return errorResponse(400, "URL ও workspace_id দরকার।", "URL and workspace_id required.");
    }

    // Detect URL type
    const isFbAdLibrary = url.includes("facebook.com/ads/library");
    const isDaraz = url.includes("daraz.com.bd");
    const extraction_mode = isFbAdLibrary ? "ad_library" : isDaraz ? "daraz_product" : "generic_product";

    // Fetch URL content
    let cleanedText = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      let html = await pageRes.text();
      html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
      html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
      cleanedText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      cleanedText = cleanedText.substring(0, isFbAdLibrary ? 4000 : 3000);
    } catch (e) {
      console.error("Fetch error:", e);
      return errorResponse(422, "এই লিংক থেকে তথ্য আনা যায়নি। অন্য লিংক চেষ্টা করুন।", "Could not fetch this URL. Try another link.");
    }

    // Build prompt
    let prompt: string;

    if (extraction_mode === "ad_library") {
      prompt = `You are analyzing a Facebook ad from the Meta Ad Library to help a Bangladeshi e-commerce shop owner create inspired ad variations for their own products.

URL: ${url}
Page content extracted: ${cleanedText}

TASK 1 — EXTRACT THE AD DETAILS:
From the content above, identify:
- The brand/advertiser name
- The ad headline (if present)
- The ad body copy text
- The CTA text
- What product or service is being advertised
- The copywriting framework being used (AIDA/PAS/FOMO/social proof/other)
- The emotional angle (urgency/aspiration/fear/humor/trust)
- Key selling points highlighted in the ad

TASK 2 — ANALYZE WHY IT WORKS:
- What makes this ad effective?
- What hook technique is used?
- What psychological triggers are activated?

TASK 3 — ADAPT FOR BANGLADESH MARKET:
Now create 5 ad variations INSPIRED by this ad's strategy and framework — but completely rewritten for a Bangladeshi e-commerce context. Do NOT copy the original ad. Take the concept, the framework, the emotional angle — and rebuild it for BD audiences.

Rules for adaptation:
- If language is '${language}': write all ads in natural, native ${language === "bn" ? "Bangla" : "English"}
- Replace any foreign cultural references with BD-relevant ones
- Adjust pricing psychology for BDT
- Use BD-appropriate CTAs: "এখনই অর্ডার করুন" / "Inbox করুন" / "লিংক থেকে নিন"
- Make it feel like it was written BY a Bangladeshi marketer FOR Bangladeshi buyers
- The user will fill in their own product name — use [PRODUCT] as placeholder

For each variation also provide:
- dhoom_score (0-100): predicted performance in BD Facebook market
- copy_score (0-100): copywriting quality score
- score_reason: one sentence explanation
- framework_used: which framework this variation uses

Return ONLY valid JSON:
{
  "source_ad": {
    "brand": "string",
    "headline": "string or null",
    "body": "string or null",
    "cta": "string or null",
    "product_type": "what is being advertised",
    "framework_detected": "string",
    "emotional_angle": "string",
    "why_it_works": "2-3 sentences"
  },
  "adapted_ads": [
    {
      "headline": "string (use [PRODUCT] placeholder)",
      "body": "string (use [PRODUCT] placeholder)",
      "cta": "string",
      "language": "${language}",
      "framework_used": "string",
      "dhoom_score": 0,
      "copy_score": 0,
      "score_reason": "string",
      "adaptation_note": "one sentence on how this differs from the source"
    }
  ]
}`;
    } else {
      prompt = `Extract product information from this e-commerce page for a Bangladeshi shop owner.

URL: ${url}
Page content: ${cleanedText}

Return ONLY valid JSON:
{
  "source_ad": null,
  "product": {
    "product_name": "extracted product name",
    "description": "2-3 sentence benefit-focused description",
    "price_bdt": 0,
    "key_features": "top 3-5 features comma separated",
    "target_audience": "who would buy this"
  }
}`;
    }

    // Call Gemini
    let aiResponse: string;
    try {
      aiResponse = await callGemini(prompt, ADDHOOM_SYSTEM_PROMPT);
    } catch (e) {
      console.error("Gemini error:", e);
      return jsonResponse(
        language === "bn"
          ? { success: false, code: 503, message: "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।" }
          : { success: false, code: 503, message: "AI is busy right now." },
        503
      );
    }

    // Parse JSON safely
    let parsed: any;
    try {
      // Strip markdown code fences
      const cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        else throw new Error("No JSON found");
      } catch {
        console.error("JSON parse failed:", aiResponse?.substring(0, 500));
        return jsonResponse(
          { success: false, code: 500, message: language === "bn" ? "AI থেকে সঠিক উত্তর পাওয়া যায়নি।" : "Could not parse AI response." },
          500
        );
      }
    }

    // Return based on mode
    if (extraction_mode === "ad_library") {
      return jsonResponse({
        success: true,
        mode: "ad_library",
        source_ad: parsed.source_ad || null,
        adapted_ads: parsed.adapted_ads || [],
        message: language === "bn"
          ? "বিজ্ঞাপনটি বিশ্লেষণ করে বাংলাদেশের জন্য ৫টি ভার্সন তৈরি হয়েছে"
          : "Ad analyzed and 5 adapted versions created for Bangladesh",
      });
    } else {
      return jsonResponse({
        success: true,
        mode: "product",
        product: parsed.product || null,
        message: language === "bn"
          ? "পণ্যের তথ্য সফলভাবে আনা হয়েছে"
          : "Product info extracted successfully",
      });
    }
  } catch (e) {
    console.error("extract-from-url error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
