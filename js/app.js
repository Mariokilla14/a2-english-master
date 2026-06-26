import { units } from './dataLoader.js';
import { grammarRules } from './dataLoader.js';
import { analyseText } from './grammarEngine.js';
import { startTimer, stopTimer } from './exam.js';
import { saveProgress, renderProgress } from './progress.js';

let currentUnits = [];
let currentGrammar = [];

const $ = (id) => document.getElementById(id);

function words(text){ return (text.trim().match(/[A-Za-z']+/g) || []); }

function showPage(id){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  $(id).classList.add('active-page');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  if(id === 'progress') renderProgress($('progressList'));
}

function renderReport(target, text, save=false){
  const result = analyseText(text);
  const cls = result.score >= 27 ? 'ok' : result.score >= 22 ? 'warn' : 'bad';
  let html = `
    <div class="report-grid">
      <div class="card"><div class="kpi ${cls}">${result.score}/30</div><p>🏆 Voto stimato</p></div>
      <div class="card"><div class="kpi">${result.wordCount}</div><p>✍️ Parole</p></div>
      <div class="card"><div class="kpi">${result.issues.length}</div><p>🔍 Errori</p></div>
    </div>
    <h3>🧠 Correzione dettagliata</h3>
  `;
  if(result.issues.length === 0){
    html += `<div class="issue ok">🎉 Ottimo: non ho trovato errori principali.</div>`;
  }
  result.issues.forEach(i => {
    html += `<div class="issue"><strong>${i.type}</strong> — <span class="bad">${i.bad}</span><br>${i.message}<br><em>Correzione: ${i.fix || 'controlla la frase'}</em></div>`;
  });
  html += `<h3>👨‍🏫 Consiglio</h3><p>${result.teacherComment}</p>`;
  target.innerHTML = html;
  if(save) saveProgress(result);
}

function loadUnit(index=0){
  const unit = currentUnits[index];
  $('studyTitle').textContent = `Unit ${unit.unit}: ${unit.title}`;
  $('studyTask').textContent = unit.task;
  $('modelBox').textContent = unit.model;
  $('modelBox').classList.add('hidden');
}

async function init(){
  currentUnits = await units();
  currentGrammar = await grammarRules();

  currentUnits.forEach((u, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Unit ${u.unit} - ${u.title}`;
    $('unitSelect').appendChild(opt);
  });
  loadUnit();

  $('grammarList').innerHTML = currentGrammar.map(r => `<div class="rule-card"><h3>${r.title}</h3><p>${r.text}</p></div>`).join('');

  document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => showPage(b.dataset.go)));

  $('unitSelect').addEventListener('change', e => loadUnit(e.target.value));
  $('showModel').addEventListener('click', () => $('modelBox').classList.toggle('hidden'));

  $('studyText').addEventListener('input', () => $('studyWords').textContent = words($('studyText').value).length);
  $('examText').addEventListener('input', () => $('examWords').textContent = words($('examText').value).length);

  $('correctStudy').addEventListener('click', () => renderReport($('studyReport'), $('studyText').value, true));

  $('startExam').addEventListener('click', () => {
    const unit = currentUnits[Math.floor(Math.random() * currentUnits.length)];
    $('examTitle').textContent = `🎲 Exam task: ${unit.title}`;
    $('examTask').textContent = `${unit.task} Write 120-150 words. You cannot see the model.`;
    $('examText').value = '';
    $('examReport').innerHTML = '';
    $('examWords').textContent = 0;
    stopTimer();
    startTimer($('timer'), 40 * 60);
  });

  $('finishExam').addEventListener('click', () => renderReport($('examReport'), $('examText').value, true));

  renderProgress($('progressList'));

  const tips = await fetch('data/tips.json').then(r => r.json());
  setInterval(() => {
    $('tipText').textContent = tips[Math.floor(Math.random()*tips.length)];
  }, 5500);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
}
init();
