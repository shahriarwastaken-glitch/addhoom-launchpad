import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADDHOOM_SYSTEM_PROMPT } from "./systemPrompt.ts";

// Get system prompt from database or fallback to default
export async function getSystemPrompt(): Promise<string> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await sb
      .from("api_keys")
      .select("key_value")
      .eq("service_name", "system_prompt")
      .eq("status", "active")
      .maybeSingle();
    if (data?.key_value) return data.key_value;
  } catch (e) {
    console.warn("Could not read system prompt from db, using default:", e);
  }
  return ADDHOOM_SYSTEM_PROMPT;
}

export async function callGemini(
  prompt: string,
  systemPrompt: string,
  jsonMode: boolean = false
): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Lovable AI Gateway error:", response.status, err);
      return null;
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content ?? null;

    if (text && jsonMode) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return text;
  } catch (error) {
    console.error("callGemini error:", error);
    return null;
  }
}

export async function callGeminiChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const openaiMessages = messages.map((m) => ({
      role: m.role === "model" ? "assistant" as const : "user" as const,
      content: m.content,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...openaiMessages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Lovable AI Gateway error:", response.status, err);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    console.error("callGeminiChat error:", error);
    return null;
  }
}
