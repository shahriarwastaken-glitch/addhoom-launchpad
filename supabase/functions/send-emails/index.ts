import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/addhoom.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Authentication: require valid JWT or service-role key ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "অননুমোদিত।", "Unauthorized.");
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Allow service-role calls (from other edge functions)
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Validate as user JWT
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser(token);
      if (error || !data?.user) {
        return errorResponse(401, "অননুমোদিত।", "Unauthorized.");
      }
    }

    // --- Authenticated: proceed with email sending ---
    const { user_id, to_email, to_name, type, plan, language } = await req.json();
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("RESEND_API_KEY not set");
      return errorResponse(500, "ইমেইল পাঠানো যায়নি।", "Could not send email.");
    }

    const lang = language || "bn";
    const isBn = lang === "bn";

    const templates: Record<string, { subject: string; html: string }> = {
      welcome: {
        subject: isBn ? "AdDhoom-এ স্বাগতম! 🚀" : "Welcome to AdDhoom! 🚀",
        html: isBn
          ? `<h1>স্বাগতম, ${to_name || ""}! 🎉</h1><p>AdDhoom-এ আপনাকে পেয়ে আমরা আনন্দিত।</p><p>এখন আপনি AI দিয়ে মিনিটে বিজ্ঞাপন তৈরি করতে পারবেন।</p><p><a href="https://addhoom.com/dashboard">ড্যাশবোর্ডে যান →</a></p>`
          : `<h1>Welcome, ${to_name || ""}! 🎉</h1><p>We're excited to have you on AdDhoom.</p><p>Start creating AI-powered ads in minutes.</p><p><a href="https://addhoom.com/dashboard">Go to Dashboard →</a></p>`,
      },
      payment_success: {
        subject: isBn ? `পেমেন্ট সফল! আপনার ${plan} প্ল্যান চালু হয়েছে 🎉` : `Payment successful! Your ${plan} plan is active 🎉`,
        html: isBn
          ? `<h1>পেমেন্ট সফল! 🎉</h1><p>আপনার ${plan} প্ল্যান এখন চালু আছে।</p>`
          : `<h1>Payment Successful! 🎉</h1><p>Your ${plan} plan is now active.</p>`,
      },
      subscription_expiring: {
        subject: isBn ? "আপনার AdDhoom প্ল্যান মেয়াদ শেষ হতে চলেছে ⚠️" : "Your AdDhoom plan is expiring soon ⚠️",
        html: isBn
          ? `<h1>মেয়াদ শেষ হচ্ছে ⚠️</h1><p>আপনার প্ল্যান ৩ দিনের মধ্যে শেষ হবে। রিনিউ করুন।</p>`
          : `<h1>Expiring Soon ⚠️</h1><p>Your plan expires in 3 days. Renew now.</p>`,
      },
      subscription_expired: {
        subject: isBn ? "আপনার প্ল্যান ডাউনগ্রেড হয়েছে" : "Your plan has been downgraded",
        html: isBn
          ? `<h1>প্ল্যান পরিবর্তন</h1><p>আপনার সাবস্ক্রিপশন শেষ হয়েছে। আপগ্রেড করুন।</p>`
          : `<h1>Plan Changed</h1><p>Your subscription has expired. Upgrade to continue.</p>`,
      },
    };

    const template = templates[type];
    if (!template) return errorResponse(400, "অবৈধ ইমেইল টাইপ।", "Invalid email type.");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AdDhoom <noreply@addhoom.com>",
        to: [to_email],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return errorResponse(500, "ইমেইল পাঠানো যায়নি।", "Could not send email.");
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error("send-emails error:", e);
    return errorResponse(500, "ইমেইল পাঠানো যায়নি।", "Could not send email.");
  }
});
