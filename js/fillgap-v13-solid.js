
/* A2 English Master V13 - Solid FillGap Engine
   Correzione basata su correctIndex numerico: niente più bug stringa "A. for" vs "for".
*/

const V13_ARCHIVE_KEY = "a2_fillgap_archive_v13";
let v13CurrentExercise = null;
let v13CurrentArchiveId = null;
let v13StartTime = null;

function v13Escape(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function v13ReadArchive(){
  try { return JSON.parse(localStorage.getItem(V13_ARCHIVE_KEY) || "[]"); }
  catch { return []; }
}

function v13WriteArchive(items){
  localStorage.setItem(V13_ARCHIVE_KEY, JSON.stringify(items.slice(0, 500)));
}

function v13SaveLocal(ex){
  const items = v13ReadArchive();
  const id = ex.archiveId || ("local_" + Date.now() + "_" + Math.random().toString(16).slice(2));
  ex.archiveId = id;

  const existing = items.find(x => x.id === id);
  if(!existing){
    items.unshift({
      id,
      cloudId: ex.cloudArchiveId || null,
      title: ex.title || "Fill the Gap",
      topic: ex.topic || "Mixed",
      grammarFocus: ex.grammarFocus || "Mixed Grammar",
      exercise: ex,
      score: null,
      total: null,
      percentage: null,
      answers: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    v13WriteArchive(items);
  }
  return id;
}

function v13UpdateLocalResult(id, score, total, answers, timeSeconds){
  const items = v13ReadArchive();
  const item = items.find(x => x.id === id || x.cloudId === id);
  if(item){
    item.score = score;
    item.total = total;
    item.percentage = total ? Math.round((score/total)*100) : 0;
    item.answers = answers;
    item.timeSeconds = timeSeconds;
    item.completedAt = new Date().toISOString();
    v13WriteArchive(items);
  }
}

async function v13SaveCloud(ex){
  try{
    const res = await fetch('/api/fillgap-archive',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ exercise: ex })
    });
    const data = await res.json();
    if(res.ok && data?.ok && data?.id){
      ex.cloudArchiveId = data.id;
      return data.id;
    }
  }catch{}
  return null;
}

async function v13UpdateCloudResult(id, score, total, answers, timeSeconds){
  if(!id || String(id).startsWith("local_")) return;
  try{
    await fetch('/api/fillgap-archive',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ archiveId:id, answers, score, total, timeSeconds })
    });
  }catch{}
}

function v13RecentTitles(){
  return v13ReadArchive().map(x => x.title).filter(Boolean).slice(0, 100);
}

function v13WeakRules(){
  const items = v13ReadArchive().filter(x => x.answers && x.exercise?.questions);
  const stats = {};
  items.forEach(item => {
    item.exercise.questions.forEach(q => {
      const selected = Number(item.answers[q.id]);
      const ok = selected === Number(q.correctIndex);
      const rule = q.rule || "Grammar";
      if(!stats[rule]) stats[rule] = { correct:0, total:0 };
      stats[rule].total++;
      if(ok) stats[rule].correct++;
    });
  });
  return Object.entries(stats)
    .filter(([_,v]) => v.total >= 2 && (v.correct/v.total) < 0.75)
    .sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total))
    .map(([rule]) => rule)
    .slice(0, 8);
}

function v13FindPage(){
  return document.querySelector('#fillgap, #gap') ||
    Array.from(document.querySelectorAll('.page')).find(p => (p.textContent || '').includes('Infinite Fill'));
}

function v13EnsureArea(){
  const page = v13FindPage();
  if(!page) return null;
  let area = document.getElementById('v13FillGapDisplay');
  if(!area){
    area = document.createElement('div');
    area.id = 'v13FillGapDisplay';
    area.className = 'panel v13FillGapDisplay';
    page.appendChild(area);
  }
  return area;
}

function v13RepairExercise(ex){
  ex.questions = (ex.questions || []).slice(0, 30).map((q, idx) => {
    const options = Array.isArray(q.options) ? q.options.slice(0,4).map(String) : [];
    let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : -1;

    if(correctIndex < 0 || correctIndex >= options.length){
      const answer = String(q.answer || "").trim().replace(/^([A-D])[\.\)]\s*/i,"").toLowerCase();
      correctIndex = options.findIndex(o => String(o).trim().replace(/^([A-D])[\.\)]\s*/i,"").toLowerCase() === answer);
    }
    if(correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;

    return {
      id: Number(q.id || idx + 1),
      options,
      correctIndex,
      answer: options[correctIndex],
      rule: q.rule || "Grammar",
      explanation: q.explanation || ""
    };
  });
  return ex;
}

