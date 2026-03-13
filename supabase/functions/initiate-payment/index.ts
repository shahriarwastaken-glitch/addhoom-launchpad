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

    const { plan_key, currency, is_upgrade } = await req.json();

    if (!plan_key) return errorResponse(400, "অবৈধ প্ল্যান।", "Invalid plan.");

    // Get plan details
    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("plan_key", plan_key)
      .single();

    if (!plan) return errorResponse(404, "প্ল্যান পাওয়া যায়নি।", "Plan not found.");

    const cur = currency || "BDT";
    const amount = cur === "BDT" ? plan.price_monthly_bdt : (plan.price_usd || plan.price_monthly_bdt);

    // Generate unique transaction ID
    const tranId = `ADH-${Date.now()}-${user.id.slice(0, 8)}`;

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, plan_key")
      .eq("id", user.id)
      .single();

    // Save pending transaction
    const { error: insertError } = await supabase
      .from("pending_transactions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        plan_key,
        currency: cur,
        amount,
        tran_id: tranId,
        is_upgrade: is_upgrade || false,
        previous_plan_key: is_upgrade ? profile?.plan_key : null,
      });

    if (insertError) {
      console.error("Pending transaction insert error:", insertError);
      return errorResponse(500, "পেমেন্ট তৈরি ব্যর্থ।", "Payment creation failed.");
    }

    const ssl = getSSLCommerzConfig();

    if (!ssl.configured) {
      return errorResponse(503, "পেমেন্ট গেটওয়ে সেটআপ করা হয়নি।", "Payment gateway not configured.");
    }

    // Build SSLCommerz payload
    const functionsUrl = getFunctionsUrl();

    const sslParams = new URLSearchParams({
      store_id: ssl.storeId,
      store_passwd: ssl.storePass,
      total_amount: amount.toString(),
      currency: cur,
      tran_id: tranId,
      success_url: `${functionsUrl}/payment-callback?action=success`,
      fail_url: `${functionsUrl}/payment-callback?action=fail`,
      cancel_url: `${functionsUrl}/payment-callback?action=cancel`,
      ipn_url: `${functionsUrl}/payment-ipn`,
      product_name: `AdDhoom Studio — ${plan.name}`,
      product_category: "SaaS Subscription",
      product_profile: "non-physical-goods",
      shipping_method: "NO",
      cus_name: profile?.full_name || "Customer",
      cus_email: profile?.email || user.email || "",
      cus_phone: profile?.phone || "01700000000",
      cus_add1: "Bangladesh",
      cus_city: "Dhaka",
      cus_country: "Bangladesh",
      value_a: user.id,
      value_b: plan_key,
      value_c: cur,
      value_d: is_upgrade ? "upgrade" : "new",
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
        plan_key,
        currency: cur,
      });
    } else {
      console.error("SSLCommerz error:", sslData);
      return errorResponse(500, "পেমেন্ট গেটওয়ে সমস্যা।", "Payment gateway error.");
    }
  } catch (e) {
    console.error("initiate-payment error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
