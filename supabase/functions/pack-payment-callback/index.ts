import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/addhoom.ts";
import { getSupabaseAdmin, getSSLCommerzConfig, getAppUrl } from "../_shared/payments.ts";

async function processPackPayment(
  supabase: any,
  tranId: string,
  valId: string,
  bankTranId: string | null
) {
  const { data: purchase } = await supabase
    .from("credit_pack_purchases")
    .select("*, credit_packs(*)")
    .eq("tran_id", tranId)
    .single();

  if (!purchase || purchase.status !== "pending") {
    return { alreadyProcessed: true };
  }

  // Mark as paid
  await supabase
    .from("credit_pack_purchases")
    .update({ status: "paid", val_id: valId, bank_tran_id: bankTranId })
    .eq("tran_id", tranId);

  // Atomically add credits + log transaction
  await supabase.rpc("add_pack_credits", {
    p_user_id: purchase.user_id,
    p_credits: purchase.credits,
    p_description: `${purchase.credit_packs.name} credit pack (${purchase.credits.toLocaleString()} credits)`,
  });

  // Record billing history
  await supabase.from("billing_history").insert({
    user_id: purchase.user_id,
    plan_name: `${purchase.credit_packs.name} Credits`,
    amount: Math.round(purchase.amount * 100),
    currency: purchase.currency,
    status: "paid",
    sslcommerz_transaction_id: tranId,
  });

  return { alreadyProcessed: false, credits: purchase.credits };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "success";
    const supabase = getSupabaseAdmin();
    const appUrl = getAppUrl();

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
      if (status !== "VALID" && status !== "VALIDATED") {
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
        });
      }

      // Verify with SSLCommerz — val_id mandatory
      const ssl = getSSLCommerzConfig();
      if (ssl.configured) {
        if (!valId) {
          console.error("pack-payment-callback: val_id missing. Possible forged callback for tran_id:", tranId);
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

      const result = await processPackPayment(supabase, tranId, valId, bankTranId);

      if (result.alreadyProcessed) {
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/dashboard?payment=already_processed` },
        });
      }

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard?payment=credits_added&credits=${result.credits}` },
      });
    }

    if (action === "fail") {
      await supabase
        .from("credit_pack_purchases")
        .update({ status: "failed" })
        .eq("tran_id", tranId);

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
      });
    }

    if (action === "cancel") {
      await supabase
        .from("credit_pack_purchases")
        .update({ status: "cancelled" })
        .eq("tran_id", tranId);

      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=cancelled` },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard` },
    });
  } catch (e) {
    console.error("pack-payment-callback error:", e);
    const appUrl = getAppUrl();
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/dashboard/settings?tab=billing&payment=failed` },
    });
  }
});
