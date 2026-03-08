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

    // SSLCommerz sends form-encoded POST
    const formData = await req.formData();
    const tranId = formData.get("tran_id") as string;
    const valId = formData.get("val_id") as string;
    const status = formData.get("status") as string;

    if (!tranId) {
      return jsonResponse({ error: "Missing tran_id" }, 400);
    }

    // Get payment record
    const { data: payment } = await supabase
      .from("payments").select("*").eq("id", tranId).single();

    if (!payment) {
      return jsonResponse({ error: "Payment not found" }, 404);
    }

    if (status === "VALID" || status === "VALIDATED") {
      // Validate with SSLCommerz
      const SSL_STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID");
      const SSL_STORE_PASSWD = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");

      let validated = false;
      if (SSL_STORE_ID && SSL_STORE_PASSWD && valId) {
        const valRes = await fetch(
          `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${SSL_STORE_ID}&store_passwd=${SSL_STORE_PASSWD}&format=json`
        );
        const valData = await valRes.json();
        validated = valData.status === "VALID" || valData.status === "VALIDATED";
      } else {
        validated = true; // Dev mode
      }

      if (validated) {
        // Update payment
        await supabase.from("payments").update({
          status: "success",
          transaction_id: valId || "dev-mode",
        }).eq("id", tranId);

        // Update user profile
        const expiresAt = payment.billing_cycle === "annual"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await supabase.from("profiles").update({
          plan: payment.plan_purchased,
          subscription_status: "active",
          subscription_expires_at: expiresAt.toISOString(),
        }).eq("id", payment.user_id);

        // Send confirmation email
        const { data: profile } = await supabase
          .from("profiles").select("email, full_name, language_pref").eq("id", payment.user_id).single();

        if (profile?.email) {
          await supabase.functions.invoke("send-emails", {
            body: {
              user_id: payment.user_id,
              to_email: profile.email,
              to_name: profile.full_name,
              type: "payment_success",
              plan: payment.plan_purchased,
              language: profile.language_pref || "bn",
            },
          });
        }

        // Redirect to success page
        return new Response(null, {
          status: 302,
          headers: { Location: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || ''}/dashboard?payment=success` },
        });
      }
    }

    // Failed payment
    await supabase.from("payments").update({ status: "failed" }).eq("id", tranId);

    return new Response(null, {
      status: 302,
      headers: { Location: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || ''}/dashboard?payment=failed` },
    });
  } catch (e) {
    console.error("sslcommerz-webhook error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
