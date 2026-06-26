
import { callGemini } from "./_gemini.js";

export default async function handler(req, res) {
  try {
    const out = await callGemini({
      prompt: "Rispondi solo con: OK",
      expectJson: false,
      maxOutputTokens: 20,
      temperature: 0
    });
    return res.status(200).json({ ok: true, modelUsed: out.modelUsed, text: out.text });
  } catch (e) {
    return res.status(e.status || 500).json({ ok: false, error: e.message });
  }
}
