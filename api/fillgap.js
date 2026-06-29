
import { incrementUsage, rpc } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/^([A-D])[\.\)]\s*/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function repairQuestion(q, index) {
  const options = Array.isArray(q.options) ? q.options.map(x => String(x).trim()).filter(Boolean) : [];
  let answer = q.answer;
  let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : null;

  if (correctIndex == null || correctIndex < 0 || correctIndex >= options.length) {
    const normAnswer = normalizeText(answer);
    correctIndex = options.findIndex(o => normalizeText(o) === normAnswer);

    // Gemini sometimes answers only "A", "B", "C", "D"
    if (correctIndex === -1 && /^[A-D]$/i.test(String(answer || "").trim())) {
      correctIndex = String(answer).trim().toUpperCase().charCodeAt(0) - 65;
    }
  }

  if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

  return {
    id: Number(q.id || index + 1),
    options: options.slice(0, 4),
    correctIndex,
    answer: options[correctIndex],
    rule: q.rule || "Grammar",
    explanation: q.explanation || "La risposta corretta è scelta in base al contesto del brano."
  };
}

function validateExercise(ex) {
  const gapCount = (ex.passage?.match(/___\d+___/g) || []).length;
  if (!ex?.passage || !Array.isArray(ex.questions)) return false;
  if (gapCount < 30 || ex.questions.length < 30) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "fillgap");

    const { grammar, level, topic, mode, recentExercises, weakRules } = req.body || {};

    const prompt = `
Sei un autore esperto di esercizi Cambridge A2/B1.

CREA UN VERO FILL THE GAP CAMBRIDGE.

REGOLA PIÙ IMPORTANTE:
Devi creare un BRANO UNICO, coerente e naturale.
Non devi creare una lista di frasi scollegate.

PROCESSO:
1. Prima immagina un testo completo, naturale, con introduzione, sviluppo e conclusione.
2. Solo dopo scegli 30 parole/espressioni grammaticali da trasformare in gap.
3. I gap devono essere distribuiti in tutto il testo.
4. Ogni gap deve avere 4 opzioni.
5. Ogni domanda deve avere correctIndex numerico: 0, 1, 2 o 3.

CARATTERISTICHE:
- 230-320 parole.
- Stile Cambridge A2/B1.
- Argomento unico dall'inizio alla fine.
- 30 gap esatti: ___1___ ... ___30___.
- 30 questions esatte.
- Opzioni difficili ma giuste per A2/B1.
- Spiegazioni in italiano, utili come un insegnante.
- Non usare risposte tipo "A. for"; nelle options metti solo "for", "to", ecc.
- answer deve essere identica a options[correctIndex].

ARGOMENTO:
${topic || "Random"}

LIVELLO:
${level || "Cambridge A2/B1"}

GRAMMATICA:
${grammar || "Mixed Grammar A2/B1"}

MODALITÀ:
${mode || "Simulazione Cambridge"}

ERRORI DA RINFORZARE:
${(weakRules || []).join(", ") || "nessuno"}

EVITA TITOLI SIMILI A:
${(recentExercises || []).slice(-50).join(" | ") || "nessuno"}

Rispondi SOLO con JSON valido, senza markdown.

SCHEMA ESATTO:
{
  "title": "titolo",
  "topic": "argomento",
  "grammarFocus": "regole principali separate da virgola",
  "instructions": "Read the text and choose the correct option for each gap.",
  "passage": "brano coerente con ___1___ ... ___30___",
  "questions": [
    {
      "id": 1,
      "options": ["for","to","at","with"],
      "correctIndex": 0,
      "answer": "for",
      "rule": "Prepositions",
      "explanation": "Si usa 'for' per indicare lo scopo o il destinatario."
    }
  ]
}

CONTROLLI FINALI:
- passage contiene esattamente 30 gap.
- questions contiene esattamente 30 elementi.
- ogni options ha 4 elementi.
- correctIndex è sempre 0, 1, 2 o 3.
- answer è identica a options[correctIndex].
- Il testo deve avere senso come brano unico.
`;

    const out = await callGemini({
      prompt,
      expectJson: true,
      maxOutputTokens: 10000,
      temperature: 0.5,
      models: ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
    });

    const ex = out.json;

    if (!validateExercise(ex)) {
      return res.status(502).json({
        error: "Gemini ha risposto, ma il formato non era corretto. Riprova."
      });
    }

    ex.questions = ex.questions.slice(0, 30).map(repairQuestion);
    ex.source = "v13-solid-fillgap";
    ex.createdAt = Date.now();
    ex.modelUsed = out.modelUsed;

    let archiveId = null;
    try {
      const sessionId = req.headers["x-session-id"];
      if (sessionId) {
        const saved = await rpc("save_fillgap_archive", {
          p_session_id: sessionId,
          p_exercise: ex
        });
        if (saved?.ok && saved?.id) {
          archiveId = saved.id;
          ex.archiveId = saved.id;
        }
      }
    } catch (err) {
      console.error("Archive save failed:", err.message);
    }

    return res.status(200).json({
      exercise: ex,
      modelUsed: out.modelUsed,
      archiveId,
      savedToArchive: !!archiveId
    });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Fill the gap generation failed" });
  }
}
