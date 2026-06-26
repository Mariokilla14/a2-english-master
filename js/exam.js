let timerId = null;
export function startTimer(element, seconds){
  let remaining = seconds;
  const tick = () => {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    element.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(remaining > 0) remaining--;
    else stopTimer();
  };
  tick();
  timerId = setInterval(tick, 1000);
}
export function stopTimer(){
  if(timerId) clearInterval(timerId);
  timerId = null;
}
