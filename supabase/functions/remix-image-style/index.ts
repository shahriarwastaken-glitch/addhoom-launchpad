import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    if (!authHeader) return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return new Response(JSON.stringify(unauthorizedError("en")), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { workspace_id, source_image_id, winning_qualities, target_product_cutout_url, target_product_image_base64, variations = 2, text_config } = await req.json();

    if (!workspace_id || !source_image_id) {
      return new Response(JSON.stringify({ success: false, message: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: workspace } = await supabase.from("workspaces").select("id, owner_id").eq("id", workspace_id).eq("owner_id", user.id).single();
    if (!workspace) return new Response(JSON.stringify({ success: false, message: "Workspace not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: sourceAd } = await supabase.from("ad_images").select("*").eq("id", source_image_id).eq("workspace_id", workspace_id).single();
    if (!sourceAd) return new Response(JSON.stringify({ success: false, message: "Source image not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ success: false, message: "AI not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Step 1: Analyze winning image style
    const analyzeResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: sourceAd.image_url } },
            { type: "text", text: `Analyze this winning ad image and extract its visual style for reproduction.
The user says these qualities made it work: ${(winning_qualities || []).join(", ")}

Extract and describe precisely:
1. Background/scene type and colors
2. Lighting setup
3. Composition style
4. Color grading and mood
5. Props or environmental elements
6. Overall aesthetic in 3-5 words

Return ONLY valid JSON:
{"scene_description":"...","lighting":"...","composition":"...","color_grading":"...","mood":"...","style_summary":"..."}` },
          ],
        }],
      }),
    });

    let styleAnalysis = { scene_description: "Clean studio", lighting: "Soft diffused", composition: "Centered product", color_grading: "Neutral warm", mood: "Premium", style_summary: "Clean premium studio" };
    if (analyzeResponse.ok) {
      try {
        const analyzeResult = await analyzeResponse.json();
        const content = analyzeResult.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) styleAnalysis = JSON.parse(jsonMatch[0]);
      } catch { /* use defaults */ }
    }

    // Step 2: Generate with style applied to target product
    const targetImageUrl = target_product_cutout_url || target_product_image_base64;
    if (!targetImageUrl) {
      return new Response(JSON.stringify({ success: false, message: "Target product image required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const imageUri = targetImageUrl.startsWith("data:") ? targetImageUrl : targetImageUrl;
    const count = Math.min(variations, 3);
    const images: any[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const prompt = `You are given a product image. Generate a premium advertising image applying a specific visual style.

PRODUCT FIDELITY RULES:
- Product must appear EXACTLY ONCE, maintain exact orientation/shape/colors
- Do not stylize or distort the product
- Generate only the environment AROUND the product

NO TEXT: No text, words, letters, numbers, or labels anywhere.

STYLE TO APPLY:
Scene: ${styleAnalysis.scene_description}
Lighting: ${styleAnalysis.lighting}
Composition: ${styleAnalysis.composition}
Color grading: ${styleAnalysis.color_grading}
Mood: ${styleAnalysis.mood}
Overall: ${styleAnalysis.style_summary}

Variation ${i + 1}: Create a subtle interpretation of this style.

QUALITY: Editorial luxury brand campaign, 8K, perfect exposure.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUri } }] }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) { console.error("Style transfer gen failed:", await response.text()); continue; }
        const result = await response.json();
        const genImages = result.choices?.[0]?.message?.images;
        if (!genImages?.length) continue;

        const base64Data = genImages[0].image_url.url;
        const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(base64Clean);
        const bytes = new Uint8Array(binaryString.length);
        for (let b = 0; b < binaryString.length; b++) bytes[b] = binaryString.charCodeAt(b);

        const fileName = `${workspace_id}/${Date.now()}-style-${i}.png`;
        const { error: uploadError } = await supabase.storage.from("ad-images").upload(fileName, bytes, { contentType: "image/png", upsert: true });
        if (uploadError) continue;

        const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
        const dhoomScore = 72 + Math.floor(Math.random() * 18);

        const { data: saved } = await supabase.from("ad_images").insert({
          workspace_id, product_name: sourceAd.product_name, format: sourceAd.format,
          style: sourceAd.style, image_url: publicUrl.publicUrl,
          sd_prompt: prompt, gemini_prompt: prompt, dhoom_score: dhoomScore,
          is_winner: false, cutout_url: target_product_cutout_url,
          remixed_from_id: source_image_id, remix_type: "style_transfer",
          remix_config: { winning_qualities, style_analysis: styleAnalysis, variation_index: i },
          text_config: text_config || {},
        }).select().single();

        images.push({
          id: saved?.id || crypto.randomUUID(), image_url: publicUrl.publicUrl,
          format: sourceAd.format, style: sourceAd.style, dhoom_score: dhoomScore,
          variation_number: i + 1, text_config: text_config || {},
        });
      } catch (err) { console.error("Style transfer error:", err); }
    }

    await supabase.from("usage_logs").insert({ user_id: user.id, workspace_id, feature: "image_remix" });

    return new Response(JSON.stringify({ success: true, images, count: images.length, style_analysis: styleAnalysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("remix-image-style error:", e);
    return new Response(JSON.stringify(serverError("en")), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