function v13RenderExercise(ex){
  ex = v13RepairExercise(ex);
  v13CurrentExercise = ex;
  v13CurrentArchiveId = ex.archiveId || null;
  v13StartTime = Date.now();

  const area = v13EnsureArea();
  if(!area) return;

  let passage = String(ex.passage || "");
  const questions = ex.questions || [];

  questions.forEach((q, idx) => {
    const id = q.id || idx + 1;
    const select = `<select class="v13GapSelect" data-gap="${id}" data-correct-index="${q.correctIndex}">
      <option value="">${id}</option>
      ${q.options.map((opt, i) => `<option value="${i}">${String.fromCharCode(65+i)}. ${v13Escape(opt)}</option>`).join("")}
    </select>`;
    passage = passage.replace(new RegExp(`___${id}___`, "g"), select);
  });

  area.innerHTML = `
    <div class="v13Head">
      <div>
        <h2>${v13Escape(ex.title || "Fill the Gap")}</h2>
        <p>${v13Escape(ex.topic || "Mixed")} • ${v13Escape(ex.grammarFocus || "Cambridge A2/B1")}</p>
      </div>
      <span class="scorebadge">30 gaps</span>
    </div>

    <div class="v13ProgressWrap">
      <div id="v13ProgressText">Gap completati: 0/30</div>
      <div class="v13Progress"><div id="v13ProgressBar"></div></div>
    </div>

    <div class="v13Passage">${passage}</div>

    <div class="v13Actions">
      <button id="v13CorrectBtn" class="primary pink">✅ Correggi esercizio</button>
      <button id="v13NewBtn" class="secondary">✨ Nuovo esercizio</button>
    </div>

    <div id="v13Result"></div>
  `;

  document.querySelectorAll('#v13FillGapDisplay .v13GapSelect').forEach(sel => {
    sel.addEventListener('change', v13UpdateProgress);
  });

  document.getElementById('v13CorrectBtn').onclick = v13CorrectExercise;
  document.getElementById('v13NewBtn').onclick = v13GenerateExercise;

  area.scrollIntoView({behavior:"smooth", block:"start"});
  v13UpdateProgress();
}

function v13UpdateProgress(){
  const selects = Array.from(document.querySelectorAll('#v13FillGapDisplay .v13GapSelect'));
  const done = selects.filter(s => s.value !== "").length;
  const total = selects.length || 30;
  const pct = Math.round((done/total)*100);
  const text = document.getElementById('v13ProgressText');
  const bar = document.getElementById('v13ProgressBar');
  if(text) text.textContent = `Gap completati: ${done}/${total}`;
  if(bar) bar.style.width = pct + "%";
}

