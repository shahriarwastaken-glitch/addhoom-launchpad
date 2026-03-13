import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { vidgoSubmit, vidgoPoll, downloadFile } from "../_shared/vidgo.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";

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
      image_url,
      target_resolution = '4k',
      quality_mode = 'standard',
      export_format = 'png',
      creativity = 0,
      // Legacy params mapping
      scale,
      mode,
    } = await req.json();

    if (!workspace_id) throw new Error('Missing workspace_id');
    if (!image_base64 && !image_url) throw new Error('Missing image');

    // Credit check
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'upscale', quantity: 1,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 100);
    }

    // Get source image URL
    let sourceImageUrl = image_url || '';

    if (!sourceImageUrl && image_base64) {
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
      sourceImageUrl = `${SUPABASE_URL}/storage/v1/object/public/ad-images/${srcPath}`;
    }

    // Map legacy params
    const effectiveMode = quality_mode || (mode === 'sharp_details' ? 'standard' : mode === 'smooth_skin' ? 'standard' : 'standard');
    const effectiveResolution = target_resolution || (scale ? (scale >= 6 ? '8k' : scale >= 4 ? '4k' : '2k') : '4k');
    const effectiveCreativity = creativity ?? (mode === 'sharp_details' ? 25 : mode === 'smooth_skin' ? -10 : 0);

    // Choose endpoint based on quality mode
    const endpoint = effectiveMode === 'ultimate'
      ? 'wavespeed-ai/ultimate-image-upscaler'
      : 'wavespeed-ai/image-upscaler';

    const requestId = await wavespeedCreate(endpoint, {
      image: sourceImageUrl,
      creativity: effectiveCreativity,
      target_resolution: effectiveResolution,
      output_format: export_format === 'jpg' ? 'jpeg' : export_format,
      enable_base64_output: false,
      enable_sync_mode: false,
    });

    const result = await wavespeedPoll(requestId);
    const upscaledUrl = result?.outputs?.[0];
    if (!upscaledUrl) throw new Error('No upscaled image in result');

    // Download and store
    const imageBytes = await downloadFile(upscaledUrl);
    const ext = export_format === 'jpg' ? 'jpg' : 'png';
    const storedPath = `upscaled/${workspace_id}/${Date.now()}.${ext}`;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

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
      studio_config: { target_resolution: effectiveResolution, quality_mode: effectiveMode },
    });

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      workspace_id,
      feature: 'upscaler',
      tokens_used: 1,
    });

    return new Response(JSON.stringify({
      image_url: imageUrl,
      upscaled_url: imageUrl,
      target_resolution: effectiveResolution,
      quality_mode: effectiveMode,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('upscale-image error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
