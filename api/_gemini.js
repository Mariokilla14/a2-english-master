
const DEFAULT_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

export function cleanApiKey(key) {
  return String(key || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

export function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try { return JSON.parse(cleaned); } catch {}

  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) {
    try { return JSON.parse(cleaned.slice(s, e + 1)); } catch {}
  }
  return null;
}

export async function callGemini({ prompt, expectJson = false, maxOutputTokens = 3500, temperature = 0.35, models = DEFAULT_MODELS }) {
  const apiKey = cleanApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY mancante su Vercel");
    err.status = 500;
    throw err;
  }

  const errors = [];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body = {
        contents: [
          {
            role: "user",
            parts: [{ text: String(prompt || "") }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens
        }
      };

      if (expectJson) {
        body.generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        errors.push(`${model}: ${data?.error?.message || response.status}`);
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim() || "";
      if (!text) {
        errors.push(`${model}: risposta vuota`);
        continue;
      }

      if (expectJson) {
        const parsed = extractJson(text);
        if (!parsed) {
          errors.push(`${model}: JSON non valido`);
          continue;
        }
        return { modelUsed: model, json: parsed, text };
      }

      return { modelUsed: model, text };
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }

  const err = new Error("Gemini non disponibile: " + errors.join(" | "));
  err.status = 502;
  throw err;
}
