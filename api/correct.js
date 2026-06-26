
import { incrementUsage } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "teacher");

    const { text, task, liveChecks } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: "Testo mancante" });

    const prompt = `
Sei un insegnante italiano di inglese A2 e un esaminatore Cambridge.
Correggi questa informal email A2.

Rispondi SOLO con JSON valido, senza markdown.

Schema:
{
  "overall": number,
  "levelEstimate": "A1 | A2 Low | A2 | A2 High | B1 Bridge",
  "summary": "commento breve in italiano",
  "bands": {
    "content": number,
    "communicative": number,
    "organisation": number,
    "language": number
  },
  "requirements": {
    "opening": "ok | missing | weak",
    "closing": "ok | missing | weak",
    "wordCount": number,
    "wordCountComment": "commento",
    "paragraphs": "ok | weak",
    "finalQuestion": "ok | missing"
  },
  "issues": [
    {
      "type": "Grammar | Spelling | Vocabulary | Organisation | Task | Natural English",
      "severity": "high | medium | low",
      "wrong": "testo sbagliato",
      "correct": "testo corretto",
      "explanation": "spiegazione breve in italiano",
      "rule": "regola",
      "examples": ["esempio corretto 1", "esempio corretto 2"]
    }
  ],
  "correctedEmail": "email corretta completa",
  "improvedEmail": "versione migliorata A2 120-150 parole",
  "strengths": ["punto forte"],
  "tips": ["consiglio"],
  "studyFocus": ["argomento"],
  "nextExercise": "esercizio breve"
}

Regole:
- Valuta /30 in modo severo ma utile.
- Usa Cambridge A2 style: Content, Communicative Achievement, Organisation, Language.
- Spiega in italiano semplice.
- Non usare linguaggio tecnico eccessivo.
- Mantieni la versione migliorata a livello A2.

TRACCIA:
${task || "A2 informal email"}

CONTROLLI LIVE:
${JSON.stringify(liveChecks || {}, null, 2)}

EMAIL:
${text}
`;

    const out = await callGemini({ prompt, expectJson: true, maxOutputTokens: 4500, temperature: 0.2 });
    return res.status(200).json({ report: out.json, modelUsed: out.modelUsed });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "AI correction failed" });
  }
}
