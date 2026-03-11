import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Downgrade expired subscriptions
    const { data: expired } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, language_pref")
      .neq("plan", "pro") // only check non-default (agency users who expired)
      .lt("subscription_expires_at", now)
      .eq("subscription_status", "active");

    for (const profile of expired || []) {
      await supabase.from("profiles").update({
        plan: "pro",
        subscription_status: "inactive",
      }).eq("id", profile.id);

      // Send expiry email
      if (profile.email) {
        await supabase.functions.invoke("send-emails", {
          body: {
            user_id: profile.id,
            to_email: profile.email,
            to_name: profile.full_name,
            type: "subscription_expired",
            language: profile.language_pref || "bn",
          },
        });
      }
    }

    // 2. Warn users expiring in 3 days
    const { data: expiring } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, language_pref")
      .neq("plan", "pro")
      .gt("subscription_expires_at", now)
      .lt("subscription_expires_at", threeDaysFromNow)
      .eq("subscription_status", "active");

    for (const profile of expiring || []) {
      if (profile.email) {
        await supabase.functions.invoke("send-emails", {
          body: {
            user_id: profile.id,
            to_email: profile.email,
            to_name: profile.full_name,
            type: "subscription_expiring",
            language: profile.language_pref || "bn",
          },
        });
      }
    }

    // 3. Reset credits for users whose 30-day cycle has elapsed
    await supabase.rpc('reset_monthly_credits');

    return jsonResponse({
      expired_count: (expired || []).length,
      expiring_count: (expiring || []).length,
    });
  } catch (e) {
    console.error("check-subscriptions error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
