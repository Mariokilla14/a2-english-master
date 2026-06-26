import { incrementUsage } from "./_supabase.js";
const MODELS = ["gemini-3-flash-preview","gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-1.5-flash","gemini-1.5-flash-8b"];

function extractJson(text){
  if(!text) return null;
  const cleaned = text.replace(/```json/gi,"").replace(/```/g,"").trim();
  try {
    await incrementUsage(req, "teacher"); return JSON.parse(cleaned); } catch {}
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if(s !== -1 && e !== -1 && e > s){
    try { return JSON.parse(cleaned.slice(s,e+1)); } catch {}
  }
  return null;
}

export default async function handler(req,res){
  if(req.method !== "POST") return res.status(405).json({error:"Use POST"});

  try{
    const { text, task, liveChecks } = req.body || {};
    if(!text) return res.status(400).json({error:"Missing text"});

    const apiKey = process.env.GEMINI_API_KEY;
    if(!apiKey) return res.status(500).json({error:"Missing GEMINI_API_KEY on Vercel"});

    const prompt = `
Sei un insegnante italiano di inglese A2 e un esaminatore Cambridge.
Correggi questa informal email A2 come se fosse un esame.

Rispondi SOLO con JSON valido, niente markdown.

Schema obbligatorio:
{
  "overall": number,
  "levelEstimate": "A1 | A2 Low | A2 | A2 High | B1 Bridge",
  "summary": "commento breve e incoraggiante in italiano",
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
      "rule": "nome della regola",
      "examples": ["esempio corretto 1", "esempio corretto 2"]
    }
  ],
  "correctedEmail": "versione corretta completa della email",
  "improvedEmail": "versione migliorata ma sempre A2, 120-150 parole",
  "strengths": ["punto forte 1", "punto forte 2"],
  "tips": ["consiglio 1", "consiglio 2", "consiglio 3"],
  "studyFocus": ["argomento grammaticale 1", "argomento grammaticale 2"],
  "nextExercise": "un esercizio breve mirato agli errori principali"
}

Criteri:
- Valuta /30 in modo severo ma utile.
- Cambridge style: Content, Communicative Achievement, Organisation, Language.
- Correzione riga per riga.
- Controlla 120-150 parole.
- Controlla opening tipo "Dear Sam,".
- Controlla closing tipo "Best wishes,".
- Controlla domanda finale.
- Spiega sempre in italiano semplice.
- Non usare livello B2/C1: mantieni tutto A2.

CONTROLLI LIVE GIÀ FATTI DALL'APP:
${JSON.stringify(liveChecks || {}, null, 2)}

TRACCIA:
${task || "A2 informal email"}

EMAIL:
${text}
`;

    let errors = [];

    for(const model of MODELS){
      try{
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:"POST",
          headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
          body:JSON.stringify({
            contents:[{role:"user",parts:[{text:prompt}]}],
            generationConfig:{temperature:0.2,maxOutputTokens:4500,responseMimeType:"application/json"}
          })
        });

        const data = await response.json();

        if(!response.ok){
          errors.push(`${model}: ${data?.error?.message || response.status}`);
          continue;
        }

        const raw = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("\n") || "";
        const report = extractJson(raw);

        if(report) return res.status(200).json({report,modelUsed:model});
        return res.status(200).json({feedback:raw,modelUsed:model});

      }catch(err){
        errors.push(`${model}: ${err.message}`);
      }
    }

    return res.status(429).json({error:"Nessun modello Gemini disponibile. " + errors.join(" | ")});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:"AI correction failed"});
  }
}
