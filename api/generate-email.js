import { incrementUsage } from "./_supabase.js";
const MODELS = ["gemini-3-flash-preview","gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-1.5-flash","gemini-1.5-flash-8b"];

function extractJson(text){
  if(!text) return null;
  const cleaned = text.replace(/```json/gi,"").replace(/```/g,"").trim();
  try {
    await incrementUsage(req, "email"); return JSON.parse(cleaned); } catch {}
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if(s !== -1 && e !== -1 && e > s){
    try { return JSON.parse(cleaned.slice(s,e+1)); } catch {}
  }
  return null;
}

export default async function handler(req,res){
  if(req.method !== "POST") return res.status(405).json({error:"Use POST"});

  try{
    const { topic, customTask, previousTitles } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    if(!apiKey) return res.status(500).json({error:"Missing GEMINI_API_KEY on Vercel"});

    const opening = `Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.`;

    const closing = `Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`;

    const prompt = `
Sei un esaminatore Cambridge A2.
Genera una informal email modello da 30/30 per uno studente italiano.

OBBLIGATORIO:
- Livello A2 alto.
- 120-150 parole totali.
- Deve essere naturale, chiara, ben organizzata.
- Deve avere una domanda finale.
- Opening IDENTICO:
${opening}

- Closing IDENTICO:
${closing}

- Cambia SOLO il corpo centrale.
- Non usare lessico troppo difficile.
- Usa almeno 4 elementi grammaticali A2 tra: Past Simple, Present Perfect, comparatives, modals, future, linkers, prepositions, conditionals base.
- Non creare un modello simile a questi titoli già salvati: ${(previousTitles||[]).slice(-30).join(", ")}

ARGOMENTO:
${topic || "Random"}

TRACCIA PERSONALIZZATA:
${customTask || "Create a realistic A2 informal email task."}

Rispondi SOLO con JSON valido:
{
  "title": "titolo breve",
  "category": "categoria",
  "task": "traccia della email",
  "wordCount": number,
  "grammarUsed": ["regola 1", "regola 2"],
  "vocabulary": ["parola 1", "parola 2"],
  "email": "email completa con opening e closing",
  "why30": ["motivo 1", "motivo 2", "motivo 3"]
}
`;

    let errors = [];

    for(const model of MODELS){
      try{
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:"POST",
          headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
          body:JSON.stringify({
            contents:[{role:"user",parts:[{text:prompt}]}],
            generationConfig:{temperature:0.75,maxOutputTokens:2500,responseMimeType:"application/json"}
          })
        });

        const data = await response.json();
        if(!response.ok){
          errors.push(`${model}: ${data?.error?.message || response.status}`);
          continue;
        }

        const raw = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("\n") || "";
        const email = extractJson(raw);
        if(!email || !email.email){
          errors.push(`${model}: invalid JSON`);
          continue;
        }

        return res.status(200).json({ email, modelUsed:model });
      }catch(err){
        errors.push(`${model}: ${err.message}`);
      }
    }

    return res.status(429).json({error:"Nessun modello disponibile per generare email. " + errors.join(" | ")});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:"Email generation failed"});
  }
}
