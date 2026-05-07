
// ═══════════════════════════════════════════════
// BVC CTX
// ═══════════════════════════════════════════════
let ctxBVCTarget=null, ctxSpecialTarget=null;
function openBVCCtx(e,ds){
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxBVCTarget=ds;
  const list=document.getElementById('ctxBVCList');list.innerHTML='';
  const cur=getBVC(ds);
  const anyHasBVC=doctors.some(d=>(d.allowedPositions||[]).includes('pos_bvc'));
  const eligible=anyHasBVC?doctors.filter(d=>(d.allowedPositions||[]).includes('pos_bvc')):doctors;
  const others=anyHasBVC?doctors.filter(d=>!(d.allowedPositions||[]).includes('pos_bvc')):[];
  if(anyHasBVC)list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--bvc);padding:3px 7px 1px">BVC-läkare</div>');
  eligible.forEach(doc=>{
    const btn=document.createElement('button');btn.className='ctx-doc-btn'+(cur===doc.id?' selected':'');
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>`;
    btn.onclick=()=>{setBVC(ds,doc.id);clearDocFromMottagning(doc.id,ds);closeAllCtx();render();};
    list.appendChild(btn);
  });
  if(others.length){
    list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px;opacity:.5">Övriga</div>');
    others.forEach(doc=>{
      const btn=document.createElement('button');btn.className='ctx-doc-btn incompatible'+(cur===doc.id?' selected':'');
      const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
      btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>`;
      btn.onclick=()=>{setBVC(ds,doc.id);clearDocFromMottagning(doc.id,ds);closeAllCtx();render();};
      list.appendChild(btn);
    });
  }
  positionCtx('ctxBVC',e);
}
function clearBVCCtx(){if(ctxBVCTarget){setBVC(ctxBVCTarget,null);closeAllCtx();render();}ctxBVCTarget=null;}

// ═══════════════════════════════════════════════
// SPECIAL SLOTS (UTB / ADM / HANDLEDNING)
// ═══════════════════════════════════════════════
function openAddSpecialModal(ds,type){
  document.getElementById('addSpecialDs').value=ds;
  document.getElementById('addSpecialType').value=type;
  document.getElementById('addSpecialNote').value='';
  document.getElementById('addHalfDay').checked=true;
  const titles={utb:'Utbildning',adm:'Administration',handledning:'Handledning'};
  const subs={utb:'Läkaren är på kurs eller utbildning denna dag.',adm:'Läkaren har administrativt arbete.',handledning:'Schemalägg en handledningssession.'};
  document.getElementById('addSpecialTitle').textContent=titles[type]||type;
  document.getElementById('addSpecialSub').textContent=subs[type]||'';
  const docSel=document.getElementById('addSpecialDoc');
  docSel.innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  const supRow=document.getElementById('addSpecialSupervisorRow');
  if(type==='handledning'){
    supRow.style.display='';
    // Populate ST doctors
    docSel.innerHTML=doctors.filter(d=>docIsUL(d)).map(d=>`<option value="${d.id}">${d.name} (ST)</option>`).join('');
    const supSel=document.getElementById('addSpecialSupervisor');
    supSel.innerHTML=doctors.filter(d=>docIsHandledare(d)).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
    // Pre-fill from handledning pairs
    docSel.onchange=()=>{
      const pair=handledningPairs.find(p=>p.stId===docSel.value);
      if(pair)supSel.value=pair.supervisorId;
    };
    if(docSel.options.length){docSel.dispatchEvent(new Event('change'));}
  } else {
    supRow.style.display='none';
  }
  openModal('addSpecialModal');
}
function confirmAddSpecial(){
  const ds=document.getElementById('addSpecialDs').value;
  const type=document.getElementById('addSpecialType').value;
  const docId=document.getElementById('addSpecialDoc').value;
  const halfDay=[...document.querySelectorAll('input[name="addSpecialHalf"]')].find(r=>r.checked)?.value||'';
  const note=document.getElementById('addSpecialNote').value.trim();
  const key=`${type}_${docId}_${Date.now()}`;
  const val={type,docId,halfDay,note};
  if(type==='handledning'){val.supervisorId=document.getElementById('addSpecialSupervisor').value;}
  setSpecial(ds,key,val);
  closeModal('addSpecialModal');render();showToast('Inslag tillagt');
}
function openSpecialCtx(e,ds,key){
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxSpecialTarget={ds,key};
  const v=getSpecial(ds,key);if(!v)return;
  const doc=docById(v.docId);
  document.getElementById('ctxSpecialHead').textContent=doc?doc.name.split(' ')[0]:'Inslag';
  positionCtx('ctxSpecial',e);
}
function deleteSpecialCtx(){if(ctxSpecialTarget){delSpecial(ctxSpecialTarget.ds,ctxSpecialTarget.key);closeAllCtx();render();}ctxSpecialTarget=null;}

