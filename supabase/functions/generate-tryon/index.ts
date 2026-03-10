import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BACKOFF_SCHEDULE = [2000, 3000, 5000, 8000, 12000, 18000, 25000, 35000];

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
      garment_image_base64,
      model_id,
      garment_category,
      background,
      variations = 1,
    } = await req.json();

    if (!workspace_id || !garment_image_base64 || !model_id || !garment_category) {
      throw new Error('Missing required fields');
    }

    const FASHN_API_KEY = Deno.env.get('FASHN_API_KEY');
    if (!FASHN_API_KEY) throw new Error('FASHN_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    // IMPROVEMENT 2: Cache uploaded garments using content hash
    const garmentUrl = await getOrUploadGarment(supabase, garment_image_base64, workspace_id, SUPABASE_URL);

    // Model image URL
    const modelUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/models/${model_id}.jpg`;

    // Map garment category
    const categoryMap: Record<string, string> = {
      'Top': 'tops',
      'Bottom': 'bottoms',
      'Full Body / Dress': 'one-pieces',
      'Outerwear': 'tops',
      'Footwear': 'tops',
    };

    const category = categoryMap[garment_category] || 'tops';

    // IMPROVEMENT 1: Parallel predictions with Promise.allSettled
    const predictionPromises = Array.from(
      { length: Math.min(variations, 3) },
      (_, i) => runFashnPrediction({
        modelUrl,
        garmentUrl,
        category,
        variationIndex: i,
        workspaceId: workspace_id,
        fashnApiKey: FASHN_API_KEY,
        supabase,
        supabaseUrl: SUPABASE_URL,
      })
    );

    const settled = await Promise.allSettled(predictionPromises);

    const results = settled
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value);

    const failedCount = settled.filter(r => r.status === 'rejected').length;

    if (results.length === 0) {
      throw new Error('All variations failed');
    }

    // Save to ad_images
    const inserts = results.map(url => ({
      workspace_id,
      image_url: url,
      style: 'tryon',
      text_config: {},
      studio_source: 'tryon',
      studio_config: {
        model_id,
        garment_category,
        background,
      },
    }));

    const { data: saved } = await supabase.from('ad_images').insert(inserts).select();

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'tryon',
      tokens_used: results.length,
    });

    return new Response(JSON.stringify({
      images: results,
      saved,
      requested: variations,
      generated: results.length,
      partial: failedCount > 0,
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

// IMPROVEMENT 2: Garment caching with content hash
async function getOrUploadGarment(
  supabase: any,
  imageBase64: string,
  workspaceId: string,
  supabaseUrl: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(imageBase64);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

  const cachePath = `garment-cache/${workspaceId}/${hash}.jpg`;

  // Check if already uploaded
  const { data: existing } = await supabase
    .storage
    .from('ad-images')
    .list(`garment-cache/${workspaceId}`, { search: hash });

  if (existing && existing.length > 0) {
    return `${supabaseUrl}/storage/v1/object/public/ad-images/${cachePath}`;
  }

  // Upload new
  const garmentBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
  await supabase.storage.from('ad-images').upload(cachePath, garmentBytes, {
    contentType: 'image/jpeg',
    cacheControl: '86400',
    upsert: false,
  });

  return `${supabaseUrl}/storage/v1/object/public/ad-images/${cachePath}`;
}

// IMPROVEMENT 1 + 3: Parallel prediction with exponential backoff polling
async function runFashnPrediction(config: {
  modelUrl: string;
  garmentUrl: string;
  category: string;
  variationIndex: number;
  workspaceId: string;
  fashnApiKey: string;
  supabase: any;
  supabaseUrl: string;
}): Promise<string> {
  const startRes = await fetch('https://api.fashn.ai/v1/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.fashnApiKey}`,
    },
    body: JSON.stringify({
      model_image: config.modelUrl,
      garment_image: config.garmentUrl,
      category: config.category,
      mode: 'quality',
      num_samples: 1,
    }),
  });

  const startData = await startRes.json();
  const predictionId = startData.id;

  if (!predictionId) {
    console.error('Fashn.ai start error:', startData);
    throw new Error('Failed to start try-on generation');
  }

  // IMPROVEMENT 3: Exponential backoff polling
  for (let attempt = 0; attempt < BACKOFF_SCHEDULE.length; attempt++) {
    await sleep(BACKOFF_SCHEDULE[attempt]);

    const statusRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${config.fashnApiKey}` },
    });
    const status = await statusRes.json();

    if (status.status === 'completed' && status.output?.[0]) {
      // Download and store
      const imageRes = await fetch(status.output[0]);
      const imageBuffer = await imageRes.arrayBuffer();
      const storedPath = `tryon/${config.workspaceId}/${Date.now()}_${config.variationIndex}.jpg`;

      await config.supabase.storage.from('ad-images').upload(storedPath, new Uint8Array(imageBuffer), {
        contentType: 'image/jpeg',
        upsert: true,
      });

      return `${config.supabaseUrl}/storage/v1/object/public/ad-images/${storedPath}`;
    }

    if (status.status === 'failed') {
      throw new Error(`Fashn.ai failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('Generation timed out after maximum wait time');
}
