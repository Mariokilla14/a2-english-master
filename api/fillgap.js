import { incrementUsage } from "./_supabase.js";
const MODELS = ["gemini-3-flash-preview","gemini-2.5-flash","gemini-2.5-flash-lite","gemini-2.0-flash","gemini-1.5-flash","gemini-1.5-flash-8b"];

function extractJson(text){
  if(!text) return null;
  const cleaned=text.replace(/```json/gi,"").replace(/```/g,"").trim();
  try{
    await incrementUsage(req, "fillgap");return JSON.parse(cleaned)}catch{}
  const s=cleaned.indexOf("{"), e=cleaned.lastIndexOf("}");
  if(s!==-1 && e!==-1 && e>s){
    try{return JSON.parse(cleaned.slice(s,e+1))}catch{}
  }
  return null;
}

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Use POST"});

  try{
    const {grammar,level,topic,mode,recentExercises,weakRules}=req.body||{};
    const apiKey=process.env.GEMINI_API_KEY;
    if(!apiKey) return res.status(500).json({error:"Missing GEMINI_API_KEY on Vercel"});

    const weak = Array.isArray(weakRules) && weakRules.length ? weakRules.join(", ") : "nessuno";
    const recent = Array.isArray(recentExercises) && recentExercises.length
      ? recentExercises.slice(-12).map(x=>`- ${x}`).join("\n")
      : "nessuno";

    const prompt=`Crea un esercizio Fill the Gap livello A2 in stile Cambridge.
Deve essere un BRANO unico, non frasi isolate.

Impostazioni:
- Livello: ${level||"Cambridge Exam"}
- Argomento richiesto: ${topic||"Random"}
- Grammatica richiesta: ${grammar||"Mixed Grammar"}
- Modalità allenamento: ${mode||"Casuale"}
- Errori ricorrenti dello studente: ${weak}

Regole intelligenti:
- Se modalità = "Errori ricorrenti", concentra almeno 60% delle domande su: ${weak}.
- Se modalità = "Simulazione Cambridge", distribuisci le regole in modo vario e realistico.
- Se modalità = "Casuale", varia argomento e grammatica.
- NON creare un esercizio simile agli ultimi esercizi:
${recent}

Formato:
- 30 spazi numerati nel brano: ___1___ ... ___30___
- Ogni domanda ha 4 opzioni.
- Una sola risposta corretta.
- Distrattori realistici e difficili, non banali.
- Copri grammatica A2 del libro: present simple, present continuous, past simple, past continuous, present perfect, future, modals, articles, prepositions, comparatives, superlatives, quantifiers, relative clauses, conditionals base, passive base, word formation.
- Spiega brevemente la regola in italiano.

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

IMPORTANTE: questions deve contenere esattamente 30 elementi.`;

    let errors=[];
    for(const model of MODELS){
      try{
        const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
          method:"POST",
          headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
          body:JSON.stringify({
            contents:[{role:"user",parts:[{text:prompt}]}],
            generationConfig:{temperature:0.75,maxOutputTokens:6500,responseMimeType:"application/json"}
          })
        });
        const data=await response.json();
        if(!response.ok){errors.push(`${model}: ${data?.error?.message||response.status}`);continue}
        const raw=data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("\n")||"";
        const exercise=extractJson(raw);
        if(!exercise||!Array.isArray(exercise.questions)){errors.push(`${model}: invalid JSON`);continue}
        if(exercise.questions.length<30){errors.push(`${model}: only ${exercise.questions.length} questions`);continue}
        exercise.questions=exercise.questions.slice(0,30);
        exercise.createdAt=Date.now();
        exercise.mode=mode||"Casuale";
        return res.status(200).json({exercise,modelUsed:model});
      }catch(err){errors.push(`${model}: ${err.message}`)}
    }
    return res.status(429).json({error:"Nessun modello disponibile per generare fill the gap. "+errors.join(" | ")});
  }catch(e){
    console.error(e);
    return res.status(500).json({error:"Fill the gap generation failed"});
  }
}
