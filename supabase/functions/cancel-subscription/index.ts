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
    const { reason } = await req.json();

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      return errorResponse(404, "সক্রিয় সাবস্ক্রিপশন নেই।", "No active subscription.");
    }

    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    // Log the cancellation reason
    if (reason) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "subscription_cancelled",
        old_value: subscription.plan_id,
        reason,
        target_user_id: user.id,
      });
    }

    return jsonResponse({
      success: true,
      access_until: subscription.current_period_end,
    });
  } catch (e) {
    console.error("cancel-subscription error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
