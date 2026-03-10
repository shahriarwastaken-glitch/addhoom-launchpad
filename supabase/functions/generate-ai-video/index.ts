import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { wavespeedCreate, wavespeedPoll, downloadFile } from '../_shared/wavespeed.ts';

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

    const {
      workspace_id,
      images,
      image_url,
      motion_prompt,
      aspect_ratio,
      product_name,
    } = await req.json();

    if (!workspace_id || !motion_prompt) {
      throw new Error('Missing required fields');
    }

    // Determine source image URL
    let sourceImageUrl = image_url || '';

    // If base64 images array provided, upload first image to get URL
    if (!sourceImageUrl && images?.length) {
      const base64 = images[0];
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid image data');

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const raw = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
      const filePath = `ai-video/${workspace_id}/${Date.now()}_src.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('video-assets')
        .upload(filePath, raw, { contentType: `image/${matches[1]}`, upsert: true });
      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('video-assets')
        .getPublicUrl(filePath);
      sourceImageUrl = publicUrl;
    }

    if (!sourceImageUrl) throw new Error('No source image provided');

    // Call WaveSpeed Seedance V1.5 Pro Fast
    const requestId = await wavespeedCreate(
      'bytedance/seedance-v1.5-pro/image-to-video-fast',
      {
        image: sourceImageUrl,
        prompt: motion_prompt,
        duration: 5,
        resolution: '720p',
        generate_audio: false,
        seed: -1,
      }
    );

    const result = await wavespeedPoll(requestId);
    const videoUrl = result?.outputs?.[0];
    if (!videoUrl) throw new Error('No video URL in result');

    // Download and store video
    const videoBuffer = await downloadFile(videoUrl);
    const videoPath = `ai-video/${workspace_id}/${Date.now()}.mp4`;
    const { error: videoUploadErr } = await supabase.storage
      .from('video-assets')
      .upload(videoPath, videoBuffer, { contentType: 'video/mp4', upsert: true });
    if (videoUploadErr) throw new Error(`Video upload failed: ${videoUploadErr.message}`);

    const { data: { publicUrl: storedVideoUrl } } = supabase.storage
      .from('video-assets')
      .getPublicUrl(videoPath);

    // Save to video_ads
    const { data: row, error: insertErr } = await supabase.from('video_ads').insert({
      workspace_id,
      video_url: storedVideoUrl,
      format: aspect_ratio || '9:16',
      motion_prompt,
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
