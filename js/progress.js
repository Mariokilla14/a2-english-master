const KEY = 'a2_english_master_pro_progress';
export function saveProgress(result){
  const old = JSON.parse(localStorage.getItem(KEY) || '[]');
  old.push({date:new Date().toLocaleString(), score:result.score, words:result.wordCount, issues:result.issues.length});
  localStorage.setItem(KEY, JSON.stringify(old));
}
export function renderProgress(container){
  const data = JSON.parse(localStorage.getItem(KEY) || '[]');
  if(!data.length){
    container.innerHTML = '<p>Nessun progresso salvato ancora.</p>';
    return;
  }
  container.innerHTML = data.slice(-20).reverse().map(x =>
    `<div class="issue"><strong>🏆 ${x.score}/30</strong> — ✍️ ${x.words} parole — 🔍 ${x.issues} errori<br>${x.date}</div>`
  ).join('');
}
