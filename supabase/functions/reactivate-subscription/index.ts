import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";
import { getSupabaseAdmin } from "../_shared/payments.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        cancelled_at: null,
      })
      .eq("user_id", user.id)
      .eq("status", "active");

    if (error) {
      console.error("Reactivate error:", error);
      return errorResponse(500, "পুনরায় সক্রিয় করতে ব্যর্থ।", "Failed to reactivate.");
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error("reactivate-subscription error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
