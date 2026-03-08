import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, checkPlanLimit, logUsage,
  errorResponse, jsonResponse, ADDHOOM_SYSTEM_PROMPT,
} from "../_shared/addhoom.ts";

const BD_FESTIVALS = [
  { name: 'ঈদ উল-ফিতর', en_name: 'Eid ul-Fitr', month: 3, day: 31, prep_days: 14, occasion: 'eid' },
  { name: 'ঈদ উল-আযহা', en_name: 'Eid ul-Adha', month: 6, day: 7, prep_days: 14, occasion: 'eid' },
  { name: 'পহেলা বৈশাখ', en_name: 'Pohela Boishakh', month: 4, day: 14, prep_days: 7, occasion: 'boishakh' },
  { name: 'বিজয় দিবস', en_name: 'Victory Day', month: 12, day: 16, prep_days: 5, occasion: 'december16' },
  { name: 'ভালোবাসা দিবস', en_name: "Valentine's Day", month: 2, day: 14, prep_days: 5, occasion: 'valentine' },
  { name: 'মা দিবস', en_name: "Mother's Day", month: 5, day: 12, prep_days: 5, occasion: 'mothers_day' },
  { name: 'দুর্গা পূজা', en_name: 'Durga Puja', month: 10, day: 2, prep_days: 7, occasion: 'puja' },
];

function getUpcomingFestivals(startDate: Date, days: number) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  const results: any[] = [];

  for (const f of BD_FESTIVALS) {
    // Check current year and next year
    for (const yearOffset of [0, 1]) {
      const year = startDate.getFullYear() + yearOffset;
      const festDate = new Date(year, f.month - 1, f.day);
      if (festDate >= startDate && festDate <= endDate) {
        results.push({
          ...f,
          date: festDate.toISOString().split('T')[0],
        });
      }
    }
  }
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const { data: profile } = await supabase
      .from("profiles").select("plan").eq("id", user.id).single();

    const limitCheck = await checkPlanLimit(supabase, user.id, "ad_generator", profile?.plan || "pro");
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const { workspace_id, start_date, language } = await req.json();
    if (!workspace_id) return errorResponse(400, "ওয়ার্কস্পেস আইডি দিন।", "Workspace ID required.");

    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();
    if (!workspace) return errorResponse(404, "শপ পাওয়া যায়নি।", "Shop not found.");

    const lang = language || "bn";
    const sDate = start_date ? new Date(start_date) : new Date();
    const festivals = getUpcomingFestivals(sDate, 90);

    const festivalsText = festivals.length > 0
      ? festivals.map(f => `- ${lang === 'bn' ? f.name : f.en_name}: ${f.date} (start campaign ${f.prep_days} days before)`).join('\n')
      : "No major festivals in this period.";

    const prompt = `Create a 90-day social media content calendar for a Bangladesh e-commerce shop.

START DATE: ${sDate.toISOString().split('T')[0]}

SHOP: ${workspace.shop_name || "N/A"} | ${workspace.industry || "General"} | Tone: ${workspace.brand_tone || "Friendly"}
TARGET AUDIENCE: ${workspace.target_audience || "General BD shoppers"}
KEY PRODUCTS: ${workspace.key_products || "Various products"}

UPCOMING FESTIVALS IN THIS PERIOD:
${festivalsText}

CONTENT MIX RULES:
- 40% Product ads (direct selling)
- 25% Educational/tips content (builds trust)
- 20% Social proof/testimonial content
- 15% Festival/seasonal campaigns

CALENDAR RULES:
- Never put heavy selling content on Friday (ছুটির দিন — lower intention)
- Saturday and Sunday: highest engagement in BD — use for best product ads
- Start festival campaigns exactly the specified days before the festival
- Vary content types — never same type 2 days in a row

Generate exactly 90 entries.

Language: ${lang === 'bn' ? 'All titles, content_idea, and hook MUST be in Bangla' : 'Respond in English'}

Return ONLY valid JSON array of exactly 90 objects:
[
  {
    "date": "YYYY-MM-DD",
    "day_of_week": "Saturday",
    "content_type": "product_ad | educational | social_proof | festival",
    "platform": "facebook | instagram | both",
    "title": "short content title",
    "content_idea": "2-3 sentence description of what to post",
    "hook": "the opening line for this content",
    "occasion": "general | eid | boishakh | puja | december16 | valentine | mothers_day",
    "priority": "high | medium | low"
  }
]`;

    const content = await callGemini(prompt, ADDHOOM_SYSTEM_PROMPT);

    let entries: any[];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      entries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      console.error("Failed to parse calendar JSON:", content.substring(0, 200));
      return errorResponse(500, "ক্যালেন্ডার তৈরিতে সমস্যা হয়েছে।", "Failed to generate calendar.");
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return errorResponse(500, "ক্যালেন্ডার তৈরি হয়নি।", "Calendar generation failed.");
    }

    // Create a batch ID for this generation
    const batchId = crypto.randomUUID();

    // Bulk insert
    const rows = entries.map(e => ({
      workspace_id,
      date: e.date,
      day_of_week: e.day_of_week || null,
      content_type: e.content_type || "product_ad",
      platform: e.platform || "facebook",
      title: e.title || "",
      content_idea: e.content_idea || "",
      hook: e.hook || "",
      occasion: e.occasion || "general",
      priority: e.priority || "medium",
      status: "pending",
      batch_id: batchId,
    }));

    const { error: insertError } = await supabase
      .from("content_calendar")
      .insert(rows);

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse(500, "সংরক্ষণে সমস্যা হয়েছে।", "Failed to save calendar.");
    }

    await logUsage(supabase, user.id, workspace_id, "content_calendar");

    return jsonResponse({
      success: true,
      entries_count: rows.length,
      batch_id: batchId,
      festivals_found: festivals.length,
    });
  } catch (e) {
    console.error("generate-content-calendar error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
