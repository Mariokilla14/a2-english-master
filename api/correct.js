const MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const { text, task } = req.body || {};
    if (!text) return res.status(400).json({ error: "Missing text" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY on Vercel" });

    const prompt = `
Sei un insegnante italiano di inglese A2 e un esaminatore Cambridge.
Correggi questa informal email.

IMPORTANTE:
- Rispondi in italiano.
- Valuta /30.
- Dai Content /25, Communicative Achievement /25, Organisation /25, Language /25.
- Fai correzione riga per riga.
- Indica: errore, correzione, spiegazione.
- Controlla apertura e chiusura: devono essere tipo "Dear Sam," e "Best wishes,".
- Controlla 120-150 parole.
- Dai una versione corretta dell'email.
- Dai 3 consigli per prendere 30/30.

TRACCIA:
${task || "A2 informal email"}

EMAIL:
${text}
`;

    let errors = [];

    for (const model of MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 2500 }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          errors.push(`${model}: ${data?.error?.message || response.status}`);
          continue;
        }

        const feedback =
          data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") ||
          "Nessun feedback generato.";

        return res.status(200).json({ feedback, modelUsed: model });

      } catch (err) {
        errors.push(`${model}: ${err.message}`);
      }
    }

    return res.status(429).json({
      error: "Nessun modello Gemini disponibile con questa chiave. Dettagli: " + errors.join(" | ")
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "AI correction failed" });
  }
}
