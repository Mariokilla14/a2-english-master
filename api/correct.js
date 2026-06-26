export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { text, task } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY environment variable on Vercel."
      });
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

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1800
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini API error"
      });
    }

    const feedback =
      data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ||
      "Nessun feedback generato.";

    return res.status(200).json({ feedback });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "AI correction failed. Check GEMINI_API_KEY and Vercel logs."
    });
  }
}
