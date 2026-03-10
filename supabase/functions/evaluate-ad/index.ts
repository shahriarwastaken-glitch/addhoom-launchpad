import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, ADDHOOM_SYSTEM_PROMPT, corsHeaders, errorResponse, jsonResponse, logUsage } from "../_shared/addhoom.ts";
import { aiError, unauthorizedError } from "../_shared/errors.ts";
import { DHOOM_SCORE_SYSTEM_PROMPT } from "../_shared/adCopyPrompt.ts";

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

    const prompt = `You are evaluating a ${platform || "facebook"} ad using the Copy That! Megacourse framework.
Provide an honest, detailed, expert evaluation.

AD TO EVALUATE:
Platform: ${platform || "facebook"}
Language: ${language || "bn"}
Headline: ${headline || "(none)"}
Body: ${body || "(none)"}
CTA: ${cta || "(none)"}

EVALUATE ON THESE DIMENSIONS (score each 0-100):

1. HOOK STRENGTH (25%): Does the hook stop a distracted scroller? Does it create an open loop? Is it genuinely "new"? Does it answer "why should I care, right now, for me?" Are generic banned hooks avoided?

2. EMOTIONAL RESONANCE (20%): Does the copy appeal to real desires — not just product features? Does the reader feel understood? Is there a moment where they think "this person gets me"? Does it enter the conversation already in the reader's head?

3. OBJECTION HANDLING (20%): Are major objections acknowledged and addressed with OCPB? Is proof specific enough to be credible? Vague assertions = low score. Named sources, real numbers = high score.

4. OFFER CLARITY (15%): Is the offer clearly and compellingly laid out? Is the CTA singular and direct? Is there a reason to act NOW? Does it close on a forward-looking benefit?

5. AWARENESS FIT (10%): Is the copy calibrated to the right awareness stage? Does the hook match what a reader at that stage needs to see?

6. LANGUAGE EXECUTION (10%): Is copy tight? No filler words? Is "you" used constantly? Are claims backed with "because"? Is it specific or vague? Does it sound like a real person or like marketing?

CALCULATE:
- dhoom_score: weighted average using the weights above
- copy_score: same as dhoom_score for this evaluation

Score tiers:
0-39: Skip (grey)
40-59: Test It (yellow)
60-79: Launch (green)
80-100: ধুম! (orange)

Calibration:
Exceptional Copy That! compliant ad: 82-90
Solid ad with good bones: 68-75
Generic competent ad: 50-60
Filler-heavy, vague: below 45

Return ONLY valid JSON:
{
  "dhoom_score": number,
  "copy_score": number,
  "grade": "one of: S (90-100) | A (80-89) | B (70-79) | C (60-69) | D (50-59) | F (below 50)",
  "scores": {
    "hook_strength": number,
    "emotional_resonance": number,
    "objection_handling": number,
    "offer_clarity": number,
    "awareness_fit": number,
    "language_execution": number
  },
  "identified_framework": "PAS | AIDA | FOMO | Story | Direct | OCPB | unclear",
  "what_works": ["array of 2-3 specific things that are strong"],
  "what_to_improve": ["array of 2-3 specific, actionable improvements"],
  "improved_headline": "a better version of the headline",
  "improved_cta": "a better version of the CTA"
}`;

    const rawResult = await callGemini(prompt, DHOOM_SCORE_SYSTEM_PROMPT);
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
