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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const PIAPI_KEY = Deno.env.get('PIAPI_KEY');
    if (!PIAPI_KEY) throw new Error('PIAPI_KEY not configured');

    const {
      workspace_id,
      input_mode,
      images,
      motion_style,
      aspect_ratio,
      motion_prompt,
      product_name,
    } = await req.json();

    if (!workspace_id || !images?.length || !motion_prompt) {
      throw new Error('Missing required fields');
    }

    // Step 1: Upload images to storage
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const base64 = images[i];
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid image data');

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const raw = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
      const filePath = `ai-video/${workspace_id}/${Date.now()}_${i}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('video-assets')
        .upload(filePath, raw, { contentType: `image/${matches[1]}`, upsert: true });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('video-assets')
        .getPublicUrl(filePath);

      imageUrls.push(publicUrl);
    }

    // Step 2: Call Kling via PiAPI
    const klingPayload: Record<string, unknown> = {
      model: 'kling',
      task_type: input_mode === 'multiple' ? 'video_generation' : 'image2video',
      input: {
        image_url: imageUrls[0],
        prompt: motion_prompt,
        duration: 5,
        aspect_ratio: aspect_ratio || '9:16',
      },
    };

    if (input_mode === 'multiple' && imageUrls.length > 1) {
      (klingPayload.input as Record<string, unknown>).image_tail_url = imageUrls[imageUrls.length - 1];
    }

    console.log('Calling PiAPI with payload:', JSON.stringify(klingPayload));

    const startRes = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PIAPI_KEY,
      },
      body: JSON.stringify(klingPayload),
    });

    if (!startRes.ok) {
      const errBody = await startRes.text();
      throw new Error(`PiAPI start failed [${startRes.status}]: ${errBody}`);
    }

    const startData = await startRes.json();
    const taskId = startData?.data?.task_id || startData?.task_id;

    if (!taskId) {
      throw new Error(`No task_id returned: ${JSON.stringify(startData)}`);
    }

    console.log('PiAPI task started:', taskId);

    // Step 3: Poll for completion
    const BACKOFF = [5000, 8000, 12000, 15000, 20000, 25000, 30000, 35000, 40000, 50000, 60000];
    let videoUrl = '';

    for (let i = 0; i < BACKOFF.length; i++) {
      await new Promise(r => setTimeout(r, BACKOFF[i]));

      const pollRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: { 'X-API-Key': PIAPI_KEY },
      });

      if (!pollRes.ok) {
        console.log(`Poll attempt ${i + 1} failed: ${pollRes.status}`);
        continue;
      }

      const pollData = await pollRes.json();
      const status = pollData?.data?.status || pollData?.status;

      console.log(`Poll ${i + 1}: status=${status}`);

      if (status === 'completed' || status === 'success') {
        videoUrl = pollData?.data?.output?.video_url
          || pollData?.data?.video_url
          || pollData?.output?.video_url
          || '';
        break;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error(pollData?.data?.error || pollData?.error || 'Kling generation failed');
      }
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out after polling');
    }

    // Step 4: Download and store video in Supabase
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Failed to download generated video');
    const videoBuffer = new Uint8Array(await videoRes.arrayBuffer());

    const videoPath = `ai-video/${workspace_id}/${Date.now()}.mp4`;
    const { error: videoUploadErr } = await supabase.storage
      .from('video-assets')
      .upload(videoPath, videoBuffer, { contentType: 'video/mp4', upsert: true });

    if (videoUploadErr) throw new Error(`Video upload failed: ${videoUploadErr.message}`);

    const { data: { publicUrl: storedVideoUrl } } = supabase.storage
      .from('video-assets')
      .getPublicUrl(videoPath);

    // Step 5: Save to video_ads table
    const { data: row, error: insertErr } = await supabase.from('video_ads').insert({
      workspace_id,
      video_url: storedVideoUrl,
      format: aspect_ratio,
      motion_style,
      motion_prompt,
      input_mode,
      source_images: imageUrls,
      status: 'completed',
      video_type: 'ai_motion',
      product_name,
      duration_seconds: 5,
      completed_at: new Date().toISOString(),
    }).select('id').single();

    if (insertErr) console.error('Insert error:', insertErr);

    // Log usage
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'ai_motion_video',
    });

    return new Response(JSON.stringify({
      video_url: storedVideoUrl,
      id: row?.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('generate-ai-video error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
