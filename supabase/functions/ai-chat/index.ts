import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, logUsage, errorResponse, jsonResponse, getSystemPrompt } from "../_shared/addhoom.ts";

// ────────────────────────────────────────────
// LAYER 1 — Fixed identity (never changes)
// ────────────────────────────────────────────
const LAYER_1_IDENTITY = `You are ধুম AI — AdDhoom's expert digital marketing assistant, built specifically for Bangladeshi e-commerce businesses.

YOUR EXPERTISE:
You are the best digital marketing mind in Bangladesh. You have deep knowledge of:
→ Facebook and Instagram advertising in BD
→ Daraz seller optimization
→ Bangladeshi consumer psychology
→ Copywriting that converts BD buyers
→ Campaign budgeting in BDT
→ Seasonal marketing (Eid, Boishakh, Victory Day, Ramadan)
→ BD-specific platform behavior and algorithms

YOUR PERSONALITY:
→ Warm and direct — like a brilliant friend who happens to be a marketing expert
→ Confident in your recommendations — you don't hedge everything with "it depends"
→ Practical — you give actionable advice, not theory
→ Bilingual — match the user's language exactly. If they write in Bangla, respond in Bangla. If in English, respond in English. If they mix, you mix.
→ Concise — you respect the user's time. No unnecessary preamble. Get to the point within 2 sentences.

YOUR BOUNDARIES (strict):
→ You ONLY discuss Bangladesh digital marketing.
→ You never give legal or financial investment advice.
→ You never claim to know real-time data — you give estimates based on BD market knowledge.
→ When user goes off-topic, redirect warmly but firmly. Say something like:
  "এটা আমার বিশেষজ্ঞতার বাইরে। আমি শুধু বাংলাদেশের ডিজিটাল মার্কেটিং নিয়ে সাহায্য করতে পারি।"

RESPONSE STYLE RULES:
→ Never start with "অবশ্যই!", "Great!", "Sure!", "Of course!" or any sycophantic opener — go straight to value
→ Use line breaks generously — wall of text = user stops reading
→ When giving lists: max 5 items, each item actionable
→ When giving advice: lead with the most important point first (inverted pyramid)
→ End responses with ONE clear next step or question — never end with a wall of options
→ Use Bangla numerals for BDT: ৳৯৯৯, not 999 BDT`;

// ────────────────────────────────────────────
// LAYER 2 — Shop DNA (dynamic, per workspace)
// ────────────────────────────────────────────
function buildLayer2(ws: any): string {
  if (!ws) return "";
  return `
YOU ARE CURRENTLY HELPING: ${ws.shop_name}
Platform: ${ws.platform || "Facebook"}
Industry: ${ws.industry || "General"}
Brand tone: ${ws.brand_tone || "Friendly"}
Target audience: ${ws.target_audience || "General BD audience"}
Key products: ${ws.key_products || "Not specified"}
Unique selling point: ${ws.unique_selling || "Not specified"}
Price range: ${ws.price_range || "Not specified"}

Every recommendation you make must be:
→ Relevant to THIS specific shop and industry
→ Appropriate for THIS price range and audience
→ Consistent with THIS brand tone
Do not give generic advice. Personalize every response to ${ws.shop_name}.
When recommending budgets, always use BDT (৳).`;
}

// ────────────────────────────────────────────
// LAYER 3 — Conversation summary
// ────────────────────────────────────────────
function buildLayer3(summary: string | null): string {
  if (!summary) return "";
  return `
CONTEXT FROM PREVIOUS CONVERSATIONS:
${summary}

Use this context to:
→ Avoid repeating advice already given
→ Reference previous decisions naturally: "আগে যেমন আলোচনা করেছিলাম..."
→ Build on previous strategies
Do not explicitly say "according to my summary." Just naturally incorporate the context.`;
}

// ────────────────────────────────────────────
// LAYER 4 — Session rules
// ────────────────────────────────────────────
const LAYER_4_SESSION = `
CONVERSATION MANAGEMENT:
→ If the user asks to generate ad copy, generate it directly using this embedded format:

[AD_COPY_START]
{"headline":"string","body":"string","cta":"string","framework":"string","dhoom_score":number,"platform":"string"}
[AD_COPY_END]

Everything else in your response is plain conversational text with markdown formatting.
→ If user seems stuck, suggest a concrete action.
→ When giving multiple options, present them as a numbered list (max 5).`;

