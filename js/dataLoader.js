export async function units(){
  return fetch('data/units.json').then(r => r.json());
}
export async function grammarRules(){
  return fetch('data/grammar.json').then(r => r.json());
}
export async function mistakes(){
  return fetch('data/common_mistakes.json').then(r => r.json());
}
export async function spelling(){
  return fetch('data/spelling.json').then(r => r.json());
}
