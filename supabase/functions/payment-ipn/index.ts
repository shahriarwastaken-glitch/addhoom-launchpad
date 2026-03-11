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

    // Verify store ID
    const ssl = getSSLCommerzConfig();
    if (ssl.configured && storeId !== ssl.storeId) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (status !== "VALID" && status !== "VALIDATED") {
      return new Response("OK", { status: 200 });
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
