import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { item_id, action } = await req.json();
    if (!item_id || !action) return errorResponse(400, "আইটেম আইডি ও অ্যাকশন দিন।", "Item ID and action required.");

    if (action === "confirm") {
      await supabase.from("content_calendar").update({ status: "confirmed", swipe_action: "confirm", swiped_at: new Date().toISOString() }).eq("id", item_id);
      return jsonResponse({ success: true, action: "confirmed" });
    }

    if (action === "skip") {
      await supabase.from("content_calendar").update({ status: "skipped", swipe_action: "skip", swiped_at: new Date().toISOString() }).eq("id", item_id);
      return jsonResponse({ success: true, action: "skipped" });
    }

    if (action === "generate") {
      // Mark as confirmed and return prefill params
      const { data: item } = await supabase.from("content_calendar").update({ status: "confirmed", swipe_action: "generate", swiped_at: new Date().toISOString() }).eq("id", item_id).select().single();
      
      if (!item) return errorResponse(404, "আইটেম পাওয়া যায়নি।", "Item not found.");

      // Get workspace for prefill
      const { data: workspace } = await supabase.from("workspaces").select("key_products, brand_tone").eq("id", item.workspace_id).single();

      return jsonResponse({
        success: true,
        action: "generate",
        redirect_to: "/dashboard/generate",
        prefill: {
          product_name: workspace?.key_products?.split(",")[0]?.trim() || "",
          platform: item.platform || "facebook",
          occasion: item.festival_theme || item.occasion || "general",
          framework: item.recommended_framework || "AIDA",
          tone: item.recommended_tone || workspace?.brand_tone || "friendly",
          calendar_item_id: item.id,
        }
      });
    }

    if (action === "undo_skip") {
      await supabase.from("content_calendar").update({ status: "planned", swipe_action: null, swiped_at: null }).eq("id", item_id);
      return jsonResponse({ success: true, action: "undo_skip" });
    }

    return errorResponse(400, "অবৈধ অ্যাকশন।", "Invalid action.");
  } catch (e) {
    console.error("swipe-action error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
