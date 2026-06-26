const CACHE = 'a2-english-master-pro-v1';
const FILES = ['./','./index.html','./css/style.css','./js/app.js','./js/dataLoader.js','./js/grammarEngine.js','./js/exam.js','./js/progress.js','./data/units.json','./data/grammar.json','./data/common_mistakes.json','./data/spelling.json','./data/tips.json','./manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
