import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, getSystemPrompt } from "../_shared/gemini.ts";
import { serverError, aiError, unauthorizedError } from "../_shared/errors.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";
import { AD_COPY_SYSTEM_PROMPT, buildCopyBrief, calculateBriefCompleteness } from "../_shared/adCopyPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      const err = unauthorizedError("bn");
      return new Response(JSON.stringify(err), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      const err = unauthorizedError("bn");
      return new Response(JSON.stringify(err), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = await req.json();
    const {
      workspace_id,
      // Basic fields
      product,
      platform,
      language,
      tone,
      variations,
      // Advanced fields (all optional)
      target_reader,
      awareness_stage,
      sophistication,
      one_idea,
      desires,
      notions,
      identification,
      offer,
      one_action,
      // Legacy fields for backward compat
      product_name,
      description,
      price_bdt,
      platforms,
      framework,
      occasion,
      num_variations,
      source_url,
      project_id,
    } = input;

    // Support both new and legacy field names
    const finalProduct = product || (product_name ? `${product_name}${description ? '\n' + description : ''}${price_bdt ? '\nPrice: ৳' + price_bdt : ''}` : '');
    const finalPlatform = platform || (platforms ? platforms[0] : 'facebook');
    const finalLanguage = language || 'en';
    const finalTone = tone || 'friendly';
    const finalVariations = variations || num_variations || 3;

    // Credit check
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'ad_copy', quantity: 1,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 10);
    }

    // Enforce plan limits on variations
    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();
    const maxVariations = (profile?.plan === "agency") ? 50 : 10;
    const requestedVariations = Math.min(finalVariations, maxVariations);

    if (!workspace_id || !finalProduct.trim()) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের তথ্য আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch workspace DNA for context
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .eq("owner_id", user.id)
      .single();

    if (!workspace) {
      return new Response(
        JSON.stringify({ success: false, code: 404, message: "Workspace পাওয়া যায়নি" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the Copy That! brief
    const brief = buildCopyBrief({
      product: finalProduct,
      platform: finalPlatform,
      language: finalLanguage === 'bn' ? 'Bangla' : finalLanguage === 'banglish' ? 'Banglish' : 'English',
      tone: finalTone,
      variations: requestedVariations,
      target_reader,
      awareness_stage,
      sophistication,
      one_idea,
      desires,
      notions,
      identification,
      offer,
      one_action,
    });

    const briefCompleteness = calculateBriefCompleteness({
      target_reader, awareness_stage, sophistication,
      one_idea, desires, notions, identification, offer, one_action,
    });

    // Add workspace context
    const shopContext = `
BRAND CONTEXT (use to inform copy, don't mention directly):
- Shop: ${workspace.shop_name || 'N/A'}
- Industry: ${workspace.industry || 'general'}
- Brand tone: ${workspace.brand_tone || finalTone}
- Target audience: ${workspace.target_audience || 'General'}
- Key products: ${workspace.key_products || 'N/A'}
- USP: ${workspace.unique_selling || 'N/A'}
`;

    const fullPrompt = `${shopContext}\n\n${brief}`;

    // Call Gemini with Copy That! system prompt
    const aiResponse = await callGemini(fullPrompt, AD_COPY_SYSTEM_PROMPT, true);

    if (!aiResponse) {
      const err = aiError(finalLanguage === "en" ? "en" : "bn");
      return new Response(JSON.stringify(err), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse response — expect { "ads": [...] }
    let ads: any[];
    try {
      const parsed = JSON.parse(aiResponse);
      ads = parsed.ads || parsed;
    } catch {
      const match = aiResponse.match(/\{[\s\S]*"ads"[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          ads = parsed.ads || parsed;
        } catch {
          const arrMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            ads = JSON.parse(arrMatch[0]);
          } else {
            const err = serverError("bn");
            return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } else {
        const arrMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          ads = JSON.parse(arrMatch[0]);
        } else {
          const err = serverError("bn");
          return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    if (!Array.isArray(ads)) {
      const err = serverError("bn");
      return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Save to database with new fields
    const creatives = ads.map((ad: any) => ({
      workspace_id,
      product_name: product_name || finalProduct.slice(0, 100),
      headline: ad.headline || "",
      body: ad.body || "",
      cta: ad.cta || "",
      language: ad.language || finalLanguage,
      platform: finalPlatform,
      framework: ad.framework || "Copy That!",
      occasion: occasion || "general",
      tone: ad.tone || finalTone,
      dhoom_score: ad.dhoom_score || 0,
      copy_score: ad.copy_score || 0,
      score_reason: ad.score_reason || "",
      is_winner: false,
      source_url: source_url || null,
      ai_generated: true,
      project_id: project_id || null,
      // New Copy That! fields
      awareness_stage: ad.awareness_stage || awareness_stage || null,
      sophistication_level: ad.sophistication_level || sophistication || null,
      key_desire_hit: ad.key_desire_hit || null,
      target_reader: target_reader || null,
      one_idea: one_idea || null,
      brief_completeness: briefCompleteness,
    }));

    const { data: saved, error: saveError } = await supabase
      .from("ad_creatives")
      .insert(creatives)
      .select();

    if (saveError) console.error("Save error:", saveError);

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      workspace_id,
      feature: "ad_generator",
    });

    // Sort by dhoom_score descending
    const sorted = (saved || creatives).sort(
      (a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)
    );

    return new Response(
      JSON.stringify({
        success: true,
        ads: sorted,
        count: sorted.length,
        message: `${sorted.length}টি বিজ্ঞাপন তৈরি হয়েছে`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ads error:", e);
    const err = serverError("bn");
    return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
