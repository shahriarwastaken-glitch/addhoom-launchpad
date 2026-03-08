import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGemini, callGeminiMultiturn, checkPlanLimit, logUsage,
  errorResponse, jsonResponse,
} from "../_shared/addhoom.ts";

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

    const limitCheck = await checkPlanLimit(supabase, user.id, "ai_chat", profile?.plan || "pro");
    if (!limitCheck.allowed) return errorResponse(402, limitCheck.message_bn!, limitCheck.message_en!);

    const { workspace_id, conversation_id, message, language } = await req.json();
    if (!workspace_id || !message) {
      return errorResponse(400, "মেসেজ দিন।", "Message is required.");
    }

    let convId = conversation_id;
    let history: any[] = [];

    if (convId) {
      const { data: conv } = await supabase
        .from("ai_conversations").select("messages").eq("id", convId).single();
      if (conv) history = conv.messages || [];
    }

    // Build multi-turn messages
    const geminiMessages = history.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    geminiMessages.push({ role: "user", parts: [{ text: message }] });

    const aiResponse = await callGeminiMultiturn(geminiMessages);

    // Update history
    history.push({ role: "user", content: message });
    history.push({ role: "model", content: aiResponse });

    if (convId) {
      await supabase.from("ai_conversations").update({
        messages: history,
        updated_at: new Date().toISOString(),
      }).eq("id", convId);
    } else {
      // Create new conversation with auto title from first message
      const title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
      const { data: newConv } = await supabase.from("ai_conversations").insert({
        workspace_id,
        title,
        messages: history,
        language: language || "bn",
      }).select("id").single();
      convId = newConv?.id;
    }

    await logUsage(supabase, user.id, workspace_id, "ai_chat");

    return jsonResponse({ response: aiResponse, conversation_id: convId });
  } catch (e) {
    console.error("ai-chat error:", e);
    return errorResponse(500, "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।", "AI is busy. Please try again.");
  }
});
