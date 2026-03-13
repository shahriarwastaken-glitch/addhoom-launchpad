import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serverError, unauthorizedError } from "../_shared/errors.ts";
import { vidgoSubmit, vidgoPoll, downloadFile } from "../_shared/vidgo.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify(unauthorizedError("bn")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify(unauthorizedError("bn")), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const input = await req.json();
    const {
      workspace_id,
      product_name,
      product_image_base64,
      product_image_mime_type = "image/jpeg",
      selected_scenes = ["studio"],
      final_prompts = {},
      lighting_mood = "soft",
      camera_angle = "front",
      additional_details = "",
      text_config,
    } = input;

    if (!workspace_id || !product_name) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের নাম আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!product_image_base64) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "পণ্যের ছবি আবশ্যক" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!selected_scenes?.length) {
      return new Response(
        JSON.stringify({ success: false, code: 400, message: "At least one scene required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit check — charge per scene
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'image_generation', quantity: selected_scenes.length,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 125 * selected_scenes.length);
    }

    const { data: workspace } = await supabase
      .from("workspaces").select("id, image_generation_prompt_modifier").eq("id", workspace_id).eq("owner_id", user.id).single();
    if (!workspace) {
      return new Response(
        JSON.stringify({ success: false, code: 404, message: "Workspace পাওয়া যায়নি" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptModifier = workspace.image_generation_prompt_modifier || "";

    // Upload source product image to storage
    const base64Match = product_image_base64.match(/^data:image\/(\w+);base64,(.+)$/);
    const rawBase64 = base64Match ? base64Match[2] : product_image_base64;
    const ext = base64Match ? (base64Match[1] === 'jpeg' ? 'jpg' : base64Match[1]) : 'png';
    const srcBytes = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0));
    const srcPath = `${workspace_id}/src_${Date.now()}.${ext}`;
    await supabase.storage.from("ad-images").upload(srcPath, srcBytes, {
      contentType: product_image_mime_type, upsert: true,
    });
    const { data: srcPublicUrl } = supabase.storage.from("ad-images").getPublicUrl(srcPath);
    const sourceImageUrl = srcPublicUrl.publicUrl;

    // Prepend IMG_3984.CR2 and prompt modifier to every prompt
    const generationTasks = selected_scenes.map((sceneKey: string) => {
      const rawPrompt = final_prompts[sceneKey] || `${product_name}, professional product photography, ${sceneKey} scene, ultra realistic, 8K`;
      const parts = ["IMG_3984.CR2"];
      if (promptModifier) parts.push(promptModifier);
      parts.push(rawPrompt);
      return { sceneKey, prompt: parts.join(" ") };
    });

    const requestIds = await Promise.allSettled(
      generationTasks.map(({ prompt }: { prompt: string }) =>
        vidgoSubmit('nano-banana-2', {
          prompt,
          image_url: sourceImageUrl,
          size: '1:1',
          resolution: '2K',
        })
      )
    );

    // Poll all in parallel
    const results = await Promise.allSettled(
      requestIds.map((r: any) =>
        r.status === 'fulfilled'
          ? vidgoPoll(r.value)
          : Promise.reject('Create failed')
      )
    );

    const images: any[] = [];

    for (let i = 0; i < results.length; i++) {
      const { sceneKey, prompt } = generationTasks[i];

      if (results[i].status === 'fulfilled') {
        try {
          const imageUrl = (results[i] as PromiseFulfilledResult<any>).value?.outputs?.[0];
          if (!imageUrl) continue;

          const imageBytes = await downloadFile(imageUrl);
          const fileName = `${workspace_id}/${Date.now()}-${sceneKey}.png`;
          const { error: uploadError } = await supabase.storage
            .from("ad-images")
            .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data: publicUrl } = supabase.storage.from("ad-images").getPublicUrl(fileName);
          const storedUrl = publicUrl.publicUrl;

          const { data: saved } = await supabase
            .from("ad_images")
            .insert({
              workspace_id,
              product_name,
              format: '1:1',
              style: sceneKey,
              image_url: storedUrl,
              generation_prompt: prompt,
              sd_prompt: prompt,
              dhoom_score: 70,
              is_winner: false,
              studio_source: sceneKey,
              studio_config: {
                scene_variant: sceneKey,
                lighting_mood,
                camera_angle,
                additional_details,
                selected_scenes,
              },
              text_config: text_config || {},
              pipeline_version: 'v4_structured',
            })
            .select()
            .single();

          images.push({
            id: saved?.id || crypto.randomUUID(),
            url: storedUrl,
            scene: sceneKey,
            prompt,
            dhoom_score: 70,
          });
        } catch (err) {
          console.error(`Error processing scene ${sceneKey}:`, err);
        }
      }
    }

    // Track usage
    await supabase.from("usage_logs").insert({
      user_id: user.id, workspace_id, feature: "image_generator",
    });

    try {
      await supabase.rpc("upsert_api_usage_stats", {
        p_service_name: "wavespeed",
        p_stat_date: new Date().toISOString().split("T")[0],
        p_calls_made: selected_scenes.length,
      });
    } catch (e) {
      console.error("Failed to track API usage:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        images,
        count: images.length,
        requested: selected_scenes.length,
        generated: images.length,
        partial: images.length < selected_scenes.length,
        message: `${images.length}টি ইমেজ তৈরি হয়েছে`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-ad-image error:", e);
    return new Response(JSON.stringify(serverError("bn")), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
