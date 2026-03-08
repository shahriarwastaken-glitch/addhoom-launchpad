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

    const { item_id, title, content_idea, date, content_type, platform, status } = await req.json();
    if (!item_id) return errorResponse(400, "আইটেম আইডি দিন।", "Item ID required.");

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (content_idea !== undefined) updates.content_idea = content_idea;
    if (date !== undefined) updates.date = date;
    if (content_type !== undefined) updates.content_type = content_type;
    if (platform !== undefined) updates.platform = platform;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from("content_calendar")
      .update(updates)
      .eq("id", item_id)
      .select()
      .single();

    if (error) return errorResponse(500, "আপডেট ব্যর্থ।", "Update failed.");

    return jsonResponse({ success: true, item: data });
  } catch (e) {
    console.error("update-calendar-item error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
