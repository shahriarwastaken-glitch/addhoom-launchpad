import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export function getSSLCommerzConfig() {
  const storeId = Deno.env.get("SSLCOMMERZ_STORE_ID") || "";
  const storePass = Deno.env.get("SSLCOMMERZ_STORE_PASSWORD") || "";
  const isLive = Deno.env.get("SSLCOMMERZ_IS_LIVE") === "true";
  const baseUrl = isLive
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";
  return { storeId, storePass, isLive, baseUrl, configured: !!(storeId && storePass) };
}

export function getAppUrl(): string {
  return Deno.env.get("SITE_URL") || "https://addhoom.lovable.app";
}

export function getFunctionsUrl(): string {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
}

export async function processSuccessfulPayment(
  supabase: ReturnType<typeof createClient>,
  tranId: string,
  valId: string | null,
  bankTranId: string | null
) {
  // Get pending transaction
  const { data: pending } = await supabase
    .from("pending_transactions")
    .select("*")
    .eq("tran_id", tranId)
    .single();

  if (!pending || pending.status !== "pending") {
    return { alreadyProcessed: true };
  }

  // Mark pending as success
  await supabase
    .from("pending_transactions")
    .update({ status: "success", val_id: valId, bank_tran_id: bankTranId })
    .eq("tran_id", tranId);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Get plan credits
  const { data: planData } = await supabase
    .from("plans")
    .select("monthly_credits, name")
    .eq("plan_key", pending.plan_key)
    .single();
  const monthlyCredits = planData?.monthly_credits || 5000;
  const planName = planData?.name || pending.plan_key;

  if (pending.is_upgrade) {
    // Update existing subscription
    await supabase
      .from("subscriptions")
      .update({
        plan_id: pending.plan_id,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        sslcommerz_transaction_id: tranId,
        val_id: valId,
        bank_tran_id: bankTranId,
        currency: pending.currency,
        amount: Math.round(pending.amount * 100),
        updated_at: now.toISOString(),
      })
      .eq("user_id", pending.user_id)
      .eq("status", "active");
  } else {
    // Cancel existing active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", pending.user_id)
      .eq("status", "active");

    // Create new subscription
    await supabase.from("subscriptions").insert({
      user_id: pending.user_id,
      plan_id: pending.plan_id,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      sslcommerz_transaction_id: tranId,
      val_id: valId,
      bank_tran_id: bankTranId,
      currency: pending.currency,
      amount: Math.round(pending.amount * 100),
    });
  }

  // Update user profile
  await supabase
    .from("profiles")
    .update({
      plan: pending.plan_key,
      plan_key: pending.plan_key,
      subscription_status: "active",
      subscription_expires_at: periodEnd.toISOString(),
      credit_balance: monthlyCredits,
      credits_reset_at: now.toISOString(),
    })
    .eq("id", pending.user_id);

  // Record credit transaction
  await supabase.from("credit_transactions").insert({
    user_id: pending.user_id,
    credits_delta: monthlyCredits,
    balance_after: monthlyCredits,
    description: `${planName} plan activated`,
    transaction_type: "subscription_payment",
  });

  // Record billing history
  await supabase.from("billing_history").insert({
    user_id: pending.user_id,
    plan_name: planName,
    amount: Math.round(pending.amount * 100),
    currency: pending.currency,
    status: "paid",
    sslcommerz_transaction_id: tranId,
  });

  // Send confirmation email
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, language_pref")
    .eq("id", pending.user_id)
    .single();

  if (profile?.email) {
    try {
      await supabase.functions.invoke("send-emails", {
        body: {
          user_id: pending.user_id,
          to_email: profile.email,
          to_name: profile.full_name,
          type: "payment_success",
          plan: pending.plan_key,
          language: profile.language_pref || "bn",
        },
      });
    } catch (e) {
      console.warn("Failed to send confirmation email:", e);
    }
  }

  return { alreadyProcessed: false, userId: pending.user_id, planKey: pending.plan_key };
}