// ═══════════════════════════════════════════════
// UTBILDNING MODAL
// ═══════════════════════════════════════════════
let utbCurrentMonth=new Date().getMonth(), utbCurrentYear=new Date().getFullYear();
function openUtbildningModal(preDocId){
  const sel=document.getElementById('utbDocSelect');
  sel.innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  if(preDocId)sel.value=preDocId;
  utbCurrentMonth=getMonday(currentDate).getMonth();utbCurrentYear=getMonday(currentDate).getFullYear();
  renderUtbildningCal();openModal('utbildningModal');
}
function utbMonth(dir){
  utbCurrentMonth+=dir;if(utbCurrentMonth>11){utbCurrentMonth=0;utbCurrentYear++;}if(utbCurrentMonth<0){utbCurrentMonth=11;utbCurrentYear--;}
  renderUtbildningCal();
}
function renderUtbildningCal(){
  const docId=document.getElementById('utbDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('utbMonthLabel').textContent=`${months[utbCurrentMonth]} ${utbCurrentYear}`;
  const first=new Date(utbCurrentYear,utbCurrentMonth,1);
  const last=new Date(utbCurrentYear,utbCurrentMonth+1,0);
  let html=`<div style="display:grid;grid-template-columns:36px repeat(7,1fr);gap:2px;margin-bottom:4px">
    <div style="font-size:9px;font-weight:700;color:var(--text3);padding:2px 4px">V.</div>`;
  ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center;padding:2px">${d}</div>`);
  html+='</div>';
  const startMon=getMonday(first);
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===utbCurrentMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const wk=wkey(wn,yr);
    const wkOn=!!(utbildningVeckor[docId]&&utbildningVeckor[docId][wk]);
    html+=`<div class="cal-week-row"><button class="wk-toggle wk-utb${wkOn?' on':''}\" onclick="toggleUtbVecka('${docId}','${wk}')">v${wn}</button>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===utbCurrentMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      const dayOn=!!(utbildningDagar[docId]&&utbildningDagar[docId][ds]);
      const cls=`cal-day${isWe?' cal-we':''}${dayOn||wkOn?' cal-utb':''}${!inMonth?' cal-other':''}`;
      html+=`<div class="${cls}" onclick="toggleUtbDay('${docId}','${ds}')">${dt.getDate()}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==utbCurrentMonth&&cur>last)break;
  }
  document.getElementById('utbCalContainer').innerHTML=html;
}
function toggleUtbDay(docId,ds){
  if(!utbildningDagar[docId])utbildningDagar[docId]={};
  if(utbildningDagar[docId][ds])delete utbildningDagar[docId][ds];
  else utbildningDagar[docId][ds]=true;
  renderUtbildningCal();
}
function toggleUtbVecka(docId,wk){
  if(!utbildningVeckor[docId])utbildningVeckor[docId]={};
  if(utbildningVeckor[docId][wk])delete utbildningVeckor[docId][wk];
  else utbildningVeckor[docId][wk]=true;
  renderUtbildningCal();
}

