import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BACKOFF = [2000, 3000, 5000, 8000, 12000, 18000, 25000];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    } = await req.json();

    if (!workspace_id || !image_base64) {
      throw new Error('Missing required fields');
    }

    const PIAPI_KEY = Deno.env.get('PIAPI_KEY');
    if (!PIAPI_KEY) throw new Error('PIAPI_KEY not configured');

    // Upload source image to storage to get URL for PiAPI
    let rawBase64 = image_base64;
    if (image_base64.startsWith("data:")) {
      const match = image_base64.match(/^data:image\/\w+;base64,(.+)$/);
      if (match) rawBase64 = match[1];
    }
    const srcBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const srcPath = `upscaled/${workspace_id}/src_${Date.now()}.png`;
    await supabase.storage.from('ad-images').upload(srcPath, srcBytes, {
      contentType: 'image/png', upsert: true,
    });
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const sourceImageUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${srcPath}`;

    // PiAPI max scale is 4, so for higher we do two passes
    const effectiveScale = Math.min(scale, 4);
    const needsTwoPass = scale > 4;

    // Call PiAPI upscale
    const resultUrl = await callPiapiUpscale(PIAPI_KEY, sourceImageUrl, effectiveScale);

    let finalUrl = resultUrl;
    if (needsTwoPass) {
      const secondScale = scale === 6 ? 2 : 2;
      finalUrl = await callPiapiUpscale(PIAPI_KEY, resultUrl, secondScale);
    }

    // Download and store result
    const imgRes = await fetch(finalUrl);
    if (!imgRes.ok) throw new Error('Failed to download upscaled image');
    const imageBytes = new Uint8Array(await imgRes.arrayBuffer());

    const ext = export_format === 'jpg' ? 'jpg' : 'png';
    const storedPath = `upscaled/${workspace_id}/${Date.now()}.${ext}`;
    await supabase.storage.from('ad-images').upload(storedPath, imageBytes, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : 'png'}`, upsert: true,
    });

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

async function callPiapiUpscale(apiKey: string, imageUrl: string, scale: number): Promise<string> {
  const createRes = await fetch('https://api.piapi.ai/api/v1/task', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'Qubico/image-toolkit',
      task_type: 'upscale',
      input: {
        image: imageUrl,
        scale,
        face_enhance: true,
      },
      config: { webhook_config: { endpoint: '', secret: '' } },
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(`PiAPI upscale start failed [${createRes.status}]: ${errBody}`);
  }

  const createData = await createRes.json();
  const taskId = createData?.data?.task_id;
  if (!taskId) throw new Error(`No task_id returned: ${JSON.stringify(createData)}`);

  console.log('PiAPI upscale task started:', taskId);

  for (const delay of BACKOFF) {
    await sleep(delay);
    const statusRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
      headers: { 'x-api-key': apiKey },
    });
    if (!statusRes.ok) continue;

    const statusData = await statusRes.json();
    const status = statusData?.data?.status;

    if (status === 'completed') {
      const resultUrl = statusData?.data?.output?.image_url
        || statusData?.data?.output?.image_urls?.[0]
        || '';
      if (!resultUrl) throw new Error('No image URL in completed upscale result');
      return resultUrl;
    }
    if (status === 'failed') {
      throw new Error(`PiAPI upscale failed: ${statusData?.data?.error || 'Unknown'}`);
    }
  }
  throw new Error('PiAPI upscale timed out');
}
