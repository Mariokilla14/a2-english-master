
import { GoogleGenAI } from "@google/genai";

const DEFAULT_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.0-flash"
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

export async function callGemini({
  prompt,
  expectJson = false,
  maxOutputTokens = 3500,
  temperature = 0.35,
  models = DEFAULT_MODELS
}) {
  const apiKey = cleanApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY mancante su Vercel");
    err.status = 500;
    throw err;
  }

  const ai = new GoogleGenAI({ apiKey });
  const errors = [];

  for (const model of models) {
    try {
      const config = {
        temperature,
        maxOutputTokens
      };

      if (expectJson) {
        config.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model,
        contents: String(prompt || ""),
        config
      });

      const text =
        response?.text ||
        response?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n") ||
        "";

      const finalText = String(text || "").trim();
      if (!finalText) {
        errors.push(`${model}: risposta vuota`);
        continue;
      }

      if (expectJson) {
        const parsed = extractJson(finalText);
        if (!parsed) {
          errors.push(`${model}: JSON non valido`);
          continue;
        }
        return { modelUsed: model, json: parsed, text: finalText };
      }

      return { modelUsed: model, text: finalText };
    } catch (e) {
      errors.push(`${model}: ${e.message || e}`);
    }
  }

  const err = new Error("Gemini non disponibile: " + errors.join(" | "));
  err.status = 502;
  throw err;
}