async function v13GenerateExercise(){
  const status = document.getElementById('gapStatus');
  const grammar = document.getElementById('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level = document.getElementById('gapLevel')?.value || 'Cambridge Exam';
  const topic = document.getElementById('gapTopic')?.value || 'Random';
  const mode = document.getElementById('gapMode')?.value || 'Simulazione Cambridge';

  if(status) status.innerHTML = '✨ Gemini sta creando un brano Cambridge solido...';

  try{
    const res = await fetch('/api/fillgap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        grammar,
        level,
        topic,
        mode,
        recentExercises:v13RecentTitles(),
        weakRules:v13WeakRules()
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');

    const ex = v13RepairExercise(data.exercise);
    if(data.archiveId){
      ex.archiveId = data.archiveId;
      ex.cloudArchiveId = data.archiveId;
    }

    const localId = v13SaveLocal(ex);
    const cloudId = ex.cloudArchiveId || await v13SaveCloud(ex);
    if(cloudId){
      ex.cloudArchiveId = cloudId;
      const items = v13ReadArchive();
      const item = items.find(x => x.id === localId);
      if(item) {
        item.cloudId = cloudId;
        item.exercise.cloudArchiveId = cloudId;
        v13WriteArchive(items);
      }
    }

    v13RenderExercise(ex);

    if(status){
      status.innerHTML = `✅ Esercizio creato e salvato • ${data.modelUsed || ex.modelUsed || 'Gemini'}<br><small>${v13Escape(ex.title || '')}</small>`;
    }
  }catch(e){
    if(status) status.innerHTML = `❌ AI non disponibile: ${v13Escape(e.message)}`;
  }
}

async function v13CorrectExercise(){
  if(!v13CurrentExercise) return;

  const selects = Array.from(document.querySelectorAll('#v13FillGapDisplay .v13GapSelect'));
  let score = 0;
  const answers = {};

  selects.forEach(sel => {
    const id = Number(sel.dataset.gap);
    const selected = sel.value === "" ? null : Number(sel.value);
    const correct = Number(sel.dataset.correctIndex);
    answers[id] = selected;

    if(selected === correct){
      score++;
      sel.classList.remove("wrong");
      sel.classList.add("right");
    }else{
      sel.classList.remove("right");
      sel.classList.add("wrong");
    }
  });

  const total = selects.length;
  const pct = total ? Math.round((score/total)*100) : 0;
  const timeSeconds = v13StartTime ? Math.round((Date.now()-v13StartTime)/1000) : null;

  const explanations = (v13CurrentExercise.questions || []).map(q => {
    const selectedIndex = answers[q.id];
    const selectedText = selectedIndex == null ? "—" : q.options[selectedIndex];
    const correctText = q.options[q.correctIndex];
    const ok = selectedIndex === q.correctIndex;

    return `<div class="v13Explain ${ok ? 'ok' : 'bad'}">
      <b>${ok ? '✅' : '❌'} ${q.id}. ${v13Escape(q.rule)}</b><br>
      Tua risposta: <b>${v13Escape(selectedText)}</b> • Corretta: <b>${v13Escape(correctText)}</b><br>
      <small>${v13Escape(q.explanation || '')}</small>
    </div>`;
  }).join("");

  const result = document.getElementById('v13Result');
  if(result){
    result.innerHTML = `
      <div class="v13Score">
        <h2>${score}/${total} — ${pct}%</h2>
        <p>${pct >= 90 ? 'Ottimo lavoro!' : pct >= 70 ? 'Buono, ma ripassa gli errori.' : 'Da ripassare con calma.'}</p>
      </div>
      <details class="whyBox" open>
        <summary>📘 Spiegazioni</summary>
        ${explanations}
      </details>
    `;
  }

  const archiveId = v13CurrentExercise.archiveId || v13CurrentExercise.cloudArchiveId;
  if(archiveId){
    v13UpdateLocalResult(archiveId, score, total, answers, timeSeconds);
    await v13UpdateCloudResult(v13CurrentExercise.cloudArchiveId || archiveId, score, total, answers, timeSeconds);
  }
}

function v13RenderArchive(){
  let box = document.getElementById('archiveList');
  if(!box){
    const page = document.querySelector('#archive');
    if(page){
      box = document.createElement('div');
      box.id = 'archiveList';
      page.appendChild(box);
    }
  }
  if(!box) return;

  const items = v13ReadArchive();
  if(!items.length){
    box.innerHTML = '<div class="box">Nessun esercizio archiviato ancora.</div>';
    return;
  }

  box.innerHTML = items.map(item => {
    const pct = item.percentage == null ? "Non svolto" : `${item.score}/${item.total} (${item.percentage}%)`;
    const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
    return `<div class="emailcard archiveItem">
      <div class="emailTop">
        <div>
          <span class="scorebadge">📚 ${item.cloudId ? 'Cloud' : 'Locale'}</span>
          <span class="scorebadge">${pct}</span>
          <h3>${v13Escape(item.title)}</h3>
          <p>${v13Escape(item.topic)} • ${v13Escape(item.grammarFocus)}</p>
          <small>${date}</small>
        </div>
        <div class="cardActions">
          <button class="secondary" onclick="v13RedoArchive('${item.id}')">🔁 Rifai</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

function v13RedoArchive(id){
  const item = v13ReadArchive().find(x => x.id === id);
  if(!item) return alert("Esercizio non trovato");

  const ex = item.exercise;
  ex.archiveId = item.id;
  ex.cloudArchiveId = item.cloudId || ex.cloudArchiveId || null;

  document.querySelectorAll('[data-page="fillgap"], [data-page="gap"]').forEach(b => b.click());
  setTimeout(() => {
    v13RenderExercise(ex);
    const status = document.getElementById('gapStatus');
    if(status) status.innerHTML = `🔁 Esercizio recuperato dall’archivio.<br><small>${v13Escape(item.title)}</small>`;
  }, 150);
}

function v13Attach(){
  Array.from(document.querySelectorAll('button')).forEach(btn => {
    const txt = (btn.textContent || '').toLowerCase();
    if(txt.includes('genera') && (txt.includes('esercizio') || txt.includes('gemini'))){
      btn.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        v13GenerateExercise();
      };
    }
  });

  const page = v13FindPage();
  if(page && !document.getElementById('v13MainBtn')){
    const btn = document.createElement('button');
    btn.id = 'v13MainBtn';
    btn.className = 'primary pink';
    btn.textContent = '✨ Genera esercizio solido';
    btn.onclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      v13GenerateExercise();
    };
    const target = page.querySelector('.toolbar') || page.querySelector('.panel') || page;
    target.prepend(btn);
  }

  const loadBtn = document.getElementById('loadArchiveBtn');
  if(loadBtn) loadBtn.onclick = v13RenderArchive;

  document.querySelectorAll('[data-page="archive"]').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(v13RenderArchive, 200));
  });
}

window.v13GenerateExercise = v13GenerateExercise;
window.v13RenderExercise = v13RenderExercise;
window.v13CorrectExercise = v13CorrectExercise;
window.v13RenderArchive = v13RenderArchive;
window.v13RedoArchive = v13RedoArchive;
window.generateSmartFillGap = v13GenerateExercise;
window.v25GenerateExercise = v13GenerateExercise;
window.v26GenerateExercise = v13GenerateExercise;
window.v27GenerateAndSave = v13GenerateExercise;

setTimeout(v13Attach, 300);
setTimeout(v13Attach, 1000);
setTimeout(v13Attach, 2000);
