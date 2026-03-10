import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      image_base64,
      scale = 4,
      mode = 'standard',
      export_format = 'png',
      jpg_quality = 90,
    } = await req.json();

    if (!workspace_id || !image_base64) {
      throw new Error('Missing required fields');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Build upscale prompt based on mode
    const modePrompts: Record<string, string> = {
      standard: 'Upscale this image to higher resolution. Maintain all details, colors, and composition exactly as they are. Enhance clarity and sharpness. Do not add or remove any elements.',
      sharp_details: 'Upscale this image to higher resolution with emphasis on sharpening edges, text, and fine details. Maintain all colors and composition exactly. Enhance clarity of product details, labels, and textures.',
      smooth_skin: 'Upscale this image to higher resolution. Smooth skin textures naturally while preserving facial features and expressions. Maintain all other details, colors, and composition exactly.',
    };

    const basePrompt = modePrompts[mode] || modePrompts.standard;

    // IMPROVEMENT 4: Handle 6x and 8x with two-pass approach
    // For scales > 4, we do two passes through Gemini
    const needsTwoPass = scale > 4;
    
    // First pass: always upscale at base quality
    const firstPassPrompt = `${basePrompt} Target: ${needsTwoPass ? '4x' : `${scale}x`} the original resolution.`;

    const firstPassResult = await callGeminiUpscale(LOVABLE_API_KEY, image_base64, firstPassPrompt);
    
    let finalBase64 = firstPassResult;

    // Second pass for 6x and 8x
    if (needsTwoPass) {
      const secondScale = scale === 6 ? '1.5x' : '2x';
      const secondPassPrompt = `${basePrompt} This image has already been upscaled once. Upscale it ${secondScale} more. Maintain absolute fidelity — no artifacts, no hallucinated details.`;
      
      finalBase64 = await callGeminiUpscale(LOVABLE_API_KEY, firstPassResult, secondPassPrompt);
    }

    // Store result
    const imageBytes = Uint8Array.from(atob(finalBase64), c => c.charCodeAt(0));
    const ext = export_format === 'jpg' ? 'jpg' : 'png';
    const storedPath = `upscaled/${workspace_id}/${Date.now()}.${ext}`;
    await supabase.storage.from('ad-images').upload(storedPath, imageBytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : 'png'}`, upsert: true,
    });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${storedPath}`;

    // Save to ad_images
    await supabase.from('ad_images').insert({
      workspace_id,
      image_url: imageUrl,
      style: 'upscaled',
      text_config: {},
      studio_source: 'upscaler',
      studio_config: { scale, mode, two_pass: needsTwoPass },
    });

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'upscaler',
      tokens_used: needsTwoPass ? 2 : 1,
    });

    return new Response(JSON.stringify({
      image_url: imageUrl,
      upscaled_scale: `${scale}x`,
      two_pass: needsTwoPass,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callGeminiUpscale(apiKey: string, imageBase64: string, prompt: string): Promise<string> {
  const geminiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${imageBase64}` },
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
    throw new Error('Upscale pass failed');
  }

  return generatedImage.replace(/^data:image\/\w+;base64,/, '');
}
