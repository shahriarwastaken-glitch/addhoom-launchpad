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

function buildModelPrompt(attrs: {
  gender: string;
  body: string;
  skin: string;
  pose: string;
  age?: string;
  style?: string;
}): string {
  const poseDesc: Record<string, string> = {
    standing: 'standing naturally, facing forward',
    walking: 'walking naturally, slight movement',
    sitting: 'sitting relaxed, full body visible',
    dynamic: 'dynamic confident pose, fashion forward',
  };
  const bodyDesc: Record<string, string> = {
    slim: 'slim build',
    average: 'average athletic build',
    plus: 'plus size curvy build',
  };
  const skinDesc: Record<string, string> = {
    fair: 'fair complexion',
    light: 'light skin tone',
    medium: 'medium brown skin tone',
    tan: 'tan olive skin tone',
    dark: 'deep dark skin tone',
  };

  let prompt = `${attrs.gender} fashion model, ${bodyDesc[attrs.body] || 'average athletic build'}, ${skinDesc[attrs.skin] || 'medium brown skin tone'}, ${poseDesc[attrs.pose] || 'standing naturally'}`;
  if (attrs.age) prompt += `, in their ${attrs.age}`;
  if (attrs.style) prompt += `, ${attrs.style} style`;
  prompt += ', professional fashion photography, neutral studio background, full body shot';
  return prompt.trim();
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
      source_image_url,
      new_model_attributes,
      advanced,
    } = await req.json();

    if (!workspace_id || !source_image_url || !new_model_attributes) {
      throw new Error('Missing required fields');
    }

    const FASHN_API_KEY = Deno.env.get('FASHN_API_KEY');
    if (!FASHN_API_KEY) throw new Error('FASHN_API_KEY not configured');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    const newModelPrompt = buildModelPrompt({
      ...new_model_attributes,
      ...(advanced || {}),
    });

    // Start model swap prediction
    const startRes = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FASHN_API_KEY}`,
      },
      body: JSON.stringify({
        model_image: source_image_url,
        model_description: newModelPrompt,
        mode: 'quality',
        num_samples: 1,
      }),
    });

    const startData = await startRes.json();
    const predictionId = startData.id;
    if (!predictionId) {
      console.error('Fashn.ai swap start error:', startData);
      throw new Error('Failed to start model swap');
    }

    // Poll with exponential backoff
    let resultUrl = '';
    for (let attempt = 0; attempt < BACKOFF_SCHEDULE.length; attempt++) {
      await sleep(BACKOFF_SCHEDULE[attempt]);
      const statusRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${FASHN_API_KEY}` },
      });
      const status = await statusRes.json();

      if (status.status === 'completed' && status.output?.[0]) {
        const imageRes = await fetch(status.output[0]);
        const imageBuffer = await imageRes.arrayBuffer();
        const storedPath = `tryon/${workspace_id}/swap_${Date.now()}.jpg`;

        await supabase.storage.from('ad-images').upload(storedPath, new Uint8Array(imageBuffer), {
          contentType: 'image/jpeg',
          upsert: true,
        });

        resultUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${storedPath}`;
        break;
      }

      if (status.status === 'failed') {
        throw new Error(`Model swap failed: ${status.error || 'Unknown error'}`);
      }
    }

    if (!resultUrl) throw new Error('Model swap timed out');

    // Save to ad_images
    await supabase.from('ad_images').insert({
      workspace_id,
      image_url: resultUrl,
      style: 'tryon',
      text_config: {},
      studio_source: 'tryon',
      studio_config: {
        swap_source_url: source_image_url,
        model_attributes: new_model_attributes,
        model_prompt: newModelPrompt,
        pipeline_version: 'tryon_v2_swap',
      },
    });

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'tryon',
      tokens_used: 1,
    });

    return new Response(JSON.stringify({ image_url: resultUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
