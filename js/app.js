let traces=[];let timer=null;let time=2400;let currentTask='';

const $=id=>document.getElementById(id);
const words=t=>t.trim().match(/[A-Za-z']+/g)||[];

async function init(){
  traces=await fetch('data/traces.json').then(r=>r.json());
  nav(); setupTeacher(); setupExam(); setupTraces(); dashboard();
}
function nav(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>show(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
}
function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='dashboard')dashboard();}
function setupTeacher(){
  $('aiCorrect').onclick=()=>teacherAI($('aiText').value,$('aiTask').value,'aiResult');
  $('offlineCorrect').onclick=()=>renderOffline($('aiText').value,'aiResult');
}
function setupExam(){
  $('newTrace').onclick=()=>{const t=traces[Math.floor(Math.random()*traces.length)];currentTask=t.task;$('examTrace').innerHTML=`<b>${t.title}</b><p>${t.task}</p>`;$('examText').value='';$('wordCount').textContent='0';resetTimer();startTimer();}
  $('examText').oninput=()=>$('wordCount').textContent=words($('examText').value).length;
  $('examAI').onclick=()=>teacherAI($('examText').value,currentTask||'A2 informal email','examResult');
}
function resetTimer(){if(timer)clearInterval(timer);time=2400;tick();}
function startTimer(){timer=setInterval(()=>{time=Math.max(0,time-1);tick();if(time===0)clearInterval(timer)},1000)}
function tick(){const m=Math.floor(time/60),s=time%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function setupTraces(){renderTraces('');$('traceSearch').oninput=e=>renderTraces(e.target.value.toLowerCase());}
function renderTraces(q){$('traceList').innerHTML=traces.filter(t=>(t.title+t.task+t.category).toLowerCase().includes(q)).slice(0,220).map(t=>`<div class="box"><b>${t.title}</b><p>${t.task}</p><button class="secondary" onclick="navigator.clipboard.writeText('${String(t.task).replaceAll("'","\'")}')">Copia traccia</button></div>`).join('')}

async function teacherAI(text,task,target){
  if(!text.trim()){ $(target).innerHTML='<div class="issue warn">Scrivi prima una email.</div>'; return; }
  $(target).innerHTML='<div class="aiout warn">🤖 Teacher AI sta correggendo...</div>';
  try{
    const res=await fetch('/api/correct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,task})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Errore AI');
    $(target).innerHTML=`<div class="aiout"><h3>🤖 Teacher AI Report</h3>${String(data.feedback).replaceAll('\n','<br>')}</div>`;
    saveAI(text,data.feedback);
  }catch(e){
    $(target).innerHTML=`<div class="issue bad"><b>Teacher AI non disponibile.</b><br>${e.message}<br>Controlla Vercel → Environment Variables → GEMINI_API_KEY.</div>`;
  }
}
const spelling={dres:'dress',jeens:'jeans',shurt:'shirt',freind:'friend',becouse:'because',tomorow:'tomorrow',studing:'studying'};
const patterns=[
[/\b(she|he|it)\s+like\b/gi,'Present Simple','Con he/she/it serve likes.','likes'],
[/\bwill\s+\w+s\b/gi,'Future','Dopo will verbo base.','will go'],
[/\bhave went\b/gi,'Present Perfect','Serve participio: have gone.','have gone'],
[/\byesterday\s+I\s+go\b/gi,'Past Simple','Con yesterday usa went.','Yesterday I went'],
[/\bbuyed\b/gi,'Irregular verb','Buy è irregolare.','bought']
];
function offline(text){
  let issues=[];let penalty=0;const w=words(text);
  w.forEach(x=>{if(spelling[x.toLowerCase()]){issues.push(['Spelling',x,`Forse volevi ${spelling[x.toLowerCase()]}`]);penalty+=.5}});
  patterns.forEach(([re,c,m,f])=>{const a=text.match(re);if(a)a.forEach(x=>{issues.push([c,x,m+' → '+f]);penalty+=1})});
  if(w.length<120){issues.push(['Word count',w.length,'Sotto 120 parole']);penalty+=2}
  if(w.length>150){issues.push(['Word count',w.length,'Sopra 150 parole']);penalty+=1}
  if(!/dear/i.test(text)){issues.push(['Organisation','opening','Manca Dear']);penalty+=1}
  if(!/best wishes|love|take care/i.test(text)){issues.push(['Organisation','ending','Manca chiusura']);penalty+=1}
  if(!/\?/.test(text)){issues.push(['Task','question','Manca domanda finale']);penalty+=1}
  return {score:Math.max(0,Math.round(30-penalty)),words:w.length,issues};
}
function renderOffline(text,target){
  const r=offline(text);
  $(target).innerHTML=`<div class="stats"><div class="stat"><span>Voto</span><b>${r.score}/30</b></div><div class="stat"><span>Words</span><b>${r.words}</b></div><div class="stat"><span>Errori</span><b>${r.issues.length}</b></div></div>`+r.issues.map(i=>`<div class="issue"><b>${i[0]}</b> — <span class="bad">${i[1]}</span><br>${i[2]}</div>`).join('');
  saveOffline(r);
}
function saveAI(text,feedback){
  const old=JSON.parse(localStorage.getItem('v10_memory')||'[]');
  old.push({id:Date.now(),type:'AI',date:new Date().toLocaleString(),text:text.slice(0,80),feedback:String(feedback).slice(0,300)});
  localStorage.setItem('v10_memory',JSON.stringify(old));
}
function saveOffline(r){
  const old=JSON.parse(localStorage.getItem('v10_memory')||'[]');
  old.push({id:Date.now(),type:'offline',date:new Date().toLocaleString(),score:r.score,words:r.words,cats:r.issues.map(i=>i[0])});
  localStorage.setItem('v10_memory',JSON.stringify(old));
}
function dashboard(){
  const mem=JSON.parse(localStorage.getItem('v10_memory')||'[]');
  const scores=mem.filter(x=>x.score).map(x=>x.score); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  const cats={}; mem.forEach(x=>(x.cats||[]).forEach(c=>cats[c]=(cats[c]||0)+1));
  const frequent=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  $('dashboardBox').innerHTML=`<div class="stats"><div class="stat"><span>Prove</span><b>${mem.length}</b></div><div class="stat"><span>Media offline</span><b>${avg}/30</b></div><div class="stat"><span>Errori ricorrenti</span><b>${frequent.length}</b></div></div><h3>🧠 Memoria errori</h3>${frequent.map(([c,n])=>`<div class="issue"><b>${c}</b><div class="bar"><div style="width:${Math.min(100,n*20)}%"></div></div>${n} volte</div>`).join('')||'<p>Nessun errore salvato ancora.</p>'}<h3>Storico</h3>${mem.slice().reverse().map(x=>`<div class="issue"><b>${x.type}</b> ${x.score?x.score+'/30':''}<br><small>${x.date}</small></div>`).join('')}`;
  $('clearData').onclick=()=>{localStorage.removeItem('v10_memory');dashboard();}
}
init();
