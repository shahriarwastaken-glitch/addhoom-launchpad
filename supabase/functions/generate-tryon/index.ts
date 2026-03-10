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

    // Upload garment to temp storage
    const garmentPath = `temp/${workspace_id}/${Date.now()}_garment.jpg`;
    const garmentBytes = Uint8Array.from(atob(garment_image_base64), c => c.charCodeAt(0));
    await supabase.storage.from('ad-images').upload(garmentPath, garmentBytes, {
      contentType: 'image/jpeg', upsert: true,
    });
    const garmentUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${garmentPath}`;

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

    const results: string[] = [];

    for (let i = 0; i < Math.min(variations, 3); i++) {
      // Start prediction
      const startRes = await fetch('https://api.fashn.ai/v1/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FASHN_API_KEY}`,
        },
        body: JSON.stringify({
          model_image: modelUrl,
          garment_image: garmentUrl,
          category: categoryMap[garment_category] || 'tops',
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

      // Poll for result (max 60s)
      let resultUrl: string | null = null;
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(r => setTimeout(r, 5000));

        const statusRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
          headers: { 'Authorization': `Bearer ${FASHN_API_KEY}` },
        });
        const status = await statusRes.json();

        if (status.status === 'completed' && status.output?.[0]) {
          resultUrl = status.output[0];
          break;
        }
        if (status.status === 'failed') {
          throw new Error('Try-on generation failed');
        }
      }

      if (!resultUrl) throw new Error('Generation timed out');

      // Download and store
      const imageRes = await fetch(resultUrl);
      const imageBuffer = await imageRes.arrayBuffer();
      const storedPath = `tryon/${workspace_id}/${Date.now()}_${i}.jpg`;

      await supabase.storage.from('ad-images').upload(storedPath, new Uint8Array(imageBuffer), {
        contentType: 'image/jpeg', upsert: true,
      });

      const storedUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${storedPath}`;
      results.push(storedUrl);
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
      tokens_used: variations,
    });

    return new Response(JSON.stringify({ images: results, saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
