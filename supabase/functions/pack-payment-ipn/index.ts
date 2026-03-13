import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/addhoom.ts";
import { getSupabaseAdmin, getSSLCommerzConfig } from "../_shared/payments.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getSupabaseAdmin();
    const formData = await req.formData();
    const tranId = formData.get("tran_id") as string;
    const valId = formData.get("val_id") as string;
    const bankTranId = formData.get("bank_tran_id") as string;
    const status = formData.get("status") as string;
    const storeId = formData.get("store_id") as string;

    const ssl = getSSLCommerzConfig();

    if (!ssl.configured) {
      console.error("Pack IPN rejected: SSLCommerz not configured");
      return new Response("Payment gateway not configured", { status: 503 });
    }

    if (storeId !== ssl.storeId) {
      console.error("Pack IPN rejected: store_id mismatch");
      return new Response("Unauthorized", { status: 401 });
    }

    if (status !== "VALID" && status !== "VALIDATED") {
      return new Response("OK", { status: 200 });
    }

    if (!valId) {
      console.error("Pack IPN rejected: missing val_id");
      return new Response("Missing val_id", { status: 400 });
    }

    // Verify with SSLCommerz
    const verifyRes = await fetch(
      `${ssl.baseUrl}/validator/api/validationserverAPI.php` +
      `?val_id=${valId}&store_id=${ssl.storeId}&store_passwd=${ssl.storePass}&v=1&format=json`
    );
    const verified = await verifyRes.json();

    if (verified.status !== "VALID" && verified.status !== "VALIDATED") {
      console.error("Pack IPN rejected: val_id verification failed", verified.status);
      return new Response("Validation failed", { status: 401 });
    }

    // Check if already processed
    const { data: purchase } = await supabase
      .from("credit_pack_purchases")
      .select("status, credits, user_id, credit_packs(name)")
      .eq("tran_id", tranId)
      .single();

    if (!purchase || purchase.status === "paid") {
      return new Response("OK", { status: 200 });
    }

    // Process
    await supabase
      .from("credit_pack_purchases")
      .update({ status: "paid", val_id: valId, bank_tran_id: bankTranId })
      .eq("tran_id", tranId);

    const packName = (purchase as any).credit_packs?.name || "Credit";
    await supabase.rpc("add_pack_credits", {
      p_user_id: purchase.user_id,
      p_credits: purchase.credits,
      p_description: `${packName} credit pack (${purchase.credits.toLocaleString()} credits)`,
    });

    await supabase.from("billing_history").insert({
      user_id: purchase.user_id,
      plan_name: `${packName} Credits`,
      amount: Math.round((purchase as any).amount * 100),
      currency: (purchase as any).currency,
      status: "paid",
      sslcommerz_transaction_id: tranId,
    });

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("pack-payment-ipn error:", e);
    return new Response("Error", { status: 500 });
  }
});
