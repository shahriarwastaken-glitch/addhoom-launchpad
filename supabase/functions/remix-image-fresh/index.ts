import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";
import { piapiGenerateImage, downloadImage } from "../_shared/piapi.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_TEMPLATES: Record<string, string> = {
  studio: "Professional studio product photography. Seamless paper or fabric backdrop. Softbox lighting from upper left, subtle rim light from right. Clean minimal environment. Empty surface beneath product with soft shadow. Ultra premium commercial quality.",
  lifestyle: "Realistic lifestyle environment. Natural light or warm soft artificial lighting. Complementary props enhancing product story. Soft bokeh background, shallow depth of field. Lived-in but carefully styled.",
  flatlay: "Overhead flat lay photography. Textured surface — marble, linen, or wood. Small complementary props at frame edges. Even soft diffused lighting. Clean editorial style.",
  gradient: "Smooth bold color gradient background. Subtle grain texture overlay. Modern editorial advertising aesthetic. Clean — nothing competing with the product.",
  outdoor: "Aspirational outdoor environment. Golden hour or soft overcast daylight. Environmental depth in background. Premium lifestyle photography feel.",
};

const CHANGE_INSTRUCTIONS: Record<string, string> = {
  Lighting: "Use dramatically different lighting direction and quality than the original.",
  "Background Color": "Use a completely different color palette for the background.",
  "Environment Depth": "Create more or less depth in the background environment.",
  "Props/Accessories": "Include different complementary props in the scene.",
  "Camera Angle": "Shoot from a slightly different angle or perspective.",
  "Time of Day": "Use different time-of-day lighting — morning, golden hour, or evening.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { workspace_id, source_image_id, style, change_elements, variations = 3, text_config } = await req.json();

    if (!workspace_id || !source_image_id) {
      return new Response(JSON.stringify({ success: false, message: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: workspace } = await supabase.from("workspaces").select("id, owner_id, brand_colors").eq("id", workspace_id).eq("owner_id", user.id).single();
    if (!workspace) return new Response(JSON.stringify({ success: false, message: "Workspace not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: sourceAd } = await supabase.from("ad_images").select("*").eq("id", source_image_id).eq("workspace_id", workspace_id).single();
    if (!sourceAd) return new Response(JSON.stringify({ success: false, message: "Source image not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const cutoutUrl = sourceAd.cutout_url || sourceAd.image_url;

    const brandColors = Array.isArray(workspace.brand_colors) ? workspace.brand_colors.map((c: any) => c.hex || c).filter(Boolean) : [];
    const styleTemplate = STYLE_TEMPLATES[style] || STYLE_TEMPLATES.studio;
    const changeInstructions = (change_elements || []).map((el: string) => CHANGE_INSTRUCTIONS[el] || "").filter(Boolean).join("\n");

    const count = Math.min(variations, 3);
    const images: any[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const prompt = `Generate a premium advertising image with this product placed naturally in a new scene.

PRODUCT FIDELITY RULES — CRITICAL:
- The product must appear EXACTLY ONCE
- Maintain EXACT same orientation, shape, proportions, and colors
- Do not stylize, distort, or reimagine the product
- Generate only the environment AROUND the product

NO TEXT: Do not add any text, words, letters, numbers, or labels anywhere.

SCENE STYLE:
${styleTemplate}

WHAT TO CHANGE (variation ${i + 1} of ${count}):
${changeInstructions || "Create a meaningfully different composition."}
Make this variation distinctly different from the original.

BRAND COLORS: ${brandColors.length > 0 ? brandColors.join(", ") : "Use complementary colors"}

QUALITY: Editorial luxury brand campaign, 8K, perfect exposure, professional color grading.`;

        const resultUrl = await piapiGenerateImage({
          prompt,
          sourceImageUrl: cutoutUrl,
          aspectRatio: "1:1",
          resolution: "1K",
        });

        const imageBytes = await downloadImage(resultUrl);
        const fileName = `${workspace_id}/${Date.now()}-fresh-${i}.png`;
        const { error: uploadError } = await supabase.storage.from("ad-images").upload(fileName, imageBytes, { contentType: "image/png", upsert: true });
        if (uploadError) { console.error("Upload error:", uploadError); continue; }

        const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
        const dhoomScore = 70 + Math.floor(Math.random() * 20);

        const { data: saved } = await supabase.from("ad_images").insert({
          workspace_id, product_name: sourceAd.product_name, format: sourceAd.format,
          style: style || sourceAd.style, image_url: publicUrl.publicUrl,
          sd_prompt: prompt, gemini_prompt: prompt, dhoom_score: dhoomScore,
          is_winner: false, cutout_url: cutoutUrl,
          remixed_from_id: source_image_id, remix_type: "fresh_scene",
          remix_config: { style, change_elements, variation_index: i },
          text_config: text_config || sourceAd.text_config || {},
        }).select().single();

        images.push({
          id: saved?.id || crypto.randomUUID(),
          image_url: publicUrl.publicUrl, format: sourceAd.format,
          style: style || sourceAd.style, dhoom_score: dhoomScore,
          variation_number: i + 1, text_config: text_config || sourceAd.text_config,
        });
      } catch (err) { console.error("Fresh scene error:", err); }
    }

    await supabase.from("usage_logs").insert({ user_id: user.id, workspace_id, feature: "image_remix" });

    return new Response(JSON.stringify({ success: true, images, count: images.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remix-image-fresh error:", e);
    return new Response(JSON.stringify(serverError("en")), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
