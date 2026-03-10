import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Caption generation mode
    if (body.action === 'caption') {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const captionPrompt = `Write a ${body.platform} post caption for a video ad about "${body.product_name}".
Language: ${body.language === 'bn' ? 'Bengali' : 'English'}
Platform: ${body.platform}
${body.platform === 'instagram' ? 'Include 10-15 relevant hashtags.' : 'Include 3-5 relevant hashtags.'}
Keep it engaging, mobile-friendly, and under 300 characters for the main text.
Return ONLY the caption text, nothing else.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: captionPrompt }],
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI error");
      }

      const aiData = await aiRes.json();
      const caption = aiData.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ success: true, caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Script generation mode
    const { workspace_id, product_name, key_message, original_price_bdt, offer_price_bdt, cta_text, style, language, num_images } = body;

    // Fetch workspace for shop DNA
    const { data: workspace } = await supabase.from("workspaces").select("*").eq("id", workspace_id).single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const priceInfo = original_price_bdt && offer_price_bdt
      ? `Original price: ৳${original_price_bdt} → Offer price: ৳${offer_price_bdt}`
      : original_price_bdt ? `Price: ৳${original_price_bdt}` : '';

    const prompt = `You are AdDhoom's AI video script writer for Bangladesh market.

Write a 15-second video ad script for:
Product: ${product_name}
Key message: ${key_message || 'General product ad'}
${priceInfo}
CTA: ${cta_text || 'এখনই কিনুন'}
Style: ${style}
Language: ${language === 'bn' ? 'Bengali' : language === 'banglish' ? 'Banglish' : 'English'}
Images available: ${num_images || 3}
${workspace ? `Shop: ${workspace.shop_name}, Industry: ${workspace.industry || 'general'}, Audience: ${workspace.target_audience || 'general'}` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{
  "slides": [
    {
      "slide_number": 1,
      "time_start": 0,
      "time_end": 3,
      "image_index": 0,
      "headline_text": "attention-grabbing headline text",
      "sub_text": "optional subtitle",
      "text_animation": "slide",
      "text_position": "bottom",
      "overlay_opacity": 0.4
    }
  ],
  "voiceover_script": "full voiceover text if needed",
  "suggested_hashtags": ["#tag1", "#tag2"],
  "dhoom_score_prediction": 82
}

Rules:
- Create 4-5 slides that fill exactly 15 seconds
- First slide (0-3s) must be the strongest hook
- Last slide must show CTA
- Use image_index 0 to ${(num_images || 3) - 1} to reference product images
- Keep text SHORT - max 8 words per headline for mobile readability
- Style "${style}": ${style === 'bold' ? 'bright colors, big price display' : style === 'luxury' ? 'premium feel, dark tones' : style === 'story' ? 'emotional narrative' : 'clean, minimal'}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean JSON
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let script;
    try {
      script = JSON.parse(content);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return new Response(JSON.stringify({ success: true, script }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-video-script error:", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
