const SPELLING_CORRECTIONS = {
  "dres":"dress",
  "jeens":"jeans",
  "shurt":"shirt",
  "writen":"written",
  "freind":"friend",
  "frend":"friend",
  "becouse":"because",
  "becaus":"because",
  "wich":"which",
  "beatiful":"beautiful",
  "resturant":"restaurant",
  "recieve":"receive",
  "tomorow":"tomorrow",
  "yestarday":"yesterday",
  "studing":"studying",
  "exspensive":"expensive",
  "confortable":"comfortable"
};

function checkSpelling(words){
  const issues = [];
  words.forEach(word => {
    const lw = word.toLowerCase();
    if(SPELLING_CORRECTIONS[lw]){
      issues.push({
        type:"🔤 Spelling",
        bad:word,
        msg:`Forse volevi scrivere "${SPELLING_CORRECTIONS[lw]}".`,
        penalty:0.5
      });
    }
  });
  return issues;
}
