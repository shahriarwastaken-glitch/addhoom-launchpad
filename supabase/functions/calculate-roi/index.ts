import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { monthly_spend_bdt, hours_weekly, platforms } = await req.json();

    const spend = monthly_spend_bdt || 0;
    const hours = hours_weekly || 0;

    const freelancer_cost_per_campaign = 4000;
    const founder_hourly_value = 500;
    const addhoom_monthly_cost = 2999;

    const monthly_time_cost = hours * 4 * founder_hourly_value;
    const monthly_freelancer_savings = 4 * freelancer_cost_per_campaign;
    const monthly_tool_savings = 2000;

    const total_monthly_savings =
      monthly_time_cost + monthly_freelancer_savings + monthly_tool_savings - addhoom_monthly_cost;

    const annual_savings = total_monthly_savings * 12;
    const hours_saved_monthly = Math.round(hours * 4 * 0.7);
    const roi_pct = Math.round((total_monthly_savings / addhoom_monthly_cost) * 100);
    const roas_boost = 25;

    return jsonResponse({
      annual_savings_bdt: Math.max(0, annual_savings),
      monthly_savings_bdt: Math.max(0, total_monthly_savings),
      hours_saved_monthly,
      roi_pct: Math.max(0, roi_pct),
      roas_boost,
    });
  } catch (e) {
    console.error("calculate-roi error:", e);
    return jsonResponse({ annual_savings_bdt: 0, monthly_savings_bdt: 0, hours_saved_monthly: 0, roi_pct: 0, roas_boost: 25 });
  }
});
