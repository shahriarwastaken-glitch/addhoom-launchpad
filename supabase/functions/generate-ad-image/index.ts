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
      ad_headline, ad_body, language = "bn", num_variations = 3, creative_id,
      platforms = ["facebook"], framework = "FOMO",
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

    const formatToAspectRatio: Record<string, string> = {
      square: "1:1",
      story: "9:16",
      banner: "16:9",
    };

    const aspectRatio = formatToAspectRatio[format] || "1:1";
    const dims = { square: { w: 1024, h: 1024 }, story: { w: 768, h: 1360 }, banner: { w: 1360, h: 768 } }[format] || { w: 1024, h: 1024 };
    const count = Math.min(num_variations, 3);

    // STEP 1 — Use Gemini to generate image prompts
    const promptRequest = `Create ${count} detailed image generation prompts for a Bangladeshi e-commerce product advertisement.

Product: ${product_name}
Description: ${product_description || "N/A"}
Style: ${style}
Format: ${format} (${dims.w}x${dims.h})
Brand colors: Primary ${brand_color_primary}, Secondary ${brand_color_secondary}
${ad_headline ? `Ad headline to incorporate: ${ad_headline}` : ""}
${ad_body ? `Ad body context: ${ad_body}` : ""}
Platforms: ${platforms.join(", ")}

Style guidelines:
- clean: White/minimal background, product as hero, studio lighting, professional
- creative: Colorful, artistic treatment, eye-catching design
- lifestyle: Product in real-life Bangladeshi context, relatable setting
- sale: Bold price overlay area, urgency design, promotional feel

Requirements per prompt:
- Professional product photography style
- Clean, high-quality, commercial look
- Colors should match brand colors
- ${format} aspect ratio composition
- No people's faces
- Suitable for ${platforms.join(", ")} advertising

Also rate each prompt's predicted ad performance (dhoom_score 0-100).

Return ONLY a valid JSON array:
[{ "prompt": "detailed prompt string", "dhoom_score": number }]`;

    const aiResponse = await callGemini(promptRequest, ADDHOOM_SYSTEM_PROMPT, true);

    if (!aiResponse) {
      return new Response(
        JSON.stringify({ success: false, code: 503, message: "AI সমস্যা। আবার চেষ্টা করুন।" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let prompts: Array<{ prompt: string; dhoom_score: number }>;
    try {
      prompts = JSON.parse(aiResponse);
    } catch {
      const match = aiResponse.match(/\[[\s\S]*\]/);
      if (match) {
        prompts = JSON.parse(match[0]);
      } else {
        return new Response(
          JSON.stringify(serverError("bn")),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return new Response(
        JSON.stringify(serverError("bn")),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 2 — Generate images using Replicate (google/imagen-4)
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "Image generation not configured (Replicate)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const images: Array<{ id: string; image_url: string; sd_prompt: string; dhoom_score: number; format: string; variation_number: number }> = [];

    for (let i = 0; i < prompts.length; i++) {
      const p = prompts[i];
      try {
        // Create prediction
        const createRes = await fetch("https://api.replicate.com/v1/models/google/imagen-4/predictions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_KEY}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({
            input: {
              prompt: p.prompt,
              aspect_ratio: aspectRatio,
              safety_filter_level: "block_medium_and_above",
              output_format: "png",
            },
          }),
        });

        if (!createRes.ok) {
          console.error("Replicate create failed:", createRes.status, await createRes.text());
          continue;
        }

        let prediction = await createRes.json();

        // If not completed yet, poll
        if (prediction.status !== "succeeded" && prediction.status !== "failed") {
          const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(r => setTimeout(r, 2000));
            const pollRes = await fetch(pollUrl, {
              headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
            });
            prediction = await pollRes.json();
            if (prediction.status === "succeeded" || prediction.status === "failed") break;
          }
        }

        if (prediction.status !== "succeeded" || !prediction.output) {
          console.error("Replicate prediction failed for prompt", i, prediction.error);
          continue;
        }

        // Imagen-4 returns a single URL string as output
        const imageUrl = typeof prediction.output === "string" ? prediction.output : prediction.output?.[0];

        // Save to database
        const { data: saved, error: saveErr } = await supabase
          .from("ad_images")
          .insert({
            workspace_id,
            creative_id: creative_id || null,
            product_name,
            format,
            style,
            image_url: imageUrl,
            sd_prompt: p.prompt,
            gemini_prompt: promptRequest,
            dhoom_score: p.dhoom_score || 70,
            is_winner: false,
          })
          .select()
          .single();

        if (saveErr) console.error("Save error:", saveErr);

        images.push({
          id: saved?.id || crypto.randomUUID(),
          image_url: imageUrl,
          sd_prompt: p.prompt,
          dhoom_score: p.dhoom_score || 70,
          format,
          variation_number: i + 1,
        });
      } catch (err) {
        console.error("Image generation error for prompt", i, err);
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
