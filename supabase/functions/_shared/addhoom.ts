export const ADDHOOM_SYSTEM_PROMPT = `You are AdDhoom AI — a world-class digital marketing strategist who specializes exclusively in Bangladesh's e-commerce market.

MARKET KNOWLEDGE:
- Bangladesh e-commerce platforms: Daraz, Chaldal, Shajgoj, Pathao, Shohoz
- 90%+ of BD shoppers browse on mobile — always optimize for mobile
- Facebook is the #1 ad platform in Bangladesh — always prioritize it
- WhatsApp/Messenger CTA converts extremely well for BD audiences
- BDT pricing psychology: ৳999 beats ৳1000, ৳49 feels cheap vs ৳50

COPYWRITING RULES:
- Bangla: write naturally, NOT translated from English. Warm, conversational.
- Use "আপনি" for trust-building, "তুমি" only for youth products
- Urgency: "সীমিত সময়" · "স্টক শেষ হওয়ার আগে" · "আজই অর্ডার করুন"
- Social proof: "হাজার হাজার সন্তুষ্ট গ্রাহক"
- Always highlight "ফ্রি ডেলিভারি" if applicable — very powerful in BD
- 1-3 emojis max for Facebook ads
- Headlines: under 40 Bangla chars, under 30 English chars

SEASONAL CAMPAIGNS:
- Eid ul-Fitr and Eid ul-Adha: launch 2 weeks before, 3x conversion rates
- Ramadan: 40-60% higher ad costs, plan budget accordingly
- Pohela Boishakh: strong for fashion, food, lifestyle
- Durga Puja: strong for Hindu-majority areas (Sylhet, Chittagong)
- 16 December: patriotic products, national pride messaging

STRATEGY RULES:
- Minimum ৳500/day for small BD shops to see results
- Always recommend retargeting — massively underused in BD
- Video ads outperform image ads 2x in BD market
- Friday-Saturday highest engagement days in BD

RESPONSE RULES:
- If user writes in Bangla → respond fully in Bangla
- If user writes in English → respond in English
- Be warm, direct, practical — no jargon
- Always give BDT numbers in recommendations
- When generating ads → return ONLY valid JSON, no explanation text`;

export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  pro: {
    ad_generator: 999999,
    ai_chat: 999999,
    competitor_intel: 999999,
    account_doctor: 1, // daily
    workspaces: 5,
  },
  agency: {
    ad_generator: 999999,
    ai_chat: 999999,
    competitor_intel: 999999,
    account_doctor: 999999,
    workspaces: 20,
  },
};

export async function checkPlanLimit(
  supabaseClient: any,
  userId: string,
  feature: string,
  plan: string
): Promise<{ allowed: boolean; message_bn?: string; message_en?: string }> {
  const limits = PLAN_LIMITS[plan];
  if (!limits) {
    return { allowed: false, message_bn: "অবৈধ প্ল্যান।", message_en: "Invalid plan." };
  }

  const limit = limits[feature];
  if (limit >= 999999) return { allowed: true };

  // Check today's usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabaseClient
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature)
    .gte("created_at", today.toISOString());

  if ((count || 0) >= limit) {
    return {
      allowed: false,
      message_bn: "আজকের সীমা শেষ। আপগ্রেড করুন।",
      message_en: "Daily limit reached. Please upgrade.",
    };
  }

  return { allowed: true };
}

export async function logUsage(
  supabaseClient: any,
  userId: string,
  workspaceId: string,
  feature: string,
  tokensUsed: number = 0
) {
  await supabaseClient.from("usage_logs").insert({
    user_id: userId,
    workspace_id: workspaceId,
    feature,
    tokens_used: tokensUsed,
  });
}

async function getApiKey(keyName: string): Promise<string> {
  // Try reading from api_keys table first (admin-managed)
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await sb
      .from("api_keys")
      .select("key_value")
      .eq("key_name", keyName)
      .eq("is_active", true)
      .maybeSingle();
    if (data?.key_value) return data.key_value;
  } catch (e) {
    console.warn("Could not read api_keys table, falling back to env:", e);
  }
  // Fallback to env var
  const envVal = Deno.env.get(keyName);
  if (!envVal) throw new Error(`${keyName} not configured`);
  return envVal;
}

export async function callGemini(prompt: string, systemPrompt: string = ADDHOOM_SYSTEM_PROMPT): Promise<string> {
  const apiKey = await getApiKey("GEMINI_API_KEY");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\n" + prompt }] },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini API error:", response.status, err);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function callGeminiMultiturn(
  messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemPrompt: string = ADDHOOM_SYSTEM_PROMPT
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Prepend system instruction as first user message if not already there
  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "বুঝেছি। আমি AdDhoom AI — বাংলাদেশের ই-কমার্সের জন্য আপনার মার্কেটিং এক্সপার্ট। কীভাবে সাহায্য করতে পারি?" }] },
    ...messages,
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini API error:", response.status, err);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function errorResponse(code: number, messageBn: string, messageEn: string) {
  return new Response(
    JSON.stringify({ error: true, code, message_bn: messageBn, message_en: messageEn }),
    { status: code, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