// ═══════════════════════════════════════════════
// FÖRÄLDRALEDIGHET MODAL
// ═══════════════════════════════════════════════
function openForaldraledModal(){
  const sel=document.getElementById('flDocSelect');
  sel.innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  const today=isoDate(currentDate);
  document.getElementById('flDateFrom').value=today;
  document.getElementById('flDateTo').value=today;
  document.getElementById('flHalfFull').checked=true;
  document.getElementById('flNote').value='';
  updateFLRangeInfo();
  renderFLList();
  openModal('foraldraledModal');
}
function updateFLRangeInfo(){
  const f=document.getElementById('flDateFrom').value;
  const t=document.getElementById('flDateTo').value;
  const el=document.getElementById('flRangeInfo');
  if(!f||!t){el.textContent='';return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){el.style.color='var(--red)';el.textContent='⚠ Slutdatum är före startdatum';return;}
  let count=0;let cur=new Date(fd);
  while(cur<=td){count++;cur.setDate(cur.getDate()+1);}
  el.style.color='var(--text2)';
  el.textContent=count===1?'1 dag':`${count} dagar (${Math.ceil(count/7)} v.)`;
}
document.addEventListener('DOMContentLoaded',()=>{
  const ff=document.getElementById('flDateFrom');
  const ft=document.getElementById('flDateTo');
  if(ff)ff.addEventListener('change',()=>{
    // Auto-advance To if it's before From
    if(ft.value&&ft.value<ff.value)ft.value=ff.value;
    updateFLRangeInfo();
  });
  if(ft)ft.addEventListener('change',updateFLRangeInfo);
});
function renderFLList(){
  const el=document.getElementById('flList');
  const docId=document.getElementById('flDocSelect').value;
  const entries=[];
  Object.entries(specialSlots).forEach(([ds,slots])=>{
    Object.entries(slots).forEach(([k,v])=>{
      if(v.type==='fl'&&v.docId===docId)entries.push({ds,k,v});
    });
  });
  entries.sort((a,b)=>a.ds.localeCompare(b.ds));
  if(!entries.length){el.innerHTML='<p style="font-size:12px;color:var(--text3)">Inga dagar registrerade.</p>';return;}
  el.innerHTML=entries.map(({ds,k,v})=>{
    const d=new Date(ds);
    const label=`${d.getDate()} ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()]} ${d.getFullYear()}`;
    const half=v.halfDay==='fm'?' (fm)':v.halfDay==='em'?' (em)':'';
    return`<div class="rit" style="display:flex;align-items:center;gap:8px">
      <span style="flex:1;font-size:12px">${label}${half}${v.note?` — <em>${v.note}</em>`:''}</span>
      <button class="btn sm danger" onclick="delSpecial('${ds}','${k}');renderFLList();render()">×</button>
    </div>`;
  }).join('');
}
function confirmAddFL(){
  const docId=document.getElementById('flDocSelect').value;
  const f=document.getElementById('flDateFrom').value;
  const t=document.getElementById('flDateTo').value;
  if(!f){showToast('Välj ett startdatum');return;}
  const fd=new Date(f),td=new Date(t||f);
  if(td<fd){showToast('Slutdatum måste vara efter startdatum');return;}
  const halfDay=[...document.querySelectorAll('input[name="flHalf"]')].find(r=>r.checked)?.value||'';
  const note=document.getElementById('flNote').value.trim();
  let cur=new Date(fd),count=0;
  while(cur<=td){
    const ds=isoDate(cur);
    setSpecial(ds,`fl_${docId}_${ds}`,{type:'fl',docId,halfDay,note});
    count++;cur.setDate(cur.getDate()+1);
  }
  renderFLList();render();
  showToast(`${count} dag${count>1?'ar':''} registrerade`);
}

