import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, checkPlanLimit, logUsage,
  errorResponse, jsonResponse, ADDHOOM_SYSTEM_PROMPT,
} from "../_shared/addhoom.ts";
import { deductCredits, insufficientCreditsResponse } from "../_shared/credits.ts";

const BD_FESTIVALS = [
  { name: 'পহেলা বৈশাখ', en_name: 'Pohela Boishakh', type: 'fixed', month: 4, day: 14, prep_days: 14, color: '#E53E3E', emoji: '🎊', occasion: 'boishakh', content_themes: ['নতুন বছর শুরু করুন নতুনভাবে', 'বৈশাখী কালেকশন', 'পরিবারের জন্য উপহার'] },
  { name: 'বিজয় দিবস', en_name: 'Victory Day', type: 'fixed', month: 12, day: 16, prep_days: 7, color: '#276749', emoji: '🇧🇩', occasion: 'december16', content_themes: ['দেশীয় পণ্যে গর্ব', 'বিজয়ের উৎসবে বিশেষ ছাড়'] },
  { name: 'ভালোবাসা দিবস', en_name: "Valentine's Day", type: 'fixed', month: 2, day: 14, prep_days: 7, color: '#E53E3E', emoji: '❤️', occasion: 'valentine', content_themes: ['প্রিয়জনকে উপহার দিন', 'ভালোবাসার উপহার'] },
  { name: 'মাতৃ দিবস', en_name: "Mother's Day", type: 'floating', month: 5, day: 11, prep_days: 7, color: '#D53F8C', emoji: '💐', occasion: 'mothers_day', content_themes: ['মায়ের জন্য সেরা উপহার', 'মায়ের হাসির জন্য'] },
  { name: 'ঈদুল ফিতর', en_name: 'Eid ul-Fitr', type: 'islamic', month: 3, day: 31, prep_days: 21, color: '#276749', emoji: '🌙', occasion: 'eid', intensity: 'CRITICAL', content_themes: ['ঈদের পোশাক কালেকশন', 'ঈদ গিফট বক্স', 'ঈদ স্পেশাল অফার', 'ঈদের আনন্দ ভাগ করুন'] },
  { name: 'ঈদুল আযহা', en_name: 'Eid ul-Adha', type: 'islamic', month: 6, day: 7, prep_days: 14, color: '#276749', emoji: '🐑', occasion: 'eid', content_themes: ['কোরবানির ঈদের অফার', 'পরিবারের সাথে ঈদ'] },
  { name: 'রমজান', en_name: 'Ramadan', type: 'islamic', month: 3, day: 1, prep_days: 7, color: '#553C9A', emoji: '🌙', occasion: 'ramadan', duration: 30, content_themes: ['রমজান মোবারক', 'ইফতারের সময়ের পোস্ট', 'সেহরির আগের অফার'] },
  { name: 'দুর্গা পূজা', en_name: 'Durga Puja', type: 'fixed', month: 10, day: 2, prep_days: 7, color: '#D53F8C', emoji: '🪔', occasion: 'puja', content_themes: ['পূজায় বিশেষ অফার'] },
];

