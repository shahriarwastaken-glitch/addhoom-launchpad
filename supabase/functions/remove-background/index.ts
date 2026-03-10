import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify(unauthorizedError("en")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, image_base64 } = await req.json();
    if (!workspace_id || !image_base64) {
      return new Response(JSON.stringify({ success: false, message: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, message: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUri = image_base64.startsWith("data:") ? image_base64 : `data:image/png;base64,${image_base64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Remove the background from this product image completely. Output ONLY the product itself on a pure solid white background (#FFFFFF). Keep every detail of the product exactly as it is - same colors, same shape, same textures. The product should be centered with some padding around it. Do NOT add any text, labels, shadows, or decorative elements. Just the product on white.`,
            },
            { type: "image_url", image_url: { url: imageUri } },
          ],
        }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`BG removal failed (${response.status}):`, errText);
      // Fallback: return original image
      return new Response(JSON.stringify({
        success: true,
        cutout_url: null,
        background_removed: false,
        message: "Background removal failed, using original",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await response.json();
    const generatedImages = result.choices?.[0]?.message?.images;

    if (!generatedImages || generatedImages.length === 0) {
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upload cutout to storage
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const base64Data = generatedImages[0].image_url.url;
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Clean);
    const bytes = new Uint8Array(binaryString.length);
    for (let b = 0; b < binaryString.length; b++) {
      bytes[b] = binaryString.charCodeAt(b);
    }

    const fileName = `${workspace_id}/${Date.now()}-cutout.png`;
    const { error: uploadError } = await supabase.storage
      .from("ad-images").upload(fileName, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Cutout upload error:", uploadError);
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);

    return new Response(JSON.stringify({
      success: true,
      cutout_url: publicUrl.publicUrl,
      background_removed: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("remove-background error:", e);
    return new Response(JSON.stringify(serverError("en")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
