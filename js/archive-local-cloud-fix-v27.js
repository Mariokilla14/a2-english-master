
/* V27 ARCHIVE LOCAL + CLOUD FIX
   L'archivio funziona sempre:
   - salva subito in localStorage;
   - prova anche Supabase;
   - mostra archivio locale + cloud.
*/

const V27_ARCHIVE_KEY = "a2_fillgap_archive_local_v27";

function v27ReadArchive(){
  try { return JSON.parse(localStorage.getItem(V27_ARCHIVE_KEY) || "[]"); }
  catch { return []; }
}

function v27WriteArchive(items){
  localStorage.setItem(V27_ARCHIVE_KEY, JSON.stringify(items.slice(0, 300)));
}

function v27LocalSaveExercise(ex){
  const items = v27ReadArchive();
  const id = ex.archiveId || ("local_" + Date.now() + "_" + Math.random().toString(16).slice(2));
  ex.archiveId = id;

  items.unshift({
    id,
    title: ex.title || "Fill the Gap",
    topic: ex.topic || "Mixed",
    grammarFocus: ex.grammarFocus || "Mixed Grammar",
    exercise: ex,
    score: null,
    total: null,
    percentage: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    source: "local"
  });

  v27WriteArchive(items);
  return id;
}

function v27LocalUpdateResult(archiveId, score, total, answers, timeSeconds){
  const items = v27ReadArchive();
  const item = items.find(x => x.id === archiveId);
  if(item){
    item.score = score;
    item.total = total;
    item.percentage = total ? Math.round((score/total)*100) : 0;
    item.answers = answers;
    item.timeSeconds = timeSeconds;
    item.completedAt = new Date().toISOString();
    v27WriteArchive(items);
  }
}

async function v27CloudSaveExercise(ex){
  try{
    const res = await fetch('/api/fillgap-archive',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exercise:ex})
    });
    const data = await res.json();
    if(res.ok && data?.ok && data?.id){
      ex.cloudArchiveId = data.id;
      return data.id;
    }
  }catch{}
  return null;
}

async function v27CloudUpdateResult(archiveId, score, total, answers, timeSeconds){
  if(!archiveId || String(archiveId).startsWith("local_")) return;
  try{
    await fetch('/api/fillgap-archive',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({archiveId,answers,score,total,timeSeconds})
    });
  }catch{}
}

