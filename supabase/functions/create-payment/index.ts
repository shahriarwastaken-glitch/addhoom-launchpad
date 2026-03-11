import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";

const PLAN_PRICES: Record<string, Record<string, number>> = {
  pro: { monthly: 2999, annual: Math.round(2999 * 12 * 0.8) },
  agency: { monthly: 7999, annual: Math.round(7999 * 12 * 0.8) },
};

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

    const { plan, billing_cycle } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return errorResponse(400, "অবৈধ প্ল্যান।", "Invalid plan.");
    }

    const cycle = billing_cycle || "monthly";
    const amount = PLAN_PRICES[plan][cycle];

    const { data: profile } = await supabase
      .from("profiles").select("full_name, email, phone").eq("id", user.id).single();

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        amount_bdt: amount,
        plan_purchased: plan,
        billing_cycle: cycle,
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return errorResponse(500, "পেমেন্ট তৈরি ব্যর্থ।", "Payment creation failed.");
    }

    const SSL_STORE_ID = Deno.env.get("SSLCOMMERZ_STORE_ID");
    const SSL_STORE_PASSWD = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD");

    if (!SSL_STORE_ID || !SSL_STORE_PASSWD) {
      // SSLCommerz not configured — simulate success for dev
      // Activate the plan directly using service role
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // Get plan monthly credits
      const { data: planData } = await supabase
        .from("plans").select("monthly_credits").eq("plan_key", plan).single();
      const monthlyCredits = planData?.monthly_credits || 5000;

      await supabase.from("profiles").update({
        plan,
        plan_key: plan,
        subscription_status: "active",
        subscription_expires_at: expiresAt,
        credit_balance: monthlyCredits,
        credits_reset_at: nowIso,
      }).eq("id", user.id);

      // Record credit grant transaction
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        credits_delta: monthlyCredits,
        balance_after: monthlyCredits,
        description: `Plan activated: ${plan}`,
        transaction_type: "monthly_reset",
      });

      await supabase.from("payments").update({
        status: "completed",
        method: "dev_mode",
      }).eq("id", payment.id);

      return jsonResponse({
        payment_id: payment.id,
        amount_bdt: amount,
        plan,
        billing_cycle: cycle,
        gateway_url: null,
        message_bn: "ডেভ মোড: প্ল্যান সক্রিয় হয়েছে।",
        message_en: "Dev mode: Plan activated.",
        dev_mode: true,
      });
    }

    // Call SSLCommerz API
    const sslParams = new URLSearchParams({
      store_id: SSL_STORE_ID,
      store_passwd: SSL_STORE_PASSWD,
      total_amount: amount.toString(),
      currency: "BDT",
      tran_id: payment.id,
      product_name: `AdDhoom ${plan} Plan`,
      product_category: "subscription",
      cus_name: profile?.full_name || "Customer",
      cus_email: profile?.email || user.email || "",
      cus_phone: profile?.phone || "N/A",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      success_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sslcommerz-webhook`,
      fail_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sslcommerz-webhook`,
      cancel_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sslcommerz-webhook`,
      ipn_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/sslcommerz-webhook`,
      shipping_method: "NO",
      product_profile: "non-physical-goods",
    });

    const sslRes = await fetch("https://sandbox.sslcommerz.com/gwprocess/v4/api.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: sslParams.toString(),
    });

    const sslData = await sslRes.json();

    if (sslData.status === "SUCCESS") {
      await supabase.from("payments").update({
        ssl_session_id: sslData.sessionkey,
      }).eq("id", payment.id);

      return jsonResponse({
        payment_id: payment.id,
        gateway_url: sslData.GatewayPageURL,
        amount_bdt: amount,
        plan,
        billing_cycle: cycle,
      });
    } else {
      return errorResponse(500, "পেমেন্ট গেটওয়ে সমস্যা।", "Payment gateway error.");
    }
  } catch (e) {
    console.error("create-payment error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
