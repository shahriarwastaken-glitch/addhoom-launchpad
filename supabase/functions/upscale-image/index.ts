import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp";

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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    // Build upscale prompt based on mode
    const modePrompts: Record<string, string> = {
      standard: 'Upscale this image to higher resolution. Maintain all details, colors, and composition exactly as they are. Enhance clarity and sharpness. Do not add or remove any elements.',
      sharp_details: 'Upscale this image to higher resolution with emphasis on sharpening edges, text, and fine details. Maintain all colors and composition exactly. Enhance clarity of product details, labels, and textures.',
      smooth_skin: 'Upscale this image to higher resolution. Smooth skin textures naturally while preserving facial features and expressions. Maintain all other details, colors, and composition exactly.',
    };

    const basePrompt = modePrompts[mode] || modePrompts.standard;

    const needsTwoPass = scale > 4;
    
    const firstPassPrompt = `${basePrompt} Target: ${needsTwoPass ? '4x' : `${scale}x`} the original resolution.`;

    const firstPassResult = await callGeminiUpscale(GEMINI_API_KEY, image_base64, firstPassPrompt);
    
    let finalBase64 = firstPassResult;

    if (needsTwoPass) {
      const secondScale = scale === 6 ? '1.5x' : '2x';
      const secondPassPrompt = `${basePrompt} This image has already been upscaled once. Upscale it ${secondScale} more. Maintain absolute fidelity — no artifacts, no hallucinated details.`;
      
      finalBase64 = await callGeminiUpscale(GEMINI_API_KEY, finalBase64, secondPassPrompt);
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

    await supabase.from('ad_images').insert({
      workspace_id,
      image_url: imageUrl,
      style: 'upscaled',
      text_config: {},
      studio_source: 'upscaler',
      studio_config: { scale, mode, two_pass: needsTwoPass },
    });

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
  const geminiRes = await fetch(`${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
        ],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  const geminiData = await geminiRes.json();
  const parts = geminiData.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData);

  if (!imagePart) {
    throw new Error('Upscale pass failed');
  }

  return imagePart.inlineData.data;
}
