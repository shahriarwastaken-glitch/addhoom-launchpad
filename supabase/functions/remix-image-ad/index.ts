import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COMPOSITION_HINTS = [
  "Use a dramatically different camera angle — try bird's eye view or low-angle hero shot.",
  "Shift the product to the left third with negative space on the right for text overlay.",
  "Create a split-composition: product on one half, lifestyle context on the other.",
  "Use a close-up macro perspective focusing on product texture and detail.",
  "Place the product centered with radiating design elements creating visual energy.",
  "Try an asymmetric layout with the product at bottom-right and bold graphics top-left.",
  "Use a minimalist floating composition with dramatic shadow beneath the product.",
  "Create depth with foreground blur elements framing the product in sharp focus.",
];

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

    const { workspace_id, ad_image_id } = await req.json();

    if (!workspace_id || !ad_image_id) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify workspace ownership
    const { data: workspace } = await supabase
      .from("workspaces").select("id, owner_id").eq("id", workspace_id).eq("owner_id", user.id).single();
    if (!workspace) {
      return new Response(
        JSON.stringify({ success: false, code: 403, message: "Workspace not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the original ad image to get its prompt and settings
    const { data: originalAd, error: fetchErr } = await supabase
      .from("ad_images")
      .select("*")
      .eq("id", ad_image_id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchErr || !originalAd) {
      return new Response(
        JSON.stringify({ success: false, code: 404, message: "Original ad image not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const originalPrompt = originalAd.gemini_prompt || originalAd.sd_prompt;
    if (!originalPrompt) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "Original ad has no stored prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // We also need the original product image. Download from storage URL.
    const originalImageUrl = originalAd.image_url;

    // Pick a random composition hint different from generic
    const hint = COMPOSITION_HINTS[Math.floor(Math.random() * COMPOSITION_HINTS.length)];

    const remixPrompt = `${originalPrompt}

REMIX INSTRUCTION: Create a completely NEW composition variation of this advertisement.
${hint}
Keep the same product, brand colors, and overall message but make the visual layout distinctly different from the original.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "AI key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the original generated image as reference for the remix
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
              { type: "text", text: remixPrompt },
              {
                type: "image_url",
                image_url: { url: originalImageUrl },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Remix image gen failed (${response.status}):`, errText);
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "Image generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const generatedImages = result.choices?.[0]?.message?.images;

    if (!generatedImages || generatedImages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "No image generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const base64Data = generatedImages[0].image_url.url;
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let b = 0; b < binaryString.length; b++) {
      bytes[b] = binaryString.charCodeAt(b);
    }

    const fileName = `${workspace_id}/${Date.now()}-remix.png`;
    const { error: uploadError } = await supabase.storage
      .from("ad-images")
      .upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, code: 500, message: "Image upload failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
    const imageUrl = publicUrl.publicUrl;

    const dhoomScore = computeDhoomScore(
      originalAd.style, true, true, true
    );

    const { data: saved, error: saveErr } = await supabase
      .from("ad_images")
      .insert({
        workspace_id,
        product_name: originalAd.product_name,
        format: originalAd.format,
        style: originalAd.style,
        image_url: imageUrl,
        sd_prompt: remixPrompt,
        gemini_prompt: remixPrompt,
        dhoom_score: dhoomScore,
        is_winner: false,
      })
      .select().single();

    if (saveErr) console.error("Save error:", saveErr);

    // Track usage
    await supabase.from("usage_logs").insert({
      user_id: user.id, workspace_id, feature: "image_remix",
    });

    return new Response(
      JSON.stringify({
        success: true,
        images: [{
          id: saved?.id || crypto.randomUUID(),
          image_url: imageUrl,
          format: originalAd.format,
          style: originalAd.style,
          dhoom_score: dhoomScore,
          variation_number: 1,
          sd_prompt: remixPrompt,
        }],
        count: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("remix-image-ad error:", e);
    return new Response(JSON.stringify(serverError("bn")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
