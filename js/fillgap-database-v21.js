
/* V21 FillGap Database Bank - no Gemini usage */
const FILLGAP_DB_VERSION = "21.0";
let FILLGAP_DB = [];
let FILLGAP_USED_IDS = new Set(JSON.parse(localStorage.getItem("a2_fillgap_db_used_ids") || "[]"));

async function loadFillGapDatabase(){
  if(FILLGAP_DB.length) return FILLGAP_DB;
  const res = await fetch("data/fillgap-bank-v21.json");
  FILLGAP_DB = await res.json();
  return FILLGAP_DB;
}

function saveFillGapUsedIds(){
  const arr = Array.from(FILLGAP_USED_IDS).slice(-2000);
  localStorage.setItem("a2_fillgap_db_used_ids", JSON.stringify(arr));
  FILLGAP_USED_IDS = new Set(arr);
}

function filterFillGapDatabase(bank, grammar, topic){
  let out = bank;
  if(topic && topic !== "Random") out = out.filter(x => x.topic === topic);
  if(grammar && grammar !== "Mixed Grammar - Tutto il libro"){
    const g = grammar.toLowerCase();
    const filtered = out.filter(x => (x.grammarFocus||"").toLowerCase().includes(g) || (x.questions||[]).some(q => (q.rule||"").toLowerCase().includes(g)));
    if(filtered.length > 20) out = filtered;
  }
  return out.length ? out : bank;
}

async function getFillGapFromDatabase({grammar, topic} = {}){
  const bank = await loadFillGapDatabase();
  let pool = filterFillGapDatabase(bank, grammar, topic);
  let fresh = pool.filter(x => !FILLGAP_USED_IDS.has(x.id));
  if(!fresh.length){
    FILLGAP_USED_IDS.clear();
    saveFillGapUsedIds();
    fresh = pool;
  }
  const ex = JSON.parse(JSON.stringify(fresh[Math.floor(Math.random()*fresh.length)]));
  FILLGAP_USED_IDS.add(ex.id);
  saveFillGapUsedIds();
  ex.modelUsed = "Database Offline V21";
  ex.cacheId = "db_"+ex.id+"_"+Date.now();
  return ex;
}

async function prepareFillGapDatabaseCache(count=100){
  await loadFillGapDatabase();
  return FILLGAP_DB.length;
}
