let units = [];
let grammar = [];
let timerId = null;
let timeLeft = 2400;
let currentExamTask = '';

const $ = id => document.getElementById(id);

async function init(){
  units = await fetch('data/units.json').then(r=>r.json());
  grammar = await fetch('data/grammar.json').then(r=>r.json());
  setupNav(); setupStudy(); setupExam(); setupGrammar(); renderProgress();
}
function setupNav(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.go));
}
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active', b.dataset.page===id));
  if(id==='progress') renderProgress();
}
function setupStudy(){
  const sel=$('unitSelect');
  units.forEach((u,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`Unit ${u.id} - ${u.title}`;sel.appendChild(o)});
  sel.onchange=loadUnit; loadUnit();
  $('showModel').onclick=()=>$('modelBox').classList.toggle('hidden');
  $('correctStudy').onclick=()=>renderReport('studyReport', analyse($('studyText').value), 'study');
  $('aiStudy').onclick=()=>teacherAI('studyText','studyAI', units[$('unitSelect').value||0].examTask);
}
function loadUnit(){
  const u=units[$('unitSelect').value||0];
  $('unitInfo').innerHTML=`<span class="tag">Unit ${u.id}</span><h3>${u.title}</h3><p>${u.topic}</p><div class="taskBox"><b>Exam Task</b><p>${u.examTask}</p><div>${u.vocabulary.map(v=>`<span class="chip">${v}</span>`).join('')}</div></div>`;
  $('modelBox').textContent=u.model; $('modelBox').classList.add('hidden');
}
function setupExam(){
  $('startExam').onclick=()=>{const u=units[Math.floor(Math.random()*units.length)]; currentExamTask=u.examTask; $('examTask').innerHTML=`<b>Exam task: ${u.title}</b><p>${u.examTask}</p>`; $('examText').value=''; $('examWords').textContent='0'; resetTimer(); startTimer();}
  $('examText').oninput=()=>$('examWords').textContent=words($('examText').value).length;
  $('finishExam').onclick=()=>{stopTimer(); renderReport('examReport', analyse($('examText').value), 'exam');}
  $('aiExam').onclick=()=>teacherAI('examText','examAI', currentExamTask || 'Informal A2 email task');
}
function resetTimer(){stopTimer(); timeLeft=2400; tick();}
function startTimer(){timerId=setInterval(()=>{timeLeft=Math.max(0,timeLeft-1);tick(); if(timeLeft===0)stopTimer();},1000);}
function stopTimer(){if(timerId)clearInterval(timerId); timerId=null;}
function tick(){const m=Math.floor(timeLeft/60),s=timeLeft%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function setupGrammar(){$('grammarList').innerHTML=grammar.map(g=>`<div class="taskBox"><h3>${g.title}</h3><p>${g.text}</p></div>`).join('');}
function words(text){return text.trim().match(/[A-Za-z']+/g)||[];}

const spelling={dres:'dress',jeens:'jeans',shurt:'shirt',writen:'written',freind:'friend',becouse:'because',wich:'which',tomorow:'tomorrow',yestarday:'yesterday',studing:'studying'};
const patterns=[
[/\b(she|he|it)\s+(really\s+|usually\s+|often\s+|sometimes\s+)?like\b/gi,'Present Simple','Con he/she/it il verbo prende la -s.','likes',1],
[/\b(she|he|it)\s+(really\s+|usually\s+|often\s+|sometimes\s+)?go\b/gi,'Present Simple','Con he/she/it si usa goes.','goes',1],
[/\b(she|he|it)\s+(really\s+|usually\s+|often\s+|sometimes\s+)?have\b/gi,'Present Simple','Con he/she/it si usa has.','has',1],
[/\bI am agree\b/gi,'Natural English','Agree è un verbo, non si usa con am.','I agree',1],
[/\bwill\s+\w+s\b/gi,'Future','Dopo will il verbo resta alla forma base.','will start / will go',1],
[/\bhave went\b|\bhas went\b/gi,'Present Perfect','Nel Present Perfect serve il participio passato.','have/has gone',1],
[/\byesterday\s+I\s+go\b/gi,'Past Simple','Con yesterday si usa il Past Simple.','Yesterday I went',1],
[/\bbuyed\b/gi,'Irregular verb','Buy è irregolare.','bought',1],
[/\barrived to\b/gi,'Preposition','Si dice arrive in/at, non arrive to.','arrived in London / arrived at school',1]
];
function analyse(text){
  const w=words(text); let issues=[], penalty=0;
  w.forEach(word=>{const lw=word.toLowerCase(); if(spelling[lw]){issues.push({cat:'Spelling',bad:word,msg:`Forse volevi scrivere ${spelling[lw]}.`,fix:spelling[lw]}); penalty+=.5;}});
  patterns.forEach(([re,cat,msg,fix,pen])=>{const m=text.match(re); if(m)m.forEach(b=>{issues.push({cat,bad:b,msg,fix}); penalty+=pen;});});
  if(w.length<120){issues.push({cat:'Word count',bad:w.length,msg:'Sotto 120 parole.',fix:'120-150 parole'}); penalty+=2;}
  if(w.length>150){issues.push({cat:'Word count',bad:w.length,msg:'Sopra 150 parole.',fix:'120-150 parole'}); penalty+=1.5;}
  if(!/dear/i.test(text)){issues.push({cat:'Organisation',bad:'opening',msg:'Manca Dear + nome.',fix:'Dear Sam,'}); penalty+=1;}
  if(!/best wishes|love|take care/i.test(text)){issues.push({cat:'Organisation',bad:'ending',msg:'Manca chiusura informale.',fix:'Best wishes,'}); penalty+=1;}
  if(!/\?/.test(text)){issues.push({cat:'Task',bad:'question',msg:'Aggiungi una domanda finale.',fix:'What about you?'}); penalty+=1;}
  if(!/\b(because|so|but|although|while|when|if|in the end|luckily|unfortunately)\b/i.test(text)){issues.push({cat:'Organisation',bad:'linkers',msg:'Usa almeno un connettivo.',fix:'because / while / although'}); penalty+=1;}
  const score=Math.max(0,Math.round(30-penalty));
  return {score,wordCount:w.length,issues,bands:{grammar:Math.max(0,25-issues.filter(i=>['Present Simple','Present Perfect','Past Simple','Future','Irregular verb'].includes(i.cat)).length*2),vocabulary:Math.max(0,25-issues.filter(i=>['Spelling','Preposition','Natural English'].includes(i.cat)).length*2),organisation:Math.max(0,25-issues.filter(i=>i.cat==='Organisation'||i.cat==='Word count').length*2),task:Math.max(0,25-issues.filter(i=>i.cat==='Task').length*4)}};
}
function renderReport(target,r,mode){
  const html=`<div class="reportGrid"><div class="scoreCard"><span>Overall</span><strong>${r.score}/30</strong></div><div class="scoreCard"><span>Words</span><strong>${r.wordCount}</strong></div><div class="scoreCard"><span>Errors</span><strong>${r.issues.length}</strong></div></div>
  <div class="taskBox"><b>Cambridge Bands</b><p>Grammar ${r.bands.grammar}/25 • Vocabulary ${r.bands.vocabulary}/25 • Organisation ${r.bands.organisation}/25 • Task ${r.bands.task}/25</p></div>
  ${r.issues.length?r.issues.map(i=>`<div class="issue"><b>${i.cat}</b> — <span class="bad">${i.bad}</span><br>${i.msg}<br><em>Correzione: ${i.fix}</em></div>`).join(''):'<div class="issue good">🎉 Nessun errore principale trovato.</div>'}
  <button class="primary" id="saveResultBtn">💾 Salva nei progressi</button>`;
  $(target).innerHTML=html;
  $('saveResultBtn').onclick=()=>saveProgress(r,mode);
}
async function teacherAI(textareaId, outputId, task){
  const text=$(textareaId).value.trim();
  if(!text){$(outputId).innerHTML='<div class="issue warn">Scrivi prima una email.</div>';return;}
  $(outputId).innerHTML='<div class="aiBox loading">🤖 Teacher AI sta correggendo...</div>';
  try{
    const res=await fetch('/api/correct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,task})});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Errore API');
    $(outputId).innerHTML=`<div class="aiBox"><h3>🤖 Teacher AI Report</h3>${formatAI(data.feedback||data.text||JSON.stringify(data,null,2))}</div>`;
  }catch(err){
    $(outputId).innerHTML=`<div class="issue bad"><b>AI non disponibile.</b><br>${err.message}<br><br>Apri l'app dal link Vercel e controlla OPENAI_API_KEY.</div>`;
  }
}
function formatAI(text){ return String(text).replace(/\n/g,'<br>'); }
function saveProgress(r,mode){
  const old=JSON.parse(localStorage.getItem('a2_v6_progress')||'[]');
  old.push({id:Date.now(),date:new Date().toLocaleString(),mode,score:r.score,wordCount:r.wordCount,issues:r.issues.length,categories:r.issues.map(i=>i.cat)});
  localStorage.setItem('a2_v6_progress',JSON.stringify(old)); alert('Salvato!');
}
function renderProgress(){
  const res=JSON.parse(localStorage.getItem('a2_v6_progress')||'[]');
  const avg=res.length?Math.round(res.reduce((s,r)=>s+r.score,0)/res.length):0;
  const best=res.length?Math.max(...res.map(r=>r.score)):0;
  const totalWords=res.reduce((s,r)=>s+r.wordCount,0);
  $('progressBox').innerHTML=`<div class="reportGrid"><div class="scoreCard"><span>Media</span><strong>${avg}/30</strong></div><div class="scoreCard"><span>Best</span><strong>${best}/30</strong></div><div class="scoreCard"><span>Parole</span><strong>${totalWords}</strong></div></div><h3>Storico</h3>${res.slice().reverse().map(r=>`<div class="issue"><b>${r.score}/30</b> — ${r.wordCount} parole — ${r.issues} errori<br><small>${r.date}</small></div>`).join('')||'<p>Nessun risultato.</p>'}`;
  $('clearProgress').onclick=()=>{localStorage.removeItem('a2_v6_progress');renderProgress();}
}
init();
