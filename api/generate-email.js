
import { incrementUsage } from "./_supabase.js";
import { callGemini } from "./_gemini.js";

function demoEmail(topic) {
  const email = `Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

Last weekend I had a very nice experience connected with ${topic || "my free time"}. I went there with two friends and we had a great time. At first, I was a little worried because the weather was not very good, but in the end everything was fine. I have never enjoyed an afternoon so much. I think experiences like this are useful because they help us become more confident. What did you do last weekend?

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`;

  return {
    title: `${topic || "Random"} email 30/30`,
    category: topic || "Random",
    task: "A2 informal email",
    wordCount: email.match(/[A-Za-z']+/g)?.length || 0,
    grammarUsed: ["Past Simple", "Present Perfect", "Linkers"],
    vocabulary: ["experience", "worried", "confident"],
    email,
    why30: ["Opening corretto", "Closing corretto", "Domanda finale presente"]
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    await incrementUsage(req, "email");

    const { topic, customTask, previousTitles } = req.body || {};

    const opening = `Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.`;

    const closing = `Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`;

    const prompt = `
Sei un esaminatore Cambridge A2.
Genera una informal email modello da 30/30.

Regole:
- 120-150 parole totali.
- Livello A2 alto, naturale, chiaro.
- Opening IDENTICO:
${opening}

- Closing IDENTICO:
${closing}

- Cambia SOLO il corpo centrale.
- Deve avere una domanda finale.
- Non usare parole troppo difficili.
- Evita titoli simili a: ${(previousTitles || []).slice(-30).join(", ") || "nessuno"}

Argomento: ${topic || "Random"}
Traccia personalizzata: ${customTask || "Create a realistic A2 informal email task."}

Rispondi SOLO con JSON valido:
{
  "title": "titolo breve",
  "category": "categoria",
  "task": "traccia",
  "wordCount": number,
  "grammarUsed": ["regola"],
  "vocabulary": ["parola"],
  "email": "email completa",
  "why30": ["motivo"]
}
`;

    const out = await callGemini({ prompt, expectJson: true, maxOutputTokens: 2500, temperature: 0.65 });
    const email = out.json;

    if (!email?.email) {
      return res.status(200).json({ email: demoEmail(topic), modelUsed: "offline-demo" });
    }

    return res.status(200).json({ email, modelUsed: out.modelUsed });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message || "Email generation failed" });
  }
}
