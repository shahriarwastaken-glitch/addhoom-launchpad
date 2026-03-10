import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";
import { getImageMasterPrompt } from "../_shared/imagePrompt.ts";
import { piapiGenerateImage, downloadImage } from "../_shared/piapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  square: "1:1 square format, optimized for Facebook/Instagram feed",
  story: "9:16 vertical format, optimized for Stories and Reels",
  banner: "16:9 horizontal format, optimized for Facebook cover ads",
};

const FORMAT_TO_RATIO: Record<string, string> = {
  square: "1:1",
  story: "9:16",
  banner: "16:9",
};

function computeDhoomScore(
  style: string,
  hasHeadline: boolean,
  hasBrandColors: boolean,
  hasProductRef: boolean
): number {
  let score = 65;
  score += 5;
  if (hasHeadline) score += 8;
  if (hasBrandColors) score += 5;
  if (hasProductRef) score += 10;
  if (style === "lifestyle" || style === "creative") score += 5;
  return Math.min(score, 95);
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("bn")), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify(unauthorizedError("bn")), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = await req.json();
    const {
      workspace_id,
      product_name,
      product_description = "",
      product_image_base64,
      format = "square",
      style = "clean",
      brand_color_primary = "#FF5100",
      brand_color_secondary = "#FFFFFF",
      ad_headline = "",
      ad_body = "",
      language = "bn",
      num_variations = 1,
      creative_id,
      framework = "AIDA",
      occasion = "general",
      tone = "friendly",
      platforms = ["facebook"],
    } = input;

    if (!workspace_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের নাম আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!product_image_base64) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের ছবি আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).eq("owner_id", user.id).single();
    if (!workspace) {
      return new Response(
        JSON.stringify({ success: false, code: 404, message: "Workspace পাওয়া যায়নি" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the master prompt from DB (or fallback to default)
    const masterPrompt = await getImageMasterPrompt();

    // ── Upload source product image to storage to get a URL for PiAPI ──
    const base64Match = product_image_base64.match(/^data:image\/(\w+);base64,(.+)$/);
    const rawBase64 = base64Match ? base64Match[2] : product_image_base64;
    const ext = base64Match ? (base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1]) : 'png';
    const srcBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const srcPath = `${workspace_id}/src_${Date.now()}.${ext}`;
    await supabase.storage.from("ad-images").upload(srcPath, srcBytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true,
    });
    const { data: srcPublicUrl } = supabase.storage.from("ad-images").getPublicUrl(srcPath);
    const sourceImageUrl = srcPublicUrl.publicUrl;

    // ── Sanitize headline text ──
    const sanitizedHeadline = (ad_headline || "")
      .replace(/[₹₨৳]/g, "BDT ")
      .replace(/\bRs\.?\s?/gi, "BDT ")
      .replace(/টাকা\s?/g, "BDT ")
      .replace(/মাত্র|মাএ|মাত্রা|মাত্ৰ|মাত্/g, "Only")
      .replace(/[০-৯]/g, (ch) => String(ch.charCodeAt(0) - 0x09E6))
      .replace(/\s+/g, " ")
      .trim();

    const hasBangla = /[\u0980-\u09FF]/.test(sanitizedHeadline);
    const finalHeadline = hasBangla ? "" : sanitizedHeadline;

    const textInstruction = finalHeadline
      ? `HEADLINE TEXT (ENGLISH ONLY — RENDER EXACTLY AS WRITTEN):
"${finalHeadline}"
- Use bold modern sans-serif English font. High contrast.
- Currency is ALWAYS "BDT" followed by the number (e.g. "BDT 999").
- NEVER render ₹, Rs, ₨, ৳, or any Bengali script in the image.`
      : "NO TEXT OVERLAY — generate a completely text-free image. Leave clean negative space for programmatic text overlay later.";

    const descInstruction = ad_body
      ? `PRODUCT DESCRIPTION: "${ad_body.substring(0, 120)}"`
      : "";

    const hardTextGuardrails = `
═══ MANDATORY TEXT RULES (VIOLATION = FAILURE) ═══
1. ALL visible text in the image MUST be in ENGLISH. Zero Bengali/Bangla script allowed.
2. Currency: Always write "BDT" before price numbers (e.g. "BDT 999", "BDT 1,499").
   BANNED symbols — using ANY of these is an automatic failure: ₹ ₨ Rs INR ৳ টাকা
3. The word "Only" replaces "মাত্র". Never attempt to write মাত্র in the image.
4. If uncertain about rendering ANY text correctly, leave that area blank.
5. Font: Bold modern sans-serif, maximum contrast against background.
`;

    const frameworkVisuals: Record<string, string> = {
      FOMO: "Create URGENCY visually — use bold countdown-style elements, limited-stock badges, or 'Almost Gone' visual cues. High energy, dynamic angles.",
      PAS: "Show the PROBLEM visually (e.g., frustration, mess) then the SOLUTION (the product as hero). Contrast between chaos and clean.",
      AIDA: "Eye-catching hero composition. The product must GRAB attention instantly. Use dramatic lighting and bold framing.",
      social_proof: "Include visual trust signals — star ratings, '1000+ sold' badge style, testimonial-style layout. Clean and trustworthy.",
      before_after: "Split composition or transformation feel — show contrast between 'without' and 'with' the product.",
      offer_first: "Lead with the DEAL visually — price/discount should be the most prominent visual element after the product.",
    };

    const occasionVisuals: Record<string, string> = {
      general: "Standard commercial product photography.",
      eid_fitr: "Eid festive theme — gold accents, crescent moon motifs, green tones, celebratory and gift-giving mood.",
      eid_adha: "Eid ul-Adha theme — rich warm tones, premium feel, family/sharing mood.",
      boishakh: "Pohela Boishakh — red and white theme, alpona patterns, Bengali New Year festive energy.",
      december16: "Victory Day — red and green patriotic colors, national pride elements.",
      valentine: "Romantic mood — soft pinks, reds, hearts, elegant gift presentation.",
      mothers_day: "Warm, emotional, caring mood — soft lighting, gentle colors, gratitude theme.",
      new_year: "Fresh start energy — bright, clean, celebratory.",
      ramadan: "Ramadan theme — serene, spiritual, gold and deep blue/green tones, iftar mood.",
      black_friday: "SALE energy — bold red/black/yellow, explosive burst elements, maximum urgency.",
      product_launch: "Premium launch feel — spotlight lighting, reveal/unveiling composition, tech-forward.",
    };

    const toneVisuals: Record<string, string> = {
      friendly: "Warm, approachable, soft lighting, inviting colors.",
      professional: "Clean, premium, structured composition, neutral-cool palette.",
      aggressive: "Bold, high-contrast, dynamic angles, intense colors, maximum impact.",
    };

    const platformTarget = (Array.isArray(platforms) ? platforms : [platforms]).join(", ");

    const prompt = `${masterPrompt}

═══════════════════════════════════════════════
SPECIFIC GENERATION INSTRUCTIONS
═══════════════════════════════════════════════

Product Name: ${product_name}
${product_description ? `Product Description: ${product_description}` : ""}
Style: ${style.toUpperCase()}
Format: ${FORMAT_INSTRUCTIONS[format] || FORMAT_INSTRUCTIONS.square}
Target Platforms: ${platformTarget}
Brand Colors: Primary ${brand_color_primary}, Secondary ${brand_color_secondary}

FRAMEWORK VISUAL DIRECTION (${framework}):
${frameworkVisuals[framework] || frameworkVisuals.AIDA}

OCCASION/SEASON THEME (${occasion}):
${occasionVisuals[occasion] || occasionVisuals.general}

TONE & MOOD (${tone}):
${toneVisuals[tone] || toneVisuals.friendly}

${textInstruction}
${descInstruction}
${hardTextGuardrails}

The reference image shows the exact product. Maintain absolute fidelity to it.
Generate the advertisement image now.`;

    // --- Generate images via PiAPI Nano Banana Pro ---
    const count = Math.min(num_variations, 3);
    const aspectRatio = FORMAT_TO_RATIO[format] || "1:1";

    const images: Array<{
      id: string;
      image_url: string;
      format: string;
      style: string;
      dhoom_score: number;
      variation_number: number;
      sd_prompt?: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      try {
        const variationHint = count > 1 ? `\n\nThis is variation ${i + 1} of ${count} — create a unique composition different from others.` : "";

        const resultUrl = await piapiGenerateImage({
          prompt: prompt + variationHint,
          sourceImageUrl: sourceImageUrl,
          aspectRatio,
          resolution: "1K",
        });

        // Download from PiAPI and upload to our storage
        const imageBytes = await downloadImage(resultUrl);
        const fileName = `${workspace_id}/${Date.now()}-${i}.png`;
        const { error: uploadError } = await supabase.storage
          .from("ad-images")
          .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
        const imageUrl = publicUrl.publicUrl;

        const dhoomScore = computeDhoomScore(
          style, !!ad_headline,
          !!(brand_color_primary && brand_color_secondary),
          true
        );

        const { data: saved, error: saveErr } = await supabase
          .from("ad_images")
          .insert({
            workspace_id,
            creative_id: creative_id || null,
            product_name, format, style,
            image_url: imageUrl,
            sd_prompt: prompt,
            gemini_prompt: prompt,
            dhoom_score: dhoomScore,
            is_winner: false,
          })
          .select().single();

        if (saveErr) console.error("Save error:", saveErr);

        images.push({
          id: saved?.id || crypto.randomUUID(),
          image_url: imageUrl,
          format, style,
          dhoom_score: dhoomScore,
          variation_number: i + 1,
          sd_prompt: prompt,
        });
      } catch (err) {
        console.error("Image generation error for variation", i + 1, err);
      }
    }

    // Track usage
    await supabase.from("usage_logs").insert({
      user_id: user.id, workspace_id, feature: "image_generator",
    });

    try {
      await supabase.rpc("upsert_api_usage_stats", {
        p_service_name: "piapi",
        p_stat_date: new Date().toISOString().split("T")[0],
        p_calls_made: count,
      });
    } catch (e) {
      console.error("Failed to track API usage:", e);
    }

    return new Response(
      JSON.stringify({
        success: true, images,
        count: images.length,
        message: `${images.length}টি ইমেজ তৈরি হয়েছে`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ad-image error:", e);
    return new Response(JSON.stringify(serverError("bn")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