async function v27GenerateAndSave(){
  const status = document.getElementById('gapStatus');
  const grammar = document.getElementById('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level = document.getElementById('gapLevel')?.value || 'Cambridge Exam';
  const topic = document.getElementById('gapTopic')?.value || 'Random';
  const mode = document.getElementById('gapMode')?.value || 'Simulazione Cambridge';

  if(status) status.innerHTML = '✨ Gemini sta creando il brano...';

  try{
    const res = await fetch('/api/fillgap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({grammar,level,topic,mode})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');

    const ex = data.exercise;

    // Salvataggio locale immediato
    const localId = v27LocalSaveExercise(ex);

    // Prova salvataggio cloud
    const cloudId = await v27CloudSaveExercise(ex);
    if(cloudId){
      ex.archiveId = cloudId;
      // aggiorna local con cloud id collegato
      const items = v27ReadArchive();
      const item = items.find(x => x.id === localId);
      if(item){
        item.cloudId = cloudId;
        item.exercise.cloudArchiveId = cloudId;
        v27WriteArchive(items);
      }
    }else{
      ex.archiveId = localId;
    }

    if(typeof v26RenderExercise === "function"){
      v26RenderExercise(ex);
    }else if(typeof renderFillGap === "function"){
      renderFillGap(ex);
    }

    if(status){
      status.innerHTML = `✅ Esercizio creato e salvato in Archivio${cloudId ? ' Cloud' : ' Locale'}<br><small>${ex.title || ''}</small>`;
    }
  }catch(e){
    if(status) status.innerHTML = `❌ AI non disponibile: ${e.message}`;
  }
}

function v27RenderArchive(){
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

  const local = v27ReadArchive();

  if(!local.length){
    box.innerHTML = '<div class="box">Nessun esercizio archiviato ancora.</div>';
    return;
  }

  box.innerHTML = local.map(item=>{
    const pct = item.percentage == null ? 'Non svolto' : `${item.score}/${item.total} (${item.percentage}%)`;
    const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
    return `<div class="emailcard archiveItem">
      <div class="emailTop">
        <div>
          <span class="scorebadge">📚 Archivio ${item.cloudId ? 'Cloud' : 'Locale'}</span>
          <span class="scorebadge">${pct}</span>
          <h3>${v26Escape ? v26Escape(item.title || 'Fill the Gap') : item.title}</h3>
          <p>${v26Escape ? v26Escape(item.topic || 'Mixed') : item.topic} • ${v26Escape ? v26Escape(item.grammarFocus || '') : item.grammarFocus}</p>
          <small>${date}</small>
        </div>
        <div class="cardActions">
          <button class="secondary" onclick="v27RedoArchive('${item.id}')">🔁 Rifai</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function v27RedoArchive(id){
  const item = v27ReadArchive().find(x=>x.id===id);
  if(!item) return alert("Esercizio non trovato");
  const ex = item.exercise;
  ex.archiveId = item.cloudId || item.id;

  if(typeof v26RenderExercise === "function"){
    v26RenderExercise(ex);
  }else if(typeof renderFillGap === "function"){
    renderFillGap(ex);
  }

  const status = document.getElementById('gapStatus');
  if(status) status.innerHTML = `🔁 Esercizio recuperato dall’archivio.<br><small>${item.title}</small>`;

  document.querySelectorAll('[data-page="fillgap"], [data-page="gap"]').forEach(b=>b.click());
}

function v27PatchCorrection(){
  const oldCorrect = window.v26CorrectExercise;
  if(typeof oldCorrect === "function" && !oldCorrect.__v27patched){
    window.v26CorrectExercise = async function(){
      await oldCorrect();
      try{
        const ex = window.v26CurrentExercise || null;
        const selects = Array.from(document.querySelectorAll('#v26FillGapDisplay .v26GapSelect'));
        let score = 0;
        const answers = {};
        selects.forEach(sel=>{
          const id = Number(sel.dataset.gap);
          answers[id] = sel.value;
          if(sel.value === sel.dataset.answer) score++;
        });
        const total = selects.length;
        const archiveId = ex?.archiveId || ex?.cloudArchiveId;
        const timeSeconds = null;
        if(archiveId){
          v27LocalUpdateResult(archiveId, score, total, answers, timeSeconds);
          await v27CloudUpdateResult(ex.cloudArchiveId || archiveId, score, total, answers, timeSeconds);
        }
      }catch{}
    };
    window.v26CorrectExercise.__v27patched = true;
  }
}

function v27Attach(){
  Array.from(document.querySelectorAll('button')).forEach(btn=>{
    const txt = (btn.textContent||'').toLowerCase();
    if(txt.includes('genera') && (txt.includes('esercizio') || txt.includes('gemini'))){
      btn.onclick = ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        v27GenerateAndSave();
      };
    }
  });

  const loadBtn = document.getElementById('loadArchiveBtn');
  if(loadBtn) loadBtn.onclick = v27RenderArchive;

  document.querySelectorAll('[data-page="archive"]').forEach(btn=>{
    btn.addEventListener('click',()=>setTimeout(v27RenderArchive,200));
  });

  v27PatchCorrection();
}

window.v27GenerateAndSave = v27GenerateAndSave;
window.v27RenderArchive = v27RenderArchive;
window.v27RedoArchive = v27RedoArchive;
window.v25LoadArchive = v27RenderArchive;
window.v25GenerateExercise = v27GenerateAndSave;
window.v26GenerateExercise = v27GenerateAndSave;
window.generateSmartFillGap = v27GenerateAndSave;

setTimeout(v27Attach,300);
setTimeout(v27Attach,1000);
setTimeout(v27Attach,2000);
