
/* V25 AI FIRST + ARCHIVIO FILL THE GAP */

let v25CurrentArchiveId = null;
let v25ExerciseStart = null;

function v25RecentTitles(){
  try {
    const local = JSON.parse(localStorage.getItem('a2_gap_archive_titles') || '[]');
    return local.slice(-100);
  } catch { return []; }
}

function v25SaveRecentTitle(title){
  if(!title) return;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem('a2_gap_archive_titles') || '[]'); } catch {}
  arr.push(title);
  arr = [...new Set(arr)].slice(-100);
  localStorage.setItem('a2_gap_archive_titles', JSON.stringify(arr));
}

function v25WeakRules(){
  try{
    const stats = JSON.parse(localStorage.getItem('a2_gap_rule_stats') || '{}');
    return Object.entries(stats)
      .filter(([_,v]) => v && v.total >= 2 && (v.correct / v.total) < 0.70)
      .sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total))
      .map(([k]) => k)
      .slice(0, 8);
  }catch{return []}
}

async function v25ArchiveExercise(ex){
  try{
    const res = await fetch('/api/fillgap-archive',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exercise:ex})
    });
    const data = await res.json();
    if(res.ok && data.ok) {
      v25CurrentArchiveId = data.id;
      ex.archiveId = data.id;
      return data.id;
    }
  }catch{}
  return null;
}

async function v25SaveResult(score,total,answers){
  if(!v25CurrentArchiveId) return;
  const timeSeconds = v25ExerciseStart ? Math.round((Date.now() - v25ExerciseStart)/1000) : null;
  try{
    await fetch('/api/fillgap-archive',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        archiveId:v25CurrentArchiveId,
        answers,
        score,
        total,
        timeSeconds
      })
    });
  }catch{}
}

