import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders, callGeminiMultiturn, logUsage,
  errorResponse, jsonResponse, getSystemPrompt,
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

    const { workspace_id, conversation_id, message, language, action } = await req.json();

    // Action: list conversations
    if (action === "list_conversations") {
      const { data: convs } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .eq("workspace_id", workspace_id)
        .order("updated_at", { ascending: false })
        .limit(50);
      return jsonResponse({ conversations: convs || [] });
    }

    // Action: load conversation
    if (action === "load_conversation" && conversation_id) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .select("id, title, messages, language")
        .eq("id", conversation_id)
        .single();
      return jsonResponse({ conversation: conv });
    }

    if (!workspace_id || !message) {
      return errorResponse(400, "মেসেজ দিন।", "Message is required.");
    }

    // STEP 1 — Fetch workspace DNA
    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();

    // STEP 2 — Manage conversation
    let convId = conversation_id;
    let history: any[] = [];

    if (convId) {
      const { data: conv } = await supabase
        .from("ai_conversations").select("messages").eq("id", convId).single();
      if (conv) history = conv.messages || [];
    }

    // STEP 3 — Build context-aware system prompt
    let shopContext = "";
    if (workspace) {
      shopContext = `

CURRENT USER'S SHOP CONTEXT:
Shop name: ${workspace.shop_name || "Unknown"}
Industry: ${workspace.industry || "General"}
Platform: ${workspace.platform || "Facebook"}
Target audience: ${workspace.target_audience || "General BD audience"}
Key products: ${workspace.key_products || "Not specified"}
Unique selling point: ${workspace.unique_selling || "Not specified"}
Brand tone: ${workspace.brand_tone || "Friendly"}
Price range: ${workspace.price_range || "Not specified"}

Always give advice that is SPECIFIC to this shop. Reference their actual products, industry, and audience. Never give generic advice that could apply to any business.

When recommending budgets, always use BDT (৳).
When recommending timing, reference Bangladesh market patterns.`;
    }

    const FULL_SYSTEM_PROMPT = ADDHOOM_SYSTEM_PROMPT + "\n\n" + shopContext;

    // STEP 4 — Call Gemini with conversation history
    const geminiMessages = history.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    geminiMessages.push({ role: "user", parts: [{ text: message }] });

    const aiResponse = await callGeminiMultiturn(geminiMessages, FULL_SYSTEM_PROMPT);

    // STEP 5 — Save and return
    const ts = new Date().toISOString();
    history.push({ role: "user", content: message, timestamp: ts });
    history.push({ role: "model", content: aiResponse, timestamp: ts });

    if (convId) {
      await supabase.from("ai_conversations").update({
        messages: history,
        updated_at: ts,
      }).eq("id", convId);
    } else {
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

    return jsonResponse({ success: true, response: aiResponse, conversation_id: convId });
  } catch (e) {
    console.error("ai-chat error:", e);
    return errorResponse(500, "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।", "AI is busy. Please try again.");
  }
});
