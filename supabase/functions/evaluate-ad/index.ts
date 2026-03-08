import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, ADDHOOM_SYSTEM_PROMPT, corsHeaders, errorResponse, jsonResponse, logUsage } from "../_shared/addhoom.ts";
import { aiError, unauthorizedError } from "../_shared/errors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "অনুমতি নেই।", "Unauthorized.");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return errorResponse(401, "অনুমতি নেই।", "Unauthorized.");

    const { headline, body, cta, platform, language, workspace_id } = await req.json();

    if (!headline && !body) {
      return errorResponse(400, "হেডলাইন বা বডি দিন।", "Provide headline or body.");
    }

    const prompt = `You are evaluating a ${platform || "facebook"} ad for the Bangladesh e-commerce market.
Provide an honest, detailed, expert evaluation.

AD TO EVALUATE:
Platform: ${platform || "facebook"}
Language: ${language || "bn"}
Headline: ${headline || "(none)"}
Body: ${body || "(none)"}
CTA: ${cta || "(none)"}

EVALUATE ON THESE DIMENSIONS (score each 0-100):

1. HOOK STRENGTH (0-100): Does the headline stop someone mid-scroll? Is it specific? Does it create curiosity or urgency?

2. BENGALI AUTHENTICITY (0-100, only if language is bn): Does it sound like natural spoken Bangla? Or does it feel translated? Is "আপনি" used correctly? Are BD-specific phrases used?

3. FRAMEWORK EXECUTION (0-100): Identify which framework (AIDA/PAS/FOMO/other) this follows and how well it executes that framework.

4. CTA STRENGTH (0-100): Is the CTA clear and specific? Does it create urgency? Is it appropriate for BD market (Inbox করুন, এখনই অর্ডার করুন, etc.)?

5. MOBILE READABILITY (0-100): Will this read well on a small phone screen? Is the first line compelling enough? Is it too long?

6. BD MARKET FIT (0-100): Overall fit for Bangladeshi buyers. Does it match BD pricing psychology, cultural context, and buying behavior?

CALCULATE:
- dhoom_score: weighted average (hook 25% + framework 20% + cta 20% + bd_fit 20% + mobile 15%)
- copy_score: weighted average (hook 30% + bengali_auth 25% + framework 25% + cta 20%) — skip bengali_auth if English ad, reweight

Return ONLY valid JSON:
{
  "dhoom_score": number,
  "copy_score": number,
  "grade": "one of: S (90-100) | A (80-89) | B (70-79) | C (60-69) | D (50-59) | F (below 50)",
  "scores": {
    "hook_strength": number,
    "bengali_authenticity": number,
    "framework_execution": number,
    "cta_strength": number,
    "mobile_readability": number,
    "bd_market_fit": number
  },
  "identified_framework": "AIDA | PAS | FOMO | before_after | social_proof | unclear",
  "what_works": ["array of 2-3 specific things that are strong"],
  "what_to_improve": ["array of 2-3 specific, actionable improvements"],
  "improved_headline": "a better version of the headline",
  "improved_cta": "a better version of the CTA"
}`;

    const rawResult = await callGemini(prompt, ADDHOOM_SYSTEM_PROMPT);
    if (!rawResult) {
      const err = aiError(language || "bn");
      return errorResponse(err.code, err.message, err.message);
    }

    // Parse JSON
    let cleaned = rawResult.replace(/```json/g, "").replace(/```/g, "").trim();
    let evaluation;
    try {
      evaluation = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        evaluation = JSON.parse(match[0]);
      } else {
        const err = aiError(language || "bn");
        return errorResponse(err.code, err.message, err.message);
      }
    }

    // Log usage
    if (workspace_id) {
      await logUsage(supabaseClient, user.id, workspace_id, "evaluate_ad");
    }

    return jsonResponse({
      success: true,
      evaluation,
      message: language === "en" ? "Ad evaluated successfully" : "বিজ্ঞাপনটি মূল্যায়ন করা হয়েছে"
    });

  } catch (error) {
    console.error("evaluate-ad error:", error);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
