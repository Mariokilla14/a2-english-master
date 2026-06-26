import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { text, task } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const prompt = `
Sei un insegnante di inglese per un esame universitario livello A2.
Correggi questa informal email.

Regole:
- Rispondi in italiano.
- Valuta in modo severo ma realistico.
- Dai un voto finale /30.
- Dai punteggi: Grammar /25, Vocabulary /25, Organisation /25, Task Achievement /25.
- Trova errori grammaticali, spelling, tempi verbali, preposizioni, frasi poco naturali.
- Per ogni errore scrivi: frase sbagliata, correzione, spiegazione breve.
- Controlla se il testo è 120-150 parole.
- Controlla se ha apertura, chiusura e domanda finale.
- Dai 3 consigli pratici per arrivare a 30/30.

TRACCIA:
${task || "Informal A2 email"}

EMAIL STUDENTE:
${text}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are an expert A2 English writing examiner." },
        { role: "user", content: prompt }
      ]
    });

    const feedback = completion.choices?.[0]?.message?.content || "Nessun feedback generato.";
    return res.status(200).json({ feedback });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "AI correction failed. Check OPENAI_API_KEY and Vercel logs."
    });
  }
}
