
// ═══════════════════════════════════════════════
// PERIOD
// ═══════════════════════════════════════════════
function openPeriodModal(){
  document.getElementById('periodFrom').value=schedulePeriod.from||'';
  document.getElementById('periodTo').value=schedulePeriod.to||'';
  updatePeriodInfo();
  openModal('periodModal');
}
function updatePeriodInfo(){
  const f=document.getElementById('periodFrom').value;
  const t=document.getElementById('periodTo').value;
  const el=document.getElementById('periodInfo');
  if(!f||!t){el.textContent='';return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){el.textContent='⚠ Slutdatum är före startdatum';el.style.color='var(--red)';return;}
  const weeks=Math.round((td-fd)/(7*86400000))+1;
  const wFrom=weekNum(fd),wTo=weekNum(td);
  el.style.color='var(--text2)';
  el.textContent=`Vecka ${wFrom}–${wTo} · ca ${weeks} veckor`;
}
document.addEventListener('DOMContentLoaded',()=>{
  const pf=document.getElementById('periodFrom');
  const pt=document.getElementById('periodTo');
  if(pf)pf.addEventListener('change',updatePeriodInfo);
  if(pt)pt.addEventListener('change',updatePeriodInfo);
});
function confirmPeriod(){
  const f=document.getElementById('periodFrom').value;
  const t=document.getElementById('periodTo').value;
  if(f&&t&&new Date(t)<new Date(f)){showToast('Slutdatum måste vara efter startdatum');return;}
  schedulePeriod={from:f||null,to:t||null};
  closeModal('periodModal');
  updatePeriodBadge();
  render();
  showToast(schedulePeriod.from?`Period satt: v.${weekNum(new Date(schedulePeriod.from))}–v.${weekNum(new Date(schedulePeriod.to))}`:'Period rensad');
}
function clearPeriod(){
  schedulePeriod={from:null,to:null};
  document.getElementById('periodFrom').value='';
  document.getElementById('periodTo').value='';
  updatePeriodInfo();
  updatePeriodBadge();
  closeModal('periodModal');
  render();
}
function updatePeriodBadge(){
  const el=document.getElementById('periodBadgeText');
  const badge=document.getElementById('periodBadge');
  if(schedulePeriod.from&&schedulePeriod.to){
    const fd=new Date(schedulePeriod.from),td=new Date(schedulePeriod.to);
    el.textContent=`v.${weekNum(fd)}–v.${weekNum(td)} ${weekYear(fd)}`;
    badge.style.background='var(--accent-light)';
    badge.style.borderColor='var(--accent)';
  } else {
    el.textContent='Ingen period';
    badge.style.background='var(--bg)';
    badge.style.borderColor='var(--border)';
    badge.style.color='var(--text2)';
  }
}
// Returns array of {mon, wn, yr} for all weeks in period (or just current week if no period)
function periodWeeks(){
  if(!schedulePeriod.from||!schedulePeriod.to) return null;
  const weeks=[];
  let cur=getMonday(new Date(schedulePeriod.from));
  const end=new Date(schedulePeriod.to);
  while(cur<=end){
    weeks.push({mon:new Date(cur),wn:weekNum(cur),yr:weekYear(cur)});
    cur=addDays(cur,7);
  }
  return weeks;
}
// Returns {fromWn, toWn, yr} for rotation — period-aware
function periodForRotation(){
  if(schedulePeriod.from&&schedulePeriod.to){
    const fd=new Date(schedulePeriod.from),td=new Date(schedulePeriod.to);
    return{fromWn:weekNum(fd),toWn:weekNum(td),yr:weekYear(fd)};
  }
  const mon=getMonday(currentDate),wn=weekNum(mon),yr=weekYear(mon);
  return{fromWn:wn,toWn:wn+11,yr};
}

const _restored = loadFromLocalStorage();
render();
updatePeriodBadge();
if (_restored) showToast('📂 Schema återställt automatiskt');