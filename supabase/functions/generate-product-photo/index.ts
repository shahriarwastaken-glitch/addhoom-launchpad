import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { piapiGenerateImage, downloadImage } from "../_shared/piapi.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_FIDELITY_BLOCK = `
PRODUCT FIDELITY — ABSOLUTE RULES:
- The product appears EXACTLY ONCE
- Same orientation, shape, proportions, colors, and surface texture as the reference
- Realistic shadows that match scene lighting
- Do not duplicate, stylize, distort, or reimagine the product
- Do not add text, words, prices, watermarks, or labels anywhere
- Full product must be visible — do not crop at frame edge
`;

const SCENE_PROMPTS: Record<string, string | ((c: any) => string)> = {
  onWhite: `Pure white seamless background. Product centered, perfectly lit from above with soft fill light. Subtle soft drop shadow beneath product. Clean, clinical, marketplace-ready. No props, no environment, just the product.`,
  studio: (config: any) => `Professional studio photography. ${config.backdrop || 'White'} seamless backdrop. Softbox lighting from ${config.lightingDirection || 'left'}, subtle rim light opposite side. Clean empty surface with soft realistic shadow. Ultra premium commercial photography.`,
  lifestyle: (config: any) => `Realistic lifestyle environment. ${config.surface || 'Marble'} surface. ${config.mood || 'Warm'} lighting mood. Complementary props that enhance the product without competing with it. Shallow depth of field, soft bokeh background. Warm, editorial lifestyle photography.`,
  flatlay: (config: any) => `Overhead flat lay photography. ${config.surface || 'Marble'} textured surface. ${config.propsDensity === 'minimal' ? 'Minimal clean styling, almost no props.' : config.propsDensity === 'rich' ? 'Richly styled with complementary props and textures.' : 'A few carefully chosen complementary props.'} Even diffused lighting, no harsh shadows. Clean editorial beauty photography.`,
  outdoor: (config: any) => `${config.environment || 'Garden'} outdoor environment. ${config.timeOfDay === 'golden' ? 'Warm golden hour light, long soft shadows.' : config.timeOfDay === 'morning' ? 'Fresh morning light, soft and directional.' : 'Soft overcast daylight, even diffused lighting.'} Aspirational lifestyle photography. Natural environment depth in background.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const {
      workspace_id,
      product_image_base64,
      scene,
      scene_config = {},
      format = '1:1',
      export_format = 'png',
      transparent_bg = false,
    } = await req.json();

    if (!workspace_id || !product_image_base64 || !scene) {
      throw new Error('Missing required fields');
    }

    // Credit check
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'image_generation', quantity: 1,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 125);
    }

    // Upload source image to storage to get URL for PiAPI
    const srcBytes = Uint8Array.from(atob(product_image_base64), c => c.charCodeAt(0));
    const srcPath = `product-photo/${workspace_id}/src_${Date.now()}.png`;
    await supabase.storage.from('ad-images').upload(srcPath, srcBytes, {
      contentType: 'image/png', upsert: true,
    });
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const sourceUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${srcPath}`;

    // Build scene prompt
    const promptBuilder = SCENE_PROMPTS[scene];
    const scenePrompt = typeof promptBuilder === 'function'
      ? promptBuilder(scene_config)
      : (promptBuilder || SCENE_PROMPTS.onWhite);

    const fullPrompt = `Place this product in a professional scene.

${PRODUCT_FIDELITY_BLOCK}

NO TEXT: No words, labels, prices, watermarks.

SCENE:
${scenePrompt}

${transparent_bg ? 'Generate on pure white background only.' : ''}

QUALITY: 8K, perfect exposure, professional color grading, luxury brand campaign quality.`;

    // Generate via PiAPI Nano Banana Pro
    const resultUrl = await piapiGenerateImage({
      prompt: fullPrompt,
      sourceImageUrl: sourceUrl,
      aspectRatio: format,
      resolution: '2K',
    });

    // Download and store result
    const imageBytes = await downloadImage(resultUrl);
    const ext = export_format === 'jpg' ? 'jpg' : 'png';
    const storedPath = `product-photo/${workspace_id}/${Date.now()}.${ext}`;
    await supabase.storage.from('ad-images').upload(storedPath, imageBytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : 'png'}`, upsert: true,
    });

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${storedPath}`;

    // Save to ad_images
    await supabase.from('ad_images').insert({
      workspace_id,
      image_url: imageUrl,
      style: scene,
      text_config: {},
      studio_source: 'product_photo',
      studio_config: { scene, scene_config, format },
    });

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'product_photo',
      tokens_used: 1,
    });

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
