import { mistakes as loadMistakes, spelling as loadSpelling } from './dataLoader.js';

let mistakesCache = null;
let spellingCache = null;

async function ensureData(){
  if(!mistakesCache) mistakesCache = await loadMistakes();
  if(!spellingCache) spellingCache = await loadSpelling();
}

function getWords(text){
  return text.trim().match(/[A-Za-z']+/g) || [];
}

export function analyseText(text){
  const wordList = getWords(text);
  let score = 30;
  const issues = [];

  // synchronous data fallback loaded via fetch may not complete inside this function in older browsers
  // therefore app preloads by first interaction; if cache is empty, use empty objects
  const spelling = spellingCache || {};
  const mistakes = mistakesCache || [];

  wordList.forEach(w => {
    const lw = w.toLowerCase();
    if(spelling[lw]){
      issues.push({type:'🔤 Spelling', bad:w, message:`Forse volevi scrivere "${spelling[lw]}".`, fix:spelling[lw]});
      score -= 0.5;
    }
  });

  mistakes.forEach(rule => {
    const re = new RegExp(rule.pattern, 'gi');
    const matches = text.match(re);
    if(matches){
      matches.forEach(m => issues.push({
        type:'🧠 ' + rule.type,
        bad:m,
        message:rule.message,
        fix:rule.fix
      }));
      score -= Number(rule.penalty || 1) * matches.length;
    }
  });

  const wc = wordList.length;
  if(wc < 120){ issues.push({type:'✍️ Words', bad:String(wc), message:'Sotto 120 parole: aggiungi dettagli.', fix:'120-150 parole'}); score -= 2; }
  if(wc > 150){ issues.push({type:'✍️ Words', bad:String(wc), message:'Sopra 150 parole: accorcia il testo.', fix:'120-150 parole'}); score -= 1.5; }
  if(!/dear/i.test(text)){ issues.push({type:'📩 Organisation', bad:'opening', message:'Manca Dear + nome.', fix:'Dear Sam,'}); score -= 1; }
  if(!/best wishes|love|take care/i.test(text)){ issues.push({type:'📩 Organisation', bad:'ending', message:'Manca una chiusura informale.', fix:'Best wishes,'}); score -= 1; }
  if(!/\?/.test(text)){ issues.push({type:'🎯 Task', bad:'question', message:'Aggiungi una domanda al tuo amico.', fix:'What about you?'}); score -= 1; }
  if(!/\b(because|so|but|although|while|when|if|in the end|luckily|unfortunately)\b/i.test(text)){
    issues.push({type:'🔗 Linking', bad:'linkers', message:'Usa almeno un connettivo.', fix:'because / while / although / in the end'});
    score -= 1;
  }

  score = Math.max(0, Math.round(score));
  const teacherComment = score >= 28
    ? 'Fantastico: struttura chiara, lessico buono e pochi errori. Email da voto alto.'
    : 'Correggi prima gli errori evidenziati, poi controlla apertura, chiusura, domanda finale e numero di parole.';

  return { score, wordCount: wc, issues, teacherComment };
}

ensureData();
