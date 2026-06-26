function getWords(text){
  return text.trim().match(/[A-Za-z']+/g) || [];
}

function analyseText(text){
  const words = getWords(text);
  let issues = [];
  issues = issues.concat(checkSpelling(words));
  issues = issues.concat(checkGrammar(text));

  if(words.length < 120){
    issues.push({type:"✍️ Words", bad:String(words.length), msg:"Sotto 120 parole: aggiungi dettagli.", penalty:2});
  }
  if(words.length > 150){
    issues.push({type:"✍️ Words", bad:String(words.length), msg:"Sopra 150 parole: accorcia il testo.", penalty:1.5});
  }
  if(!/dear/i.test(text)){
    issues.push({type:"📩 Organisation", bad:"opening", msg:"Manca Dear + nome.", penalty:1});
  }
  if(!/best wishes|love|take care/i.test(text)){
    issues.push({type:"📩 Organisation", bad:"ending", msg:"Manca una chiusura informale.", penalty:1});
  }
  if(!/\?/.test(text)){
    issues.push({type:"🎯 Task", bad:"question", msg:"Aggiungi una domanda al tuo amico.", penalty:1});
  }
  if(!/\b(because|so|but|although|while|when|if|in the end|luckily|unfortunately)\b/i.test(text)){
    issues.push({type:"🔗 Linking", bad:"linkers", msg:"Usa almeno un connettivo: because, so, while, although...", penalty:1});
  }
  const veryCount = (text.match(/\bvery\b/gi)||[]).length;
  if(veryCount >= 4){
    issues.push({type:"🌟 Style", bad:"very", msg:"Hai ripetuto very molte volte. Prova really, quite, a bit.", penalty:0.5});
  }

  const penalty = issues.reduce((sum, issue) => sum + issue.penalty, 0);
  const score = Math.max(0, Math.round(30 - penalty));
  return {score, words:words.length, issues};
}

function renderReport(targetId, text, saveProgress){
  const result = analyseText(text);
  const cls = result.score >= 27 ? "ok" : result.score >= 22 ? "warn" : "bad";
  let html = `<div class="report">
    <div class="card"><div class="kpi ${cls}">${result.score}/30</div><p>🏆 Voto stimato</p></div>
    <div class="card"><div class="kpi">${result.words}</div><p>✍️ Parole</p></div>
    <div class="card"><div class="kpi">${result.issues.length}</div><p>🔍 Errori trovati</p></div>
  </div>`;

  html += `<h3>🧠 Correzione dettagliata</h3>`;
  if(result.issues.length === 0){
    html += `<div class="issue ok">🎉 Ottimo: non ho trovato errori principali. Email molto forte.</div>`;
  } else {
    result.issues.forEach(issue => {
      html += `<div class="issue"><span class="pill">${issue.type}</span><b class="bad">${issue.bad}</b><br>${issue.msg}</div>`;
    });
  }

  html += `<h3>👨‍🏫 Consiglio del professore</h3><p>${
    result.score >= 28
      ? "Fantastico: struttura chiara, lessico buono e pochi errori. Questa email è da voto alto."
      : "Prima correggi gli errori evidenziati, poi controlla apertura, chiusura, domanda finale e 120-150 parole."
  }</p>`;

  document.getElementById(targetId).innerHTML = html;
  if(saveProgress) saveResult(result);
}
