const LIMITS: Record<string, Record<string, number>> = {
  pro: {
    ad_generator: 999999,
    ai_chat: 999999,
    competitor_intel: 999999,
    account_doctor: 999999,
    video_ad: 2,
    content_calendar: 999999,
    remix_ad: 999999
  },
  agency: {
    ad_generator: 999999,
    ai_chat: 999999,
    competitor_intel: 999999,
    account_doctor: 999999,
    video_ad: 999999,
    content_calendar: 999999,
    remix_ad: 999999
  }
};

export async function checkPlanLimit(
  supabaseClient: any,
  userId: string,
  feature: string,
  language: string = "bn"
): Promise<{ allowed: boolean; plan: string; used: number; limit: number }> {
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const plan = profile?.plan || "pro";
  const planLimits = LIMITS[plan] || LIMITS.pro;
  const limit = planLimits[feature] ?? 999999;

  if (feature === "video_ad" && plan === "pro") {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count } = await supabaseClient
      .from("usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", "video_ad")
      .gte("created_at", firstOfMonth);

    const used = count || 0;
    return { allowed: used < limit, plan, used, limit };
  }

  return { allowed: true, plan, used: 0, limit };
}
