import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

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

const FORMAT_ASPECT: Record<string, string> = {
  square: "1:1",
  story: "9:16",
  banner: "16:9",
};

function buildStyleInstructions(
  style: string,
  brandPrimary: string,
  brandSecondary: string
): string {
  const map: Record<string, string> = {
    clean: `Clean white or light background.
Product is the hero, centered and prominent.
Minimal text overlay. Studio lighting feel.
Professional e-commerce product photo aesthetic.`,
    creative: `Bold, eye-catching design.
Colorful background using brand colors: ${brandPrimary} and ${brandSecondary}.
Dynamic composition, modern aesthetic.
The product should be stylized and artistic.`,
    lifestyle: `Product shown in a realistic lifestyle context.
Bangladeshi aesthetic — warm, familiar, relatable setting.
Natural lighting. The product feels like part of real life.
Aspirational but achievable.`,
    sale: `Bold promotional design.
High contrast, attention-grabbing.
Large prominent area for price/offer text overlay.
Urgency and excitement in the visual energy.
Brand colors: ${brandPrimary} dominant.`,
  };
  return map[style] || map.clean;
}

function computeDhoomScore(
  style: string,
  hasHeadline: boolean,
  hasBrandColors: boolean,
  hasProductRef: boolean
): number {
  let score = 65;
  // style completeness
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
    // --- Auth ---
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
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
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

    // --- Parse input ---
    const input = await req.json();
    const {
      workspace_id,
      product_name,
      product_description = "",
      product_image_base64,
      product_image_mime_type = "image/jpeg",
      format = "square",
      style = "clean",
      brand_color_primary = "#FF5100",
      brand_color_secondary = "#FFFFFF",
      ad_headline = "",
      ad_body = "",
      language = "bn",
      num_variations = 1,
      creative_id,
    } = input;

    if (!workspace_id || !product_name) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 400,
          message: "পণ্যের নাম আবশ্যক",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!product_image_base64) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 400,
          message: "পণ্যের ছবি আবশ্যক",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify workspace ownership
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspace_id)
      .eq("owner_id", user.id)
      .single();
    if (!workspace) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 404,
          message: "Workspace পাওয়া যায়নি",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 500,
          message: "Image generation not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- STEP 1: Build prompt ---
    const styleText = buildStyleInstructions(
      style,
      brand_color_primary,
      brand_color_secondary
    );
    const headlineInstruction = ad_headline
      ? `Include this text as an overlay in Bengali: "${ad_headline}"`
      : "No text overlay needed — just the visual.";

    const prompt = `You are creating a professional advertisement image for a Bangladeshi e-commerce product.

This exact product is shown in the reference image.
Maintain the product's appearance, colors, and key features.

Create a ${styleText} advertisement image.

Requirements:
- Format: ${FORMAT_INSTRUCTIONS[format] || FORMAT_INSTRUCTIONS.square}
- Style: ${style}
- Brand colors to use: ${brand_color_primary} (primary), ${brand_color_secondary} (secondary)
- ${headlineInstruction}
- High quality, professional, suitable for Facebook/Instagram ads
- Clean, polished, commercial photography aesthetic
- No watermarks, no logos other than subtle brand color usage
- Product must remain recognizable from the reference image

The result should look like a high-converting Bangladeshi e-commerce advertisement.`;

    // --- STEP 2 & 3: Generate images ---
    const count = Math.min(num_variations, 3);
    const cleanBase64 = product_image_base64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    const images: Array<{
      id: string;
      image_url: string;
      format: string;
      style: string;
      dhoom_score: number;
      variation_number: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      try {
        let generatedBase64: string | null = null;

        // Try Imagen 3 first
        try {
          const imagenResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [
                  {
                    prompt,
                    referenceImages: [
                      {
                        referenceType: "STYLE",
                        referenceId: 1,
                        referenceImage: {
                          bytesBase64Encoded: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: FORMAT_ASPECT[format] || "1:1",
                  safetyFilterLevel: "block_some",
                  personGeneration: "dont_allow",
                },
              }),
            }
          );

          if (imagenResp.ok) {
            const imagenData = await imagenResp.json();
            generatedBase64 =
              imagenData?.predictions?.[0]?.bytesBase64Encoded || null;
          } else {
            const errText = await imagenResp.text();
            console.error(
              `Imagen 3 failed (${imagenResp.status}), falling back:`,
              errText
            );
          }
        } catch (imagenErr) {
          console.error("Imagen 3 error, falling back:", imagenErr);
        }

        // Fallback: Gemini 2.0 Flash experimental image generation
        if (!generatedBase64) {
          console.log(
            "Using Gemini 2.0 Flash fallback for variation",
            i + 1
          );
          const fallbackResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: prompt },
                      {
                        inlineData: {
                          mimeType: product_image_mime_type,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  responseModalities: ["IMAGE", "TEXT"],
                },
              }),
            }
          );

          if (!fallbackResp.ok) {
            const errText = await fallbackResp.text();
            console.error(
              `Gemini fallback failed (${fallbackResp.status}):`,
              errText
            );
            continue;
          }

          const fallbackData = await fallbackResp.json();
          const parts =
            fallbackData?.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              generatedBase64 = part.inlineData.data;
              break;
            }
          }
        }

        if (!generatedBase64) {
          console.error("No image generated for variation", i + 1);
          continue;
        }

        // --- STEP 3: Upload to storage ---
        const fileName = `${workspace_id}/${Date.now()}-${i}.png`;
        const binaryString = atob(generatedBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let b = 0; b < binaryString.length; b++) {
          bytes[b] = binaryString.charCodeAt(b);
        }

        const { error: uploadError } = await supabase.storage
          .from("ad-images")
          .upload(fileName, bytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from("ad-images")
          .getPublicUrl(fileName);
        const imageUrl = publicUrl.publicUrl;

        // --- STEP 4: Dhoom Score ---
        const dhoomScore = computeDhoomScore(
          style,
          !!ad_headline,
          !!(brand_color_primary && brand_color_secondary),
          true // product reference always provided
        );

        // --- STEP 5: Save to ad_images ---
        const { data: saved, error: saveErr } = await supabase
          .from("ad_images")
          .insert({
            workspace_id,
            creative_id: creative_id || null,
            product_name,
            format,
            style,
            image_url: imageUrl,
            sd_prompt: prompt,
            gemini_prompt: prompt,
            dhoom_score: dhoomScore,
            is_winner: false,
          })
          .select()
          .single();

        if (saveErr) console.error("Save error:", saveErr);

        images.push({
          id: saved?.id || crypto.randomUUID(),
          image_url: imageUrl,
          format,
          style,
          dhoom_score: dhoomScore,
          variation_number: i + 1,
        });
      } catch (err) {
        console.error("Image generation error for variation", i + 1, err);
      }
    }

    // --- STEP 6: Track usage ---
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      workspace_id,
      feature: "image_generator",
    });

    // Track API usage stats
    try {
      await supabase.rpc("upsert_api_usage_stats", {
        p_service_name: "gemini",
        p_stat_date: new Date().toISOString().split("T")[0],
        p_calls_made: count,
      });
    } catch (e) {
      console.error("Failed to track API usage:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        images,
        count: images.length,
        message: `${images.length}টি ইমেজ তৈরি হয়েছে`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ad-image error:", e);
    return new Response(JSON.stringify(serverError("bn")), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
