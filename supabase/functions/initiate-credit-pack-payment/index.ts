import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";
import { getSupabaseAdmin, getSSLCommerzConfig, getFunctionsUrl } from "../_shared/payments.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = getSupabaseAdmin();
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { pack_id, currency } = await req.json();
    if (!pack_id) return errorResponse(400, "প্যাক নির্বাচন করুন।", "Please select a pack.");

    // Block unsubscribed users
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status, full_name, email, phone, plan_key")
      .eq("id", user.id)
      .single();

    if (!profile || profile.subscription_status !== "active") {
      return errorResponse(403, "ক্রেডিট প্যাক কিনতে সাবস্ক্রিপশন প্রয়োজন।", "Active subscription required to purchase credit packs.");
    }

    // Get pack details
    const { data: pack } = await supabase
      .from("credit_packs")
      .select("*")
      .eq("id", pack_id)
      .eq("is_active", true)
      .single();

    if (!pack) return errorResponse(404, "প্যাক পাওয়া যায়নি।", "Pack not found.");

    const cur = currency || "BDT";
    const amount = cur === "BDT" ? pack.price_bdt : pack.price_usd;
    const tranId = `ADH-PACK-${Date.now()}-${user.id.slice(0, 8)}`;

    // Save pending purchase
    const { error: insertError } = await supabase
      .from("credit_pack_purchases")
      .insert({
        user_id: user.id,
        pack_id: pack.id,
        credits: pack.credits,
        amount,
        currency: cur,
        tran_id: tranId,
        status: "pending",
      });

    if (insertError) {
      console.error("Pack purchase insert error:", insertError);
      return errorResponse(500, "পেমেন্ট তৈরি ব্যর্থ।", "Payment creation failed.");
    }

    const ssl = getSSLCommerzConfig();
    if (!ssl.configured) {
      return errorResponse(503, "পেমেন্ট গেটওয়ে সেটআপ করা হয়নি।", "Payment gateway not configured.");
    }

    const functionsUrl = getFunctionsUrl();

    const sslParams = new URLSearchParams({
      store_id: ssl.storeId,
      store_passwd: ssl.storePass,
      total_amount: amount.toString(),
      currency: cur,
      tran_id: tranId,
      success_url: `${functionsUrl}/pack-payment-callback?action=success`,
      fail_url: `${functionsUrl}/pack-payment-callback?action=fail`,
      cancel_url: `${functionsUrl}/pack-payment-callback?action=cancel`,
      ipn_url: `${functionsUrl}/pack-payment-ipn`,
      product_name: `AdDhoom Studio — ${pack.name} Credit Pack`,
      product_category: "Credits",
      product_profile: "non-physical-goods",
      shipping_method: "NO",
      cus_name: profile.full_name || "Customer",
      cus_email: profile.email || user.email || "",
      cus_phone: profile.phone || "01700000000",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      value_a: user.id,
      value_b: pack_id,
      value_c: cur,
      value_d: "credit_pack",
    });

    const sslRes = await fetch(`${ssl.baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: sslParams.toString(),
    });

    const sslData = await sslRes.json();

    if (sslData.status === "SUCCESS") {
      return jsonResponse({
        tran_id: tranId,
        gateway_url: sslData.GatewayPageURL,
        amount,
        pack_name: pack.name,
        credits: pack.credits,
        currency: cur,
      });
    } else {
      console.error("SSLCommerz error:", sslData);
      return errorResponse(500, "পেমেন্ট গেটওয়ে সমস্যা।", "Payment gateway error.");
    }
  } catch (e) {
    console.error("initiate-credit-pack-payment error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
