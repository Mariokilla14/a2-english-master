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

function teacher(){ $('aiCorrect').onclick=()=>ai($('aiText').value,$('aiTask').value,'aiResult'); }
function exam(){
  $('newTrace').onclick=()=>{
    let t=traces[Math.floor(Math.random()*traces.length)];
    currentTask=t.task;
    $('examTrace').innerHTML=`<b>${t.title}</b><p>${t.task}</p>`;
    $('examText').value=''; $('wordCount').textContent='0'; resetTimer(); startTimer();
  };
  $('examText').oninput=()=>$('wordCount').textContent=words($('examText').value).length;
  $('examAI').onclick=()=>ai($('examText').value,currentTask||'A2 informal email','examResult');
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

async function ai(text,task,target){
  if(!text.trim()){ $(target).innerHTML='<div class="issue warn">Scrivi prima una email.</div>'; return; }
  $(target).innerHTML='<div class="aiout warn">🤖 Teacher AI sta correggendo...</div>';
  try{
    let res=await fetch('/api/correct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,task})});
    let data=await res.json();
    if(!res.ok)throw new Error(data.error||'Errore AI');
    if(data.report){ $(target).innerHTML=renderBeautifulReport(data.report,data.modelUsed); saveAI(JSON.stringify(data.report)); }
    else { $(target).innerHTML=`<div class="aiout">${cleanText(data.feedback||'')}</div>`; saveAI(data.feedback||''); }
  }catch(e){
    $(target).innerHTML=`<div class="issue bad"><b>AI non disponibile.</b><br>${e.message}<br>Controlla GEMINI_API_KEY su Vercel e fai Redeploy.</div>`;
  }
}
function cleanText(text){return String(text).replaceAll('###','').replaceAll('**','').replaceAll('|',' ').replaceAll('---','').replaceAll('\n','<br>');}
function bandCard(label,value){let n=Number(value||0);let w=Math.max(0,Math.min(100,(n/25)*100));return `<div class="bandCard"><div>${label} <b>${n}/25</b></div><div class="bar"><div style="width:${w}%"></div></div></div>`;}
function renderBeautifulReport(r,model){
  const issues=Array.isArray(r.issues)?r.issues:[], tips=Array.isArray(r.tips)?r.tips:[], focus=Array.isArray(r.studyFocus)?r.studyFocus:[];
  return `<div class="reportNice"><div class="reportHero"><div><span class="tag">🤖 ${model||'Gemini'}</span><h2>Valutazione Teacher AI</h2><p>${r.summary||''}</p></div><div class="scoreCircle"><strong>${Number(r.overall||0)}</strong><span>/30</span></div></div><div class="bandGrid">${bandCard('Content',r.bands?.content)}${bandCard('Communicative',r.bands?.communicative)}${bandCard('Organisation',r.bands?.organisation)}${bandCard('Language',r.bands?.language)}</div><h3>📝 Correzione riga per riga</h3>${issues.length?issues.map((i,idx)=>`<div class="errorCard"><b>${idx+1}. ${i.type||'Errore'}</b><div class="compareRows"><div><small>Hai scritto</small><p class="wrongText">${escapeHtml(i.wrong||'-')}</p></div><div><small>Correzione</small><p class="correctText">${escapeHtml(i.correct||'-')}</p></div></div><p>${escapeHtml(i.explanation||'')}</p></div>`).join(''):'<div class="issue good">🎉 Nessun errore importante trovato.</div>'}<h3>✅ Email corretta</h3><div class="correctedEmail">${escapeHtml(r.correctedEmail||'Non disponibile.')}</div><h3>🎯 Consigli</h3>${tips.map(t=>`<div class="tipItem">💡 ${escapeHtml(t)}</div>`).join('')}<h3>📚 Da ripassare</h3>${focus.map(f=>`<span class="chip">${escapeHtml(f)}</span>`).join('')}</div>`;
}

function fillGapUI(){
  const btn=$('generateGap');
  if(!btn)return;
  btn.onclick=generateFillGap;
}
async function generateFillGap(){
  const grammar=$('gapGrammar').value, level=$('gapLevel').value, topic=$('gapTopic').value;
  $('gapStatus').innerHTML='🤖 Gemini sta generando un brano con 30 domande...';
  $('gapExercise').innerHTML='';
  try{
    const res=await fetch('/api/fillgap',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grammar,level,topic})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Errore generazione fill the gap');
    renderFillGap(data.exercise||data);
  }catch(e){
    $('gapStatus').innerHTML=`<span class="bad">AI non disponibile:</span> ${e.message}<br>Uso esercizio demo offline.`;
    renderFillGap(makeDemoGap());
  }
}
function renderFillGap(ex){
  if(!ex||!Array.isArray(ex.questions)){ $('gapStatus').innerHTML='<span class="bad">Esercizio non valido.</span>'; return; }
  $('gapStatus').innerHTML=`<b>${ex.title||'Fill the Gap A2'}</b><p>${ex.instructions||'Choose the correct option for each gap.'}</p>`;
  $('gapExercise').innerHTML=`<div class="gapPassage">${renderPassageWithSelects(ex.passage,ex.questions)}</div><button id="checkGap" class="primary pink">✅ Correggi esercizio</button><div id="gapResult"></div>`;
  $('checkGap').onclick=()=>checkFillGap(ex);
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
  $('gapResult').innerHTML=`<div class="reportHero"><div><span class="tag">🧩 Fill the Gap</span><h2>${correct}/${ex.questions.length}</h2><p>${percent}% corretto</p></div><div class="scoreCircle"><strong>${percent}</strong><span>%</span></div></div><h3>📚 Errori e spiegazioni</h3>${details.map(d=>`<div class="errorCard"><b>${d.id}. ${escapeHtml(d.rule||'Grammar')}</b><div class="compareRows"><div><small>Hai scelto</small><p class="${d.ok?'correctText':'wrongText'}">${escapeHtml(d.chosen||'—')}</p></div><div><small>Risposta corretta</small><p class="correctText">${escapeHtml(d.answer)}</p></div></div><p>${escapeHtml(d.explanation||'')}</p></div>`).join('')}`;
}
function saveGap(correct,total,details){
  const old=JSON.parse(localStorage.getItem('a2_fillgap_memory')||'[]');
  const wrongRules={};
  details.filter(d=>!d.ok).forEach(d=>wrongRules[d.rule||'Grammar']=(wrongRules[d.rule||'Grammar']||0)+1);
  old.push({id:Date.now(),date:new Date().toLocaleString(),correct,total,wrongRules});
  localStorage.setItem('a2_fillgap_memory',JSON.stringify(old));
}
function makeDemoGap(){
  const passage=`Dear Anna,\n\nYesterday I ___1___ to a new restaurant with my family. The waiter ___2___ very kind and the food was delicious. I ___3___ pasta because I love Italian food. My sister ___4___ pizza, but she didn't like it very much. We ___5___ there for two hours and then we went home.\n\nI think you ___6___ come with me next time. It is ___7___ than the restaurant near school, but the food is better. I have ___8___ eaten such good pasta before.\n\nWrite back soon,\nMarco`;
  return {title:'Demo Fill the Gap A2',instructions:'Choose the correct option.',passage,questions:[
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
  $('dashboardBox').innerHTML=`<div class="stats"><div class="stat"><span>Correzioni AI</span><b>${ai.length}</b></div><div class="stat"><span>Fill the Gap</span><b>${gaps.length}</b></div><div class="stat"><span>Memoria</span><b>ON</b></div></div><h3>Storico Fill the Gap</h3>${gaps.slice().reverse().map(g=>`<div class="issue"><b>${g.correct}/${g.total}</b><br><small>${g.date}</small></div>`).join('')||'<p>Nessun esercizio salvato.</p>'}<h3>Storico AI</h3>${ai.slice().reverse().map(x=>`<div class="issue"><b>${x.date}</b><br>${escapeHtml(x.feedback)}</div>`).join('')||'<p>Nessuna correzione salvata.</p>'}`;
  $('clearData').onclick=()=>{localStorage.removeItem('a2_ai_memory');localStorage.removeItem('a2_fillgap_memory');dashboard();}
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

init();