function getUpcomingFestivals(startDate: Date, days: number) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  const results: any[] = [];

  for (const f of BD_FESTIVALS) {
    for (const yearOffset of [0, 1]) {
      const year = startDate.getFullYear() + yearOffset;
      const festDate = new Date(year, f.month - 1, f.day);
      if (festDate >= startDate && festDate <= endDate) {
        const daysUntil = Math.ceil((festDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        results.push({
          ...f,
          date: festDate.toISOString().split('T')[0],
          days_until: daysUntil,
        });
      }
    }
  }
  return results.sort((a, b) => a.days_until - b.days_until);
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

    const limitCheck = await checkPlanLimit(supabase, user.id, "content_calendar", profile?.plan || "pro");
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const { workspace_id, start_date, posts_per_week, platforms, content_mix, regenerate, language } = await req.json();

    // Credit check
    const creditResult = await deductCredits({
      supabase, userId: user.id, workspaceId: workspace_id,
      actionKey: 'content_calendar', quantity: 1,
    });
    if (!creditResult.success) {
      return insufficientCreditsResponse(corsHeaders, creditResult.balanceAfter, 500);
    }
    if (!workspace_id) return errorResponse(400, "ওয়ার্কস্পেস আইডি দিন।", "Workspace ID required.");

    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();
    if (!workspace) return errorResponse(404, "শপ পাওয়া যায়নি।", "Shop not found.");

    // If regenerating, delete old entries
    if (regenerate) {
      await supabase.from("content_calendar").delete().eq("workspace_id", workspace_id);
    }

    const lang = language || "bn";
    const sDate = start_date ? new Date(start_date) : new Date();
    const ppw = posts_per_week || 4;
    const plats = platforms || ["facebook"];
    const mix = content_mix || { product_ads: 40, educational: 25, social_proof: 20, festival: 15 };
    const festivals = getUpcomingFestivals(sDate, 90);

    const festivalsText = festivals.length > 0
      ? festivals.map(f => `- ${f.name} (${f.en_name}): ${f.date} — ${f.days_until} days away, prep ${f.prep_days} days before, themes: ${(f.content_themes || []).join(', ')}${f.intensity === 'CRITICAL' ? ' [CRITICAL - highest revenue season]' : ''}`).join('\n')
      : "No major festivals in this period.";

    const totalPosts = ppw * 13; // 13 weeks in 90 days

    const prompt = `Create a ${totalPosts}-item content calendar for a Bangladeshi e-commerce shop over the next 90 days.

START DATE: ${sDate.toISOString().split('T')[0]}
POSTS PER WEEK: ${ppw}
PLATFORMS: ${plats.join(', ')}

SHOP: ${workspace.shop_name || "N/A"} | ${workspace.industry || "General"} | Tone: ${workspace.brand_tone || "Friendly"}
TARGET AUDIENCE: ${workspace.target_audience || "General BD shoppers"}
KEY PRODUCTS: ${workspace.key_products || "Various products"}

UPCOMING FESTIVALS:
${festivalsText}

CONTENT MIX:
- Product ads: ${mix.product_ads}%
- Educational: ${mix.educational}%
- Social proof: ${mix.social_proof}%
- Festival/seasonal: ${mix.festival}%

CALENDAR RULES:
- Space posts evenly, prefer Mon/Wed/Fri/Sun (BD peak engagement)
- Never same content_type 2 days in a row
- During festival prep windows, increase festival content
- For CRITICAL festivals (Eid), ramp up: 1/week → 2/week → daily near the date
- Saturday-Sunday highest engagement — use for best product ads

Language: ${lang === 'bn' ? 'All titles, content_idea, hook MUST be in Bangla' : 'Respond in English'}

Return ONLY valid JSON array of exactly ${totalPosts} objects:
[{
  "date": "YYYY-MM-DD",
  "day_of_week": "Saturday",
  "content_type": "product_ad | educational | social_proof | festival",
  "platform": "${plats[0]}",
  "title": "short catchy title",
  "content_idea": "2-3 sentence content direction/brief",
  "hook": "the opening line for this content",
  "occasion": "general | eid | boishakh | puja | december16 | valentine | mothers_day | ramadan",
  "priority": "high | medium | low",
  "recommended_framework": "FOMO | PAS | AIDA | SOCIAL_PROOF | BEFORE_AFTER | OFFER_FIRST",
  "recommended_tone": "friendly | professional | urgent | emotional | humorous",
  "festival_theme": "null or specific festival theme if near a festival"
}]`;

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

    const batchId = crypto.randomUUID();

    const rows = entries.map(e => ({
      workspace_id,
      date: e.date,
      day_of_week: e.day_of_week || null,
      content_type: e.content_type || "product_ad",
      platform: e.platform || plats[0],
      title: e.title || "",
      content_idea: e.content_idea || "",
      hook: e.hook || "",
      occasion: e.occasion || "general",
      priority: e.priority || "medium",
      status: "planned",
      batch_id: batchId,
      recommended_framework: e.recommended_framework || null,
      recommended_tone: e.recommended_tone || null,
      festival_theme: e.festival_theme || null,
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
      total_items: rows.length,
      batch_id: batchId,
      festivals_covered: festivals.map(f => lang === 'bn' ? f.name : f.en_name),
    });
  } catch (e) {
    console.error("generate-content-calendar error:", e);
    return errorResponse(500, "কিছু একটা সমস্যা হয়েছে।", "Something went wrong.");
  }
});