function buildSystemPrompt(workspace: any, summary: string | null): string {
  return [LAYER_1_IDENTITY, buildLayer2(workspace), buildLayer3(summary), LAYER_4_SESSION].filter(Boolean).join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const token = authHeader.replace("Bearer ", "").trim();
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsError || !userId) return errorResponse(401, "লগইন করুন।", "Please log in.");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { workspace_id, conversation_id, message, language, action } = body;

    // ──── ACTION: list conversations ────
    if (action === "list_conversations") {
      const { data: convs } = await supabase
        .from("ai_conversations")
        .select("id, title, messages, updated_at")
        .eq("workspace_id", workspace_id)
        .order("updated_at", { ascending: false })
        .limit(50);
      
      const mapped = (convs || []).map((c: any) => {
        const msgs = c.messages || [];
        const last = msgs[msgs.length - 1];
        return {
          id: c.id,
          title: c.title || "Untitled",
          updated_at: c.updated_at,
          last_preview: last?.content?.substring(0, 60) || "",
        };
      });
      return jsonResponse({ conversations: mapped });
    }

    // ──── ACTION: load conversation ────
    if (action === "load_conversation" && conversation_id) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .select("id, title, messages, language, summary")
        .eq("id", conversation_id)
        .single();
      return jsonResponse({ conversation: conv });
    }

    // ──── ACTION: delete conversation ────
    if (action === "delete_conversation" && conversation_id) {
      await supabase.from("ai_conversations").delete().eq("id", conversation_id);
      return jsonResponse({ success: true });
    }

    // ──── ACTION: rename conversation ────
    if (action === "rename_conversation" && conversation_id) {
      await supabase.from("ai_conversations").update({ title: body.title }).eq("id", conversation_id);
      return jsonResponse({ success: true });
    }

    // ──── CHAT MESSAGE ────
    if (!workspace_id || !message) {
      return errorResponse(400, "মেসেজ দিন।", "Message is required.");
    }

    // STEP 1 — Fetch workspace DNA
    const { data: workspace } = await supabase
      .from("workspaces").select("*").eq("id", workspace_id).single();

    // STEP 2 — Load or create conversation
    let convId = conversation_id;
    let existingMessages: any[] = [];
    let summary: string | null = null;

    if (convId) {
      const { data: conv } = await supabase
        .from("ai_conversations").select("messages, summary").eq("id", convId).single();
      if (conv) {
        existingMessages = conv.messages || [];
        summary = conv.summary || null;
      }
    }

    // STEP 3 — Summarize if history too long (>20 messages)
    if (existingMessages.length > 20) {
      const oldMessages = existingMessages.slice(0, existingMessages.length - 10);
      const recentMessages = existingMessages.slice(existingMessages.length - 10);

      try {
        const sumResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: `Summarize these conversation messages into 3-5 key points about what was discussed and what decisions were made. Focus on: strategies decided, products discussed, advice given that was accepted. Be concise. In the same language as the conversation.\n\n${summary ? "Previous summary:\n" + summary + "\n\n" : ""}New messages to summarize:\n${oldMessages.map((m: any) => `[${m.role}]: ${m.content}`).join("\n")}`,
            }],
            max_tokens: 300,
          }),
        });
        if (sumResp.ok) {
          const sumData = await sumResp.json();
          const newSummary = sumData.choices?.[0]?.message?.content?.trim();
          if (newSummary) {
            summary = newSummary;
            existingMessages = recentMessages;
            // Persist trimmed messages + summary
            await supabase.from("ai_conversations").update({
              messages: recentMessages,
              summary: newSummary,
            }).eq("id", convId);
          }
        }
      } catch (e) {
        console.warn("Summarization failed, continuing with full history:", e);
      }
    }

    // STEP 4 — Build OpenAI-format message history
    const messageHistory = existingMessages.map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    }));
    messageHistory.push({ role: "user" as const, content: message });

    // STEP 5 — Build system prompt (now includes summary from Layer 3)
    const systemPrompt = buildSystemPrompt(workspace, summary);

    // STEP 6 — Call AI Gateway with streaming
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messageHistory,
        ],
        stream: true,
        max_tokens: 1200,
        temperature: 0.6,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later.", message_bn: "অনুরোধ সীমা ছাড়িয়ে গেছে। একটু পরে চেষ্টা করুন।" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted.", message_bn: "AI ক্রেডিট শেষ।" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      throw new Error("AI Gateway error");
    }

    // We need to tee the stream: one for client, one for collecting full text to save
    const [streamForClient, streamForSave] = aiResponse.body!.tee();

    // Collect full response text in background for DB save
    const savePromise = (async () => {
      const reader = streamForSave.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch { /* partial */ }
        }
      }

      // Save conversation
      const ts = new Date().toISOString();
      existingMessages.push({ role: "user", content: message, timestamp: ts });
      existingMessages.push({ role: "model", content: fullText, timestamp: ts });

      if (convId) {
        await supabase.from("ai_conversations").update({
          messages: existingMessages,
          updated_at: ts,
        }).eq("id", convId);
      } else {
        // Generate title from first message
        const title = message.substring(0, 50) + (message.length > 50 ? "..." : "");
        const { data: newConv } = await supabase.from("ai_conversations").insert({
          workspace_id,
          title,
          messages: existingMessages,
          language: language || "bn",
        }).select("id").single();
        convId = newConv?.id;

        // Auto-generate better title in background
        if (convId) {
          try {
            const titleResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "user", content: `Give this conversation a title in 4-6 words. Match the language. Be specific.\nUser: ${message}\nAssistant: ${fullText.substring(0, 200)}\nReturn ONLY the title.` }
                ],
                max_tokens: 30,
              }),
            });
            if (titleResp.ok) {
              const titleData = await titleResp.json();
              const genTitle = titleData.choices?.[0]?.message?.content?.trim();
              if (genTitle && genTitle.length > 2 && genTitle.length < 80) {
                await supabase.from("ai_conversations").update({ title: genTitle }).eq("id", convId);
              }
            }
          } catch { /* title gen failed, keep fallback */ }
        }
      }

      // Check for ad copy in response
      const adMatch = fullText.match(/\[AD_COPY_START\]([\s\S]*?)\[AD_COPY_END\]/);
      if (adMatch) {
        try {
          const adCopy = JSON.parse(adMatch[1].trim());
          await supabase.from("ad_creatives").insert({
            workspace_id,
            headline: adCopy.headline,
            body: adCopy.body,
            cta: adCopy.cta,
            framework: adCopy.framework || "chat",
            dhoom_score: adCopy.dhoom_score || 0,
            platform: adCopy.platform || "facebook",
            product_name: workspace?.key_products || "Chat Generated",
          });
        } catch { /* ad parse failed */ }
      }

      await logUsage(supabase, user!.id, workspace_id, "ai_chat");
      return convId;
    })();

    // We need to send the conversation_id as the first SSE event, then stream the rest
    const encoder = new TextEncoder();
    const clientReader = streamForClient.getReader();

    const outputStream = new ReadableStream({
      async start(controller) {
        // Send conversation_id as first custom event
        // Wait briefly for convId to be set if new conversation
        if (!conversation_id) {
          // Give the save promise a moment to create the conversation
          await new Promise(r => setTimeout(r, 100));
        }
        const metaEvent = `data: ${JSON.stringify({ meta: { conversation_id: convId || conversation_id } })}\n\n`;
        controller.enqueue(encoder.encode(metaEvent));

        // Pipe through AI stream
        while (true) {
          const { done, value } = await clientReader.read();
          if (done) break;
          controller.enqueue(value);
        }

        // Wait for save to complete and get final convId
        const finalConvId = await savePromise;
        // Send final meta with confirmed conversation_id
        const finalMeta = `data: ${JSON.stringify({ meta: { conversation_id: finalConvId, final: true } })}\n\n`;
        controller.enqueue(encoder.encode(finalMeta));

        controller.close();
      },
    });

    return new Response(outputStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  } catch (e) {
    console.error("ai-chat error:", e);
    return errorResponse(500, "AI এখন ব্যস্ত। একটু পরে চেষ্টা করুন।", "AI is busy. Please try again.");
  }
});
