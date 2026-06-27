let traces=[],examples=[];let timer=null,time=2400,currentTask='';
const $=id=>document.getElementById(id);
const words=t=>t.trim().match(/[A-Za-z']+/g)||[];

async function init(){
  traces=await fetch('data/traces.json').then(r=>r.json());
  examples=await fetch('data/examples.json').then(r=>r.json());
  nav(); teacher(); exam(); fillGapUI(); traceUI(); emailLibraryUI(); dashboard();
}

function nav(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>show(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
}
function show(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
  if(id==='dashboard') dashboard();
}


function teacher(){
  const btn = $('aiCorrect');
  if(btn) btn.onclick=()=>ai($('aiText').value,$('aiTask').value,'aiResult','teacher');
  const insert = $('insertTemplateTeacher');
  if(insert) insert.onclick=()=>insertEmailTemplate('aiText');
  const clear = $('clearTeacherText');
  if(clear) clear.onclick=()=>{ $('aiText').value=''; updateAllLiveChecks(); };
}

function exam(){
  $('newTrace').onclick=()=>{
    let t=traces[Math.floor(Math.random()*traces.length)];
    currentTask=t.task;
    $('examTrace').innerHTML=`<b>${t.title}</b><p>${t.task}</p>`;
    $('examText').value='';
    $('wordCount').textContent='0';
    resetTimer();
    startTimer();
    updateAllLiveChecks();
  };
  $('examText').oninput=()=>{
    $('wordCount').textContent=words($('examText').value).length;
    updateAllLiveChecks();
  };
  $('examAI').onclick=()=>ai($('examText').value,currentTask||'A2 informal email','examResult','exam');
  const insert = $('insertTemplateExam');
  if(insert) insert.onclick=()=>insertEmailTemplate('examText');
  const clear = $('clearExamText');
  if(clear) clear.onclick=()=>{ $('examText').value=''; $('wordCount').textContent='0'; updateAllLiveChecks(); };
}

function resetTimer(){if(timer)clearInterval(timer);time=2400;tick();}
function startTimer(){timer=setInterval(()=>{time=Math.max(0,time-1);tick();if(time===0)clearInterval(timer)},1000)}
function tick(){let m=Math.floor(time/60),s=time%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}

function traceUI(){ renderTraces(''); $('traceSearch').oninput=e=>renderTraces(e.target.value.toLowerCase()); }
function renderTraces(q){
  $('traceList').innerHTML=traces.filter(t=>(t.title+t.task+t.category).toLowerCase().includes(q)).map(t=>`<div class="box"><b>${t.title}</b><p>${t.task}</p></div>`).join('');
}
function examplesUI(){ renderExamples(''); $('exampleSearch').oninput=e=>renderExamples(e.target.value.toLowerCase()); }
function renderExamples(q){
  $('exampleList').innerHTML=examples.filter(e=>(e.title+e.category+e.score).toLowerCase().includes(q)).map(e=>`<div class="emailcard"><span class="scorebadge">${e.label}</span><h3>${e.title}</h3><div class="emailtext">${escapeHtml(e.email)}</div><button class="secondary" onclick="navigator.clipboard.writeText(\`${e.email.replaceAll('`','')}\`)">Copia</button></div>`).join('');
}


async function ai(text,task,target,mode='teacher'){
  if(!text.trim()){
    $(target).innerHTML='<div class="issue warn">Scrivi prima una email.</div>';
    return;
  }

  const checks = analyseLiveText(text);
  $(target).innerHTML='<div class="aiout warn">🤖 Teacher AI 4.0 sta correggendo...<br>Analizzo grammatica, lessico, struttura e requisiti Cambridge.</div>';

  try{
    let res=await fetch('/api/correct',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text,task,liveChecks:checks})
    });
    let data=await res.json();
    if(!res.ok)throw new Error(data.error||'Errore AI');

    if(data.report){
      $(target).innerHTML=renderBeautifulReport(data.report,data.modelUsed);
      saveAI(JSON.stringify(data.report));
      saveTeacherReport(data.report, mode);
    } else {
      $(target).innerHTML=`<div class="aiout">${cleanText(data.feedback||'')}</div>`;
      saveAI(data.feedback||'');
    }
  }catch(e){
    $(target).innerHTML=`<div class="issue bad"><b>AI non disponibile.</b><br>${e.message}<br>Controlla Vercel → Environment Variables e fai Redeploy.</div>`;
  }
}

function cleanText(text){return String(text).replaceAll('###','').replaceAll('**','').replaceAll('|',' ').replaceAll('---','').replaceAll('\n','<br>');}
function bandCard(label,value){let n=Number(value||0);let w=Math.max(0,Math.min(100,(n/25)*100));return `<div class="bandCard"><div>${label} <b>${n}/25</b></div><div class="bar"><div style="width:${w}%"></div></div></div>`;}
function renderBeautifulReport(r,model){
  const issues=Array.isArray(r.issues)?r.issues:[], tips=Array.isArray(r.tips)?r.tips:[], focus=Array.isArray(r.studyFocus)?r.studyFocus:[];
  const strengths=Array.isArray(r.strengths)?r.strengths:[];
  return `<div class="reportNice">
    <div class="reportHero">
      <div>
        <span class="tag">🤖 ${model||'Gemini'}</span>
        <h2>Teacher AI 4.0 Report</h2>
        <p>${escapeHtml(r.summary||'Ecco la tua correzione.')}</p>
        <span class="levelBadge">Livello stimato: ${escapeHtml(r.levelEstimate||'A2')}</span>
      </div>
      <div class="scoreCircle"><strong>${Number(r.overall||0)}</strong><span>/30</span></div>
    </div>

    <div class="bandGrid">
      ${bandCard('Content',r.bands?.content)}
      ${bandCard('Communicative',r.bands?.communicative)}
      ${bandCard('Organisation',r.bands?.organisation)}
      ${bandCard('Language',r.bands?.language)}
    </div>

    <div class="reqGrid">
      ${reqCard('Opening',r.requirements?.opening)}
      ${reqCard('Closing',r.requirements?.closing)}
      ${reqCard('Question',r.requirements?.finalQuestion)}
      <div class="reqCard"><span>Words</span><b>${r.requirements?.wordCount ?? '-'}</b><small>${escapeHtml(r.requirements?.wordCountComment||'')}</small></div>
    </div>

    ${strengths.length ? `<h3>✅ Punti forti</h3><div class="twoCols">${strengths.map(s=>`<div class="tipItem good">✅ ${escapeHtml(s)}</div>`).join('')}</div>` : ''}

    <h3>📝 Correzione riga per riga</h3>
    ${issues.length?issues.map((i,idx)=>`<div class="errorCard severity_${escapeHtml(i.severity||'low')}">
      <div class="errorHeader"><span>${idx+1}</span><b>${escapeHtml(i.type||'Errore')}</b><em>${escapeHtml(i.rule||'')}</em></div>
      <div class="compareRows">
        <div><small>Hai scritto</small><p class="wrongText">${escapeHtml(i.wrong||'-')}</p></div>
        <div><small>Correzione</small><p class="correctText">${escapeHtml(i.correct||'-')}</p></div>
      </div>
      <p class="explain">${escapeHtml(i.explanation||'')}</p>
      ${(i.examples||[]).length ? `<div class="exampleMini"><b>Esempi:</b>${(i.examples||[]).map(ex=>`<div>• ${escapeHtml(ex)}</div>`).join('')}</div>` : ''}
    </div>`).join(''):'<div class="issue good">🎉 Nessun errore importante trovato.</div>'}

    <h3>✅ Email corretta</h3>
    <div class="correctedEmail">${escapeHtml(r.correctedEmail||'Non disponibile.')}</div>

    ${r.improvedEmail ? `<h3>🌟 Versione migliorata 30/30</h3><div class="correctedEmail improved">${escapeHtml(r.improvedEmail)}</div>` : ''}

    <div class="twoCols">
      <div>
        <h3>🎯 Consigli per salire</h3>
        ${tips.length?tips.map(t=>`<div class="tipItem">💡 ${escapeHtml(t)}</div>`).join(''):'<p>Nessun consiglio.</p>'}
      </div>
      <div>
        <h3>📚 Da ripassare</h3>
        ${focus.length?focus.map(f=>`<span class="chip">${escapeHtml(f)}</span>`).join(''):'<p>Nessun focus.</p>'}
      </div>
    </div>

    ${r.nextExercise ? `<h3>🧩 Esercizio mirato</h3><div class="box">${escapeHtml(r.nextExercise)}</div>` : ''}
  </div>`;
}

function reqCard(label,value){
  const v = value || 'weak';
  const cls = v === 'ok' ? 'good' : v === 'missing' ? 'bad' : 'warn';
  const text = v === 'ok' ? 'OK' : v === 'missing' ? 'Mancante' : 'Da migliorare';
  return `<div class="reqCard"><span>${label}</span><b class="${cls}">${text}</b></div>`;
}




/* ===========================
   V14 SMART FILL THE GAP
   Cache intelligente + modalità allenamento
=========================== */

const GAP_CACHE_KEY = 'a2_smart_gap_cache';
const GAP_USED_KEY = 'a2_smart_gap_used';

function fillGapUI(){
  const btn=$('generateGap');
  if(!btn)return;
  btn.onclick=generateSmartFillGap;

  const cached=$('useCachedGap');
  if(cached) cached.onclick=useReadyGap;

  const preload=$('preloadGap');
  if(preload) preload.onclick=()=>preloadGapCache(true);

  updateGapCacheStatus();
  setTimeout(()=>prepareFillGapDatabaseCache(100).then(n=>{ if($('gapCacheStatus')) $('gapCacheStatus').innerHTML='📚 Database offline pronto: '+n+' esercizi'; }).catch(()=>{}), 800);
}

function getGapCache(){
  try{return JSON.parse(localStorage.getItem(GAP_CACHE_KEY)||'[]')}catch{return []}
}
function setGapCache(items){
  localStorage.setItem(GAP_CACHE_KEY, JSON.stringify(items.slice(-25)));
}
function getUsedGaps(){
  try{return JSON.parse(localStorage.getItem(GAP_USED_KEY)||'[]')}catch{return []}
}
function setUsedGaps(items){
  localStorage.setItem(GAP_USED_KEY, JSON.stringify(items.slice(-50)));
}

function getWeakRules(){
  const gaps=JSON.parse(localStorage.getItem('a2_fillgap_memory')||'[]');
  const reports=JSON.parse(localStorage.getItem('a2_teacher_reports')||'[]');
  const rules={};

  gaps.forEach(g=>{
    Object.entries(g.wrongRules||{}).forEach(([r,n])=>rules[r]=(rules[r]||0)+n);
  });
  reports.forEach(r=>{
    (r.issues||[]).forEach(x=>rules[x]=(rules[x]||0)+1);
  });

  return Object.entries(rules).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r])=>r);
}

