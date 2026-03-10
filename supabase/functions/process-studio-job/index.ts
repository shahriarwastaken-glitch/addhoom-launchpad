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

    const { job_id } = await req.json();
    if (!job_id) throw new Error('Missing job_id');

    // Claim job (prevent double processing)
    const { data: job, error: claimError } = await supabase
      .from('studio_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', job_id)
      .eq('status', 'queued')
      .select()
      .single();

    if (claimError || !job) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Increment attempt count
    await supabase
      .from('studio_jobs')
      .update({ attempt_count: (job.attempt_count || 0) + 1 })
      .eq('id', job_id);

    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      // Delegate to the appropriate existing edge function
      let functionName = '';
      switch (job.job_type) {
        case 'tryon': functionName = 'generate-tryon'; break;
        case 'product_photo': functionName = 'generate-product-photo'; break;
        case 'upscale': functionName = 'upscale-image'; break;
        default: throw new Error(`Unknown job type: ${job.job_type}`);
      }

      // Build the auth header for the user
      // We use service role key since the original user token may have expired
      const workerRes = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          ...job.input_config,
          workspace_id: job.workspace_id,
        }),
      });

      const workerData = await workerRes.json();

      if (workerData.error) {
        throw new Error(workerData.error);
      }

      // Extract output URLs
      const outputUrls: string[] = [];
      if (workerData.images) {
        outputUrls.push(...workerData.images);
      } else if (workerData.image_url) {
        outputUrls.push(workerData.image_url);
      }

      // Mark complete
      await supabase
        .from('studio_jobs')
        .update({
          status: 'completed',
          output_urls: outputUrls,
          completed_at: new Date().toISOString(),
          completed_variations: outputUrls.length,
        })
        .eq('id', job_id);

    } catch (error: any) {
      const currentAttempt = (job.attempt_count || 0) + 1;
      const shouldRetry = currentAttempt < (job.max_attempts || 3);

      await supabase
        .from('studio_jobs')
        .update({
          status: shouldRetry ? 'queued' : 'failed',
          error_message: error.message,
          completed_at: shouldRetry ? null : new Date().toISOString(),
        })
        .eq('id', job_id);

      if (shouldRetry) {
        // Re-trigger worker after a delay
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        setTimeout(() => {
          fetch(`${SUPABASE_URL}/functions/v1/process-studio-job`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ job_id }),
          }).catch(() => {});
        }, 5000);
      }
    }

    return new Response(JSON.stringify({ processed: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
