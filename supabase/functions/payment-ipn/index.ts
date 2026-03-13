import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/addhoom.ts";
import { getSupabaseAdmin, getSSLCommerzConfig, processSuccessfulPayment } from "../_shared/payments.ts";

// IPN (Instant Payment Notification) — server-to-server backup
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

    // Reject if SSLCommerz is not configured — never process unverified IPNs
    if (!ssl.configured) {
      console.error("IPN rejected: SSLCommerz not configured");
      return new Response("Payment gateway not configured", { status: 503 });
    }

    // Verify store ID
    if (storeId !== ssl.storeId) {
      console.error("IPN rejected: store_id mismatch");
      return new Response("Unauthorized", { status: 401 });
    }

    if (status !== "VALID" && status !== "VALIDATED") {
      return new Response("OK", { status: 200 });
    }

    // Verify val_id with SSLCommerz validation API (mirrors payment-callback)
    if (!valId) {
      console.error("IPN rejected: missing val_id");
      return new Response("Missing val_id", { status: 400 });
    }

    const verifyRes = await fetch(
      `${ssl.baseUrl}/validator/api/validationserverAPI.php` +
      `?val_id=${valId}&store_id=${ssl.storeId}&store_passwd=${ssl.storePass}&v=1&format=json`
    );
    const verified = await verifyRes.json();

    if (verified.status !== "VALID" && verified.status !== "VALIDATED") {
      console.error("IPN rejected: val_id verification failed", verified.status);
      return new Response("Validation failed", { status: 401 });
    }

    // Check if already processed
    const { data: pending } = await supabase
      .from("pending_transactions")
      .select("status")
      .eq("tran_id", tranId)
      .single();

    if (pending?.status === "success") {
      return new Response("OK", { status: 200 });
    }

    // Process payment (fallback if redirect failed)
    await processSuccessfulPayment(supabase, tranId, valId, bankTranId);

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("payment-ipn error:", e);
    return new Response("Error", { status: 500 });
  }
});
