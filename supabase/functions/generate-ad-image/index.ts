import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";
import { getImageMasterPrompt } from "../_shared/imagePrompt.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "Image generation not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the master prompt from DB (or fallback to default)
    const masterPrompt = await getImageMasterPrompt();

    // Build the specific instructions for this generation
    const textInstruction = ad_headline
      ? `HEADLINE TO OVERLAY: "${ad_headline}" — render this text prominently in the image following Section 3 rules.`
      : "NO TEXT OVERLAY REQUESTED — generate a completely text-free image. Leave clean space for programmatic text overlay later.";

    const descInstruction = ad_body
      ? `PRODUCT DESCRIPTION: "${ad_body.substring(0, 120)}"`
      : "";

    const prompt = `${masterPrompt}

═══════════════════════════════════════════════
SPECIFIC GENERATION INSTRUCTIONS
═══════════════════════════════════════════════

Product Name: ${product_name}
${product_description ? `Product Description: ${product_description}` : ""}
Style: ${style.toUpperCase()}
Format: ${FORMAT_INSTRUCTIONS[format] || FORMAT_INSTRUCTIONS.square}
Brand Colors: Primary ${brand_color_primary}, Secondary ${brand_color_secondary}
${textInstruction}
${descInstruction}

The attached reference image shows the exact product. Maintain absolute fidelity to it.
Generate the advertisement image now.`;

    // --- Generate images via Lovable AI Gateway ---
    const count = Math.min(num_variations, 3);
    const imageDataUri = product_image_base64.startsWith("data:")
      ? product_image_base64
      : `data:image/jpeg;base64,${product_image_base64}`;

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
        const variationHint = count > 1 ? `\n\nThis is variation ${i + 1} of ${count} — create a unique composition different from others.` : "";

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt + variationHint },
                  {
                    type: "image_url",
                    image_url: { url: imageDataUri },
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Image gen failed (${response.status}):`, errText);
          continue;
        }

        const result = await response.json();
        const generatedImages = result.choices?.[0]?.message?.images;

        if (!generatedImages || generatedImages.length === 0) {
          console.error("No images returned for variation", i + 1);
          continue;
        }

        const base64Data = generatedImages[0].image_url.url;

        // Upload to Supabase Storage
        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(base64Clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let b = 0; b < binaryString.length; b++) {
          bytes[b] = binaryString.charCodeAt(b);
        }

        const fileName = `${workspace_id}/${Date.now()}-${i}.png`;
        const { error: uploadError } = await supabase.storage
          .from("ad-images")
          .upload(fileName, bytes, { contentType: "image/png", upsert: true });

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
        p_service_name: "gemini",
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
