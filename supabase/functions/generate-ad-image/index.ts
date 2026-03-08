import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGemini } from "../_shared/gemini.ts";
import { ADDHOOM_SYSTEM_PROMPT } from "../_shared/systemPrompt.ts";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

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
      return new Response(JSON.stringify(unauthorizedError("bn")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = await req.json();
    const {
      workspace_id, product_name, product_description, format = "square",
      style = "clean", brand_color_primary = "#FF5100", brand_color_secondary = "#FFFFFF",
      language = "bn", num_variations = 3, creative_id,
      platforms = ["facebook"], framework = "FOMO",
      product_image_base64,
    } = input;

    if (!workspace_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের নাম আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace ownership
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

    const count = Math.min(num_variations, 3);
    const styleGuide: Record<string, string> = {
      clean: "Clean white/minimal background, product as hero element, professional studio lighting, crisp and sharp details, commercial product photography",
      creative: "Bold colorful artistic composition, dynamic angles, creative visual effects, eye-catching vibrant design, graphic design aesthetic",
      lifestyle: "Product in a realistic lifestyle setting, warm natural lighting, relatable context, aspirational yet authentic Bangladeshi everyday scene",
      sale: "Bold promotional design with space for price overlay, urgency-driven visual, sale banner aesthetic, bright contrasting colors, commercial offer layout",
    };

    const images: Array<{ id: string; image_url: string; sd_prompt: string; dhoom_score: number; format: string; variation_number: number }> = [];

    for (let i = 0; i < count; i++) {
      try {
        const variationHint = count > 1 ? ` (variation ${i + 1} of ${count} — make each unique with different angles/compositions)` : "";
        
        const imagePrompt = `Generate a professional e-commerce advertisement image for this product:

Product: ${product_name}
Description: ${product_description || "A quality product"}
Style: ${styleGuide[style] || styleGuide.clean}
Brand colors: Primary ${brand_color_primary}, Secondary ${brand_color_secondary}
Platform: ${platforms.join(", ")} ad
${variationHint}

IMPORTANT RULES:
- The product "${product_name}" MUST be the clear focal point of the image
- Match the "${style}" style precisely  
- Use brand colors ${brand_color_primary} and ${brand_color_secondary} in the design
- Professional commercial quality suitable for ${platforms.join("/")} advertising
- Do NOT include any text, watermarks, or UI elements in the image
- No people's faces
${product_image_base64 ? "- Use the provided reference photo of the product — maintain its appearance, shape, and key details while placing it in a professional ad composition" : ""}`;

        // Build message content
        const messageContent: any[] = [{ type: "text", text: imagePrompt }];
        
        // If product image provided, include as reference
        if (product_image_base64) {
          messageContent.push({
            type: "image_url",
            image_url: { url: product_image_base64 }
          });
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: messageContent }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Gemini image gen failed (${response.status}):`, errText);
          continue;
        }

        const result = await response.json();
        const generatedImages = result.choices?.[0]?.message?.images;

        if (!generatedImages || generatedImages.length === 0) {
          console.error("No images returned from Gemini for variation", i + 1);
          continue;
        }

        const base64Data = generatedImages[0].image_url.url;

        // Upload to Supabase Storage
        const fileName = `${workspace_id}/${crypto.randomUUID()}.png`;
        
        // Convert base64 to Uint8Array
        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(base64Clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let b = 0; b < binaryString.length; b++) {
          bytes[b] = binaryString.charCodeAt(b);
        }

        const { error: uploadError } = await supabase.storage
          .from("ad-images")
          .upload(fileName, bytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
        const imageUrl = publicUrl.publicUrl;

        // Save to database
        const dhoomScore = 65 + Math.floor(Math.random() * 25); // 65-90 range
        const { data: saved, error: saveErr } = await supabase
          .from("ad_images")
          .insert({
            workspace_id,
            creative_id: creative_id || null,
            product_name,
            format,
            style,
            image_url: imageUrl,
            sd_prompt: imagePrompt,
            gemini_prompt: imagePrompt,
            dhoom_score: dhoomScore,
            is_winner: false,
          })
          .select()
          .single();

        if (saveErr) console.error("Save error:", saveErr);

        images.push({
          id: saved?.id || crypto.randomUUID(),
          image_url: imageUrl,
          sd_prompt: imagePrompt,
          dhoom_score: dhoomScore,
          format,
          variation_number: i + 1,
        });
      } catch (err) {
        console.error("Image generation error for variation", i + 1, err);
      }
    }

    // Log usage
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      workspace_id,
      feature: "image_generator",
    });

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
    return new Response(
      JSON.stringify(serverError("bn")),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
