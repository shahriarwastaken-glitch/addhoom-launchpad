import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini, getSystemPrompt } from "../_shared/gemini.ts";
import { serverError, aiError, unauthorizedError } from "../_shared/errors.ts";

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
      workspace_id, product_name, description, price_bdt,
      target_audience, platforms, language, framework,
      occasion, tone, num_variations, source_url, project_id,
    } = input;

    // Enforce plan limits on variations
    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();
    const maxVariations = (profile?.plan === "agency") ? 50 : 10;
    const requestedVariations = Math.min(num_variations || 5, maxVariations);

    if (!workspace_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের নাম আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 1 — Fetch workspace with Shop DNA
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

    // Fetch workspace products for richer context
    const { data: wsProducts } = await supabase
      .from("workspace_products")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .order("display_order")
      .limit(5);

    const shopName = workspace.shop_name || "My Shop";
    const industry = workspace.industry || "other";
    const brandTone = workspace.brand_tone || tone || "friendly";
    const shopTarget = workspace.target_audience || "General Bangladesh audience";
    const keyProducts = workspace.key_products || "N/A";
    const uniqueSelling = workspace.unique_selling || "N/A";
    const priceRange = workspace.price_range || "mid_range";
    const nicheTags = workspace.niche_tags?.join(", ") || "";
    const primaryColor = workspace.brand_colors?.find((c: any) => c.role === "primary")?.hex || "";
    const stylePrefs = workspace.style_preferences || {};

    const adTarget = target_audience || shopTarget;
    const adPlatforms = (platforms || ["facebook"]).join(", ");
    const adLang = language || "bn";
    const adFramework = framework || "AIDA";
    const adOccasion = occasion || "general";
    const adTone = tone || brandTone;
    const adCount = requestedVariations;

    // Framework instructions
    const frameworkInstructions: Record<string, string> = {
      AIDA: "Headline = Attention grabber. Body line 1 = build Interest with a key benefit. Body line 2-3 = create Desire with features, social proof, or scarcity. CTA = Action.",
      PAS: "Headline = name the Problem the customer has. Body = Agitate it — make them feel the pain. Then present the product as the Solution.",
      FOMO: "Lead with what they'll MISS if they don't act. Include scarcity (limited stock or time). Social proof. Urgent CTA.",
      before_after: "Headline = their current painful situation (Before). Body = paint the dream outcome (After). Then bridge: this product is HOW they get there.",
      social_proof: "Lead with a customer result or testimonial angle. Build credibility. Then present the offer.",
      offer_first: "Lead with the deal/price/discount in the headline. Make the offer irresistible upfront. Then explain the product. CTA = grab the deal now.",
    };

    const occasionContext: Record<string, string> = {
      general: "Standard campaign — focus purely on product benefits and conversion.",
      eid_fitr: "Eid ul-Fitr season — the biggest shopping event in Bangladesh. Celebratory, gift-giving, family-centered messaging. 'ঈদ স্পেশাল অফার' hooks perform best. Urgency: stock runs out before Eid.",
      eid_adha: "Eid ul-Adha — sacrifice, sharing, family gatherings. Premium products, meat/kitchen items, and fashion do well. Gift-giving angle.",
      boishakh: "Pohela Boishakh — Bengali New Year. Cultural pride, new beginnings, celebration. Red and white theme.",
      december16: "Victory Day — national pride. Patriotic messaging, red and green colors.",
      valentine: "Valentine's Day — gifts, love, relationships. Romantic but subtle for BD context.",
      mothers_day: "Mother's Day — emotional, gratitude, care. Very high-converting for beauty and fashion.",
      new_year: "New Year — fresh start, resolution, celebration. Great for lifestyle and self-improvement products.",
      ramadan: "Ramadan — spiritual, family iftar, sehri essentials, charity angle. Serene and respectful tone. Evening/night shopping peaks.",
      black_friday: "Black Friday / Sale Season — maximum urgency, deep discounts, doorbuster deals. Aggressive pricing hooks and countdown urgency.",
      product_launch: "Product Launch — excitement, novelty, first-mover advantage. 'নতুন এসেছে' hooks. Build curiosity and exclusivity.",
    };

    const langInstruction = adLang === "bn"
      ? "Pure Bangla — write natively, do NOT translate from English"
      : adLang === "en"
        ? "English"
        : "Generate half in Bangla, half in English — label each";

    // STEP 2 — Build prompt
    // Build product catalog context
    const productCatalog = (wsProducts || []).length > 0
      ? `\nPRODUCT CATALOG (${wsProducts!.length} active products):\n${wsProducts!.map((p: any) =>
          `- ${p.name}: ${p.description?.slice(0, 80) || "N/A"} | Price: ৳${p.price_bdt || "N/A"}${p.original_price_bdt ? ` (was ৳${p.original_price_bdt})` : ""}`
        ).join("\n")}`
      : "";

    const styleContext = stylePrefs.dominant_style
      ? `\nSTYLE PREFERENCES:\n- Dominant style: ${stylePrefs.dominant_style}\n- Preferred: ${stylePrefs.liked?.join(", ") || "N/A"}\n- Avoid: ${stylePrefs.disliked?.join(", ") || "N/A"}`
      : "";

    const prompt = `Generate ${adCount} high-converting ad variations for a Bangladeshi e-commerce shop.

BRAND DNA:
- Shop name: ${shopName}
- Industry: ${industry}
- Niches: ${nicheTags || industry}
- Brand tone: ${brandTone}
- Shop's target audience: ${shopTarget}
- Key products: ${keyProducts}
- What makes them unique: ${uniqueSelling}
- Price range positioning: ${priceRange}
- Primary brand color: ${primaryColor || "not specified"}
${productCatalog}${styleContext}

PRODUCT TO ADVERTISE:
- Product name: ${product_name}
- Description: ${description || "N/A"}
- Price: ৳${price_bdt || "N/A"}
- Target audience for THIS ad: ${adTarget}

AD SPECIFICATIONS:
- Platforms: ${adPlatforms}
- Language: ${langInstruction}
- Copywriting framework: ${adFramework}
- Occasion/season: ${adOccasion}
- Tone: ${adTone}

FRAMEWORK INSTRUCTIONS FOR ${adFramework}:
${frameworkInstructions[adFramework] || frameworkInstructions.AIDA}

OCCASION CONTEXT FOR ${adOccasion}:
${occasionContext[adOccasion] || occasionContext.general}

FOR EACH VARIATION, also calculate and return:
1. dhoom_score (0-100): Your honest prediction of how well this ad will perform in the Bangladesh Facebook/Instagram market. Consider: hook strength, Bangla authenticity, platform fit, framework execution, scarcity/urgency presence, CTA clarity. Be realistic — not everything scores 80+.
2. copy_score (0-100): Quality of the copywriting itself. Consider: headline power, emotional pull, readability, grammar, framework adherence.
3. score_reason: One sentence in ${adLang === "en" ? "English" : "Bangla"} explaining the combined score. Be specific — mention what makes it strong OR what its weakness is.
4. platform_tag: Which of the requested platforms this variation is best suited for.

RETURN FORMAT:
Return ONLY a valid JSON array. No explanation. No markdown. No text before or after the array. Just the raw JSON.

[
  {
    "headline": "string",
    "body": "string",
    "cta": "string",
    "language": "bn or en",
    "platform_tag": "facebook | instagram | google",
    "framework_used": "${adFramework}",
    "dhoom_score": number,
    "copy_score": number,
    "score_reason": "string"
  }
]`;

    // STEP 3 — Call Gemini with dynamic system prompt (DB override or default)
    const activeSystemPrompt = await getSystemPrompt();
    const aiResponse = await callGemini(prompt, activeSystemPrompt, true);

    if (!aiResponse) {
      const err = aiError(adLang === "en" ? "en" : "bn");
      return new Response(JSON.stringify(err), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STEP 4 — Parse response
    let ads: any[];
    try {
      ads = JSON.parse(aiResponse);
    } catch {
      const match = aiResponse.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          ads = JSON.parse(match[0]);
        } catch {
          const err = serverError("bn");
          return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        const err = serverError("bn");
        return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (!Array.isArray(ads)) {
      const err = serverError("bn");
      return new Response(JSON.stringify(err), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // STEP 5 — Save to database
    const creatives = ads.map((ad: any) => ({
      workspace_id,
      product_name,
      headline: ad.headline || "",
      body: ad.body || "",
      cta: ad.cta || "",
      language: ad.language || adLang,
      platform: ad.platform_tag || "facebook",
      framework: ad.framework_used || adFramework,
      occasion: adOccasion,
      tone: adTone,
      dhoom_score: ad.dhoom_score || 0,
      copy_score: ad.copy_score || 0,
      score_reason: ad.score_reason || "",
      is_winner: false,
      source_url: source_url || null,
      ai_generated: true,
      project_id: project_id || null,
    }));

    const { data: saved, error: saveError } = await supabase
      .from("ad_creatives")
      .insert(creatives)
      .select();

    if (saveError) console.error("Save error:", saveError);

    // STEP 6 — Log usage
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      workspace_id,
      feature: "ad_generator",
    });

    // Sort by dhoom_score descending
    const sorted = (saved || creatives).sort(
      (a: any, b: any) => (b.dhoom_score || 0) - (a.dhoom_score || 0)
    );

    // STEP 7 — Return
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
