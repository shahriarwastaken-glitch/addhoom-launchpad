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

    const { item_ids, action, new_date } = await req.json();
    if (!item_ids || !Array.isArray(item_ids) || !action) {
      return errorResponse(400, "আইটেম আইডি ও অ্যাকশন দিন।", "Item IDs and action required.");
    }

    if (action === "confirm") {
      await supabase.from("content_calendar").update({ status: "confirmed" }).in("id", item_ids);
    } else if (action === "skip") {
      await supabase.from("content_calendar").update({ status: "skipped" }).in("id", item_ids);
    } else if (action === "reschedule" && new_date) {
      await supabase.from("content_calendar").update({ date: new_date }).in("id", item_ids);
    } else {
      return errorResponse(400, "অবৈধ অ্যাকশন।", "Invalid action.");
    }

    return jsonResponse({ success: true, updated: item_ids.length });
  } catch (e) {
    console.error("bulk-update-calendar error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
