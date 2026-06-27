
/* V23 Coherent Cambridge Local Bank */
const COHERENT_TOPICS = ["Travel","School","Friends","Family","Shopping","Health","Technology","Work","Sport","Music","Holiday","Food"];
const COHERENT_NAMES = ["Emma","Marco","Sofia","Luca","Anna","Tom","Marta","Jack"];

function cPick(a){return a[Math.floor(Math.random()*a.length)]}
function cShuffle(a){return [...a].sort(()=>Math.random()-.5)}

function makeCoherentLocalExercise(topic="Random"){
  const t = topic && topic !== "Random" ? topic : cPick(COHERENT_TOPICS);
  const name = cPick(COHERENT_NAMES);
  const places = {
    Travel:["a small town near the sea","London","an old village","a mountain hotel"],
    School:["the school library","an English classroom","a music lesson","a science museum"],
    Friends:["a birthday party","the cinema","a park near school","a café"],
    Family:["grandmother's house","a family restaurant","a holiday flat","the kitchen"],
    Shopping:["a shopping centre","a bookshop","a small market","a clothes shop"],
    Health:["a sports centre","the park","a swimming pool","a doctor's office"],
    Technology:["the computer room","an online class","a phone shop","the library"],
    Work:["a small office","a hotel","a shop","a restaurant"],
    Sport:["a football pitch","a gym","a tennis club","a swimming pool"],
    Music:["a concert hall","a music school","a theatre","a festival"],
    Holiday:["a seaside town","a camping site","an island","a hotel"],
    Food:["a restaurant","a café","a pizzeria","a food market"]
  };
  const place = cPick(places[t] || places.Travel);

  let passage = `${name} had a very busy weekend at ${place}. On Saturday morning, ${name} went there with two friends because they wanted to do something different. When they arrived, the weather was better than they expected, so they decided to walk around first. They had never visited that place before, and everything looked more interesting than in the photos online. After an hour, they found a small café where they could sit and plan the afternoon. ${name} bought a drink and some sandwiches, but one friend said he was not hungry yet. Later, they visited the most popular part of the area, which was full of people. Although it was crowded, they enjoyed the visit because there was a lot to see. In the evening, they returned home by bus. If ${name} goes there again next month, they will invite more friends and stay longer.`;

  const gaps = [
    ["had",["had","has","have","having"],"Past Simple","Il racconto è al passato."],
    ["went",["went","go","gone","going"],"Past Simple","Il passato di go è went."],
    ["because",["because","so","but","although"],"Conjunctions","Because introduce la causa."],
    ["wanted",["wanted","want","wants","wanting"],"Past Simple","Azione passata conclusa."],
    ["arrived",["arrived","arrive","arrives","arriving"],"Past Simple","Dopo when nel racconto passato si usa arrived."],
    ["better",["better","best","good","the better"],"Comparative","Better è comparativo di good."],
    ["than",["than","then","that","as"],"Comparative","Il comparativo usa than."],
    ["decided",["decided","decide","deciding","decides"],"Past Simple","Azione passata."],
    ["had never visited",["had never visited","has never visit","never visited","was visiting"],"Past Perfect","Esperienza precedente a un momento passato."],
    ["more interesting",["more interesting","interestinger","most interesting","interesting than"],"Comparative","Con aggettivi lunghi: more + aggettivo."],
    ["After",["After","Because","Although","During"],"Linkers","After indica successione temporale."],
    ["where",["where","which","who","when"],"Relative clauses","Where indica il luogo."],
    ["could",["could","can","must","should"],"Modal past ability","Could è usato per possibilità/capacità al passato."],
    ["bought",["bought","buy","buyed","buying"],"Past Simple irregular","Il passato di buy è bought."],
    ["some",["some","any","much","a"],"Quantifiers","Some in frase affermativa."],
    ["was",["was","were","is","be"],"Past Simple be","One friend è singolare."],
    ["yet",["yet","already","never","ever"],"Yet","Yet si usa con significato di ancora in frasi negative."],
    ["which",["which","who","where","when"],"Relative clauses","Which si usa per cose/luoghi indicati come cosa."],
    ["Although",["Although","Because","So","But"],"Conjunctions","Although introduce contrasto."],
    ["crowded",["crowded","crowd","crowding","crowds"],"Adjectives","Serve un aggettivo dopo was."],
    ["because",["because","so","but","although"],"Conjunctions","Because introduce la ragione."],
    ["a lot",["a lot","many of","much of","lots"],"Quantifiers","A lot to see = molto da vedere."],
    ["returned",["returned","return","returns","returning"],"Past Simple","Azione passata."],
    ["by",["by","on","in","at"],"Transport prepositions","By bus/train/car."],
    ["If",["If","When","Because","Although"],"Conditional","If introduce la condizione."],
    ["goes",["goes","go","went","going"],"First conditional","If + Present Simple."],
    ["will",["will","would","did","has"],"First conditional","If + present, will + base verb."],
    ["more",["more","most","many","much"],"Comparative quantity","More friends = più amici."],
    ["stay",["stay","stays","stayed","staying"],"Future with will","Dopo will si usa verbo base."],
    ["longer",["longer","longest","long","the longer"],"Comparative","Longer è comparativo di long."]
  ];

  const questions = [];
  gaps.forEach((g,i)=>{
    passage = passage.replace(g[0], `___${i+1}___`);
    questions.push({id:i+1, options:cShuffle(g[1]), answer:g[0], rule:g[2], explanation:g[3]});
  });

  return {
    id: "coherent_"+Date.now()+"_"+Math.random().toString(16).slice(2),
    title: `${t} coherent Cambridge passage`,
    topic:t,
    grammarFocus:"Coherent Cambridge A2/B1 mixed grammar",
    instructions:"Read the whole text and choose the correct option for each gap.",
    passage,
    questions,
    source:"coherent-local-v23",
    modelUsed:"Coherent Local V23",
    createdAt:Date.now()
  };
}
