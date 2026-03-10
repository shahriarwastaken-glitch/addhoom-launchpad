import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADDHOOM_SYSTEM_PROMPT } from "./systemPrompt.ts";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.1-flash-lite-preview";

function getGeminiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return key;
}

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
    const key = getGeminiKey();

    const response = await fetch(`${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", response.status, err);
      return null;
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

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
    const key = getGeminiKey();

    const contents = messages.map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(`${GEMINI_BASE}/${DEFAULT_MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini API error:", response.status, err);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (error) {
    console.error("callGeminiChat error:", error);
    return null;
  }
}

// Export for use in other functions
export { GEMINI_BASE, DEFAULT_MODEL, getGeminiKey };