// ═══════════════════════════════════════════════
// LEDIGHET MODAL
// ═══════════════════════════════════════════════
let ledCurrentMonth=new Date().getMonth(), ledCurrentYear=new Date().getFullYear();
function openLedighetModal(){
  const sel=document.getElementById('ledDocSelect');
  sel.innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  ledCurrentMonth=getMonday(currentDate).getMonth();ledCurrentYear=getMonday(currentDate).getFullYear();
  renderLedighetCal();openModal('ledighetModal');
}
function ledMonth(dir){
  ledCurrentMonth+=dir;if(ledCurrentMonth>11){ledCurrentMonth=0;ledCurrentYear++;}if(ledCurrentMonth<0){ledCurrentMonth=11;ledCurrentYear--;}
  renderLedighetCal();
}
function renderLedighetCal(){
  const docId=document.getElementById('ledDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('ledMonthLabel').textContent=`${months[ledCurrentMonth]} ${ledCurrentYear}`;
  const first=new Date(ledCurrentYear,ledCurrentMonth,1);
  const last=new Date(ledCurrentYear,ledCurrentMonth+1,0);
  let html=`<div style="display:grid;grid-template-columns:36px repeat(7,1fr);gap:2px;margin-bottom:4px">
    <div style="font-size:9px;font-weight:700;color:var(--text3);padding:2px 4px">V.</div>`;
  ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center;padding:2px">${d}</div>`);
  html+='</div>';
  // Build weeks
  const startMon=getMonday(first);
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===ledCurrentMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const wk=wkey(wn,yr);
    const wkOff=!!(ledighetVeckor[docId]&&ledighetVeckor[docId][wk]);
    html+=`<div class="cal-week-row"><button class="wk-toggle${wkOff?' on':''}" onclick="toggleLedighetVecka('${docId}','${wk}')">v${wn}</button>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===ledCurrentMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      const dayOff=!!(ledighetRequests[docId]&&ledighetRequests[docId][ds]);
      const cls=`cal-day${isWe?' cal-we':''}${dayOff||wkOff?' cal-off':''}${!inMonth?' cal-other':''}`;
      html+=`<div class="${cls}" onclick="toggleLedighetDay('${docId}','${ds}')">${dt.getDate()}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==ledCurrentMonth&&cur>last)break;
  }
  document.getElementById('ledCalContainer').innerHTML=html;
}
function toggleLedighetDay(docId,ds){
  if(!ledighetRequests[docId])ledighetRequests[docId]={};
  if(ledighetRequests[docId][ds])delete ledighetRequests[docId][ds];
  else{ledighetRequests[docId][ds]=true;clearDocFromMottagning(docId,ds);}
  renderLedighetCal();
}
function toggleLedighetVecka(docId,wk){
  if(!ledighetVeckor[docId])ledighetVeckor[docId]={};
  if(ledighetVeckor[docId][wk])delete ledighetVeckor[docId][wk];
  else{
    ledighetVeckor[docId][wk]=true;
    // Clear Mottagning for all weekdays in this week
    const[yrStr,wPart]=wk.split('-W');
    const mon=addDays(getMonday(new Date(parseInt(yrStr),0,4)),(parseInt(wPart)-1)*7);
    for(let i=0;i<5;i++){clearDocFromMottagning(docId,isoDate(addDays(mon,i)));}
  }
  renderLedighetCal();
}

// ═══════════════════════════════════════════════
// HANDLEDNING MODAL
// ═══════════════════════════════════════════════
function openHandledningModal(){
  renderHandledningPairs();
  const stSel=document.getElementById('newHandlST');
  const supSel=document.getElementById('newHandlSup');
  stSel.innerHTML=doctors.filter(d=>docIsUL(d)).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  supSel.innerHTML=doctors.filter(d=>docIsHandledare(d)).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  openModal('handledningModal');
}
function renderHandledningPairs(){
  const el=document.getElementById('handledningPairsList');
  if(!handledningPairs.length){el.innerHTML='<p style="font-size:12px;color:var(--text3)">Inga par registrerade ännu.</p>';return;}
  el.innerHTML=handledningPairs.map((p,i)=>{
    const st=docById(p.stId),sup=docById(p.supervisorId);
    // Check if handledning is scheduled this month
    const yr=currentDate.getFullYear(),mo=currentDate.getMonth();
    const scheduled=Object.values(specialSlots).some(day=>Object.values(day).some(v=>v.type==='handledning'&&v.docId===p.stId));
    return`<div class="rit" style="${scheduled?'':'border-color:#e0a0c0;background:#fff8fc'}">
      <span style="font-size:12px"><span style="font-weight:700;color:#8a2060">${st?st.name:'?'}</span> <span style="color:var(--text3)">→</span> ${sup?sup.name:'?'}</span>
      ${scheduled?'<span style="font-size:10px;color:var(--accent)">✓ Schemalagd</span>':'<span style="font-size:10px;color:#c04080">⚠ Ej schemalagd</span>'}
      <button class="btn sm danger" onclick="removeHandledningPair(${i})">×</button>
    </div>`;
  }).join('');
}
function addHandledningPair(){
  const stId=document.getElementById('newHandlST').value;
  const supervisorId=document.getElementById('newHandlSup').value;
  if(!stId||!supervisorId)return;
  if(handledningPairs.find(p=>p.stId===stId)){showToast('ST-läkaren har redan en handledare');return;}
  handledningPairs.push({stId,supervisorId});
  renderHandledningPairs();showToast('Par tillagt');
}
function removeHandledningPair(i){handledningPairs.splice(i,1);renderHandledningPairs();}
