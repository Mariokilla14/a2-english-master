
/* V24 GEMINI ONLY FILL THE GAP
   Rimuove database/offline e collega direttamente i bottoni a /api/fillgap.
*/

function v24GetRecentGapTitles(){
  try{
    const arr = JSON.parse(localStorage.getItem('a2_gap_used') || '[]');
    return arr.map(x => x.title || '').filter(Boolean).slice(-20);
  }catch{return []}
}

function v24GetWeakGapRules(){
  try{
    const stats = JSON.parse(localStorage.getItem('a2_gap_rule_stats') || '{}');
    return Object.entries(stats)
      .filter(([_,v]) => v && v.total >= 2 && (v.correct / v.total) < 0.65)
      .map(([k]) => k)
      .slice(0, 8);
  }catch{return []}
}

async function v24GenerateGeminiFillGap(){
  const status = document.getElementById('gapStatus');
  const grammar = document.getElementById('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level = document.getElementById('gapLevel')?.value || 'Cambridge Exam';
  const topic = document.getElementById('gapTopic')?.value || 'Random';
  const mode = document.getElementById('gapMode')?.value || 'Simulazione Cambridge';

  if(status){
    status.innerHTML = '✨ Gemini sta creando un vero brano Cambridge coerente...<br><small>Attendi qualche secondo.</small>';
  }

  try{
    const res = await fetch('/api/fillgap', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        grammar,
        level,
        topic,
        mode,
        recentExercises:v24GetRecentGapTitles(),
        weakRules:v24GetWeakGapRules()
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');

    const ex = data.exercise;
    if(typeof markGapAsUsed === 'function') markGapAsUsed(ex);
    if(typeof renderFillGap === 'function') renderFillGap(ex);

    if(status){
      status.innerHTML = `✅ Brano creato con Gemini • ${data.modelUsed || ex.modelUsed || 'Gemini'}<br><small>${ex.title || ''}</small>`;
    }
  }catch(e){
    if(status){
      status.innerHTML = `❌ AI non disponibile: ${e.message}<br><small>Controlla quota Gemini o riprova tra poco.</small>`;
    }
  }
}

function v24AttachFillGapButtons(){
  const allButtons = Array.from(document.querySelectorAll('button'));
  allButtons.forEach(btn => {
    const txt = (btn.textContent || '').toLowerCase();
    if(
      txt.includes('genera esercizio') ||
      txt.includes('brano cambridge') ||
      txt.includes('nuova traccia')
    ){
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        v24GenerateGeminiFillGap();
      };
    }
  });

  const gapPage = document.querySelector('#fillgap, #gap');
  if(gapPage && !document.getElementById('v24GeminiOnlyBtn')){
    const btn = document.createElement('button');
    btn.id = 'v24GeminiOnlyBtn';
    btn.className = 'primary pink';
    btn.textContent = '✨ Genera con Gemini';
    btn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      v24GenerateGeminiFillGap();
    };
    const target = gapPage.querySelector('.toolbar') || gapPage.querySelector('.panel') || gapPage;
    target.prepend(btn);
  }
}

window.generateSmartFillGap = v24GenerateGeminiFillGap;
window.fetchNewGap = async function(){
  await v24GenerateGeminiFillGap();
};

setTimeout(v24AttachFillGapButtons, 300);
setTimeout(v24AttachFillGapButtons, 1000);
setTimeout(v24AttachFillGapButtons, 2000);