async function v25GenerateExercise(){
  const status = document.getElementById('gapStatus');
  const grammar = document.getElementById('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level = document.getElementById('gapLevel')?.value || 'Cambridge Exam';
  const topic = document.getElementById('gapTopic')?.value || 'Random';
  const mode = document.getElementById('gapMode')?.value || 'Simulazione Cambridge';

  v25CurrentArchiveId = null;
  v25ExerciseStart = Date.now();

  if(status){
    status.innerHTML = '✨ Gemini sta creando un nuovo brano Cambridge...<br><small>L’esercizio verrà salvato automaticamente nell’archivio.</small>';
  }

  try{
    const res = await fetch('/api/fillgap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        grammar, level, topic, mode,
        recentExercises:v25RecentTitles(),
        weakRules:v25WeakRules()
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');

    const ex = data.exercise;
    v25SaveRecentTitle(ex.title);
    await v25ArchiveExercise(ex);

    if(typeof markGapAsUsed === 'function') markGapAsUsed(ex);
    if(typeof renderFillGap === 'function') renderFillGap(ex);

    if(status){
      status.innerHTML = `✅ Esercizio creato e archiviato • ${data.modelUsed || ex.modelUsed || 'Gemini'}<br><small>${ex.title || ''}</small>`;
    }
  }catch(e){
    if(status){
      status.innerHTML = `❌ AI non disponibile: ${e.message}<br><small>Controlla credito/quota Gemini oppure riprova tra poco.</small>`;
    }
  }
}

async function v25LoadArchive(){
  const box = document.getElementById('archiveList');
  if(!box) return;
  box.innerHTML = '<div class="box">Carico archivio...</div>';
  try{
    const res = await fetch('/api/fillgap-archive?limit=100');
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Archivio non disponibile');
    const items = data.items || [];
    if(!items.length){
      box.innerHTML = '<div class="box">Nessun esercizio archiviato ancora.</div>';
      return;
    }

    box.innerHTML = items.map(item => {
      const pct = item.percentage == null ? 'Non svolto' : `${item.score}/${item.total} (${Math.round(item.percentage)}%)`;
      const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      return `<div class="emailcard archiveItem">
        <div class="emailTop">
          <div>
            <span class="scorebadge">${item.favorite ? '⭐ Preferito' : '📚 Archivio'}</span>
            <span class="scorebadge">${pct}</span>
            <h3>${escapeHtml(item.title || 'Fill the Gap')}</h3>
            <p>${escapeHtml(item.topic || 'Mixed')} • ${escapeHtml(item.grammarFocus || '')}</p>
            <small>${date}</small>
          </div>
          <div class="cardActions">
            <button class="secondary" onclick="v25RedoArchive('${item.id}')">🔁 Rifai</button>
            <button class="secondary" onclick="v25ToggleFavorite('${item.id}')">⭐</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }catch(e){
    box.innerHTML = `<div class="issue bad">${escapeHtml(e.message)}</div>`;
  }
}

async function v25RedoArchive(id){
  try{
    const res = await fetch('/api/fillgap-archive?limit=100');
    const data = await res.json();
    const item = (data.items || []).find(x => x.id === id);
    if(!item) throw new Error('Esercizio non trovato');
    v25CurrentArchiveId = item.id;
    v25ExerciseStart = Date.now();
    if(typeof renderFillGap === 'function') renderFillGap(item.exercise);
    document.querySelectorAll('[data-page="fillgap"], [data-page="gap"]').forEach(btn => btn.click());
    const status = document.getElementById('gapStatus');
    if(status) status.innerHTML = `🔁 Esercizio recuperato dall’archivio.<br><small>${item.title}</small>`;
  }catch(e){ alert(e.message); }
}

async function v25ToggleFavorite(id){
  try{
    await fetch('/api/fillgap-archive',{
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({archiveId:id,favorite:true})
    });
    v25LoadArchive();
  }catch(e){ alert(e.message); }
}

function v25InstallButtons(){
  Array.from(document.querySelectorAll('button')).forEach(btn => {
    const txt = (btn.textContent || '').toLowerCase();
    if(txt.includes('genera esercizio') || txt.includes('genera con gemini') || txt.includes('nuova traccia')){
      btn.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        v25GenerateExercise();
      };
    }
    if(txt.includes('prepara cache') || txt.includes('usa pronto')){
      btn.style.display = 'none';
    }
  });

  const gapPage = document.querySelector('#fillgap, #gap');
  if(gapPage && !document.getElementById('v25GenerateBtn')){
    const btn = document.createElement('button');
    btn.id = 'v25GenerateBtn';
    btn.className = 'primary pink';
    btn.textContent = '✨ Genera nuovo esercizio';
    btn.onclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      v25GenerateExercise();
    };
    const target = gapPage.querySelector('.toolbar') || gapPage.querySelector('.panel') || gapPage;
    target.prepend(btn);
  }
}

function v25PatchCorrectionSave(){
  const old = window.checkFillGapAnswers || window.correctFillGap || null;
  if(old && !old.__v25patched){
    const patched = function(...args){
      const result = old.apply(this,args);
      setTimeout(() => {
        try{
          const selects = Array.from(document.querySelectorAll('#gapText select, .gapText select, select[data-gap]'));
          let score = 0;
          let total = selects.length;
          const answers = {};
          selects.forEach((s,i)=>{
            const selected = s.value;
            answers[i+1] = selected;
            if(s.dataset.answer && selected === s.dataset.answer) score++;
          });
          if(total > 0) v25SaveResult(score,total,answers);
        }catch{}
      },500);
      return result;
    };
    patched.__v25patched = true;
    if(window.checkFillGapAnswers) window.checkFillGapAnswers = patched;
    if(window.correctFillGap) window.correctFillGap = patched;
  }
}

window.v25GenerateExercise = v25GenerateExercise;
window.v25LoadArchive = v25LoadArchive;
window.v25RedoArchive = v25RedoArchive;
window.v25ToggleFavorite = v25ToggleFavorite;
window.generateSmartFillGap = v25GenerateExercise;
window.fetchNewGap = async function(){ await v25GenerateExercise(); return null; };

setTimeout(v25InstallButtons,300);
setTimeout(v25InstallButtons,1000);
setTimeout(v25InstallButtons,2000);
setTimeout(v25PatchCorrectionSave,1000);
setTimeout(v25PatchCorrectionSave,2500);
