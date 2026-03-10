import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Build scene prompt
    const promptBuilder = SCENE_PROMPTS[scene];
    const scenePrompt = typeof promptBuilder === 'function'
      ? promptBuilder(scene_config)
      : (promptBuilder || SCENE_PROMPTS.onWhite);

    const fullPrompt = `You are given a product image. Place this product in a professional scene.

PRODUCT FIDELITY — CRITICAL:
- Product appears EXACTLY ONCE
- Same orientation, shape, colors, proportions
- Do not stylize or alter the product
- Generate only the environment around it

NO TEXT: No words, labels, prices, watermarks.

SCENE:
${scenePrompt}

${transparent_bg ? 'Generate on pure white background only.' : ''}

QUALITY: 8K, perfect exposure, professional color grading, luxury brand campaign quality.`;

    // Call Gemini via Lovable AI Gateway for image generation
    const geminiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: fullPrompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/png;base64,${product_image_base64}` },
              },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    const geminiData = await geminiRes.json();
    const generatedImage = geminiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      throw new Error('Image generation failed');
    }

    // Extract base64 data
    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Store result
    const ext = export_format === 'jpg' ? 'jpg' : 'png';
    const storedPath = `product-photo/${workspace_id}/${Date.now()}.${ext}`;
    await supabase.storage.from('ad-images').upload(storedPath, imageBytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : 'png'}`, upsert: true,
    });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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
