import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/addhoom.ts";
import { getSupabaseAdmin, getSSLCommerzConfig, getAppUrl, processSuccessfulPayment } from "../_shared/payments.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "success";
    const supabase = getSupabaseAdmin();
    const appUrl = getAppUrl();

    // SSLCommerz sends form-encoded POST
    const formData = await req.formData();
    const tranId = formData.get("tran_id") as string;
    const valId = formData.get("val_id") as string;
    const bankTranId = formData.get("bank_tran_id") as string;
    const status = formData.get("status") as string;

    if (!tranId) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
      });
    }

    if (action === "success") {
      // Only process VALID status
      if (status !== "VALID" && status !== "VALIDATED") {
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
        });
      }

      // Verify with SSLCommerz
      const ssl = getSSLCommerzConfig();
      if (ssl.configured) {
        // val_id is mandatory when SSLCommerz is configured — reject forged callbacks
        if (!valId) {
          console.error("payment-callback: val_id missing with SSLCommerz configured. Possible forged callback for tran_id:", tranId);
          return new Response(null, {
            status: 302,
            headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
          });
        }

        const verifyRes = await fetch(
          `${ssl.baseUrl}/validator/api/validationserverAPI.php` +
          `?val_id=${valId}&store_id=${ssl.storeId}&store_passwd=${ssl.storePass}&v=1&format=json`
        );
        const verified = await verifyRes.json();

        if (verified.status !== "VALID" && verified.status !== "VALIDATED") {
          return new Response(null, {
            status: 302,
            headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
          });
        }
      }

      // Process the payment
      const result = await processSuccessfulPayment(supabase, tranId, valId, bankTranId);

      if (result.alreadyProcessed) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/dashboard?payment=already_processed` },
        });
      }

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard?payment=success` },
      });
    }

    if (action === "fail") {
      await supabase
        .from("pending_transactions")
        .update({ status: "failed" })
        .eq("tran_id", tranId);

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
      });
    }

    if (action === "cancel") {
      await supabase
        .from("pending_transactions")
        .update({ status: "cancelled" })
        .eq("tran_id", tranId);

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=cancelled` },
      });
    }

    // Unknown action
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard` },
    });
  } catch (e) {
    console.error("payment-callback error:", e);
    const appUrl = getAppUrl();
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
    });
  }
});
