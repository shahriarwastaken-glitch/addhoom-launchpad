import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKOFF = [2000, 3000, 5000, 8000, 12000, 18000];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const PIAPI_KEY = Deno.env.get("PIAPI_KEY");
    if (!PIAPI_KEY) {
      return new Response(JSON.stringify({ success: false, message: "PiAPI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Upload source image to storage to get a URL for PiAPI
    let rawBase64 = image_base64;
    let mimeType = "image/png";
    if (image_base64.startsWith("data:")) {
      const match = image_base64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }
    }

    const srcBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const srcPath = `${workspace_id}/rmbg_src_${Date.now()}.png`;
    await supabase.storage.from("ad-images").upload(srcPath, srcBytes, {
      contentType: mimeType, upsert: true,
    });
    const { data: srcPublicUrl } = supabase.storage.from("ad-images").getPublicUrl(srcPath);
    const sourceImageUrl = srcPublicUrl.publicUrl;

    // Call PiAPI background-remove
    const createRes = await fetch("https://api.piapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "x-api-key": PIAPI_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qubico/image-toolkit",
        task_type: "background-remove",
        input: {
          image: sourceImageUrl,
          rmbg_model: "RMBG-2.0",
        },
        config: { webhook_config: { endpoint: "", secret: "" } },
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      console.error(`PiAPI bg-remove start failed [${createRes.status}]:`, errBody);
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
        message: "Background removal failed, using original",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const createData = await createRes.json();
    const taskId = createData?.data?.task_id;
    if (!taskId) {
      console.error("No task_id returned:", createData);
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("PiAPI bg-remove task started:", taskId);

    // Poll for completion
    let resultImageUrl = "";
    for (const delay of BACKOFF) {
      await sleep(delay);
      const statusRes = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: { "x-api-key": PIAPI_KEY },
      });
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status = statusData?.data?.status;

      if (status === "completed") {
        resultImageUrl = statusData?.data?.output?.image_url
          || statusData?.data?.output?.image_urls?.[0]
          || "";
        break;
      }
      if (status === "failed") {
        console.error("PiAPI bg-remove failed:", statusData?.data?.error);
        break;
      }
    }

    if (!resultImageUrl) {
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
        message: "Background removal timed out, using original",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download result and upload to our storage
    const imgRes = await fetch(resultImageUrl);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({
        success: true, cutout_url: null, background_removed: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());

    const fileName = `${workspace_id}/${Date.now()}-cutout.png`;
    const { error: uploadError } = await supabase.storage
      .from("ad-images").upload(fileName, imgBytes, { contentType: "image/png", upsert: true });

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
