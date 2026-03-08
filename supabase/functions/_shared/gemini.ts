const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export async function callGemini(
  prompt: string,
  systemPrompt: string,
  jsonMode: boolean = false
): Promise<string | null> {
  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

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
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

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
