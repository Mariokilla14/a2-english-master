
/* V26 FIX DISPLAY FILL THE GAP
   Se Gemini genera l'esercizio ma non appare, questo script crea il box del brano in modo sicuro.
*/

let v26CurrentExercise = null;
let v26CurrentArchiveId = null;
let v26StartTime = null;

function v26Escape(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function v26FindGapPage(){
  return document.querySelector('#fillgap, #gap') ||
         Array.from(document.querySelectorAll('.page')).find(p => (p.textContent || '').includes('Infinite Fill'));
}

function v26EnsureDisplayArea(){
  const page = v26FindGapPage();
  if(!page) return null;

  let area = document.getElementById('v26FillGapDisplay');
  if(!area){
    area = document.createElement('div');
    area.id = 'v26FillGapDisplay';
    area.className = 'panel v26FillGapDisplay';
    page.appendChild(area);
  }
  return area;
}

function v26RenderExercise(ex){
  v26CurrentExercise = ex;
  v26StartTime = Date.now();

  const area = v26EnsureDisplayArea();
  if(!area) return;

  const qs = Array.isArray(ex.questions) ? ex.questions : [];
  let passage = String(ex.passage || "");

  qs.forEach((q, index) => {
    const id = q.id || index + 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const select = `<select class="v26GapSelect" data-gap="${id}" data-answer="${v26Escape(q.answer)}">
      <option value="">${id}</option>
      ${opts.map(o => `<option value="${v26Escape(o)}">${v26Escape(o)}</option>`).join("")}
    </select>`;
    passage = passage.replace(new RegExp(`___${id}___`, "g"), select);
  });

  area.innerHTML = `
    <div class="v26ExerciseHead">
      <div>
        <h2>${v26Escape(ex.title || "Fill the Gap")}</h2>
        <p>${v26Escape(ex.topic || "Mixed")} • ${v26Escape(ex.grammarFocus || "Cambridge A2/B1")}</p>
      </div>
      <span class="scorebadge">30 gaps</span>
    </div>

    <div class="v26Passage">${passage}</div>

    <div class="v26Actions">
      <button id="v26CorrectBtn" class="primary pink">✅ Correggi esercizio</button>
      <button id="v26NewBtn" class="secondary">✨ Nuovo esercizio</button>
    </div>

    <div id="v26Result"></div>
  `;

  document.getElementById('v26CorrectBtn').onclick = v26CorrectExercise;
  document.getElementById('v26NewBtn').onclick = () => {
    if(typeof v25GenerateExercise === 'function') v25GenerateExercise();
    else if(typeof v24GenerateGeminiFillGap === 'function') v24GenerateGeminiFillGap();
  };

  area.scrollIntoView({behavior:"smooth", block:"start"});
}

async function v26CorrectExercise(){
  if(!v26CurrentExercise) return;

  const selects = Array.from(document.querySelectorAll('#v26FillGapDisplay .v26GapSelect'));
  let score = 0;
  const answers = {};
  const qs = v26CurrentExercise.questions || [];

  selects.forEach(sel => {
    const id = Number(sel.dataset.gap);
    const selected = sel.value;
    const answer = sel.dataset.answer;
    answers[id] = selected;

    if(selected === answer){
      score++;
      sel.classList.remove('wrong');
      sel.classList.add('right');
    }else{
      sel.classList.remove('right');
      sel.classList.add('wrong');
    }
  });

  const total = selects.length;
  const pct = total ? Math.round((score/total)*100) : 0;

  const result = document.getElementById('v26Result');
  const details = qs.map(q => {
    const selected = answers[q.id] || "—";
    const ok = selected === q.answer;
    return `<div class="v26Explain ${ok ? 'ok' : 'bad'}">
      <b>${ok ? '✅' : '❌'} ${q.id}. ${v26Escape(q.rule || 'Regola')}</b><br>
      Tua risposta: <b>${v26Escape(selected)}</b> • Corretta: <b>${v26Escape(q.answer)}</b><br>
      <small>${v26Escape(q.explanation || '')}</small>
    </div>`;
  }).join("");

  result.innerHTML = `
    <div class="v26Score">
      <h2>${score}/${total} — ${pct}%</h2>
      <p>${pct >= 90 ? 'Ottimo lavoro!' : pct >= 70 ? 'Buono, ma puoi migliorare.' : 'Da ripassare con calma.'}</p>
    </div>
    <details class="whyBox" open>
      <summary>📘 Spiegazioni</summary>
      ${details}
    </details>
  `;

  if(window.v25SaveResult){
    try{
      const timeSeconds = v26StartTime ? Math.round((Date.now()-v26StartTime)/1000) : null;
      await fetch('/api/fillgap-archive',{
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          archiveId:v26CurrentExercise.archiveId || window.v25CurrentArchiveId || v26CurrentArchiveId,
          answers,
          score,
          total,
          timeSeconds
        })
      });
    }catch{}
  }
}

async function v26GenerateExercise(){
  const status = document.getElementById('gapStatus');
  const grammar = document.getElementById('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level = document.getElementById('gapLevel')?.value || 'Cambridge Exam';
  const topic = document.getElementById('gapTopic')?.value || 'Random';
  const mode = document.getElementById('gapMode')?.value || 'Simulazione Cambridge';

  if(status){
    status.innerHTML = '✨ Gemini sta creando il brano...';
  }

  try{
    const res = await fetch('/api/fillgap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({grammar, level, topic, mode})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');

    const ex = data.exercise;

    try{
      const save = await fetch('/api/fillgap-archive',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({exercise:ex})
      });
      const saved = await save.json();
      if(saved?.id){
        ex.archiveId = saved.id;
        v26CurrentArchiveId = saved.id;
      }
    }catch{}

    if(status){
      status.innerHTML = `✅ Esercizio creato e archiviato • ${data.modelUsed || ex.modelUsed || 'Gemini'}<br><small>${v26Escape(ex.title || '')}</small>`;
    }

    v26RenderExercise(ex);
  }catch(e){
    if(status){
      status.innerHTML = `❌ AI non disponibile: ${v26Escape(e.message)}`;
    }
  }
}

function v26AttachButtons(){
  const buttons = Array.from(document.querySelectorAll('button'));
  buttons.forEach(btn => {
    const txt = (btn.textContent || '').toLowerCase();
    if(txt.includes('genera nuovo esercizio') || txt.includes('genera esercizio') || txt.includes('genera con gemini')){
      btn.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        v26GenerateExercise();
      };
    }
  });

  const page = v26FindGapPage();
  if(page && !document.getElementById('v26MainBtn')){
    const btn = document.createElement('button');
    btn.id = 'v26MainBtn';
    btn.className = 'primary pink';
    btn.textContent = '✨ Genera e mostra esercizio';
    btn.onclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      v26GenerateExercise();
    };
    const target = page.querySelector('.toolbar') || page.querySelector('.panel') || page;
    target.prepend(btn);
  }
}

window.v26GenerateExercise = v26GenerateExercise;
window.v26RenderExercise = v26RenderExercise;
window.generateSmartFillGap = v26GenerateExercise;
window.v25GenerateExercise = v26GenerateExercise;

setTimeout(v26AttachButtons, 300);
setTimeout(v26AttachButtons, 1000);
setTimeout(v26AttachButtons, 2000);
