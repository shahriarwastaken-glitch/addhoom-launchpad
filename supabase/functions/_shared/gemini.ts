import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function getGeminiKey(): Promise<string> {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await sb
      .from("api_keys")
      .select("key_value")
      .eq("key_name", "GEMINI_API_KEY")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.key_value) return data.key_value;
  } catch (e) {
    console.warn("Could not read api_keys table, falling back to env:", e);
  }
  const envVal = Deno.env.get("GEMINI_API_KEY");
  if (!envVal) throw new Error("GEMINI_API_KEY not set");
  return envVal;
}

export async function callGemini(
  prompt: string,
  systemPrompt: string,
  jsonMode: boolean = false
): Promise<string | null> {
  try {
    const apiKey = await getGeminiKey();

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: systemPrompt + "\n\n" + prompt }]
        }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          topP: 0.95
        }
      })
    });

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
    const apiKey = await getGeminiKey();

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...messages.map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
    ];

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
          topP: 0.95
        }
      })
    });

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (error) {
    console.error("callGeminiChat error:", error);
    return null;
  }
}