function getRecentExerciseLabels(){
  const used=getUsedGaps();
  return used.slice(-12).map(x=>`${x.title||'Exercise'} / ${x.topic||''} / ${x.grammarFocus||''}`);
}

function updateGapCacheStatus(){
  const cache=getGapCache();
  const weak=getWeakRules();
  const status=$('gapStatus');
  if(status && status.textContent.includes('Premi')){
    status.innerHTML=`Premi “Genera esercizio”.<br><small>⚡ Esercizi pronti in cache: <b>${cache.length}</b>${weak.length?` • 🎯 Focus consigliato: ${weak.join(', ')}`:''}</small>`;
  }
}

async function generateSmartFillGap(){
  const grammar=$('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const topic=$('gapTopic')?.value || 'Random';
  if($('gapStatus')) $('gapStatus').innerHTML='📚 Cerco prima nel database cloud, poi nel database offline...';
  try{
    const ex=await getHybridFillGap({grammar,topic});
    markGapAsUsed(ex);
    if($('gapStatus')) $('gapStatus').innerHTML=`📚 ${ex.modelUsed || 'Database'} • ${ex.title}<br><small>Zero consumo Gemini, salvo quando usi “Cresci database AI”.</small>`;
    renderFillGap(ex);
    updateHybridBankStatus();
  }catch(e){
    if($('gapStatus')) $('gapStatus').innerHTML='Errore banca dati: '+e.message;
  }
}

function useReadyGap(){
  const cache=getGapCache();
  if(!cache.length){
    $('gapStatus').innerHTML='⚠️ Non ci sono esercizi pronti. Premi “Prepara cache” oppure “Genera esercizio”.';
    return;
  }
  const ex=cache.shift();
  setGapCache(cache);
  markGapAsUsed(ex);
  renderFillGap(ex);
  updateGapCacheStatus();
  prepareFillGapDatabaseCache(100);
}

async function preloadGapCache(force=false){
  const cache=getGapCache();
  if(!force && cache.length>=3) return;

  const status=$('gapStatus');
  if(force && status) status.innerHTML='📦 Sto preparando esercizi in cache...';

  const target=force ? 3 : 2;
  let current=getGapCache();

  while(current.length<target){
    try{
      const ex=await fetchNewGap();
      current=getGapCache();
      current.push(ex);
      setGapCache(current);
      if(force && status) status.innerHTML=`✅ Cache aggiornata: ${current.length} esercizi pronti.`;
    }catch(e){
      if(force && status) status.innerHTML=`<span class="bad">Database offline pronto; cache Gemini non necessaria:</span> ${e.message}`;
      break;
    }
  }
  updateGapCacheStatus();
}

async function fetchNewGap(){
  const grammar=$('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const topic=$('gapTopic')?.value || 'Random';
  return await getHybridFillGap({grammar,topic});
}

function markGapAsUsed(ex){
  const used=getUsedGaps();
  used.push({
    id:ex.cacheId||Date.now(),
    title:ex.title,
    topic:ex.topic,
    grammarFocus:ex.grammarFocus,
    mode:ex.mode,
    usedAt:Date.now()
  });
  setUsedGaps(used);
}

function renderFillGap(ex){
  if(!ex||!Array.isArray(ex.questions)){
    $('gapStatus').innerHTML='<span class="bad">Esercizio non valido.</span>';
    return;
  }

  $('gapStatus').innerHTML=`<b>${ex.title||'Fill the Gap A2'}</b><p>${ex.instructions||'Choose the correct option for each gap.'}</p><small>🤖 ${ex.modelUsed||'Gemini'} • ${ex.mode||''}</small>`;

  $('gapExercise').innerHTML=`<div class="gapPassage">${renderPassageWithSelects(ex.passage,ex.questions)}</div>
  <button id="checkGap" class="primary pink">✅ Correggi esercizio</button>
  <button id="nextGapSmart" class="secondary">⚡ Prossimo pronto</button>
  <div id="gapResult"></div>`;

  $('checkGap').onclick=()=>checkFillGap(ex);
  $('nextGapSmart').onclick=generateSmartFillGap;
}

function renderPassageWithSelects(passage,questions){
  let out=escapeHtml(passage||'');
  questions.forEach(q=>{
    const opts=(q.options||[]).map(opt=>`<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join('');
    const select=`<span class="gapWrap"><select class="gapSelect" data-gap="${q.id}"><option value="">${q.id}</option>${opts}</select></span>`;
    out=out.replace(`___${q.id}___`,select);
  });
  return out.replaceAll('\n','<br>');
}

function checkFillGap(ex){
  let correct=0; const details=[];
  ex.questions.forEach(q=>{
    const sel=document.querySelector(`select[data-gap="${q.id}"]`);
    const val=sel?sel.value:'';
    const ok=val===q.answer;
    if(ok)correct++;
    if(sel){sel.classList.remove('right','wrong');sel.classList.add(ok?'right':'wrong');}
    details.push({...q,chosen:val,ok});
  });

  const percent=Math.round((correct/ex.questions.length)*100);
  saveGap(correct,ex.questions.length,details);

  $('gapResult').innerHTML=`<div class="reportHero">
    <div><span class="tag">🧩 Fill the Gap</span><h2>${correct}/${ex.questions.length}</h2><p>${percent}% corretto</p></div>
    <div class="scoreCircle"><strong>${percent}</strong><span>%</span></div>
  </div>
  <h3>📚 Errori e spiegazioni</h3>
  ${details.map(d=>`<div class="errorCard">
    <b>${d.id}. ${escapeHtml(d.rule||'Grammar')}</b>
    <div class="compareRows">
      <div><small>Hai scelto</small><p class="${d.ok?'correctText':'wrongText'}">${escapeHtml(d.chosen||'—')}</p></div>
      <div><small>Risposta corretta</small><p class="correctText">${escapeHtml(d.answer)}</p></div>
    </div>
    <p>${escapeHtml(d.explanation||'')}</p>
  </div>`).join('')}`;

  prepareFillGapDatabaseCache(100);
}

function saveGap(correct,total,details){
  const old=JSON.parse(localStorage.getItem('a2_fillgap_memory')||'[]');
  const wrongRules={};
  details.filter(d=>!d.ok).forEach(d=>wrongRules[d.rule||'Grammar']=(wrongRules[d.rule||'Grammar']||0)+1);
  old.push({id:Date.now(),date:new Date().toLocaleString(),correct,total,wrongRules});
  localStorage.setItem('a2_fillgap_memory',JSON.stringify(old));
  if(typeof saveCloudNote==='function') saveCloudNote('fillgap_result','Fill the Gap Result',{correct,total,details});
}

function makeDemoGap(){
  const passage=`Dear Anna,

Yesterday I ___1___ to a new restaurant with my family. The waiter ___2___ very kind and the food was delicious. I ___3___ pasta because I love Italian food. My sister ___4___ pizza, but she didn't like it very much. We ___5___ there for two hours and then we went home.

I think you ___6___ come with me next time. It is ___7___ than the restaurant near school, but the food is better. I have ___8___ eaten such good pasta before.

Write back soon,
Marco`;
  return {title:'Demo Fill the Gap A2',instructions:'Choose the correct option.',passage,mode:'Demo',modelUsed:'Offline',questions:[
    {id:1,options:['go','went','gone','going'],answer:'went',rule:'Past Simple',explanation:'Con yesterday si usa il Past Simple: went.'},
    {id:2,options:['was','were','is','be'],answer:'was',rule:'Past Simple of be',explanation:'The waiter è singolare: was.'},
    {id:3,options:['order','ordered','ordering','orders'],answer:'ordered',rule:'Past Simple',explanation:'Azione passata conclusa: ordered.'},
    {id:4,options:['has','had','have','having'],answer:'had',rule:'Past Simple',explanation:'Past Simple di have = had.'},
    {id:5,options:['stayed','stay','staying','stays'],answer:'stayed',rule:'Past Simple',explanation:'Azione passata: stayed.'},
    {id:6,options:['should','must to','can to','will to'],answer:'should',rule:'Modals',explanation:'Dopo should il verbo resta base: should come.'},
    {id:7,options:['more expensive','expensiver','most expensive','the expensive'],answer:'more expensive',rule:'Comparatives',explanation:'Aggettivo lungo: more expensive.'},
    {id:8,options:['never','ever','yet','already not'],answer:'never',rule:'Present Perfect',explanation:'I have never eaten = non ho mai mangiato.'}
  ]};
}

function saveAI(feedback){let old=JSON.parse(localStorage.getItem('a2_ai_memory')||'[]');old.push({id:Date.now(),date:new Date().toLocaleString(),feedback:String(feedback).slice(0,500)});localStorage.setItem('a2_ai_memory',JSON.stringify(old));}
function dashboard(){
  const ai=JSON.parse(localStorage.getItem('a2_ai_memory')||'[]');
  const gaps=JSON.parse(localStorage.getItem('a2_fillgap_memory')||'[]');
  const reports=JSON.parse(localStorage.getItem('a2_teacher_reports')||'[]');

  const avg = reports.length ? Math.round(reports.reduce((s,r)=>s+Number(r.score||0),0)/reports.length) : 0;
  const rules = {};
  reports.forEach(r => (r.issues||[]).forEach(x => rules[x]=(rules[x]||0)+1));
  const common = Object.entries(rules).sort((a,b)=>b[1]-a[1]).slice(0,6);

  $('dashboardBox').innerHTML=`<div class="stats">
    <div class="stat"><span>Correzioni AI</span><b>${reports.length || ai.length}</b></div>
    <div class="stat"><span>Media voto</span><b>${avg || '-'}/30</b></div>
    <div class="stat"><span>Fill the Gap</span><b>${gaps.length}</b></div><div class="stat"><span>Gap pronti</span><b>${getGapCache().length}</b></div>
  </div>

  <h3>🧠 Errori ricorrenti</h3>
  ${common.length ? common.map(([rule,n])=>`<div class="issue"><b>${escapeHtml(rule)}</b><div class="bar"><div style="width:${Math.min(100,n*20)}%"></div></div>${n} volte</div>`).join('') : '<p>Nessun errore ricorrente ancora.</p>'}

  <h3>Storico Teacher AI</h3>
  ${reports.slice().reverse().map(r=>`<div class="issue"><b>${r.score}/30</b> — ${escapeHtml(r.level)}<br><small>${r.date} • ${r.mode}</small></div>`).join('') || '<p>Nessun report salvato.</p>'}

  <h3>Storico Fill the Gap</h3>
  ${gaps.slice().reverse().map(g=>`<div class="issue"><b>${g.correct}/${g.total}</b><br><small>${g.date}</small></div>`).join('')||'<p>Nessun esercizio salvato.</p>'}`;

  $('clearData').onclick=()=>{
    localStorage.removeItem('a2_ai_memory');
    localStorage.removeItem('a2_fillgap_memory');
    localStorage.removeItem('a2_teacher_reports');
    dashboard();
  };
}

function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

/* ===========================
   AI EMAIL LIBRARY - PACKAGE 1
   IndexedDB offline archive
=========================== */

const DB_NAME = 'A2EnglishMasterDB';
const DB_VERSION = 1;
const EMAIL_STORE = 'emails';
let favOnly = false;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(EMAIL_STORE)){
        const store = db.createObjectStore(EMAIL_STORE, { keyPath:'id' });
        store.createIndex('createdAt','createdAt');
        store.createIndex('category','category');
        store.createIndex('favorite','favorite');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAddEmail(email){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(EMAIL_STORE,'readwrite');
    tx.objectStore(EMAIL_STORE).put(email);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetEmails(){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(EMAIL_STORE,'readonly');
    const req = tx.objectStore(EMAIL_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDeleteEmail(id){
  const db = await openDB();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(EMAIL_STORE,'readwrite');
    tx.objectStore(EMAIL_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function emailLibraryUI(){
  const btn = $('generateEmailBtn');
  if(!btn) return;

  btn.onclick = generateAIEmail;
  $('librarySearch').oninput = renderEmailLibrary;
  $('showFavOnly').onclick = () => {
    favOnly = !favOnly;
    $('showFavOnly').textContent = favOnly ? '📚 Mostra tutte' : '⭐ Solo preferite';
    renderEmailLibrary();
  };

  await seedOldExamplesOnce();
  renderEmailLibrary();
}

async function seedOldExamplesOnce(){
  if(localStorage.getItem('seeded_email_examples_v13')) return;
  try{
    const old = await fetch('data/examples.json').then(r=>r.json());
    for(const item of old.slice(0,12)){
      await dbAddEmail({
        id:'seed_'+item.id,
        title:item.title,
        category:item.category,
        task:'Email spunto dal modello iniziale',
        wordCount: countWords(item.email),
        grammarUsed:['A2 grammar'],
        vocabulary:[],
        email:item.email,
        why30:item.score === 30 ? ['Opening corretto','Closing corretto','Buona organizzazione'] : ['Esempio di confronto'],
        favorite:false,
        createdAt:Date.now() - (1000000-item.id),
        source:'seed'
      });
    }
    localStorage.setItem('seeded_email_examples_v13','1');
  }catch{}
}

async function generateAIEmail(){
  const topic = $('emailTopic').value;
  const customTask = $('emailCustomTask').value.trim();
  const existing = await dbGetEmails();

  $('emailGenStatus').innerHTML = '🤖 Gemini sta generando una email modello 30/30...';

  try{
    const res = await fetch('/api/generate-email',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        topic,
        customTask,
        previousTitles: existing.map(e=>e.title)
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Errore generazione email');

    const e = data.email;
    const saved = {
      id:'email_'+Date.now(),
      title:e.title || 'Email 30/30',
      category:e.category || topic || 'Random',
      task:e.task || customTask || 'A2 informal email',
      wordCount:e.wordCount || countWords(e.email || ''),
      grammarUsed:e.grammarUsed || [],
      vocabulary:e.vocabulary || [],
      email:e.email || '',
      why30:e.why30 || [],
      favorite:false,
      createdAt:Date.now(),
      modelUsed:data.modelUsed || 'Gemini',
      source:'ai'
    };

    await dbAddEmail(saved);
    $('emailGenStatus').innerHTML = `<span class="good">✅ Email generata e salvata offline.</span> Modello: ${saved.modelUsed}`;
    renderEmailLibrary();

  }catch(err){
    $('emailGenStatus').innerHTML = `<span class="bad">AI non disponibile:</span> ${err.message}<br>Ho creato una email demo offline.`;
    const demo = makeDemoEmail(topic, customTask);
    await dbAddEmail(demo);
    renderEmailLibrary();
  }
}

function makeDemoEmail(topic, customTask){
  const body = `Last weekend I had a very nice experience connected with ${topic || 'my free time'}. I went there with two friends and we had a great time. At first, I was a little worried because the weather was not very good, but in the end everything was fine. I have never enjoyed an afternoon so much. I think experiences like this are useful because they help us become more confident. What did you do last weekend?`;
  const email = `Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

${body}

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`;
  return {
    id:'demo_'+Date.now(),
    title:`${topic || 'Random'} email 30/30`,
    category:topic || 'Random',
    task:customTask || 'A2 informal email',
    wordCount:countWords(email),
    grammarUsed:['Past Simple','Present Perfect','Linkers','Question form'],
    vocabulary:['experience','worried','confident'],
    email,
    why30:['Opening uguale al libro','Closing uguale al libro','Corpo chiaro e naturale','Domanda finale presente'],
    favorite:false,
    createdAt:Date.now(),
    source:'demo'
  };
}

async function renderEmailLibrary(){
  const q = ($('librarySearch')?.value || '').toLowerCase();
  let emails = await dbGetEmails();

  emails = emails
    .filter(e => !favOnly || e.favorite)
    .filter(e => (e.title + e.category + e.task + e.email + (e.grammarUsed||[]).join(' ')).toLowerCase().includes(q))
    .sort((a,b)=>b.createdAt-a.createdAt);

  const total = emails.length;
  const favs = emails.filter(e=>e.favorite).length;
  const avg = total ? Math.round(emails.reduce((s,e)=>s+(e.wordCount||0),0)/total) : 0;

  $('emailLibraryStats').innerHTML = `
    <div class="stat"><span>📧 Email</span><b>${total}</b></div>
    <div class="stat"><span>⭐ Preferite</span><b>${favs}</b></div>
    <div class="stat"><span>✍️ Media parole</span><b>${avg}</b></div>
  `;

  $('emailLibraryList').innerHTML = emails.length ? emails.map(e => emailCard(e)).join('') : '<div class="box">Nessuna email salvata ancora.</div>';

  emails.forEach(e=>{
    const fav = document.getElementById('fav_'+e.id);
    const del = document.getElementById('del_'+e.id);
    const copy = document.getElementById('copy_'+e.id);
    const edit = document.getElementById('edit_'+e.id);

    if(fav) fav.onclick = async()=>{ e.favorite=!e.favorite; await dbAddEmail(e); renderEmailLibrary(); };
    if(del) del.onclick = async()=>{ if(confirm('Eliminare questa email?')){ await dbDeleteEmail(e.id); renderEmailLibrary(); } };
    if(copy) copy.onclick = async()=>{ await navigator.clipboard.writeText(e.email); copy.textContent='✅ Copiata'; setTimeout(()=>copy.textContent='📋 Copia',1200); };
    if(edit) edit.onclick = ()=>openEmailEditor(e);
  });
}

function emailCard(e){
  return `<div class="emailcard libraryCard">
    <div class="emailTop">
      <div>
        <span class="scorebadge">🥇 30/30</span>
        <span class="scorebadge">${escapeHtml(e.category || 'Random')}</span>
        ${e.favorite ? '<span class="scorebadge">⭐ Preferita</span>' : ''}
        <h3>${escapeHtml(e.title || 'Email modello')}</h3>
        <p>${escapeHtml(e.task || '')}</p>
      </div>
      <div class="wordBadge">${e.wordCount || countWords(e.email)} words</div>
    </div>

    <div class="emailtext">${escapeHtml(e.email)}</div>

    <div class="miniChips">
      ${(e.grammarUsed||[]).map(g=>`<span class="chip">${escapeHtml(g)}</span>`).join('')}
    </div>

    ${(e.why30||[]).length ? `<details class="whyBox"><summary>🏆 Perché è da 30/30</summary>${(e.why30||[]).map(w=>`<div>✅ ${escapeHtml(w)}</div>`).join('')}</details>` : ''}

    <div class="cardActions">
      <button id="fav_${e.id}" class="secondary">${e.favorite ? '💔 Rimuovi preferito' : '⭐ Preferito'}</button>
      <button id="copy_${e.id}" class="secondary">📋 Copia</button>
      <button id="edit_${e.id}" class="secondary">📝 Modifica</button>
      <button id="del_${e.id}" class="secondary dangerBtn">🗑 Elimina</button>
    </div>
  </div>`;
}

function openEmailEditor(e){
  const newText = prompt('Modifica email:', e.email);
  if(newText === null) return;
  e.email = newText;
  e.wordCount = countWords(newText);
  e.updatedAt = Date.now();
  dbAddEmail(e).then(renderEmailLibrary);
}

function countWords(text){
  return (String(text).trim().match(/[A-Za-z']+/g) || []).length;
}

/* ===========================
   Live word counters - Package 2 foundation
=========================== */

function setupLiveWordCounters(){
  addCounterToTextarea('aiText','teacherWordCounter');
  addCounterToTextarea('examText','examWordCounter');
}

function addCounterToTextarea(textareaId,counterId){
  const ta = $(textareaId);
  if(!ta || $(counterId)) return;

  const box = document.createElement('div');
  box.className = 'liveCounter';
  box.id = counterId;
  ta.insertAdjacentElement('beforebegin', box);

  const update = () => {
    const n = countWords(ta.value);
    const ok = n >= 120 && n <= 150;
    const status = n < 120 ? '⚠️ Too short' : n > 150 ? '❌ Too long' : '✅ Perfect';
    box.innerHTML = `<span>✍️ Words: <b>${n}</b></span><span>🎯 Target: 120-150</span><span class="${ok?'good':'warn'}">${status}</span>`;
  };

  ta.addEventListener('input', update);
  update();
}

setTimeout(setupLiveWordCounters, 300);


/* ===========================
   PACKAGE 2 - Teacher AI 4.0
   Live checklist + better memory
=========================== */

function insertEmailTemplate(textareaId){
  const ta = $(textareaId);
  if(!ta) return;
  ta.value = `Dear Sam,

Thanks for your email. I'm sorry I haven't written for a long time, but I've been very busy. How are you? I hope you're well.

[Write your main body here.]

Well, that's all for now. Write back soon and tell me your news.

Best wishes,
Marco`;
  ta.dispatchEvent(new Event('input'));
  updateAllLiveChecks();
}

function analyseLiveText(text){
  const n = countWords(text);
  const lower = String(text).toLowerCase();
  const paragraphs = String(text).trim().split(/\n\s*\n/).filter(Boolean).length;
  return {
    words:n,
    wordStatus:n>=120 && n<=150 ? 'ok' : n<120 ? 'short' : 'long',
    opening:/dear\s+\w+/i.test(text) && /thanks for your email/i.test(text),
    closing:/best wishes/i.test(text) || /write back soon/i.test(text),
    question:/\?/.test(text),
    paragraphs,
    paragraphStatus:paragraphs>=3 ? 'ok' : 'weak',
    hasLinker:/\b(because|but|so|although|while|when|if|in the end|luckily|unfortunately)\b/i.test(text),
    hasPast:/\b(went|had|was|were|visited|bought|met|watched|played|ordered|arrived)\b/i.test(text),
    hasPresentPerfect:/\b(have|has)\s+(been|gone|seen|visited|eaten|met|bought|done|taken)\b/i.test(text)
  };
}

function updateChecklist(panelId,textareaId){
  const panel = $(panelId);
  const ta = $(textareaId);
  if(!panel || !ta) return;

  const c = analyseLiveText(ta.value);
  const wordClass = c.wordStatus === 'ok' ? 'okItem' : c.wordStatus === 'short' ? 'warnItem' : 'badItem';
  const wordText = c.wordStatus === 'ok' ? 'Perfetto' : c.wordStatus === 'short' ? 'Troppo corta' : 'Troppo lunga';

  panel.innerHTML = `
    <div class="checkItem ${wordClass}"><b>✍️ ${c.words}</b><span>Words: ${wordText}</span></div>
    <div class="checkItem ${c.opening?'okItem':'badItem'}"><b>${c.opening?'✅':'❌'}</b><span>Opening</span></div>
    <div class="checkItem ${c.closing?'okItem':'badItem'}"><b>${c.closing?'✅':'❌'}</b><span>Closing</span></div>
    <div class="checkItem ${c.question?'okItem':'warnItem'}"><b>${c.question?'✅':'⚠️'}</b><span>Final question</span></div>
    <div class="checkItem ${c.paragraphStatus==='ok'?'okItem':'warnItem'}"><b>${c.paragraphs}</b><span>Paragraphs</span></div>
    <div class="checkItem ${c.hasLinker?'okItem':'warnItem'}"><b>${c.hasLinker?'✅':'⚠️'}</b><span>Linkers</span></div>
  `;
}

function updateAllLiveChecks(){
  updateChecklist('teacherChecklist','aiText');
  updateChecklist('examChecklist','examText');
}

function setupTeacherPackage2(){
  const ai = $('aiText');
  const ex = $('examText');
  if(ai) ai.addEventListener('input', updateAllLiveChecks);
  if(ex) ex.addEventListener('input', updateAllLiveChecks);
  updateAllLiveChecks();
}

function saveTeacherReport(report, mode){
  const old = JSON.parse(localStorage.getItem('a2_teacher_reports') || '[]');
  old.push({
    id:Date.now(),
    date:new Date().toLocaleString(),
    mode,
    score:report.overall || 0,
    level:report.levelEstimate || 'A2',
    focus:report.studyFocus || [],
    issues:(report.issues || []).map(i=>i.rule || i.type || 'Grammar')
  });
  localStorage.setItem('a2_teacher_reports', JSON.stringify(old));
  if(typeof saveCloudNote==='function') saveCloudNote('teacher_report','Teacher AI Report', report);
}

setTimeout(setupTeacherPackage2, 400);








/* V17 PROFESSIONAL LOGIN + ADMIN + CLOUD */
const SESSION_KEY='a2_enterprise_session';
const USER_KEY='a2_enterprise_user';
const DEVICE_KEY='a2_device_id';

function getDeviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){
    id='DEV-'+Math.random().toString(36).slice(2,6).toUpperCase()+'-'+Date.now().toString(36).slice(-5).toUpperCase();
    localStorage.setItem(DEVICE_KEY,id);
  }
  return id;
}
function detectOS(){const ua=navigator.userAgent;if(/Mac/i.test(ua))return'Mac';if(/Windows/i.test(ua))return'Windows';if(/iPhone|iPad/i.test(ua))return'iPhone/iPad';if(/Android/i.test(ua))return'Android';if(/Linux/i.test(ua))return'Linux';return'Unknown'}
function detectBrowser(){const ua=navigator.userAgent;if(/Edg/i.test(ua))return'Edge';if(/Chrome/i.test(ua)&&!/Edg/i.test(ua))return'Chrome';if(/Safari/i.test(ua)&&!/Chrome/i.test(ua))return'Safari';if(/Firefox/i.test(ua))return'Firefox';return'Browser'}
function getSessionId(){return localStorage.getItem(SESSION_KEY)}

(function patchFetchForSession(){
  const original=window.fetch.bind(window);
  window.fetch=(url,opts={})=>{
    if(typeof url==='string'&&url.startsWith('/api/')&&!url.includes('/api/login')){
      opts.headers=opts.headers||{};
      if(!(opts.headers instanceof Headers)) opts.headers['x-session-id']=getSessionId()||'';
    }
    return original(url,opts);
  };
})();

async function loginEnterprise(){
  const username=$('loginUsername').value.trim();
  const password=$('loginPassword').value;
  $('loginError').innerHTML='';
  try{
    const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password,deviceId:getDeviceId(),browser:detectBrowser(),os:detectOS()})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Login non riuscito');
    localStorage.setItem(SESSION_KEY,data.session_id);
    localStorage.setItem(USER_KEY,JSON.stringify(data.user));
    showAppAfterLogin(data.user);
  }catch(e){$('loginError').innerHTML=`<div class="issue bad">${e.message}</div>`}
}

async function checkExistingSession(){
  const sid=getSessionId();
  if(!sid){showLogin();return}
  try{
    const res=await fetch('/api/me',{headers:{'x-session-id':sid}});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Sessione scaduta');
    localStorage.setItem(USER_KEY,JSON.stringify(data.user));
    showAppAfterLogin(data.user);
  }catch{
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    showLogin();
  }
}

function showLogin(){const ls=$('loginScreen');if(ls)ls.style.display='grid';document.body.classList.add('lockedApp')}
function showAppAfterLogin(user){
  const ls=$('loginScreen');if(ls)ls.style.display='none';
  document.body.classList.remove('lockedApp');
  const adminBtn=$('adminNavBtn');
  if(adminBtn&&user.role==='admin')adminBtn.classList.remove('hidden');
  if(adminBtn&&user.role!=='admin')adminBtn.classList.add('hidden');
  addUserBox(user);
}
function addUserBox(user){
  if(document.getElementById('userBox'))return;
  const sidebar=document.querySelector('.sidebar'); if(!sidebar)return;
  const box=document.createElement('div');box.id='userBox';box.className='sidecard';
  box.innerHTML=`<b>👤 ${escapeHtml(user.username)}</b><p>Ruolo: ${escapeHtml(user.role)}<br>Device: ${getDeviceId()}</p><button id="logoutBtn" class="secondary">Esci</button>`;
  sidebar.appendChild(box);
  $('logoutBtn').onclick=()=>{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(USER_KEY);location.reload()};
}

async function loadAdminPanel(){
  const box=$('adminList'); if(!box)return;
  box.innerHTML='<div class="box">Carico utenti...</div>';
  try{
    const res=await fetch('/api/admin-overview');
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Errore admin');
    const users=data.users||[];
    const online=users.flatMap(u=>u.sessions||[]).filter(s=>s.online).length;
    $('adminStats').innerHTML=`<div class="stat"><span>Utenti</span><b>${users.length}</b></div><div class="stat"><span>Online</span><b>${online}</b></div><div class="stat"><span>Device</span><b>${users.reduce((n,u)=>n+(u.sessions||[]).length,0)}</b></div>`;

    box.innerHTML = adminCreateBox() + users.map(adminUserCard).join('');

    const createBtn=$('createUserBtn');
    if(createBtn) createBtn.onclick=createNewUserFromAdmin;

    users.forEach(u=>{
      const toggle=document.getElementById('toggle_user_'+u.id);
      if(toggle)toggle.onclick=()=>adminAction({type:'user_enabled',userId:u.id,enabled:!u.enabled});
      const reset=document.getElementById('reset_user_'+u.id);
      if(reset)reset.onclick=()=>adminAction({type:'reset_usage',userId:u.id});
      const update=document.getElementById('update_user_'+u.id);
      if(update)update.onclick=()=>updateUserPlan(u.id);
      (u.sessions||[]).forEach(s=>{
        const b=document.getElementById('block_session_'+s.id);
        if(b)b.onclick=()=>adminAction({type:'session_blocked',sessionTargetId:s.id,blocked:!s.blocked});
      });
    });
  }catch(e){box.innerHTML=`<div class="issue bad">${e.message}</div>`}
}

function adminCreateBox(){
  return `<div class="emailcard adminCreate">
    <h3>➕ Crea nuovo utente</h3>
    <div class="adminGrid">
      <input id="newUsername" placeholder="username">
      <input id="newPassword" placeholder="password">
      <select id="newRole"><option value="basic">basic</option><option value="premium">premium</option><option value="admin">admin</option></select>
      <input id="newTeacherLimit" placeholder="Teacher limit (vuoto = ∞)">
      <input id="newFillgapLimit" placeholder="FillGap limit">
      <input id="newEmailLimit" placeholder="Email limit">
    </div>
    <button id="createUserBtn" class="primary pink">Crea utente</button>
  </div>`;
}
function nullableInt(v){v=String(v??'').trim();return v===''?null:Number(v)}
async function createNewUserFromAdmin(){
  await adminAction({
    type:'create_user',
    username:$('newUsername').value.trim(),
    password:$('newPassword').value,
    role:$('newRole').value,
    teacherLimit:nullableInt($('newTeacherLimit').value),
    fillgapLimit:nullableInt($('newFillgapLimit').value),
    emailLimit:nullableInt($('newEmailLimit').value)
  });
}
function adminUserCard(u){
  const limitText=(used,limit)=>limit==null?`${used} / ∞`:`${used} / ${limit}`;
  return `<div class="emailcard">
    <div class="emailTop">
      <div>
        <span class="scorebadge">${u.enabled?'🟢 Attivo':'🔴 Bloccato'}</span>
        <span class="scorebadge">${escapeHtml(u.role)}</span>
        <h3>${escapeHtml(u.username)}</h3>
        <p>Teacher: ${limitText(u.teacher_used,u.teacher_limit)} • FillGap: ${limitText(u.fillgap_used,u.fillgap_limit)} • Email: ${limitText(u.email_used,u.email_limit)}</p>
      </div>
      <div class="cardActions">
        <button id="toggle_user_${u.id}" class="secondary dangerBtn">${u.enabled?'🚫 Blocca':'✅ Sblocca'}</button>
        <button id="reset_user_${u.id}" class="secondary">🔄 Reset usi</button>
      </div>
    </div>
    <details class="whyBox"><summary>⚙️ Modifica piano</summary>
      <div class="adminGrid">
        <select id="role_${u.id}"><option ${u.role==='basic'?'selected':''} value="basic">basic</option><option ${u.role==='premium'?'selected':''} value="premium">premium</option><option ${u.role==='admin'?'selected':''} value="admin">admin</option></select>
        <input id="tl_${u.id}" value="${u.teacher_limit??''}" placeholder="Teacher limit">
        <input id="fl_${u.id}" value="${u.fillgap_limit??''}" placeholder="FillGap limit">
        <input id="el_${u.id}" value="${u.email_limit??''}" placeholder="Email limit">
      </div>
      <button id="update_user_${u.id}" class="primary">Salva piano</button>
    </details>
    <h4>💻 Dispositivi</h4>
    ${(u.sessions||[]).map(s=>`<div class="deviceRow">
      <div>
        <b>${s.online?'🟢 Online':'⚫ Offline'} ${escapeHtml(s.device_id)}</b><br>
        <small>${escapeHtml(s.os||'')} • ${escapeHtml(s.browser||'')} • Ultima attività: ${new Date(s.last_seen).toLocaleString()}</small>
      </div>
      <button id="block_session_${s.id}" class="secondary">${s.blocked?'✅ Sblocca device':'🚫 Blocca device'}</button>
    </div>`).join('')||'<p>Nessun dispositivo registrato.</p>'}
  </div>`;
}
async function updateUserPlan(id){
  await adminAction({
    type:'update_plan',
    userId:id,
    role:$('role_'+id).value,
    teacherLimit:nullableInt($('tl_'+id).value),
    fillgapLimit:nullableInt($('fl_'+id).value),
    emailLimit:nullableInt($('el_'+id).value)
  });
}
async function adminAction(payload){
  try{
    const res=await fetch('/api/admin-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Errore azione admin');
    loadAdminPanel();
  }catch(e){alert(e.message)}
}

async function saveCloudNote(kind,title,content){
  try{
    await fetch('/api/cloud-note',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,title,content})});
  }catch{}
}
async function loadCloudNotes(){
  const box=$('cloudNotesList'); if(!box)return;
  box.innerHTML='<div class="box">Carico archivio cloud...</div>';
  try{
    const res=await fetch('/api/cloud-note');
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Errore cloud');
    const notes=data.notes||[];
    box.innerHTML=notes.length?notes.map(n=>`<div class="emailcard"><span class="scorebadge">${escapeHtml(n.kind)}</span><h3>${escapeHtml(n.title||'Senza titolo')}</h3><small>${new Date(n.created_at).toLocaleString()}</small><pre class="cloudPre">${escapeHtml(JSON.stringify(n.content,null,2))}</pre></div>`).join(''):'<div class="box">Nessun elemento salvato nel cloud.</div>';
  }catch(e){box.innerHTML=`<div class="issue bad">${e.message}</div>`}
}

setTimeout(()=>{
  const btn=$('loginBtn'); if(btn)btn.onclick=loginEnterprise;
  const pass=$('loginPassword'); if(pass)pass.addEventListener('keydown',e=>{if(e.key==='Enter')loginEnterprise()});
  const refresh=$('refreshAdmin'); if(refresh)refresh.onclick=loadAdminPanel;
  const cloud=$('loadCloudNotes'); if(cloud)cloud.onclick=loadCloudNotes;
  document.querySelectorAll('[data-page="admin"]').forEach(b=>b.addEventListener('click',()=>setTimeout(loadAdminPanel,100)));
  document.querySelectorAll('[data-page="cloud"]').forEach(b=>b.addEventListener('click',()=>setTimeout(loadCloudNotes,100)));
  checkExistingSession();
},300);


/* V22 HYBRID FILLGAP DATABASE + AI */
async function getCloudFillGap({grammar, topic} = {}){
  const qs = new URLSearchParams();
  if(grammar) qs.set('grammar', grammar);
  if(topic) qs.set('topic', topic);
  const res = await fetch('/api/fillgap-cloud?' + qs.toString());
  if(!res.ok) throw new Error('Nessun esercizio cloud disponibile');
  const data = await res.json();
  if(!data.ok || !data.exercise) throw new Error(data.error || 'Nessun esercizio cloud');
  const ex = data.exercise;
  ex.modelUsed = 'Supabase Cloud Bank';
  ex.cacheId = 'cloud_' + (ex.cloudId || Date.now());
  return ex;
}

async function saveExerciseToCloud(ex){
  try{
    await fetch('/api/fillgap-cloud',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({exercise:ex})
    });
  }catch{}
}

async function getHybridFillGap({grammar, topic} = {}){
  try{
    return await getCloudFillGap({grammar, topic});
  }catch{}
  const local = await getFillGapFromDatabase({grammar, topic});
  if(Math.random() < 0.03) saveExerciseToCloud(local);
  return local;
}

async function growFillGapCloudWithAI(){
  const grammar=$('gapGrammar')?.value || 'Mixed Grammar - Tutto il libro';
  const level=$('gapLevel')?.value || 'Cambridge Exam';
  const topic=$('gapTopic')?.value || 'Random';
  if($('gapStatus')) $('gapStatus').innerHTML='🌱 Provo a creare un nuovo esercizio AI e salvarlo nel cloud...';
  try{
    const res=await fetch('/api/fillgap',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({grammar,level,topic,mode:'🌱 Crescita database AI',recentExercises:getRecentGapTitles ? getRecentGapTitles() : [],weakRules:getWeakGapRules ? getWeakGapRules() : []})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error || 'AI non disponibile');
    const ex=data.exercise;
    await saveExerciseToCloud(ex);
    markGapAsUsed(ex);
    renderFillGap(ex);
    if($('gapStatus')) $('gapStatus').innerHTML='🌱 Nuovo esercizio creato con AI e salvato nel database cloud.';
    updateHybridBankStatus();
  }catch(e){
    if($('gapStatus')) $('gapStatus').innerHTML='⚠️ AI esaurita o non disponibile. Uso database offline senza consumare quota.';
    setTimeout(()=>generateSmartFillGap(), 350);
  }
}

async function updateHybridBankStatus(){
  const el=$('gapCacheStatus');
  if(!el) return;
  try{
    const res=await fetch('/api/fillgap-count');
    const data=await res.json();
    const cloud = data?.total ?? 0;
    const local = (window.FILLGAP_DB && FILLGAP_DB.length) ? FILLGAP_DB.length : '3000';
    el.innerHTML=`📚 Banca dati: ${local} locali + ${cloud} cloud`;
  }catch{
    el.innerHTML='📚 Banca dati offline pronta';
  }
}

setTimeout(()=>{
  const gapPage=document.querySelector('#fillgap, #gap');
  if(gapPage && !document.getElementById('growGapCloudBtn')){
    const btn=document.createElement('button');
    btn.className='secondary';
    btn.id='growGapCloudBtn';
    btn.textContent='🌱 Cresci database AI';
    btn.onclick=growFillGapCloudWithAI;
    const target=gapPage.querySelector('.toolbar') || gapPage.querySelector('.panel') || gapPage;
    target.prepend(btn);
  }
  updateHybridBankStatus();
},800);

init();