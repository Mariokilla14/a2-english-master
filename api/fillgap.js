
import { incrementUsage } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

function demoGap() {
  return {
    title: "Demo Fill the Gap A2",
    topic: "Restaurant",
    grammarFocus: "Past Simple, modals, comparatives",
    instructions: "Choose the correct option for each gap.",
    passage: "Yesterday I ___1___ to a restaurant with my family. The waiter ___2___ very kind and the food was delicious. I ___3___ pasta because I love Italian food.",
    questions: [
      { id: 1, options: ["go", "went", "gone", "going"], answer: "went", rule: "Past Simple", explanation: "Con yesterday si usa il Past Simple." },
      { id: 2, options: ["was", "were", "is", "be"], answer: "was", rule: "Past Simple be", explanation: "The waiter è singolare: was." },
      { id: 3, options: ["order", "ordered", "ordering", "orders"], answer: "ordered", rule: "Past Simple", explanation: "Azione passata conclusa." }
    ],
    mode: "Demo"
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "fillgap");

    const { grammar, level, topic, mode, recentExercises, weakRules } = req.body || {};
    const prompt = `
Crea un esercizio Fill the Gap livello A2 stile Cambridge.
Deve essere un BRANO unico, non frasi isolate.

Impostazioni:
- Livello: ${level || "Cambridge A2"}
- Argomento: ${topic || "Random"}
- Grammatica: ${grammar || "Mixed Grammar"}
- Modalità: ${mode || "Casuale"}
- Errori ricorrenti: ${(weakRules || []).join(", ") || "nessuno"}
- Ultimi esercizi da NON ripetere: ${(recentExercises || []).join(" | ") || "nessuno"}

Obbligatorio:
- 30 spazi numerati nel brano: ___1___ ... ___30___
- 30 domande esatte.
- Ogni domanda ha 4 opzioni.
- Una sola risposta corretta.
- Distrattori realistici.
- Copri grammatica A2: present simple/continuous, past simple/continuous, present perfect, future, modals, articles, prepositions, comparatives, superlatives, quantifiers, relative clauses, conditionals base, passive base.
- Spiega in italiano semplice.

Rispondi SOLO con JSON valido:
{
  "title":"titolo",
  "topic":"argomento",
  "grammarFocus":"focus grammaticale",
  "instructions":"istruzioni",
  "passage":"brano con ___1___ ... ___30___",
  "questions":[
    {"id":1,"options":["A","B","C","D"],"answer":"risposta corretta","rule":"regola grammaticale","explanation":"spiegazione in italiano"}
  ]
}
`;

    const out = await callGemini({ prompt, expectJson: true, maxOutputTokens: 7000, temperature: 0.7 });
    const ex = out.json;

    if (!Array.isArray(ex.questions) || ex.questions.length < 10) {
      return res.status(200).json({ exercise: demoGap(), modelUsed: "offline-demo" });
    }

    ex.questions = ex.questions.slice(0, 30);
    ex.createdAt = Date.now();
    ex.modelUsed = out.modelUsed;

    return res.status(200).json({ exercise: ex, modelUsed: out.modelUsed });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Fill the gap generation failed" });
  }
}
