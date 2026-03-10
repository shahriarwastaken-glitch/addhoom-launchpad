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

    const { job_id } = await req.json();
    if (!job_id) throw new Error('Missing job_id');

    const { data: job } = await supabase
      .from('studio_jobs')
      .select('id, status, job_type, output_urls, error_message, total_variations, completed_variations, queued_at, started_at, completed_at')
      .eq('id', job_id)
      .eq('user_id', user.id)
      .single();

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate progress
    const progress = job.total_variations > 0
      ? Math.round((job.completed_variations / job.total_variations) * 100)
      : 0;

    // Estimate time remaining
    const elapsed = job.started_at
      ? Date.now() - new Date(job.started_at).getTime()
      : 0;

    const estimatedTotal: Record<string, number> = {
      tryon: 20000,
      product_photo: 15000,
      upscale: 8000,
    };

    const timeRemaining = Math.max(0, (estimatedTotal[job.job_type] || 20000) - elapsed);

    return new Response(JSON.stringify({
      ...job,
      progress,
      time_remaining_ms: timeRemaining,
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
