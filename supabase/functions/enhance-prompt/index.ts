import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.5-flash";

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

    const { prompt, tab_type } = await req.json();
    if (!prompt) throw new Error('Missing prompt');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const systemPrompt = `You are an expert AI image generation prompt writer.
The user has written a prompt for generating a product/fashion advertisement image.
Your job: rewrite their prompt to be more detailed, specific, and effective for image generation.

Rules:
- Keep the same core intent and style
- Add specific lighting, texture, and atmosphere details
- Add camera/composition language (wide angle, shallow depth of field, etc.)
- Add quality boosters naturally (8K, photorealistic, professional photography)
- Keep it as one flowing paragraph
- Do NOT add text overlay instructions
- Do NOT change the product or scene type
- Maximum 500 characters
- Return ONLY the enhanced prompt, no explanation, no preamble`;

    const response = await fetch(`${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Enhance this ${tab_type || 'image generation'} prompt:\n\n${prompt}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Gemini API error');
    }

    const data = await response.json();
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || prompt;

    return new Response(JSON.stringify({ enhanced_prompt: enhanced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
