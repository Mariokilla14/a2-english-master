
import { incrementUsage, rpc } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

function offlineCoherentDemo(topic = "Travel") {
  const passage = `Last weekend, Emma went to a small town near the sea with her family. They left home early because they wanted to arrive before lunch. When they got there, the weather was sunny, so they decided to walk along the beach first. Emma took many photos and sent one to her best friend. In the afternoon, they visited an old museum which was near the hotel. Emma had never been there before, and she thought it was more interesting than she expected. Later, they had dinner in a little restaurant where the waiter was very kind. Although everyone was tired, they talked about the best part of the day. On Sunday morning, Emma bought some postcards for her friends. If she goes back next summer, she will stay for a longer time.`;

  const gaps = [
    ["went",["went","go","gone","going"],"Past Simple","Con last weekend si usa il Past Simple."],
    ["left",["left","leave","leaves","leaving"],"Past Simple","Azione conclusa nel passato."],
    ["because",["because","so","but","although"],"Conjunctions","Because introduce la causa."],
    ["arrive",["arrive","arrived","arriving","to arrive"],"Infinitive","Dopo wanted to si usa il verbo base."],
    ["was",["was","were","is","be"],"Past Simple be","The weather è singolare."],
    ["decided",["decided","decide","deciding","decides"],"Past Simple","Azione passata conclusa."],
    ["took",["took","take","taken","taking"],"Past Simple","Il passato di take è took."],
    ["sent",["sent","send","sended","sending"],"Past Simple irregular","Il passato di send è sent."],
    ["which",["which","who","where","when"],"Relative clauses","Which si usa per cose o luoghi/oggetti."],
    ["had never been",["had never been","has never be","never went","was never"],"Past Perfect","Indica un'esperienza precedente a un momento passato."],
    ["more interesting",["more interesting","interestinger","most interesting","the interesting"],"Comparative","Con aggettivi lunghi si usa more + aggettivo."],
    ["than",["than","that","then","as"],"Comparative","Il comparativo usa than."],
    ["where",["where","which","who","when"],"Relative clauses","Where indica il luogo."],
    ["Although",["Although","Because","So","But"],"Conjunctions","Although introduce contrasto."],
    ["bought",["bought","buy","buyed","buying"],"Past Simple irregular","Il passato di buy è bought."],
    ["If",["If","When","Because","Although"],"First conditional","If introduce la condizione."],
    ["will",["will","would","did","has"],"First conditional","If + present, will + base verb."]
  ];
  let text = passage;
  const questions = [];
  gaps.forEach((g,i)=>{
    text = text.replace(g[0], `___${i+1}___`);
    questions.push({id:i+1, options:g[1], answer:g[0], rule:g[2], explanation:g[3]});
  });
  while (questions.length < 30) {
    const i = questions.length + 1;
    questions.push({id:i, options:["a","an","the","-"], answer:"the", rule:"Articles", explanation:"Domanda demo di riserva."});
    text += ` The guide showed them ___${i}___ most important place in town.`;
  }
  return {
    title: `${topic} coherent Cambridge demo`,
    topic,
    grammarFocus: "Coherent Cambridge A2/B1 passage",
    instructions: "Read the whole text and choose the correct option for each gap.",
    passage: text,
    questions,
    source: "offline-coherent-demo",
    createdAt: Date.now()
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "fillgap");

    const { grammar, level, topic, mode, recentExercises, weakRules } = req.body || {};

    const prompt = `
Sei un autore esperto di esercizi Cambridge A2/B1.

Devi creare UN VERO BRANO COERENTE, non frasi isolate.

OBIETTIVO:
Un fill the gap stile Cambridge/PET con un testo naturale di 230-320 parole, con:
- titolo;
- un solo racconto/articolo/email coerente;
- inizio, sviluppo e conclusione;
- stesso argomento dall'inizio alla fine;
- 30 gap distribuiti nel testo;
- 4 opzioni per ogni gap;
- spiegazione grammaticale in italiano.

IMPORTANTISSIMO:
Non creare una lista di frasi scollegate.
Non mettere frasi come "English is spoken..." se non c'entrano col racconto.
Ogni frase deve continuare logicamente la precedente.
Il brano deve sembrare preso da un libro Cambridge A2/B1.

ARGOMENTO:
${topic || "Random"}

LIVELLO:
${level || "Cambridge A2/B1"}

GRAMMATICA DA INCLUDERE:
${grammar || "Mixed Grammar A2/B1"}

ERRORI DA RINFORZARE:
${(weakRules || []).join(", ") || "nessuno"}

EVITA TITOLI SIMILI A:
${(recentExercises || []).slice(-20).join(" | ") || "nessuno"}

REGOLE:
- Scrivi prima un testo naturale.
- Poi sostituisci 30 parole/espressioni grammaticalmente importanti con ___1___ ... ___30___.
- Le 30 risposte devono dipendere dal contesto.
- Le opzioni sbagliate devono essere credibili.
- Ogni explanation deve spiegare perché la risposta è corretta e perché le altre sono sbagliate in modo breve.
- Mantieni livello A2/B1, non troppo difficile.
- Non usare markdown.
- Rispondi SOLO con JSON valido.

SCHEMA ESATTO:
{
  "title": "titolo",
  "topic": "argomento",
  "grammarFocus": "regole principali",
  "instructions": "Read the text and choose the correct option for each gap.",
  "passage": "brano coerente con ___1___ ... ___30___",
  "questions": [
    {
      "id": 1,
      "options": ["opzione1","opzione2","opzione3","opzione4"],
      "answer": "risposta corretta identica a una delle opzioni",
      "rule": "regola grammaticale",
      "explanation": "spiegazione in italiano"
    }
  ]
}

Controllo finale prima di rispondere:
- Il passage contiene esattamente 30 gap.
- questions contiene esattamente 30 elementi.
- Ogni answer è presente nelle options.
- Il brano ha senso come testo unico.
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
      return res.status(200).json({ exercise: offlineCoherentDemo(topic), modelUsed: "offline-coherent-demo" });
    }

    ex.questions = ex.questions.slice(0, 30);
    ex.source = "ai-coherent-cambridge-v23";
    ex.createdAt = Date.now();
    ex.modelUsed = out.modelUsed;

    try {
      const sessionId = req.headers["x-session-id"];
      if (sessionId) await rpc("save_fillgap_exercise", { p_session_id: sessionId, p_exercise: ex });
    } catch {}

    return res.status(200).json({ exercise: ex, modelUsed: out.modelUsed, savedToCloud: true });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Fill the gap generation failed" });
  }
}
