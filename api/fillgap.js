
import { incrementUsage } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "fillgap");

    const { grammar, level, topic, mode, recentExercises, weakRules } = req.body || {};

    const prompt = `
Sei un autore esperto di esercizi Cambridge A2/B1.

CREA UN VERO FILL THE GAP CAMBRIDGE.
Non creare frasi scollegate. Devi creare un BRANO UNICO, coerente e naturale.

Caratteristiche obbligatorie:
- testo unico di 230-320 parole;
- inizio, sviluppo e conclusione;
- stesso argomento dall'inizio alla fine;
- 30 gap nel testo: ___1___ ... ___30___;
- 30 domande;
- 4 opzioni per ogni gap;
- risposta corretta presente nelle opzioni;
- spiegazione in italiano per ogni risposta;
- stile Cambridge A2/B1;
- opzioni abbastanza difficili, non troppo banali.

Argomento: ${topic || "Random"}
Livello: ${level || "Cambridge A2/B1"}
Grammatica: ${grammar || "Mixed Grammar A2/B1"}
Modalità: ${mode || "Simulazione Cambridge"}
Errori da rinforzare: ${(weakRules || []).join(", ") || "nessuno"}
Evita titoli simili a: ${(recentExercises || []).slice(-20).join(" | ") || "nessuno"}

Rispondi SOLO con JSON valido, senza markdown.

Schema esatto:
{
  "title": "titolo",
  "topic": "argomento",
  "grammarFocus": "regole principali",
  "instructions": "Read the text and choose the correct option for each gap.",
  "passage": "brano coerente con ___1___ ... ___30___",
  "questions": [
    {
      "id": 1,
      "options": ["A","B","C","D"],
      "answer": "risposta corretta",
      "rule": "regola grammaticale",
      "explanation": "spiegazione breve in italiano"
    }
  ]
}

Controllo qualità prima di rispondere:
- Il brano deve avere senso.
- Non devono esserci frasi buttate a caso.
- Devono esserci esattamente 30 gap.
- Devono esserci esattamente 30 questions.
`;

    const out = await callGemini({
      prompt,
      expectJson: true,
      maxOutputTokens: 9000,
      temperature: 0.55,
      models: ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
    });

    const ex = out.json;
    const gapCount = (ex.passage?.match(/___\d+___/g) || []).length;

    if (!ex?.passage || !Array.isArray(ex.questions) || ex.questions.length < 30 || gapCount < 30) {
      return res.status(502).json({
        error: "Gemini ha risposto, ma il formato non era corretto. Riprova."
      });
    }

    ex.questions = ex.questions.slice(0, 30);
    ex.source = "gemini-only-v24";
    ex.createdAt = Date.now();
    ex.modelUsed = out.modelUsed;

    return res.status(200).json({ exercise: ex, modelUsed: out.modelUsed });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Fill the gap generation failed" });
  }
}
