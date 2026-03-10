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

    const { workspace_id, job_type, input_config } = await req.json();

    if (!workspace_id || !job_type || !input_config) {
      throw new Error('Missing required fields');
    }

    // Create job record
    const { data: job, error: insertError } = await supabase
      .from('studio_jobs')
      .insert({
        workspace_id,
        user_id: user.id,
        job_type,
        status: 'queued',
        input_config,
        total_variations: input_config.variations || 1,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger the worker by calling the process function
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fire and forget — don't await the worker
    fetch(`${SUPABASE_URL}/functions/v1/process-studio-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ job_id: job.id }),
    }).catch(err => console.error('Worker trigger failed:', err));

    return new Response(JSON.stringify({
      job_id: job.id,
      status: 'queued',
      message: 'Job queued successfully',
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
