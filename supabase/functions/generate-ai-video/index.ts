import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { vidgoSubmit, vidgoPoll, downloadFile } from '../_shared/vidgo.ts';
import { deductCredits, insufficientCreditsResponse } from '../_shared/credits.ts';

async function cleanOldVideos(supabase: SupabaseClient, workspaceId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: oldVideos } = await supabase
    .from('video_ads')
    .select('id, storage_path')
    .eq('workspace_id', workspaceId)
    .lt('created_at', thirtyDaysAgo.toISOString());

  if (!oldVideos || oldVideos.length === 0) return;

  const paths = oldVideos.map((v: any) => v.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from('video-assets').remove(paths);
  }

  const ids = oldVideos.map((v: any) => v.id);
  await supabase.from('video_ads').delete().in('id', ids);
  console.log(`Cleaned ${ids.length} old videos for workspace ${workspaceId}`);
}

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
      duration,
    } = await req.json();

    if (!workspace_id || !motion_prompt) {
      throw new Error('Missing required fields');
    }

    // Credit check
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'video_generation', quantity: 1,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 330);
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
      const filePath = `ai-video/${user.id}/${Date.now()}_src.${ext}`;

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

    const videoDuration = duration === 3 ? 3 : 5;

    // Call Vidgo.ai Seedance V1.5 Pro
    const videoInput: Record<string, unknown> = {
      prompt: motion_prompt,
      duration: videoDuration,
      aspect_ratio: aspect_ratio || '9:16',
    };
    if (sourceImageUrl) {
      videoInput.image_url = sourceImageUrl;
    }

    const taskId = await vidgoSubmit('seedance-1-5-pro', videoInput);
    const videoUrl = await vidgoPoll(taskId);
    if (!videoUrl) throw new Error('No video URL in result');

    // Download and store video
    const videoBuffer = await downloadFile(videoUrl);
    const videoPath = `ai-video/${user.id}/${Date.now()}.mp4`;
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
      storage_path: videoPath,
      format: aspect_ratio || '9:16',
      motion_prompt,
      status: 'completed',
      video_type: 'ai_motion',
      product_name,
      duration_seconds: videoDuration,
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
