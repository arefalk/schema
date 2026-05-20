
function toggleWarnPopover(e){
  e.stopPropagation();
  let pop=document.getElementById('warnPopover');
  if(pop){pop.remove();return;}
  const warns=window._lastWarns||[];
  pop=document.createElement('div');
  pop.id='warnPopover';
  pop.style.cssText='position:absolute;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px #0002;padding:8px 0;min-width:280px;max-width:380px';
  pop.innerHTML=`<div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:4px 12px 6px">Varningar</div>`+
    warns.map(w=>`<div style="font-size:12px;padding:5px 12px;border-top:1px solid var(--border)20;color:var(--text1)">⚠ ${w}</div>`).join('');
  document.body.appendChild(pop);
  const r=e.target.getBoundingClientRect();
  pop.style.top=(r.bottom+4+window.scrollY)+'px';
  pop.style.left=Math.min(r.left,(window.innerWidth-390))+'px';
  const close=()=>{pop.remove();document.removeEventListener('click',close);};
  setTimeout(()=>document.addEventListener('click',close),0);
}

let ctxSpecialTarget=null;

// ═══════════════════════════════════════════════
// SPECIAL SLOTS (UTB / ADM / HANDLEDNING)
// ═══════════════════════════════════════════════
function _setupSpecialModal(ds,type){
  document.getElementById('addSpecialDs').value=ds;
  document.getElementById('addSpecialType').value=type;
  document.getElementById('addSpecialEditKey').value='';
  const titles={utb:'Utbildning',adm:'Administration',handledning:'Handledning'};
  const subs={utb:'Läkaren är på kurs eller utbildning denna dag.',adm:'Läkaren har administrativt arbete.',handledning:'Schemalägg en handledningssession.'};
  document.getElementById('addSpecialTitle').textContent=titles[type]||type;
  document.getElementById('addSpecialSub').textContent=subs[type]||'';
  const docSel=document.getElementById('addSpecialDoc');
  docSel.innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  const supRow=document.getElementById('addSpecialSupervisorRow');
  const deleteBtn=document.getElementById('addSpecialDeleteBtn');
  if(type==='handledning'){
    supRow.style.display='';
    docSel.innerHTML=doctors.filter(d=>docIsUL(d)).map(d=>`<option value="${d.id}">${d.name} (ST)</option>`).join('');
    const supSel=document.getElementById('addSpecialSupervisor');
    supSel.innerHTML=doctors.filter(d=>docIsHandledare(d)).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
    docSel.onchange=()=>{
      const pair=handledningPairs.find(p=>p.stId===docSel.value);
      if(pair)supSel.value=pair.supervisorId;
    };
    if(docSel.options.length){docSel.dispatchEvent(new Event('change'));}
    document.getElementById('addSpecialRecSection').style.display='none';
  } else {
    supRow.style.display='none';
    const recSection=document.getElementById('addSpecialRecSection');
    recSection.style.display='';
    document.getElementById('addSpecialRecStart').value=ds;
    document.getElementById('addSpecialRecurrence').value='weekly';
    renderSpecialRecurringList(type);
  }
  if(deleteBtn)deleteBtn.style.display='none';
  document.getElementById('addSpecialConfirmBtn').textContent='Lägg till';
}
function openAddSpecialModal(ds,type){
  _setupSpecialModal(ds,type);
  document.getElementById('addSpecialNote').value='';
  document.getElementById('addHalfDay').checked=true;
  openModal('addSpecialModal');
}
function openEditSpecialModal(ds,key){
  const v=getSpecial(ds,key);if(!v)return;
  _setupSpecialModal(ds,v.type);
  // Pre-fill fields
  document.getElementById('addSpecialDoc').value=v.docId;
  document.getElementById('addSpecialNote').value=v.note||'';
  const halfInput=[...document.querySelectorAll('input[name="addSpecialHalf"]')].find(r=>r.value===(v.halfDay||''));
  if(halfInput)halfInput.checked=true;
  document.getElementById('addSpecialEditKey').value=key;
  document.getElementById('addSpecialConfirmBtn').textContent='Spara';
  const deleteBtn=document.getElementById('addSpecialDeleteBtn');
  if(deleteBtn)deleteBtn.style.display='';
  openModal('addSpecialModal');
}
function renderSpecialRecurringList(type){
  const el=document.getElementById('addSpecialRecList');
  if(!el)return;
  const recLabels={weekly:'Varje vecka',biweekly:'Varannan vecka',quadweekly:'Var 4:e vecka'};
  const entries=(specialRecurring||[]).filter(r=>r.type===type);
  if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:2px 0">Inga återkommande poster</div>';return;}
  const svDows=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  el.innerHTML=entries.map(r=>{
    const doc=docById(r.docId);
    const dow=r.startDate?svDows[new Date(r.startDate+'T12:00:00').getDay()]:'';
    return`<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;font-weight:600;flex:1">${doc?docShortName(doc):r.docId}${r.halfDay?` (${r.halfDay})`:''}</span>
      <span style="font-size:9px;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:1px 5px;border-radius:3px">🔁 ${recLabels[r.recurrence]||r.recurrence}</span>
      <span style="font-size:10px;color:var(--text3)">${dow} fr.o.m. ${r.startDate||''}</span>
      <button onclick="removeSpecialRecurring('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">×</button>
    </div>`;
  }).join('');
}
function addSpecialRecurring(){
  const type=document.getElementById('addSpecialType').value;
  const docId=document.getElementById('addSpecialDoc').value;
  if(!docId)return;
  const halfDay=[...document.querySelectorAll('input[name="addSpecialHalf"]')].find(r=>r.checked)?.value||'';
  const note=document.getElementById('addSpecialNote').value.trim();
  const startDate=document.getElementById('addSpecialRecStart').value;
  const recurrence=document.getElementById('addSpecialRecurrence').value||'weekly';
  if(!startDate){showToast('Välj ett startdatum');return;}
  specialRecurring.push({id:`srec_${Date.now()}`,type,docId,halfDay,note,startDate,recurrence});
  renderSpecialRecurringList(type);
  autoSave();render();
  showToast('Återkommande post tillagd');
}
function removeSpecialRecurring(id){
  const r=specialRecurring.find(x=>x.id===id);
  specialRecurring=specialRecurring.filter(x=>x.id!==id);
  if(r)renderSpecialRecurringList(r.type);
  autoSave();render();
}
function confirmAddSpecial(){
  const ds=document.getElementById('addSpecialDs').value;
  const type=document.getElementById('addSpecialType').value;
  const docId=document.getElementById('addSpecialDoc').value;
  const halfDay=[...document.querySelectorAll('input[name="addSpecialHalf"]')].find(r=>r.checked)?.value||'';
  const note=document.getElementById('addSpecialNote').value.trim();
  const editKey=document.getElementById('addSpecialEditKey').value;
  // If editing: remove old entry first, reuse same key so position stays stable
  if(editKey)delSpecial(ds,editKey);
  const key=editKey||`${type}_${docId}_${Date.now()}`;
  const val={type,docId,halfDay,note};
  if(type==='handledning'){val.supervisorId=document.getElementById('addSpecialSupervisor').value;}
  setSpecial(ds,key,val);
  if(type==='handledning'&&halfDay)scheduleHandledningMottagning(docId,val.supervisorId,ds,halfDay);
  closeModal('addSpecialModal');render();showToast(editKey?'Inslag uppdaterat':'Inslag tillagt');
}
function deleteEditSpecial(){
  const ds=document.getElementById('addSpecialDs').value;
  const key=document.getElementById('addSpecialEditKey').value;
  if(key)delSpecial(ds,key);
  closeModal('addSpecialModal');render();showToast('Inslag borttaget');
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

// ── Utbildning notering ──────────────────────────
function openUtbNoteModal(docId,ds){
  const doc=docById(docId);if(!doc)return;
  const dt=new Date(ds+'T12:00:00');
  document.getElementById('utbNoteTitle').textContent=`${docShortName(doc)} – ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}`;
  document.getElementById('utbNoteDs').value=ds;
  document.getElementById('utbNoteDocId').value=docId;
  document.getElementById('utbNoteInput').value=getUtbNote(docId,ds);
  openModal('utbNoteModal');
}
function saveUtbNote(){
  const ds=document.getElementById('utbNoteDs').value;
  const docId=document.getElementById('utbNoteDocId').value;
  const note=document.getElementById('utbNoteInput').value.trim();
  setUtbNote(docId,ds,note);
  closeModal('utbNoteModal');autoSave();render();
}

// ═══════════════════════════════════════════════
// UTBILDNING MODAL
// ═══════════════════════════════════════════════
let utbCurrentMonth=new Date().getMonth(), utbCurrentYear=new Date().getFullYear();
let _utbSelectedDs=null;
function openUtbildningModal(preDocId, ds){
  const sel=document.getElementById('utbDocSelect');
  sel.innerHTML=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  if(preDocId)sel.value=preDocId;
  const nav=ds?new Date(ds+'T12:00:00'):getMonday(currentDate);
  utbCurrentMonth=nav.getMonth();utbCurrentYear=nav.getFullYear();
  _utbSelectedDs=ds||null;
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
      const isSelected=_utbSelectedDs===ds;
      const note=dayOn?getUtbNote(docId,ds):'';
      const cls=`cal-day${isWe?' cal-we':''}${dayOn||wkOn?' cal-utb':''}${!inMonth?' cal-other':''}${isSelected?' cal-utb-sel':''}`;
      html+=`<div class="${cls}" onclick="toggleUtbDay('${docId}','${ds}')" title="${note}">${dt.getDate()}${note?'<span style="font-size:7px;vertical-align:top">✎</span>':''}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==utbCurrentMonth&&cur>last)break;
  }
  document.getElementById('utbCalContainer').innerHTML=html;
  // Kommentarsfält
  const noteSection=document.getElementById('utbNoteSection');
  if(_utbSelectedDs&&utbildningDagar[docId]&&utbildningDagar[docId][_utbSelectedDs]){
    const dt=new Date(_utbSelectedDs+'T12:00:00');
    document.getElementById('utbNoteLabel').textContent=`Kommentar – ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}`;
    document.getElementById('utbNoteField').value=getUtbNote(docId,_utbSelectedDs);
    noteSection.style.display='';
  } else {
    noteSection.style.display='none';
  }
}
function toggleUtbDay(docId,ds){
  if(!utbildningDagar[docId])utbildningDagar[docId]={};
  if(utbildningDagar[docId][ds]){
    if(_utbSelectedDs===ds){
      // Second click on selected day: remove it
      delete utbildningDagar[docId][ds];
      _utbSelectedDs=null;
    } else {
      // First click on active day: select it (show note)
      _utbSelectedDs=ds;
    }
  } else {
    // Inactive day: add it and select it
    utbildningDagar[docId][ds]=true;
    _utbSelectedDs=ds;
  }
  renderUtbildningCal();
}
function saveUtbNoteInline(){
  const docId=document.getElementById('utbDocSelect').value;
  if(!_utbSelectedDs||!docId)return;
  const note=document.getElementById('utbNoteField').value.trim();
  setUtbNote(docId,_utbSelectedDs,note);
  renderUtbildningCal();autoSave();
}
function toggleUtbVecka(docId,wk){
  if(!utbildningVeckor[docId])utbildningVeckor[docId]={};
  if(utbildningVeckor[docId][wk])delete utbildningVeckor[docId][wk];
  else utbildningVeckor[docId][wk]=true;
  renderUtbildningCal();
}

// ═══════════════════════════════════════════════
// DELTIDSSCHEMA MODAL
// ═══════════════════════════════════════════════
let deltCurrentMonth=new Date().getMonth(),deltCurrentYear=new Date().getFullYear();
function openDeltidModal(preDocId){
  const sel=document.getElementById('deltDocSelect');
  sel.innerHTML=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  if(preDocId)sel.value=preDocId;
  deltCurrentMonth=getMonday(currentDate).getMonth();deltCurrentYear=getMonday(currentDate).getFullYear();
  renderDeltidCal();openModal('deltidModal');
}
function deltMonth(dir){
  deltCurrentMonth+=dir;if(deltCurrentMonth>11){deltCurrentMonth=0;deltCurrentYear++;}if(deltCurrentMonth<0){deltCurrentMonth=11;deltCurrentYear--;}
  renderDeltidCal();
}
function renderDeltidCal(){
  const docId=document.getElementById('deltDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('deltMonthLabel').textContent=`${months[deltCurrentMonth]} ${deltCurrentYear}`;
  const first=new Date(deltCurrentYear,deltCurrentMonth,1);
  const last=new Date(deltCurrentYear,deltCurrentMonth+1,0);
  let html=`<div style="display:grid;grid-template-columns:36px 18px repeat(5,1fr);gap:2px;margin-bottom:4px">
    <div style="font-size:9px;font-weight:700;color:var(--text3);padding:2px 4px">V.</div>
    <div></div>`;
  ['Mån','Tis','Ons','Tor','Fre'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center;padding:2px">${d}</div>`);
  html+='</div>';
  const startMon=getMonday(first);
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===deltCurrentMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const wk=wkey(wn,yr);
    const wkVal=(deltidVeckor[docId]&&deltidVeckor[docId][wk])||null;
    const wkCls=wkVal==='hel'?' on':wkVal==='fm'?' fm-on':wkVal==='em'?' em-on':'';
    const wkLabel=wkVal==='fm'?'FM':wkVal==='em'?'EM':wkVal==='hel'?'Hel':`v${wn}`;
    const wkTitle=wkVal==='fm'?`v${wn}: förmiddag ledig alla dagar`:wkVal==='em'?`v${wn}: eftermiddag ledig alla dagar`:wkVal==='hel'?`v${wn}: hela veckan ledig`:`Klicka: FM → EM → Hel → av`;
    let hasDayData=false;
    for(let i=0;i<5;i++){const dt2=new Date(cur);dt2.setDate(dt2.getDate()+i);if(deltidDagar[docId]&&deltidDagar[docId][isoDate(dt2)]){hasDayData=true;break;}}
    const hasData=!!(wkVal||hasDayData);
    const fwdTitle=hasData?`Kopiera veckans mönster till alla veckor framåt`:'Ange ett deltidsvärde för veckan först';
    html+=`<div class="cal-week-row">`;
    html+=`<button class="wk-toggle wk-deltid${wkCls}" onclick="toggleDeltidVecka('${docId}','${wk}')" title="${wkTitle}">${wkLabel}</button>`;
    html+=`<button class="btn-copy-fwd${hasData?'':' disabled'}" onclick="${hasData?`copyDeltidForward('${docId}','${wk}')`:''}" title="${fwdTitle}">→</button>`;
    for(let i=0;i<5;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===deltCurrentMonth;
      const val=wkVal||((deltidDagar[docId]&&deltidDagar[docId][ds])||null);
      const cls=`cal-day${val==='hel'?' cal-deltid-hel':val==='fm'?' cal-deltid-fm':val==='em'?' cal-deltid-em':''}${!inMonth?' cal-other':''}`;
      const inner=val==='fm'?`<span style="font-size:8px;font-weight:700">FM</span>`:val==='em'?`<span style="font-size:8px;font-weight:700">EM</span>`:val==='hel'?`<span style="font-size:8px;font-weight:700">Hel</span>`:dt.getDate();
      const clickable=!wkVal;
      html+=`<div class="${cls}"${clickable?` onclick="toggleDeltidDay('${docId}','${ds}')"`:''}>${inner}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==deltCurrentMonth&&cur>last)break;
  }
  document.getElementById('deltCalContainer').innerHTML=html;
}
function toggleDeltidDay(docId,ds){
  if(!deltidDagar[docId])deltidDagar[docId]={};
  const cur=deltidDagar[docId][ds]||null;
  if(!cur)deltidDagar[docId][ds]='fm';
  else if(cur==='fm')deltidDagar[docId][ds]='em';
  else if(cur==='em')deltidDagar[docId][ds]='hel';
  else delete deltidDagar[docId][ds];
  autoSave();renderDeltidCal();render();
}
function toggleDeltidVecka(docId,wk){
  if(!deltidVeckor[docId])deltidVeckor[docId]={};
  const cur=deltidVeckor[docId][wk]||null;
  if(!cur)deltidVeckor[docId][wk]='fm';
  else if(cur==='fm')deltidVeckor[docId][wk]='em';
  else if(cur==='em')deltidVeckor[docId][wk]='hel';
  else delete deltidVeckor[docId][wk];
  autoSave();renderDeltidCal();render();
}
function copyDeltidForward(docId,wk){
  const wkVal=(deltidVeckor[docId]&&deltidVeckor[docId][wk])||null;
  const[yrStr,wPart]=wk.split('-W');
  const fromMon=isoWeekMon(parseInt(wPart),parseInt(yrStr));
  const endDate=schedulePeriod.to?new Date(schedulePeriod.to+'T12:00:00'):new Date(parseInt(yrStr)+1,11,31);
  let count=0;
  if(wkVal){
    // Kopiera veckonivå framåt
    if(!deltidVeckor[docId])deltidVeckor[docId]={};
    let cur=addDays(fromMon,7);
    while(cur<=endDate){
      deltidVeckor[docId][wkey(weekNum(cur),weekYear(cur))]=wkVal;
      cur=addDays(cur,7);count++;
    }
  } else {
    // Kopiera dagmönster (vilken dag-i-veckan → värde) framåt
    const dayPattern={};
    for(let i=0;i<5;i++){
      const ds=isoDate(addDays(fromMon,i));
      const v=deltidDagar[docId]&&deltidDagar[docId][ds];
      if(v)dayPattern[i]=v;
    }
    if(!Object.keys(dayPattern).length)return;
    if(!deltidDagar[docId])deltidDagar[docId]={};
    let cur=addDays(fromMon,7);
    while(cur<=endDate){
      for(let i=0;i<5;i++){
        const ds=isoDate(addDays(cur,i));
        if(dayPattern[i])deltidDagar[docId][ds]=dayPattern[i];
      }
      cur=addDays(cur,7);count++;
    }
  }
  autoSave();renderDeltidCal();render();
  showToast(`Mönster kopierat till ${count} veckor framåt`);
}

// ═══════════════════════════════════════════════
// LEDIGHET MODAL
// ═══════════════════════════════════════════════
let ledCurrentMonth=new Date().getMonth(), ledCurrentYear=new Date().getFullYear();
function openLedighetModal(ds,preDocId){
  const sel=document.getElementById('ledDocSelect');
  const sorted=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  sel.innerHTML=sorted.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  if(preDocId)sel.value=preDocId;
  const nav=ds?new Date(ds+'T12:00:00'):getMonday(currentDate);
  ledCurrentMonth=nav.getMonth();ledCurrentYear=nav.getFullYear();
  renderLedighetCal();openModal('ledighetModal');
}
function ledMonth(dir){
  ledCurrentMonth+=dir;if(ledCurrentMonth>11){ledCurrentMonth=0;ledCurrentYear++;}if(ledCurrentMonth<0){ledCurrentMonth=11;ledCurrentYear--;}
  renderLedighetCal();
}
function _adminLedigWeekState(docId,wk){
  if(ledighetVeckor[docId]&&ledighetVeckor[docId][wk])return'ledig';
  const jf=jourfriOnskad[docId]&&jourfriOnskad[docId][wk];
  if(jf&&jf.scope==='week')return'jourfri-week';
  if(jf&&jf.scope==='weekend')return'jourfri-weekend';
  return null;
}
function _adminLedigDayState(docId,ds){
  if(ledighetRequests[docId]&&ledighetRequests[docId][ds])return'ledig';
  if(jourfriOnskadDag[docId]&&jourfriOnskadDag[docId][ds])return'jourfri';
  return null;
}
function renderLedighetCal(){
  const docId=document.getElementById('ledDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('ledMonthLabel').textContent=`${months[ledCurrentMonth]} ${ledCurrentYear}`;
  const first=new Date(ledCurrentYear,ledCurrentMonth,1);
  const last=new Date(ledCurrentYear,ledCurrentMonth+1,0);
  let html=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:3px"><div></div>`;
  ['M','T','O','T','F','L','S'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center">${d}</div>`);
  html+='</div>';
  const startMon=getMonday(first);
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===ledCurrentMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const wk=wkey(wn,yr);
    const weekState=_adminLedigWeekState(docId,wk);
    const wkBg=weekState==='ledig'?'var(--accent-light)':weekState==='jourfri-week'?'#dde8f5':weekState==='jourfri-weekend'?'#eef3fa':'transparent';
    const wkCol=weekState==='ledig'?'var(--accent)':weekState?'var(--night)':'var(--text2)';
    const wkBrd=weekState==='ledig'?'var(--accent)':weekState?'var(--night)':'var(--border)';
    const flexVal=weekState==='ledig'?(ledighetVeckor[docId]&&ledighetVeckor[docId][wk]):null;
    const flex=_wishEntryFlexible(flexVal);
    const flexSfx=flex==='both'?'<span style="font-size:7px;vertical-align:super">±</span>':flex==='forward'?'<span style="font-size:7px;vertical-align:super">+</span>':'';
    const wkBorderStyle=flex?'dashed':'solid';
    const wkTitle=weekState==='ledig'?`Klicka → Jourfri hel vecka${flex?' (flexibel '+(flex==='both'?'±1v':'+1v')+')':''}`:weekState==='jourfri-week'?'Klicka → Jourfri helg':weekState==='jourfri-weekend'?'Klicka → Ta bort':'Klicka → Ledig hel vecka';
    const wkLabel=weekState==='jourfri-week'?'JF':weekState==='jourfri-weekend'?'JFH':`v${wn}${flexSfx}`;
    html+=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:2px">`;
    html+=`<div style="font-size:9px;color:${wkCol};text-align:center;padding:2px 0;cursor:pointer;font-weight:700;border-radius:3px;border:1px ${wkBorderStyle} ${wkBrd};background:${wkBg}" onclick="toggleLedighetVecka('${docId}','${wk}')" title="${wkTitle}">${wkLabel}</div>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===ledCurrentMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      const dayState=_adminLedigDayState(docId,ds);
      const wkLedig=weekState==='ledig'&&!isWe;
      const wkJfAll=weekState==='jourfri-week';
      const wkJfWe=weekState==='jourfri-weekend'&&isWe;
      const locked=wkLedig||wkJfAll||wkJfWe;
      let bg='transparent',col='inherit',brd='var(--border)';
      if(locked){if(wkLedig){bg='var(--accent-light)';col='var(--accent)';brd='var(--accent)';}else{bg='#dde8f5';col='var(--night)';brd='var(--night)';}}
      else if(dayState==='ledig'){bg='var(--accent)';col='#fff';brd='transparent';}
      else if(dayState==='jourfri'){bg='var(--night)';col='#fff';brd='transparent';}
      const dim=!inMonth?'opacity:.3;':(!dayState&&!locked&&isWe?'opacity:.5;':'');
      const tooltip=locked?(wkLedig?'Ledig (hela veckan)':'Jourfritt (vecka/helg)'):isWe?(dayState==='jourfri'?'Klicka → Ta bort':'Klicka → Jourfri'):(dayState==='ledig'?'Klicka → Jourfri':dayState==='jourfri'?'Klicka → Ta bort':'Klicka → Ledig');
      html+=`<div style="font-size:10px;text-align:center;padding:2px 1px;border-radius:4px;background:${bg};color:${col};${dim}cursor:${locked?'default':'pointer'};border:1px solid ${brd}" ${locked?`title="${tooltip}"`:` onclick="toggleLedighetDay('${docId}','${ds}')" title="${tooltip}"`}>${dt.getDate()}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==ledCurrentMonth&&cur>last)break;
  }
  document.getElementById('ledCalContainer').innerHTML=html;
  renderStaffingBar('ledStaffingContainer',ledCurrentMonth,ledCurrentYear);
}
function toggleLedighetDay(docId,ds){
  const dow=new Date(ds+'T12:00:00').getDay();
  const isWe=dow===0||dow===6;
  const cur=_adminLedigDayState(docId,ds);
  if(isWe){
    if(cur==='jourfri'){if(jourfriOnskadDag[docId])delete jourfriOnskadDag[docId][ds];}
    else{if(!jourfriOnskadDag[docId])jourfriOnskadDag[docId]={};jourfriOnskadDag[docId][ds]=true;}
  } else {
    if(cur==='ledig'){
      if(ledighetRequests[docId])delete ledighetRequests[docId][ds];
      if(!jourfriOnskadDag[docId])jourfriOnskadDag[docId]={};
      jourfriOnskadDag[docId][ds]=true;
    } else if(cur==='jourfri'){
      if(jourfriOnskadDag[docId])delete jourfriOnskadDag[docId][ds];
    } else {
      if(!ledighetRequests[docId])ledighetRequests[docId]={};
      ledighetRequests[docId][ds]=true;
      clearDocFromMottagning(docId,ds);
    }
  }
  renderLedighetCal();autoSave();render();
}
function toggleLedighetVecka(docId,wk){
  const state=_adminLedigWeekState(docId,wk);
  if(state===null){
    if(!ledighetVeckor[docId])ledighetVeckor[docId]={};
    ledighetVeckor[docId][wk]=true;
    const[yrStr,wPart]=wk.split('-W');
    const mon=isoWeekMon(parseInt(wPart),parseInt(yrStr));
    for(let i=0;i<5;i++){clearDocFromMottagning(docId,isoDate(addDays(mon,i)));}
  } else if(state==='ledig'){
    delete ledighetVeckor[docId][wk];
    if(!jourfriOnskad[docId])jourfriOnskad[docId]={};
    jourfriOnskad[docId][wk]={scope:'week',note:''};
  } else if(state==='jourfri-week'){
    jourfriOnskad[docId][wk]={scope:'weekend',note:''};
  } else {
    delete jourfriOnskad[docId][wk];
  }
  renderLedighetCal();autoSave();render();
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
  autoSave();renderHandledningPairs();showToast('Par tillagt');
}
function removeHandledningPair(i){handledningPairs.splice(i,1);autoSave();renderHandledningPairs();}

// ═══════════════════════════════════════════════
// DAGVÅRD
// ═══════════════════════════════════════════════
function openDagvardModal(ds){
  if(!dagvardEntries[ds])dagvardEntries[ds]={docs:[],note:''};
  document.getElementById('dagvardDs').value=ds;
  const d=new Date(ds+'T12:00:00');
  document.getElementById('dagvardDateLabel').textContent=`${svDay(d)} ${d.getDate()} ${svMonth(d)}`;
  document.getElementById('dagvardNoteInput').value=dagvardEntries[ds].note||'';
  const sel=document.getElementById('dagvardDocSel');
  sel.innerHTML=`<option value="">— Välj läkare —</option>`+doctors.map(doc=>`<option value="${doc.id}">${doc.name}</option>`).join('');
  renderDagvardList();
  openModal('dagvardModal');
}
function renderDagvardList(){
  const ds=document.getElementById('dagvardDs').value;
  const dv=dagvardEntries[ds]||{docs:[],note:''};
  const el=document.getElementById('dagvardDocList');
  if(!(dv.docs&&dv.docs.length)){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga läkare tillagda</div>';return;}
  el.innerHTML=(dv.docs||[]).map(docId=>{const doc=docById(docId);if(!doc)return'';
    return`<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg2);border-radius:6px;margin-bottom:4px">
      <div class="savatar" style="width:20px;height:20px;font-size:9px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div>
      <span style="flex:1;font-size:12px">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span>
      <button class="btn sm danger" onclick="removeDagvardDoc('${docId}')">×</button>
    </div>`;
  }).join('');
}
function addDagvardDoc(){
  const ds=document.getElementById('dagvardDs').value;
  const docId=document.getElementById('dagvardDocSel').value;
  if(!docId)return;
  if(!dagvardEntries[ds])dagvardEntries[ds]={docs:[],note:''};
  if(!(dagvardEntries[ds].docs||[]).includes(docId)){
    if(!dagvardEntries[ds].docs)dagvardEntries[ds].docs=[];
    dagvardEntries[ds].docs.push(docId);
  }
  document.getElementById('dagvardDocSel').value='';
  renderDagvardList();autoSave();render();
}
function removeDagvardDoc(docId){
  const ds=document.getElementById('dagvardDs').value;
  if(dagvardEntries[ds])dagvardEntries[ds].docs=(dagvardEntries[ds].docs||[]).filter(d=>d!==docId);
  renderDagvardList();autoSave();render();
}
function saveDagvardNote(){
  const ds=document.getElementById('dagvardDs').value;
  const note=document.getElementById('dagvardNoteInput').value.trim();
  if(!dagvardEntries[ds])dagvardEntries[ds]={docs:[],note:''};
  dagvardEntries[ds].note=note;
  closeModal('dagvardModal');autoSave();render();showToast('Dagvård uppdaterad');
}

// ═══════════════════════════════════════════════
// AUSKULTATION
// ═══════════════════════════════════════════════
let _auskMode='dag'; // 'dag' | 'vecka'
function setAuskMode(mode){
  _auskMode=mode;
  document.getElementById('auskModeDag').classList.toggle('active',mode==='dag');
  document.getElementById('auskModeVecka').classList.toggle('active',mode==='vecka');
  _refreshAuskDocSel();
  renderAuskultationList();
}
function _auskWeekDates(ds){
  const mon=getMonday(new Date(ds+'T12:00:00'));
  return[0,1,2,3,4].map(i=>{const d=new Date(mon);d.setDate(d.getDate()+i);return isoDate(d);});
}
function _refreshAuskDocSel(){
  const ds=document.getElementById('auskDs').value;
  const sel=document.getElementById('auskDocSel');
  const dates=_auskMode==='vecka'?_auskWeekDates(ds):[ds];
  // Show all doctors (not filtered by placement for week-mode; filter for single day)
  let pool;
  if(_auskMode==='dag'){
    const dow=new Date(ds+'T12:00:00').getDay();
    pool=doctors.filter(doc=>{
      const id=doc.id;
      if(docIsAssignedOnDate(id,ds))return false;
      if(getBJ(ds,'BJFS')===id||getBJ(ds,'BJLO')===id||getBJ(ds,'BJNV')===id)return false;
      if(specialsOnDate(ds).some(([,v])=>v.docId===id||v.supervisorId===id))return false;
      if(dow===0||dow===6)return false;
      if(docHasAnyLedighet(id,ds))return false;
      if(deltidOnDay(id,ds)==='hel')return false;
      if(docRestrictedOnDate(id,ds))return false;
      return true;
    });
  } else {
    pool=[...doctors];
  }
  pool.sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  sel.innerHTML=`<option value="">— Välj läkare —</option>`+pool.map(doc=>`<option value="${doc.id}">${doc.name}</option>`).join('');
}
function openAuskultationModal(ds){
  document.getElementById('auskDs').value=ds;
  const d=new Date(ds+'T12:00:00');
  document.getElementById('auskDateLabel').textContent=`${svDay(d)} ${d.getDate()} ${svMonth(d)}`;
  document.getElementById('auskWeekLabel').textContent=`v.${weekNum(getMonday(d))}`;
  _auskMode='dag';
  document.getElementById('auskModeDag').classList.add('active');
  document.getElementById('auskModeVecka').classList.remove('active');
  _refreshAuskDocSel();
  document.getElementById('auskPlaceSel').value='';
  document.getElementById('auskNoteInput').value='';
  renderAuskultationList();
  openModal('auskultationModal');
}
function _auskEntryHtml(e,showDay){
  const doc=docById(e.docId);if(!doc)return'';
  const place=e.place||e.desc||'';
  const note=e.note||'';
  return`<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:var(--bg2);border-radius:6px;margin-bottom:4px">
    <div class="savatar" style="width:20px;height:20px;font-size:9px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div>
    <div style="flex:1">
      <div style="font-size:12px">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}${place?` — <span style="font-size:11px;color:#7c3aed">${place}</span>`:''}</div>
      ${note?`<div style="font-size:10px;color:var(--text2);font-style:italic">${note}</div>`:''}
    </div>
    <button class="btn sm danger" onclick="removeAuskultationEntry('${e.id}')">×</button>
  </div>`;
}
function renderAuskultationList(){
  const ds=document.getElementById('auskDs').value;
  const el=document.getElementById('auskList');
  if(_auskMode==='dag'){
    const entries=auskultationEntries[ds]||[];
    if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga auskultanter registrerade</div>';return;}
    el.innerHTML=entries.map(e=>_auskEntryHtml(e,false)).join('');
  } else {
    const dates=_auskWeekDates(ds);
    let html='';
    dates.forEach(d=>{
      const dt=new Date(d+'T12:00:00');
      const entries=auskultationEntries[d]||[];
      html+=`<div style="font-size:10px;font-weight:700;color:var(--text3);margin-top:6px;margin-bottom:2px;text-transform:capitalize">${svDay(dt)} ${dt.getDate()}</div>`;
      if(!entries.length) html+='<div style="font-size:10px;color:var(--text3);padding:1px 0 2px">—</div>';
      else html+=entries.map(e=>_auskEntryHtml(e,false)).join('');
    });
    el.innerHTML=html||'<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga auskultanter registrerade</div>';
  }
}
function addAuskultationEntry(){
  const ds=document.getElementById('auskDs').value;
  const docId=document.getElementById('auskDocSel').value;
  const place=document.getElementById('auskPlaceSel').value;
  const note=document.getElementById('auskNoteInput').value.trim();
  if(!docId)return;
  const dates=_auskMode==='vecka'?_auskWeekDates(ds):[ds];
  dates.forEach(d=>{
    if(!auskultationEntries[d])auskultationEntries[d]=[];
    if(!auskultationEntries[d].some(e=>e.docId===docId))
      auskultationEntries[d].push({id:`ausk_${Date.now()}_${d}`,docId,place,note});
  });
  document.getElementById('auskDocSel').value='';
  document.getElementById('auskPlaceSel').value='';
  document.getElementById('auskNoteInput').value='';
  renderAuskultationList();autoSave();render();
}
function removeAuskultationEntry(id){
  Object.keys(auskultationEntries).forEach(d=>{
    if(auskultationEntries[d])auskultationEntries[d]=auskultationEntries[d].filter(e=>e.id!==id);
  });
  renderAuskultationList();autoSave();render();
}

// ═══════════════════════════════════════════════
// ÖVRIGT
// ═══════════════════════════════════════════════
let _ovrigtSelDocIds=[];
function ovrigtNoteDocIds(n){return n.docIds||(n.docId?[n.docId]:[]);}
function openOvrigtModal(ds){
  document.getElementById('ovrigtDs').value=ds;
  const d=new Date(ds+'T12:00:00');
  document.getElementById('ovrigtDateLabel').textContent=`${svDay(d)} ${d.getDate()} ${svMonth(d)}`;
  document.getElementById('ovrigtInput').value='';
  document.getElementById('ovrigtBlocks').value='';
  _ovrigtSelDocIds=[];
  _renderOvrigtDocChips();
  _populateOvrigtDocDropdown();
  renderOvrigtList();
  // Återkommande section
  _ovrigtRecSelDocIds=[];
  _renderOvrigtRecDocChips();
  _populateOvrigtRecDocDropdown();
  document.getElementById('ovrigtRecInput').value='';
  document.getElementById('ovrigtRecBlocks').value='';
  document.getElementById('ovrigtRecStart').value=ds;
  document.getElementById('ovrigtRecurrence').value='weekly';
  renderOvrigtRecurringList();
  openModal('ovrigtModal');
}
function _populateOvrigtDocDropdown(){
  const sel=document.getElementById('ovrigtDocSelect');
  sel.innerHTML='<option value="">+ Lägg till läkare...</option>';
  [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
    if(_ovrigtSelDocIds.includes(doc.id))return;
    const o=document.createElement('option');o.value=doc.id;o.textContent=docShortName(doc);sel.appendChild(o);
  });
  sel.value='';
}
function _renderOvrigtDocChips(){
  const el=document.getElementById('ovrigtDocChips');
  if(!_ovrigtSelDocIds.length){el.innerHTML='<span style="font-size:11px;color:var(--text3)">Inga läkare valda</span>';return;}
  el.innerHTML=_ovrigtSelDocIds.map(id=>{
    const doc=docById(id);
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:var(--accent-light,#e0f2fe);font-size:11px;font-weight:600;color:var(--accent)">
      ${doc?docShortName(doc):id}
      <button onclick="removeOvrigtDocChip('${id}')" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;font-size:13px;color:var(--accent);opacity:.7">×</button>
    </span>`;
  }).join('');
}
function addOvrigtDocChip(){
  const sel=document.getElementById('ovrigtDocSelect');
  const id=sel.value;
  if(!id||_ovrigtSelDocIds.includes(id))return;
  _ovrigtSelDocIds.push(id);
  _renderOvrigtDocChips();
  _populateOvrigtDocDropdown();
}
function removeOvrigtDocChip(id){
  _ovrigtSelDocIds=_ovrigtSelDocIds.filter(x=>x!==id);
  _renderOvrigtDocChips();
  _populateOvrigtDocDropdown();
}
function renderOvrigtList(){
  const ds=document.getElementById('ovrigtDs').value;
  const notes=ovrigtNotes[ds]||[];
  const el=document.getElementById('ovrigtList');
  if(!notes.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga noteringar</div>';return;}
  const blockLabels={fm:'FM',em:'EM',hel:'Hela dagen',true:'Hela dagen'};
  el.innerHTML=notes.map(n=>{
    const ids=ovrigtNoteDocIds(n);
    const blockTag=n.blocks&&ids.length?`<span style="font-size:9px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:3px">${blockLabels[n.blocks]||'Hela dagen'}</span>`:'';
    const docTags=ids.map(id=>{const doc=docById(id);return doc?`<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:10px;background:var(--accent-light,#e0f2fe);font-size:10px;font-weight:600;color:var(--accent)">${docShortName(doc)}<button onclick="removeOvrigtNoteDoc('${n.id}','${id}')" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;font-size:12px;color:var(--accent);opacity:.7" title="Ta bort">×</button></span>`:''}).join('');
    const remaining=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).filter(d=>!ids.includes(d.id));
    const addSel=remaining.length?`<select id="ovrigtAddDoc_${n.id}" style="font-size:10px;padding:1px 4px;border-radius:6px;border:1px solid var(--border);background:var(--bg1);color:var(--text1);height:22px"><option value="">+ Läkare…</option>${remaining.map(d=>`<option value="${d.id}">${docShortName(d)}</option>`).join('')}</select><button class="btn sm" onclick="addOvrigtNoteDoc('${n.id}')" style="padding:0 7px;height:22px;font-size:11px">+</button>`:'';
    return `<div style="padding:5px 8px;background:var(--bg2);border-radius:6px;margin-bottom:5px">
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px">
        <span style="flex:1;font-size:12px;font-weight:500">${n.text}</span>
        ${blockTag}
        <button class="btn sm" onclick="openOvrigtCopy('${n.id}')" title="Kopiera till annan dag" style="padding:0 6px;font-size:11px">📋</button>
        <button class="btn sm danger" onclick="removeOvrigtNote('${n.id}')">×</button>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${docTags}${addSel}</div>
    </div>`;
  }).join('');
}
let _ovrigtCopySource=null;
function openOvrigtCopy(noteId){
  const ds=document.getElementById('ovrigtDs').value;
  const note=(ovrigtNotes[ds]||[]).find(n=>n.id===noteId);if(!note)return;
  _ovrigtCopySource={noteId,ds};
  // Populate modal
  const d=new Date(ds+'T12:00:00');
  document.getElementById('copyOvrigtDesc').innerHTML=
    `<strong>${note.text}</strong> <span style="color:var(--text3)">${svDay(d)} ${d.getDate()} ${svMonth(d)}</span>`;
  // Default range: day after source → source + 4 weeks
  document.getElementById('copyOvrigtFrom').value=isoDate(addDays(new Date(ds+'T12:00:00'),1));
  document.getElementById('copyOvrigtTo').value=isoDate(addDays(new Date(ds+'T12:00:00'),28));
  // Default weekday = same as source
  const srcDow=d.getDay();
  document.querySelectorAll('.copyOvrigtDow').forEach(cb=>{cb.checked=parseInt(cb.value)===srcDow;});
  updateOvrigtCopyPreview();
  openModal('copyOvrigtModal');
}
function _ovrigtCopyTargets(){
  if(!_ovrigtCopySource)return[];
  const from=document.getElementById('copyOvrigtFrom').value;
  const to=document.getElementById('copyOvrigtTo').value;
  if(!from||!to||from>to)return[];
  const dows=new Set([...document.querySelectorAll('.copyOvrigtDow:checked')].map(cb=>parseInt(cb.value)));
  if(!dows.size)return[];
  const targets=[];
  let cur=new Date(from+'T12:00:00');
  const end=new Date(to+'T12:00:00');
  while(cur<=end){
    if(dows.has(cur.getDay())){const cds=isoDate(cur);if(cds!==_ovrigtCopySource.ds)targets.push(cds);}
    cur=addDays(cur,1);
  }
  return targets;
}
function updateOvrigtCopyPreview(){
  const n=_ovrigtCopyTargets().length;
  const el=document.getElementById('copyOvrigtPreview');
  if(el)el.textContent=n>0?`${n} dag${n>1?'ar':''} kommer att kopieras`:n===0?'Inga dagar matchar':'';
}
function confirmOvrigtCopy(){
  if(!_ovrigtCopySource)return;
  const{noteId,ds}=_ovrigtCopySource;
  const note=(ovrigtNotes[ds]||[]).find(n=>n.id===noteId);if(!note)return;
  const targets=_ovrigtCopyTargets();
  if(!targets.length){showToast('Inga dagar matchar — kontrollera intervall och veckodagar');return;}
  targets.forEach(tds=>{
    if(!ovrigtNotes[tds])ovrigtNotes[tds]=[];
    if(ovrigtNotes[tds].some(n=>n.text===note.text))return; // skip duplicates
    ovrigtNotes[tds].push({id:`ovr_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,text:note.text,blocks:note.blocks,docIds:[...(note.docIds||[])]});
  });
  logChange(`Kopierade Övrigt "${note.text}" till ${targets.length} dag${targets.length>1?'ar':''}`);
  autoSave();render();
  closeModal('copyOvrigtModal');
  showToast(`✓ Kopierat till ${targets.length} dag${targets.length>1?'ar':''}`);
}
function removeOvrigtNoteDoc(noteId,docId){
  const ds=document.getElementById('ovrigtDs').value;
  const note=(ovrigtNotes[ds]||[]).find(n=>n.id===noteId);if(!note)return;
  if(note.docIds)note.docIds=note.docIds.filter(id=>id!==docId);
  if(note.docId===docId)delete note.docId;
  renderOvrigtList();autoSave();render();
}
function addOvrigtNoteDoc(noteId){
  const ds=document.getElementById('ovrigtDs').value;
  const sel=document.getElementById('ovrigtAddDoc_'+noteId);if(!sel||!sel.value)return;
  const note=(ovrigtNotes[ds]||[]).find(n=>n.id===noteId);if(!note)return;
  if(!note.docIds)note.docIds=[];
  if(!note.docIds.includes(sel.value))note.docIds.push(sel.value);
  renderOvrigtList();autoSave();render();
}
function addOvrigtNote(){
  const ds=document.getElementById('ovrigtDs').value;
  const text=document.getElementById('ovrigtInput').value.trim();
  if(!text)return;
  const blocks=document.getElementById('ovrigtBlocks').value||null;
  const docIds=[..._ovrigtSelDocIds];
  if(!ovrigtNotes[ds])ovrigtNotes[ds]=[];
  ovrigtNotes[ds].push({id:`ovr_${Date.now()}`,text,blocks:docIds.length?blocks:null,docIds});
  document.getElementById('ovrigtInput').value='';
  document.getElementById('ovrigtBlocks').value='';
  _ovrigtSelDocIds=[];
  _renderOvrigtDocChips();
  _populateOvrigtDocDropdown();
  renderOvrigtList();autoSave();render();
}
function removeOvrigtNote(id){
  const ds=document.getElementById('ovrigtDs').value;
  if(ovrigtNotes[ds])ovrigtNotes[ds]=ovrigtNotes[ds].filter(n=>n.id!==id);
  renderOvrigtList();autoSave();render();
}

// ── Återkommande övrigt ──────────────────────────
let _ovrigtRecSelDocIds=[];
function _renderOvrigtRecDocChips(){
  const el=document.getElementById('ovrigtRecDocChips');
  if(!el)return;
  if(!_ovrigtRecSelDocIds.length){el.innerHTML='<span style="font-size:11px;color:var(--text3)">Inga läkare valda</span>';return;}
  el.innerHTML=_ovrigtRecSelDocIds.map(id=>{
    const doc=docById(id);
    return`<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;background:var(--accent-light,#e0f2fe);font-size:11px;font-weight:600;color:var(--accent)">${doc?docShortName(doc):id}<button onclick="removeOvrigtRecDocChip('${id}')" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;font-size:13px;color:var(--accent);opacity:.7">×</button></span>`;
  }).join('');
}
function _populateOvrigtRecDocDropdown(){
  const sel=document.getElementById('ovrigtRecDocSelect');
  if(!sel)return;
  sel.innerHTML='<option value="">+ Lägg till läkare...</option>';
  [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
    if(_ovrigtRecSelDocIds.includes(doc.id))return;
    const o=document.createElement('option');o.value=doc.id;o.textContent=docShortName(doc);sel.appendChild(o);
  });
  sel.value='';
}
function addOvrigtRecDocChip(){
  const sel=document.getElementById('ovrigtRecDocSelect');
  const id=sel.value;
  if(!id||_ovrigtRecSelDocIds.includes(id))return;
  _ovrigtRecSelDocIds.push(id);
  _renderOvrigtRecDocChips();
  _populateOvrigtRecDocDropdown();
}
function removeOvrigtRecDocChip(id){
  _ovrigtRecSelDocIds=_ovrigtRecSelDocIds.filter(x=>x!==id);
  _renderOvrigtRecDocChips();
  _populateOvrigtRecDocDropdown();
}
function renderOvrigtRecurringList(){
  const el=document.getElementById('ovrigtRecurringList');
  if(!el)return;
  const recLabels={weekly:'Varje vecka',biweekly:'Varannan vecka',quadweekly:'Var 4:e vecka',monthly:'Månadsvis'};
  const blockLabels={fm:'FM',em:'EM',hel:'Hela dagen'};
  const svDows=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  if(!ovrigtRecurring.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga återkommande aktiviteter</div>';return;}
  el.innerHTML=ovrigtRecurring.map(r=>{
    const ids=r.docIds||[];
    const blockTag=r.blocks&&ids.length?`<span style="font-size:9px;font-weight:700;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:3px">${blockLabels[r.blocks]||'Hela dagen'}</span>`:'';
    const recBadge=`<span style="font-size:9px;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:1px 6px;border-radius:3px">🔁 ${recLabels[r.recurrence]||r.recurrence}</span>`;
    const dowLabel=r.startDate?svDows[new Date(r.startDate+'T12:00:00').getDay()]:'';
    const startLabel=r.startDate?`<span style="font-size:10px;color:var(--text3)">${dowLabel} fr.o.m. ${r.startDate}</span>`:'';
    const docTags=ids.map(id=>{const doc=docById(id);return doc?`<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:10px;background:var(--accent-light,#e0f2fe);font-size:10px;font-weight:600;color:var(--accent)">${docShortName(doc)}<button onclick="removeOvrigtRecurringDoc('${r.id}','${id}')" style="background:none;border:none;cursor:pointer;padding:0;line-height:1;font-size:12px;color:var(--accent);opacity:.7" title="Ta bort">×</button></span>`:''}).join('');
    const remaining=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).filter(d=>!ids.includes(d.id));
    const addSel=remaining.length?`<select id="ovrigtRecAddDoc_${r.id}" style="font-size:10px;padding:1px 4px;border-radius:6px;border:1px solid var(--border);background:var(--bg1);color:var(--text1);height:22px"><option value="">+ Läkare…</option>${remaining.map(d=>`<option value="${d.id}">${docShortName(d)}</option>`).join('')}</select><button class="btn sm" onclick="addOvrigtRecurringDoc('${r.id}')" style="padding:0 7px;height:22px;font-size:11px">+</button>`:'';
    return`<div style="padding:5px 8px;background:var(--bg2);border-radius:6px;margin-bottom:5px;border-left:3px solid #3b82f6">
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px">
        <span style="flex:1;font-size:12px;font-weight:500">${r.text}</span>
        ${recBadge}${blockTag}
        <button class="btn sm danger" onclick="removeOvrigtRecurring('${r.id}')">×</button>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${docTags}${addSel}${startLabel}</div>
    </div>`;
  }).join('');
}
function addOvrigtRecurring(){
  const ds=document.getElementById('ovrigtDs').value;
  const text=document.getElementById('ovrigtRecInput').value.trim();
  if(!text)return;
  const blocks=document.getElementById('ovrigtRecBlocks').value||null;
  const startDate=document.getElementById('ovrigtRecStart').value||ds;
  const recurrence=document.getElementById('ovrigtRecurrence').value||'weekly';
  const docIds=[..._ovrigtRecSelDocIds];
  ovrigtRecurring.push({id:`rec_${Date.now()}`,text,blocks:docIds.length?blocks:null,docIds,startDate,recurrence});
  document.getElementById('ovrigtRecInput').value='';
  document.getElementById('ovrigtRecBlocks').value='';
  _ovrigtRecSelDocIds=[];
  _renderOvrigtRecDocChips();
  _populateOvrigtRecDocDropdown();
  renderOvrigtRecurringList();autoSave();render();
}
function removeOvrigtRecurring(id){
  ovrigtRecurring=ovrigtRecurring.filter(r=>r.id!==id);
  renderOvrigtRecurringList();autoSave();render();
}
function removeOvrigtRecurringDoc(recId,docId){
  const r=ovrigtRecurring.find(x=>x.id===recId);if(!r)return;
  if(r.docIds)r.docIds=r.docIds.filter(id=>id!==docId);
  renderOvrigtRecurringList();autoSave();render();
}
function addOvrigtRecurringDoc(recId){
  const sel=document.getElementById('ovrigtRecAddDoc_'+recId);if(!sel||!sel.value)return;
  const r=ovrigtRecurring.find(x=>x.id===recId);if(!r)return;
  if(!r.docIds)r.docIds=[];
  if(!r.docIds.includes(sel.value))r.docIds.push(sel.value);
  renderOvrigtRecurringList();autoSave();render();
}


// ═══════════════════════════════════════════════
// SJUKSKRIVNING / VAB
// ═══════════════════════════════════════════════
let _sjukDs=null;
function openSjukskrivningModal(ds){
  _sjukDs=ds;
  const dt=new Date(ds+'T12:00:00');
  const dayNames=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  const svMonths=['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  document.getElementById('sjukTitle').textContent=`${dayNames[dt.getDay()]} ${dt.getDate()} ${svMonths[dt.getMonth()]}`;
  renderSjukList();
  openModal('sjukskrivningModal');
}
function renderSjukList(){
  const entries=sjukskrivning[_sjukDs]||[];
  const el=document.getElementById('sjukList');
  const typeLabel={sjuk:'Sjuk',vab:'VAB'};
  const typeColor={sjuk:'var(--sjuk)',vab:'var(--vab)'};
  const typeBg={sjuk:'var(--sjuk-light)',vab:'var(--vab-light)'};
  if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga inlagda</div>';}
  else{el.innerHTML=entries.map(e=>{
    const doc=docById(e.docId);if(!doc)return'';
    const t=e.type||'sjuk';
    return`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 6px;border-radius:6px;background:${typeBg[t]};border:1px solid ${typeColor[t]}44">
      <div class="savatar" style="width:18px;height:18px;font-size:8px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div>
      <span style="flex:1;font-size:12px;font-weight:600">${docShortName(doc)}</span>
      <span style="font-size:10px;font-weight:700;color:${typeColor[t]};background:${typeBg[t]};padding:1px 5px;border-radius:3px">${typeLabel[t]}</span>
      <button onclick="removeSjukEntry('${e.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 2px;line-height:1">×</button>
    </div>`;
  }).join('');}
  // populate dropdown: exclude already added
  const added=entries.map(e=>e.docId);
  const sel=document.getElementById('sjukDocSel');
  sel.innerHTML=`<option value="">+ Lägg till läkare...</option>`+
    [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'))
      .filter(d=>!added.includes(d.id))
      .map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
}
function addSjukEntry(){
  const docId=document.getElementById('sjukDocSel').value;
  const type=document.getElementById('sjukTypeSel').value||'sjuk';
  if(!docId)return;
  if(!sjukskrivning[_sjukDs])sjukskrivning[_sjukDs]=[];
  sjukskrivning[_sjukDs].push({id:'sjuk_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),docId,type});
  const doc=docById(docId);
  logChange(`${type==='vab'?'VAB':'Sjukskrivning'}: ${doc?docShortName(doc):docId} (${_sjukDs})`);
  document.getElementById('sjukDocSel').value='';
  renderSjukList();autoSave();render();
}
function removeSjukEntry(id){
  const e=(sjukskrivning[_sjukDs]||[]).find(x=>x.id===id);
  if(sjukskrivning[_sjukDs])sjukskrivning[_sjukDs]=sjukskrivning[_sjukDs].filter(e=>e.id!==id);
  if(e){const doc=docById(e.docId);logChange(`Tog bort ${e.type==='vab'?'VAB':'sjukskrivning'}: ${doc?docShortName(doc):e.docId} (${_sjukDs})`);}
  renderSjukList();autoSave();render();
}

// ═══════════════════════════════════════════════
// FÖRÄLDRALEDIG (FL)
// ═══════════════════════════════════════════════
let _flDs=null;
function openFlModal(ds){
  _flDs=ds;
  const dt=new Date(ds+'T12:00:00');
  const dayNames=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  const svMonths=['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  document.getElementById('flTitle').textContent=`${dayNames[dt.getDay()]} ${dt.getDate()} ${svMonths[dt.getMonth()]}`;
  renderFlList();
  openModal('flModal');
}
function renderFlList(){
  const entries=foraldraledig[_flDs]||[];
  const el=document.getElementById('flList');
  if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga inlagda</div>';}
  else{el.innerHTML=entries.map(e=>{
    const doc=docById(e.docId);if(!doc)return'';
    return`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 6px;border-radius:6px;background:var(--fl-light);border:1px solid var(--fl)44">
      <div class="savatar" style="width:18px;height:18px;font-size:8px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div>
      <span style="flex:1;font-size:12px;font-weight:600">${docShortName(doc)}</span>
      <span style="font-size:10px;font-weight:700;color:var(--fl);background:var(--fl-light);padding:1px 5px;border-radius:3px">FL</span>
      <button onclick="removeFlEntry('${e.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 2px;line-height:1">×</button>
    </div>`;
  }).join('');}
  const added=entries.map(e=>e.docId);
  const sel=document.getElementById('flDocSel');
  sel.innerHTML=`<option value="">+ Lägg till läkare...</option>`+
    [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'))
      .filter(d=>!added.includes(d.id))
      .map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
}
function addFlEntry(){
  const docId=document.getElementById('flDocSel').value;
  if(!docId)return;
  if(!foraldraledig[_flDs])foraldraledig[_flDs]=[];
  foraldraledig[_flDs].push({id:'fl_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),docId});
  const doc=docById(docId);
  logChange(`Föräldraledig: ${doc?docShortName(doc):docId} (${_flDs})`);
  document.getElementById('flDocSel').value='';
  renderFlList();autoSave();render();
}
function removeFlEntry(id){
  const e=(foraldraledig[_flDs]||[]).find(x=>x.id===id);
  if(foraldraledig[_flDs])foraldraledig[_flDs]=foraldraledig[_flDs].filter(e=>e.id!==id);
  if(e){const doc=docById(e.docId);logChange(`Tog bort föräldraledig: ${doc?docShortName(doc):e.docId} (${_flDs})`);}
  renderFlList();autoSave();render();
}

let _jvOverrideDs=null,_jvOverrideKey=null,_jvOverrideType=null,_jvOverrideJvType=null;
function openJVOverrideModal(ds,jvType,overrideKey){
  _jvOverrideDs=ds;_jvOverrideKey=overrideKey;_jvOverrideJvType=jvType;
  const isNight=overrideKey.endsWith('_night');
  const isDay=overrideKey.endsWith('_day');
  const dt=new Date(ds+'T12:00:00');
  const dayNames=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  const dateStr=`${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth()+1}`;
  const typeLabel=isNight?'natt':'dag (helgjour)';
  document.getElementById('jvOverrideTitle').textContent=`Byt jourhavande — ${jvType==='NLO'?'NLÖ':jvType}`;
  document.getElementById('jvOverrideSub').textContent=`${dateStr} · ${typeLabel}`;
  // Get current effective doc
  const shiftType=isNight?'night':'day';
  const curId=getEffectiveJVDoc(ds,jvType,shiftType);
  const curIsOverride=!!getJVOverride(ds,overrideKey);
  // All doctors available (ÖL can also be placed manually)
  const sel=document.getElementById('jvOverrideSel');
  sel.innerHTML=`<option value="">— Välj läkare —</option>`+
    doctors.map(doc=>`<option value="${doc.id}"${doc.id===curId?' selected':''}>${doc.name}${curIsOverride&&doc.id===curId?' (manuell)':!curIsOverride&&doc.id===curId?' (JV-schema)':''}</option>`).join('');
  openModal('jvOverrideModal');
}
function confirmJVOverride(){
  const docId=document.getElementById('jvOverrideSel').value;
  if(!docId)return;
  setJVOverride(_jvOverrideDs,_jvOverrideKey,docId);
  autoSave();render();closeModal('jvOverrideModal');
  showToast('Jourhavande uppdaterad');
}
function clearJVOverride(){
  setJVOverride(_jvOverrideDs,_jvOverrideKey,null);
  autoSave();render();closeModal('jvOverrideModal');
  showToast('Återställd till JV-schema');
}

// ═══════════════════════════════════════════════
// ÖNSKEPASS
// ═══════════════════════════════════════════════
let _opMonth=0, _opYear=0;
let _opTab='pass'; // 'pass'|'jourvecka'|'ledighet'|'utbildning'|'admin'|'fl'
let _opJVMonth=new Date().getMonth(),_opJVYear=new Date().getFullYear();
let _opWishCalMonth=new Date().getMonth(),_opWishCalYear=new Date().getFullYear();
function switchOpTab(tab){
  _opTab=tab;
  ['pass','jourvecka','ledighet','utbildning','admin','fl'].forEach(t=>{
    const btn=document.getElementById('opTab_'+t);
    const panel=document.getElementById('opPanel_'+t);
    if(btn)btn.classList.toggle('active',t===tab);
    if(panel)panel.style.display=t===tab?'':'none';
  });
  if(tab==='pass')renderOpCal();
  else if(tab==='jourvecka')renderOpJVCal();
  else if(tab==='ledighet')renderOpLedighetJourfriPanel();
  else if(tab==='utbildning')_renderOpWishCal('utbildning');
  else if(tab==='fl')_renderOpWishCal('fl');
  else if(tab==='admin')_renderOpWishCal('admin');
}
function openOnskadPassModal(){
  const sel=document.getElementById('opDocSelect');
  const sorted=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  sel.innerHTML=sorted.map(d=>`<option value="${d.id}">${d.name}</option>`).join('');
  // Doctor mode: lock to active doctor
  if(IS_DOCTOR_MODE&&ACTIVE_DOCTOR_ID){
    sel.value=ACTIVE_DOCTOR_ID;
    sel.disabled=true;
    sel.style.display='none';
    const lbl=document.getElementById('opDocLabel');
    if(lbl){
      const doc=docById(ACTIVE_DOCTOR_ID);
      lbl.textContent=doc?doc.name:'';
      lbl.style.display='block';
    }
  } else {
    sel.disabled=false;
    sel.style.display='';
    const lbl=document.getElementById('opDocLabel');
    if(lbl)lbl.style.display='none';
  }
  // Update modal title
  const titleEl=document.getElementById('opModalTitle');
  if(titleEl)titleEl.textContent=IS_DOCTOR_MODE?'📋 Mina önskemål':'⭐ Önskemål';
  const posSel=document.getElementById('opPosSelect');
  posSel.innerHTML=`<option value="">Valfri position</option>`+
    positions.filter(p=>p.id!=='pos_dagvard').map(p=>`<option value="${p.id}">${p.name}${p.slots.length>1?' ('+p.slots.length+' platser)':''}</option>`).join('');
  _opMonth=getMonday(currentDate).getMonth();_opYear=getMonday(currentDate).getFullYear();
  _opJVMonth=getMonday(currentDate).getMonth();_opJVYear=getMonday(currentDate).getFullYear();
  _opWishCalMonth=getMonday(currentDate).getMonth();_opWishCalYear=getMonday(currentDate).getFullYear();
  _opTab='pass';
  switchOpTab('pass');
  openModal('onskadPassModal');
}
function opMonth(dir){
  _opMonth+=dir;if(_opMonth>11){_opMonth=0;_opYear++;}if(_opMonth<0){_opMonth=11;_opYear--;}
  renderOpCal();
}
function renderOpCal(){
  const docId=document.getElementById('opDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('opMonthLabel').textContent=`${months[_opMonth]} ${_opYear}`;
  const first=new Date(_opYear,_opMonth,1);
  const last=new Date(_opYear,_opMonth+1,0);
  const startMon=getMonday(first);
  let html=`<div style="display:grid;grid-template-columns:36px repeat(7,1fr);gap:2px;margin-bottom:4px">
    <div></div>`;
  ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center;padding:2px">${d}</div>`);
  html+='</div>';
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===_opMonth){
    const wn=weekNum(cur);
    html+=`<div style="display:grid;grid-template-columns:36px repeat(7,1fr);gap:2px;margin-bottom:2px">
      <div style="font-size:9px;color:var(--text3);padding:3px 0;display:flex;align-items:center">v${wn}</div>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===_opMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      const hasOp=!!(onskadPass[docId]&&onskadPass[docId][ds]);
      const op=hasOp?onskadPass[docId][ds]:null;
      const posName=op&&op.posId?positions.find(p=>p.id===op.posId)?.name:'';
      const cls=`cal-day${isWe?' cal-we':''}${hasOp?' cal-op':''}${!inMonth?' cal-other':''}`;
      html+=`<div class="${cls}" onclick="toggleOnskadPass('${docId}','${ds}')" title="${hasOp?'Önskad: '+(posName||'valfri position'):'Klicka för att önska detta datum'}">${dt.getDate()}${hasOp?'★':''}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==_opMonth&&cur>last)break;
  }
  document.getElementById('opCalContainer').innerHTML=html;
  renderOpList(docId);
}
function toggleOnskadPass(docId,ds){
  if(!onskadPass[docId])onskadPass[docId]={};
  if(onskadPass[docId][ds]){delete onskadPass[docId][ds];}
  else{
    const posId=document.getElementById('opPosSelect').value||null;
    const note=document.getElementById('opNote').value.trim()||null;
    onskadPass[docId][ds]={posId,note};
  }
  renderOpCal();autoSave();render();
}
function renderOpList(docId){
  const el=document.getElementById('opList');
  const entries=Object.entries(onskadPass[docId]||{}).sort(([a],[b])=>a.localeCompare(b));
  if(!entries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga önskade pass</div>';return;}
  el.innerHTML=entries.map(([ds,op])=>{
    const dt=new Date(ds+'T12:00:00');
    const pos=op.posId?positions.find(p=>p.id===op.posId):null;
    const dateStr=`${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}`;
    return`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text3);white-space:nowrap">${dateStr}</span>
      <span style="font-size:11px;font-weight:600;flex:1">${pos?pos.name:'Valfri position'}</span>
      ${op.note?`<span style="font-size:10px;color:var(--text3)">${op.note}</span>`:''}
      <button onclick="removeOnskadPass('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">×</button>
    </div>`;
  }).join('');
}
function removeOnskadPass(docId,ds){
  if(onskadPass[docId])delete onskadPass[docId][ds];
  renderOpCal();autoSave();render();
}
function opDocChanged(){
  if(_opTab==='pass')renderOpCal();
  else if(_opTab==='jourvecka')renderOpJVCal();
  else if(_opTab==='ledighet')renderOpLedighetJourfriPanel();
  else if(_opTab==='utbildning')_renderOpWishCal('utbildning');
  else if(_opTab==='fl')_renderOpWishCal('fl');
  else if(_opTab==='admin')_renderOpWishCal('admin');
}

// ── JOURVECKA ÖNSKAN ──
function opJVMonth(dir){
  _opJVMonth+=dir;if(_opJVMonth>11){_opJVMonth=0;_opJVYear++;}if(_opJVMonth<0){_opJVMonth=11;_opJVYear--;}
  renderOpJVCal();
}
function _pjColor(r){return r==='JV1'?'var(--jv1)':r==='JV2'?'var(--jv2)':r==='NLO'?'var(--nlo)':'var(--text3)';}
function _pjBg(r){return r==='JV1'?'var(--jv1-light)':r==='JV2'?'var(--jv2-light)':r==='NLO'?'var(--nlo-light)':'var(--bg2)';}
function _pjLabel(r){return r==='NLO'?'NLÖ':r||'—';}
function _bjColor(r){return r==='BJFS'?'var(--bjfs)':r==='BJLO'?'var(--bjlo)':'var(--text3)';}
function _bjBg(r){return r==='BJFS'?'var(--bjfs-light)':r==='BJLO'?'var(--bjlo-light)':'var(--bg2)';}
function _bjLabel(r){return r==='BJLO'?'BJLÖ':r||'—';}
function renderOpJVCal(){
  const docId=document.getElementById('opDocSelect').value;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('opJVMonthLabel').textContent=`${months[_opJVMonth]} ${_opJVYear}`;
  const first=new Date(_opJVYear,_opJVMonth,1);
  const last=new Date(_opJVYear,_opJVMonth+1,0);
  const startMon=getMonday(first);
  const pjWished=onskadJourvecka[docId]||{};
  const bjWished=onskadBJ[docId]||{};
  let pjHtml='',bjHtml='';
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===_opJVMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const wk=wkey(wn,yr);
    const inMonth=cur.getMonth()===_opJVMonth||addDays(cur,6).getMonth()===_opJVMonth;
    if(inMonth){
      const pjRole=pjWished[wk]||null;
      const bjRole=bjWished[wk]||null;
      const fri=addDays(cur,4),sun=addDays(cur,6);
      const svM=['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
      const monFri=`${cur.getDate()} ${svM[cur.getMonth()]} – ${fri.getDate()} ${svM[fri.getMonth()]}`;
      const friSun=`${fri.getDate()} ${svM[fri.getMonth()]} – ${sun.getDate()} ${svM[sun.getMonth()]}`;
      pjHtml+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;margin-bottom:3px;background:${_pjBg(pjRole)};border:1px solid ${pjRole?_pjColor(pjRole)+'44':'var(--border)'};cursor:pointer" onclick="toggleOnskadJourvecka('${docId}','${wk}')">
        <span style="font-size:11px;font-weight:700;color:var(--text3);min-width:28px">v${wn}</span>
        <span style="font-size:10px;color:var(--text2);flex:1">${monFri}</span>
        <span style="font-size:11px;font-weight:700;color:${_pjColor(pjRole)}">${_pjLabel(pjRole)}</span>
      </div>`;
      bjHtml+=`<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;margin-bottom:3px;background:${_bjBg(bjRole)};border:1px solid ${bjRole?_bjColor(bjRole)+'44':'var(--border)'};cursor:pointer" onclick="toggleOnskadBJ('${docId}','${wk}')">
        <span style="font-size:11px;font-weight:700;color:var(--text3);min-width:28px">v${wn}</span>
        <span style="font-size:10px;color:var(--text2);flex:1">${friSun}</span>
        <span style="font-size:11px;font-weight:700;color:${_bjColor(bjRole)}">${_bjLabel(bjRole)}</span>
      </div>`;
    }
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==_opJVMonth&&cur>last)break;
  }
  const empty='<div style="font-size:11px;color:var(--text3)">Inga veckor i månaden</div>';
  document.getElementById('opJVCalContainer').innerHTML=pjHtml||empty;
  document.getElementById('opBJCalContainer').innerHTML=bjHtml||empty;
  renderOpJVList(docId);
}
function _weekRangeStr(mon){
  const fri=new Date(mon);fri.setDate(fri.getDate()+4);
  const svM=['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
  return`${mon.getDate()} ${svM[mon.getMonth()]} – ${fri.getDate()} ${svM[fri.getMonth()]}`;
}
function renderOpJVList(docId){
  const el=document.getElementById('opJVList');
  const pjEntries=Object.entries(onskadJourvecka[docId]||{}).sort(([a],[b])=>a.localeCompare(b));
  const bjEntries=Object.entries(onskadBJ[docId]||{}).sort(([a],[b])=>a.localeCompare(b));
  if(!pjEntries.length&&!bjEntries.length){el.innerHTML='<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga önskade PJ/BJ</div>';return;}
  const allEntries=[
    ...pjEntries.map(([wk,role])=>({wk,role,type:'pj'})),
    ...bjEntries.map(([wk,role])=>({wk,role,type:'bj'}))
  ].sort((a,b)=>a.wk.localeCompare(b.wk));
  el.innerHTML=allEntries.map(({wk,role,type})=>{
    const p=wk.split('-W');
    const col=type==='pj'?_pjColor(role):_bjColor(role);
    const lbl=type==='pj'?_pjLabel(role):_bjLabel(role);
    const rmFn=type==='pj'?`removeOnskadJourvecka`:`removeOnskadBJ`;
    return`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text3)">v${p[1]} ${p[0]}</span>
      <span style="font-size:11px;font-weight:700;color:${col};flex:1">${lbl}</span>
      <button onclick="${rmFn}('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">×</button>
    </div>`;
  }).join('');
}
function removeOnskadJourvecka(docId,wk){
  if(onskadJourvecka[docId])delete onskadJourvecka[docId][wk];
  renderOpJVCal();autoSave();
}
function removeOnskadBJ(docId,wk){
  if(onskadBJ[docId])delete onskadBJ[docId][wk];
  renderOpJVCal();autoSave();
}

// ── LEDIGHET & JOURFRI TAB I ÖNSKEPASS ──
// ── ÖNSKEMÅL: LEDIGHET ──
function _ledOnskemalEntryHtml(docId,ds,isVecka,wk){
  const dt=new Date(ds+'T12:00:00');
  const lbl=isVecka?`Vecka ${wk.split('-W')[1]} ${wk.split('-W')[0]} (hel vecka)`:`${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}`;
  const acceptFn=isVecka?`approveLedighetVeckaOnskemal('${docId}','${wk}')`:`approveLedighetDagOnskemal('${docId}','${ds}')`;
  const rejectFn=isVecka?`rejectLedighetVeckaOnskemal('${docId}','${wk}')`:`rejectLedighetDagOnskemal('${docId}','${ds}')`;
  return`<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:#fefce8;border:1px solid #fde047;border-radius:6px;margin-bottom:3px">
    <span style="font-size:11px;flex:1;color:var(--text1)">📅 ${lbl}</span>
    <button onclick="${acceptFn}" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓ Acceptera</button>
    <button onclick="${rejectFn}" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--border);background:var(--bg2);color:var(--text3);cursor:pointer">✕</button>
  </div>`;
}
// ── GEMENSAM KALENDER-PICKER FÖR LEDIGHET / UTBILDNING / FL ──
function opWishCalNav(dir,type){
  _opWishCalMonth+=dir;
  if(_opWishCalMonth>11){_opWishCalMonth=0;_opWishCalYear++;}
  if(_opWishCalMonth<0){_opWishCalMonth=11;_opWishCalYear--;}
  if(type==='ledighet')renderOpLedighetJourfriPanel();
  else _renderOpWishCal(type);
}
function renderOpLedighetJourfriPanel(){
  _renderOpLedigJourCal();
}
function _ledigJourDayState(docId,ds){
  if(ledighetOnskemal[docId]&&ledighetOnskemal[docId][ds])return 'ledig';
  if(jourfriOnskemalDag[docId]&&jourfriOnskemalDag[docId][ds])return 'jourfri';
  return null;
}
function _ledigJourWeekState(docId,wn,yr){
  const wk=wkey(wn,yr);
  if(ledighetVeckorOnskemal[docId]&&ledighetVeckorOnskemal[docId][wk])return 'ledig';
  if(jourfriOnskemal[docId]&&jourfriOnskemal[docId][wk])return 'jourfri';
  return null;
}
function toggleLedigJourWeek(docId,wn,yr){
  const wk=wkey(wn,yr);
  const note=document.getElementById('opWishNote_ledjour')?.value?.trim()||null;
  const cur=_ledigJourWeekState(docId,wn,yr);
  if(cur==='ledig'){
    // ledig → jourfri hel vecka
    delete ledighetVeckorOnskemal[docId][wk];
    if(!jourfriOnskemal[docId])jourfriOnskemal[docId]={};
    jourfriOnskemal[docId][wk]={scope:'week',note:note||null};
  } else if(cur==='jourfri'){
    // jourfri → ingen
    delete jourfriOnskemal[docId][wk];
  } else {
    // ingen → ledig vecka
    if(!ledighetVeckorOnskemal[docId])ledighetVeckorOnskemal[docId]={};
    ledighetVeckorOnskemal[docId][wk]=note?{note}:true;
    const mon=isoWeekMon(wn,yr);
    if(ledighetOnskemal[docId]){for(let i=0;i<5;i++)delete ledighetOnskemal[docId][isoDate(addDays(mon,i))];}
  }
  autoSave();renderOpLedighetJourfriPanel();render();
}
function toggleLedigJourDay(docId,ds){
  const note=document.getElementById('opWishNote_ledjour')?.value?.trim()||null;
  const val=note?{note}:true;
  const cur=_ledigJourDayState(docId,ds);
  const dow=new Date(ds+'T12:00:00').getDay();
  const isWe=dow===0||dow===6;
  if(isWe){
    // Helgdag: ingen → jourfri → ingen
    if(cur==='jourfri'){if(jourfriOnskemalDag[docId])delete jourfriOnskemalDag[docId][ds];}
    else{if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};jourfriOnskemalDag[docId][ds]=val;}
  } else {
    // Vardag: ingen → ledig → jourfri → ingen
    if(cur==='ledig'){
      if(ledighetOnskemal[docId])delete ledighetOnskemal[docId][ds];
      if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};
      jourfriOnskemalDag[docId][ds]=val;
    } else if(cur==='jourfri'){
      if(jourfriOnskemalDag[docId])delete jourfriOnskemalDag[docId][ds];
    } else {
      if(!ledighetOnskemal[docId])ledighetOnskemal[docId]={};
      ledighetOnskemal[docId][ds]=val;
    }
  }
  autoSave();renderOpLedighetJourfriPanel();render();
}
function _renderOpLedigJourCal(){
  const docId=document.getElementById('opDocSelect').value;
  const calEl=document.getElementById('opWishCalContainer_ledjour');
  if(!calEl||!docId)return;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  const lbl=document.getElementById('opWishMonthLabel_ledjour');
  if(lbl)lbl.textContent=`${months[_opWishCalMonth]} ${_opWishCalYear}`;
  const first=new Date(_opWishCalYear,_opWishCalMonth,1);
  const last=new Date(_opWishCalYear,_opWishCalMonth+1,0);
  const startMon=getMonday(first);
  let html=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:3px"><div></div>`;
  ['M','T','O','T','F','L','S'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center">${d}</div>`);
  html+='</div>';
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===_opWishCalMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const weekState=_ledigJourWeekState(docId,wn,yr);
    const wkBg=weekState==='ledig'?'var(--accent-light)':weekState==='jourfri'?'#dde8f5':'transparent';
    const wkCol=weekState==='ledig'?'var(--accent)':weekState==='jourfri'?'var(--night)':'var(--text2)';
    const wkBrd=weekState==='ledig'?'var(--accent)':weekState==='jourfri'?'var(--night)':'var(--border)';
    const wkTitle=weekState==='ledig'?'Klicka → Jourfri hel vecka':weekState==='jourfri'?'Klicka → Ta bort':'Klicka → Ledig hel vecka';
    html+=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:2px">`;
    html+=`<div style="font-size:9px;color:${wkCol};text-align:center;padding:2px 0;cursor:pointer;font-weight:700;border-radius:3px;border:1px solid ${wkBrd};background:${wkBg}" onclick="toggleLedigJourWeek('${docId}',${wn},${yr})" title="${wkTitle}">v${wn}</div>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===_opWishCalMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      // Kontrollera godkänd status (skuggat, ej klickbart)
      const wkKey=wkey(weekNum(dt),weekYear(dt));
      const apprLedig=!isWe&&((ledighetRequests[docId]&&ledighetRequests[docId][ds])||(ledighetVeckor[docId]&&ledighetVeckor[docId][wkKey]));
      const jfwkEntry=jourfriOnskad[docId]&&jourfriOnskad[docId][wkKey];
      const apprJourfri=(jourfriOnskadDag[docId]&&jourfriOnskadDag[docId][ds])||(jfwkEntry&&(jfwkEntry.scope==='week'||(jfwkEntry.scope==='weekend'&&isWe)));
      // Veckotillstånd styr dagceller: ledig→mån-fre, jourfri→alla 7 dagar
      const state=(apprLedig||apprJourfri)?null:
                  (weekState==='ledig'&&!isWe)?'ledig':
                  weekState==='jourfri'?'jourfri':
                  _ledigJourDayState(docId,ds);
      let bg='transparent',col='inherit',brd='var(--border)';
      if(apprLedig){bg='var(--accent-light)';col='var(--accent)';brd='var(--accent)';}
      else if(apprJourfri){bg='#dde8f5';col='var(--night)';brd='var(--night)';}
      else if(state==='ledig'){bg='var(--accent)';col='#fff';brd='transparent';}
      else if(state==='jourfri'){bg='var(--night)';col='#fff';brd='transparent';}
      // Dagcell låst om godkänd, eller om veckan har en veckonivå-status
      const locked=apprLedig||apprJourfri||weekState!==null;
      const dim=!inMonth?'opacity:.3;':(!state&&!apprLedig&&!apprJourfri&&isWe?'opacity:.5;':'');
      const tooltip=apprLedig?'Godkänd ledighet':apprJourfri?'Godkänd jourfri':isWe?(state==='jourfri'?'Klicka → Ta bort':'Klicka → Jourfri'):(state==='ledig'?'Klicka → Jourfri':state==='jourfri'?'Klicka → Ta bort':'Klicka → Ledighet');
      const label=(apprLedig||apprJourfri)?`<span style="font-size:8px;display:block;line-height:1">✓</span>${dt.getDate()}`:dt.getDate();
      html+=`<div style="font-size:10px;text-align:center;padding:2px 1px;border-radius:4px;background:${bg};color:${col};${dim}cursor:${locked?'default':'pointer'};border:1px solid ${brd}" ${locked?`title="${tooltip}"`:` onclick="toggleLedigJourDay('${docId}','${ds}')" title="${tooltip}"`}>${label}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==_opWishCalMonth&&cur>last)break;
  }
  calEl.innerHTML=html;
  _renderCombinedLedigJourList(docId);
  renderStaffingBar('opStaffingContainer_ledjour',_opWishCalMonth,_opWishCalYear);
}
function _renderCombinedLedigJourList(docId){
  const el=document.getElementById('opWishList_ledjour');
  if(!el)return;
  const svs=(a,b)=>a.localeCompare(b,'sv');
  let rows=[];
  // Ledighet veckor
  Object.entries(ledighetVeckorOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([wk,v])=>{
    const p=wk.split('-W');const note=_wishEntryNote(v);const flex=_wishEntryFlexible(v);
    const flexLabel=flex==='both'?'±1v':flex==='forward'?'+1v':'';
    const flexColor=flex==='both'?'var(--accent)':flex==='forward'?'#0f766e':'var(--text3)';
    const flexBg=flex==='both'?'var(--accent-light)':flex==='forward'?'#ccfbf1':'transparent';
    const flexBorder=flex?flexColor:'var(--border)';
    const flexTitle=flex==='both'?'Flexibel ±1 vecka — klicka för +1v':flex==='forward'?'+1 vecka framåt — klicka för att ta bort':'Klicka för att markera som flexibel';
    const flexBadge=flex?`<span style="font-size:9px;font-weight:700;color:${flexColor};background:${flexBg};padding:1px 4px;border-radius:3px">${flexLabel}</span>`:'';
    const appWk=IS_DOCTOR_MODE?'':` <button onclick="approveLedighetVeckaOnskemal('${docId}','${wk}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button>`;
    rows.push({sort:wk,html:`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">📅 Vecka ${p[1]} ${p[0]} (hel vecka)${note?' — <em>'+note+'</em>':''} ${flexBadge}</span><button onclick="toggleLedighetVeckaFlexibel('${docId}','${wk}')" title="${flexTitle}" style="font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;border:1px solid ${flexBorder};background:${flexBg};color:${flexColor};cursor:pointer">${flexLabel||'±1v'}</button>${appWk}<button onclick="rejectLedighetVeckaOnskemal('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`});
  });
  // Ledighet dagar
  Object.entries(ledighetOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([ds,v])=>{
    const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
    const appDay=IS_DOCTOR_MODE?'':` <button onclick="approveLedighetDagOnskemal('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button>`;
    rows.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">📅 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span>${appDay}<button onclick="rejectLedighetDagOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`});
  });
  // Jourfri veckor
  Object.entries(jourfriOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([wk,v])=>{
    const p=wk.split('-W');
    const appJfwk=IS_DOCTOR_MODE?'':` <button onclick="approveJourfriOnskemal('${docId}','${wk}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button>`;
    rows.push({sort:wk,html:`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">🌙 Vecka ${p[1]} ${p[0]} (hel vecka inkl. helg)${v.note?' — <em>'+v.note+'</em>':''}</span>${appJfwk}<button onclick="rejectJourfriOnskemal('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`});
  });
  // Jourfri dagar
  Object.entries(jourfriOnskemalDag[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([ds,v])=>{
    const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
    const appJf=IS_DOCTOR_MODE?'':` <button onclick="approveJourfriDagOnskemal('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button>`;
    rows.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">🌙 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span>${appJf}<button onclick="rejectJourfriDagOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`});
  });
  rows.sort((a,b)=>a.sort.localeCompare(b.sort,'sv'));
  // ── GODKÄNT & SCHEMALAGT ──
  let approved=[];
  const svs2=(a,b)=>a.localeCompare(b,'sv');
  // Godkänd ledighet veckor
  Object.entries(ledighetVeckor[docId]||{}).sort(([a],[b])=>svs2(a,b)).forEach(([wk,v])=>{
    const p=wk.split('-W');
    const flex=_wishEntryFlexible(v);
    const flexLabel=flex==='both'?' <span style="font-size:9px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:3px">±1v</span>':flex==='forward'?' <span style="font-size:9px;color:#b45309;background:#fef3c7;padding:1px 5px;border-radius:3px">+1v</span>':'';
    const angra=IS_DOCTOR_MODE?'':` <button onclick="revokeLedighetVecka('${docId}','${wk}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Flytta tillbaka till önskemål">↩</button>`;
    approved.push({sort:wk,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:var(--accent)">✅ 📅 Vecka ${p[1]} ${p[0]}${flexLabel} — <em>ledighet godkänd</em></span>${angra}</div>`});
  });
  // Godkänd ledighet dagar
  Object.entries(ledighetRequests[docId]||{}).sort(([a],[b])=>svs2(a,b)).forEach(([ds])=>{
    const dt=new Date(ds+'T12:00:00');
    const angra=IS_DOCTOR_MODE?'':` <button onclick="revokeLedighetDag('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Flytta tillbaka till önskemål">↩</button>`;
    approved.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:var(--accent)">✅ 📅 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)} — <em>ledighet godkänd</em></span>${angra}</div>`});
  });
  // Godkänd jourfri dagar
  Object.entries(jourfriOnskadDag[docId]||{}).sort(([a],[b])=>svs2(a,b)).forEach(([ds,v])=>{
    const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
    const angra=IS_DOCTOR_MODE?'':` <button onclick="revokeJourfriDag('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Flytta tillbaka till önskemål">↩</button>`;
    approved.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:var(--night)">✅ 🌙 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''} — <em>jourfri godkänd</em></span>${angra}</div>`});
  });
  // Godkänd jourfri veckor
  Object.entries(jourfriOnskad[docId]||{}).sort(([a],[b])=>svs2(a,b)).forEach(([wk,v])=>{
    const p=wk.split('-W');
    const angra=IS_DOCTOR_MODE?'':` <button onclick="revokeJourfriVecka('${docId}','${wk}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Flytta tillbaka till önskemål">↩</button>`;
    approved.push({sort:wk,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:var(--night)">✅ 🌙 Vecka ${p[1]} ${p[0]} (${v.scope==='week'?'hel vecka':'helgen'}) — <em>jourfri godkänd</em></span>${angra}</div>`});
  });
  // Godkänd utbildning
  Object.entries(utbildningDagar[docId]||{}).sort(([a],[b])=>svs2(a,b)).forEach(([ds,v])=>{
    const dt=new Date(ds+'T12:00:00');const note=typeof v==='object'?v.note||'':'';
    const angra=IS_DOCTOR_MODE?'':` <button onclick="revokeUtbildning('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Flytta tillbaka till önskemål">↩</button>`;
    approved.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:var(--utb)">✅ 📚 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span>${angra}</div>`});
  });
  // Sjukskrivning & VAB
  Object.entries(sjukskrivning).forEach(([ds,arr])=>{(arr||[]).filter(e=>e.docId===docId).forEach(e=>{
    const dt=new Date(ds+'T12:00:00');
    approved.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:#c0392b">${e.type==='vab'?'👶':'🤒'} ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)} — <em>${e.type==='vab'?'VAB':'Sjuk'}</em></span></div>`});
  });});
  // Föräldraledig
  Object.entries(foraldraledig).forEach(([ds,arr])=>{(arr||[]).filter(e=>e.docId===docId).forEach(()=>{
    const dt=new Date(ds+'T12:00:00');
    approved.push({sort:ds,html:`<div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid var(--border)33"><span style="font-size:11px;flex:1;color:#7c3aed">👶 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)} — <em>Föräldraledig</em></span></div>`});
  });});
  approved.sort((a,b)=>a.sort.localeCompare(b.sort,'sv'));
  const wishHtml=rows.length?rows.map(r=>r.html).join(''):'<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga önskemål</div>';
  const apprHtml=approved.length?`<div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.05em;margin:10px 0 4px">GODKÄNT & SCHEMALAGT</div>`+approved.map(r=>r.html).join(''):'';
  el.innerHTML=wishHtml+apprHtml;
}
function _wishDaySelected(type,docId,ds){
  if(type==='ledighet')return !!(ledighetOnskemal[docId]&&ledighetOnskemal[docId][ds]);
  if(type==='utbildning')return !!(utbildningOnskemal[docId]&&utbildningOnskemal[docId][ds]);
  if(type==='fl')return !!(foraldraledigenOnskemal[docId]&&foraldraledigenOnskemal[docId][ds]);
  if(type==='jourfri')return !!(jourfriOnskemalDag[docId]&&jourfriOnskemalDag[docId][ds]);
  if(type==='admin')return !!(adminOnskemal[docId]&&adminOnskemal[docId][ds]);
  return false;
}
function _wishWeekSelected(type,docId,wn,yr){
  const wk=wkey(wn,yr);
  if(type==='ledighet')return !!(ledighetVeckorOnskemal[docId]&&ledighetVeckorOnskemal[docId][wk]);
  if(type==='jourfri')return !!(jourfriOnskemal[docId]&&jourfriOnskemal[docId][wk]);
  // utbildning/fl/admin: check all 5 weekdays
  const mon=isoWeekMon(wn,yr);
  return [0,1,2,3,4].every(i=>_wishDaySelected(type,docId,isoDate(addDays(mon,i))));
}
function _wishNote(type){
  const key=(type==='ledighet'||type==='jourfri')?'ledjour':type;
  return document.getElementById('opWishNote_'+key)?.value?.trim()||null;
}
function toggleWishDay(type,docId,ds){
  const note=_wishNote(type);
  const val=note?{note}:true;
  if(type==='ledighet'){
    if(!ledighetOnskemal[docId])ledighetOnskemal[docId]={};
    if(ledighetOnskemal[docId][ds])delete ledighetOnskemal[docId][ds];
    else ledighetOnskemal[docId][ds]=val;
  } else if(type==='utbildning'){
    if(!utbildningOnskemal[docId])utbildningOnskemal[docId]={};
    if(utbildningOnskemal[docId][ds])delete utbildningOnskemal[docId][ds];
    else utbildningOnskemal[docId][ds]=val;
  } else if(type==='fl'){
    if(!foraldraledigenOnskemal[docId])foraldraledigenOnskemal[docId]={};
    if(foraldraledigenOnskemal[docId][ds])delete foraldraledigenOnskemal[docId][ds];
    else foraldraledigenOnskemal[docId][ds]=val;
  } else if(type==='jourfri'){
    if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};
    if(jourfriOnskemalDag[docId][ds])delete jourfriOnskemalDag[docId][ds];
    else jourfriOnskemalDag[docId][ds]=val;
  } else if(type==='admin'){
    if(!adminOnskemal[docId])adminOnskemal[docId]={};
    if(adminOnskemal[docId][ds])delete adminOnskemal[docId][ds];
    else adminOnskemal[docId][ds]=val;
  }
  autoSave();
  if(type==='jourfri'||type==='ledighet')renderOpLedighetJourfriPanel();
  else _renderOpWishCal(type);
  render();
}
function toggleWishWeek(type,docId,wn,yr){
  const wk=wkey(wn,yr);
  const note=_wishNote(type);
  const val=note?{note}:true;
  const mon=isoWeekMon(wn,yr);
  if(type==='ledighet'){
    if(!ledighetVeckorOnskemal[docId])ledighetVeckorOnskemal[docId]={};
    if(ledighetVeckorOnskemal[docId][wk]){
      delete ledighetVeckorOnskemal[docId][wk];
    } else {
      ledighetVeckorOnskemal[docId][wk]=val;
      // Ta bort eventuella enskilda dagönskemål för vardagarna (ej helg)
      if(ledighetOnskemal[docId]){for(let i=0;i<5;i++)delete ledighetOnskemal[docId][isoDate(addDays(mon,i))];}
    }
  } else if(type==='jourfri'){
    if(!jourfriOnskemal[docId])jourfriOnskemal[docId]={};
    if(jourfriOnskemal[docId][wk])delete jourfriOnskemal[docId][wk];
    else jourfriOnskemal[docId][wk]={scope:'week',note:note||null};
  } else {
    // utbildning/fl/admin: toggle alla veckodagar
    const state=type==='utbildning'?utbildningOnskemal:type==='fl'?foraldraledigenOnskemal:adminOnskemal;
    if(!state[docId])state[docId]={};
    const allSel=[0,1,2,3,4].every(i=>!!state[docId][isoDate(addDays(mon,i))]);
    for(let i=0;i<5;i++){
      const ds=isoDate(addDays(mon,i));
      if(allSel)delete state[docId][ds];
      else state[docId][ds]=val;
    }
  }
  autoSave();
  if(type==='jourfri'||type==='ledighet')renderOpLedighetJourfriPanel();
  else _renderOpWishCal(type);
  render();
}
function _renderOpWishCal(type){
  const docId=document.getElementById('opDocSelect').value;
  const calEl=document.getElementById('opWishCalContainer_'+type);
  if(!calEl||!docId)return;
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  const lbl=document.getElementById('opWishMonthLabel_'+type);
  if(lbl)lbl.textContent=`${months[_opWishCalMonth]} ${_opWishCalYear}`;
  const first=new Date(_opWishCalYear,_opWishCalMonth,1);
  const last=new Date(_opWishCalYear,_opWishCalMonth+1,0);
  const startMon=getMonday(first);
  let html=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:3px"><div></div>`;
  ['M','T','O','T','F','L','S'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center">${d}</div>`);
  html+='</div>';
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===_opWishCalMonth){
    const wn=weekNum(cur),yr=weekYear(cur);
    const weekSel=_wishWeekSelected(type,docId,wn,yr);
    html+=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:2px">`;
    html+=`<div style="font-size:9px;color:${weekSel?'var(--accent)':'var(--text2)'};text-align:center;padding:2px 0;cursor:pointer;font-weight:700;border-radius:3px;border:1px solid ${weekSel?'var(--accent)':'var(--border)'};background:${weekSel?'var(--accent-light)':'transparent'}" onclick="toggleWishWeek('${type}','${docId}',${wn},${yr})" title="Klicka för att välja/avmarkera hela veckan">v${wn}</div>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===_opWishCalMonth;
      const isWe=dt.getDay()===0||dt.getDay()===6;
      const noClick=type==='utbildning'&&isWe;
      const sel=!noClick&&(weekSel||_wishDaySelected(type,docId,ds));
      const dimStyle=(isWe&&!sel)||noClick?'opacity:.2;cursor:default;':'';
      html+=`<div class="cal-day${isWe?' cal-we':''}${sel?' cal-op':''}${!inMonth?' cal-other':''}" ${noClick?'':` onclick="toggleWishDay('${type}','${docId}','${ds}')" title="${sel?'Klicka för att ta bort':'Lägg till'}"`} style="${dimStyle}">${dt.getDate()}</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==_opWishCalMonth&&cur>last)break;
  }
  calEl.innerHTML=html;
  _renderOpWishList(type,docId);
}
function _wishEntryNote(v){return v&&typeof v==='object'?v.note||'':'';}
function _wishEntryFlexible(v){return v&&typeof v==='object'?v.flexible||null:null;}
function toggleLedighetVeckaFlexibel(docId,wk){
  const cur=ledighetVeckorOnskemal[docId]&&ledighetVeckorOnskemal[docId][wk];
  if(!cur)return;
  const note=_wishEntryNote(cur);
  const flex=_wishEntryFlexible(cur);
  // Cykel: ingen → 'both' (±1v) → 'forward' (+1v) → ingen
  const next=flex===null?'both':flex==='both'?'forward':null;
  const base=note?{note}:{};
  ledighetVeckorOnskemal[docId][wk]=next?{...base,flexible:next}:(note?{note}:true);
  // Auto-add jourfri-önskemål för angränsande helger så ledigheten blir ≥7 dagar
  if(next){
    const p=wk.split('-W');
    const mon=isoWeekMon(Number(p[1]),Number(p[0]));
    // ±1v: helgen FÖRE veckan (lör/sön -2/-1) + helgen I veckan (lör/sön +5/+6)
    // +1v: helgen i veckan (+5/+6) + helgen i nästa vecka (+12/+13)
    const wkends=next==='both'
      ?[addDays(mon,-2),addDays(mon,-1),addDays(mon,5),addDays(mon,6)]
      :[addDays(mon,5),addDays(mon,6),addDays(mon,12),addDays(mon,13)];
    if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};
    wkends.forEach(d=>{const ds=isoDate(d);if(!jourfriOnskemalDag[docId][ds])jourfriOnskemalDag[docId][ds]={note:'Auto (flexibel ledighet)'}});
    showToast('🌙 Jourfri-önskemål tillagda för angränsande helger');
  }
  autoSave();renderOpLedighetJourfriPanel();
}
function _renderOpWishList(type,docId){
  const el=document.getElementById('opWishList_'+type);
  if(!el)return;
  const svs=(a,b)=>a.localeCompare(b,'sv');
  let rows=[];
  if(type==='ledighet'){
    Object.entries(ledighetVeckorOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([wk,v])=>{
      const p=wk.split('-W');const note=_wishEntryNote(v);const flex=_wishEntryFlexible(v);
      const flexLabel=flex==='both'?'±1v':flex==='forward'?'+1v':'';
      const flexColor=flex==='both'?'var(--accent)':flex==='forward'?'#0f766e':'var(--text3)';
      const flexBg=flex==='both'?'var(--accent-light)':flex==='forward'?'#ccfbf1':'transparent';
      const flexBorder=flex?flexColor:'var(--border)';
      const flexTitle=flex==='both'?'Flexibel ±1 vecka — klicka för +1v':flex==='forward'?'+1 vecka framåt — klicka för att ta bort':'Klicka för att markera som flexibel';
      const flexBadge=flex?`<span style="font-size:9px;font-weight:700;color:${flexColor};background:${flexBg};padding:1px 4px;border-radius:3px">${flexLabel}</span>`:'';
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">📅 Vecka ${p[1]} ${p[0]} (hel vecka)${note?' — <em>'+note+'</em>':''} ${flexBadge}</span><button onclick="toggleLedighetVeckaFlexibel('${docId}','${wk}')" title="${flexTitle}" style="font-size:9px;font-weight:700;padding:2px 5px;border-radius:4px;border:1px solid ${flexBorder};background:${flexBg};color:${flexColor};cursor:pointer">${flexLabel||'±1v'}</button><button onclick="rejectLedighetVeckaOnskemal('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
    Object.entries(ledighetOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([ds,v])=>{
      const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">📅 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span><button onclick="rejectLedighetDagOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
  } else if(type==='utbildning'){
    const utbEntries=Object.entries(utbildningOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b));
    if(utbEntries.length>1){
      rows.push(`<div style="margin-bottom:6px"><button onclick="approveAllUtbildningOnskemal('${docId}')" style="width:100%;font-size:11px;padding:4px 10px;border-radius:5px;border:1.5px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer;font-weight:700">✓ Godkänn alla dagar</button></div>`);
    }
    utbEntries.forEach(([ds,v])=>{
      const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">📚 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span><button onclick="approveUtbildningOnskemal('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button><button onclick="rejectUtbildningOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
  } else if(type==='fl'){
    // Show approved FL period (flFrom/flTo on doctor)
    const doc=docById(docId);
    if(doc&&doc.flFrom){
      const fmtDate=ds=>{const dt=new Date(ds+'T12:00:00');return`${dt.getDate()} ${svMonth(dt)} ${dt.getFullYear()}`;};
      const toLabel=doc.flTo?fmtDate(doc.flTo):'pågår';
      rows.push(`<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:var(--fl-light);border:1.5px solid var(--fl)88;margin-bottom:8px">
        <span style="font-size:20px">📅</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;font-weight:700;color:var(--fl);letter-spacing:.05em;margin-bottom:1px">GODKÄND FL-PERIOD</div>
          <div style="font-size:12px;font-weight:600;color:var(--text1)">${fmtDate(doc.flFrom)} – ${toLabel}</div>
        </div>
        <button onclick="clearFlPeriod('${docId}')" style="font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid var(--text3);background:none;color:var(--text3);cursor:pointer" title="Ta bort FL-period">Rensa</button>
      </div>`);
    }
    const flEntries=Object.entries(foraldraledigenOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b));
    if(flEntries.length){
      rows.push(`<div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.05em;margin-bottom:4px">INKOMNA ÖNSKEMÅL</div>`);
      rows.push(`<div style="margin-bottom:6px"><button onclick="approveAllFlAsPeriod('${docId}')" style="width:100%;font-size:11px;padding:4px 10px;border-radius:5px;border:1.5px solid var(--fl);background:var(--fl-light);color:var(--fl);cursor:pointer;font-weight:700">📅 Godkänn alla som FL-period</button></div>`);
    }
    flEntries.forEach(([ds,v])=>{
      const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">👶 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span><button onclick="approveFlOnskemal('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--fl);background:var(--fl-light);color:var(--fl);cursor:pointer">✓</button><button onclick="rejectFlOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
  } else if(type==='jourfri'){
    Object.entries(jourfriOnskemalDag[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([ds,v])=>{
      const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">🌙 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span><button onclick="approveJourfriDagOnskemal('${docId}','${ds}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button><button onclick="rejectJourfriDagOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
    Object.entries(jourfriOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([wk,v])=>{
      const p=wk.split('-W');
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">🌙 Vecka ${p[1]} ${p[0]} (${v.scope==='week'?'hel vecka':'helgen'})${v.note?' — <em>'+v.note+'</em>':''}</span><button onclick="approveJourfriOnskemal('${docId}','${wk}')" style="font-size:10px;padding:2px 7px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button><button onclick="rejectJourfriOnskemal('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
  } else if(type==='admin'){
    Object.entries(adminOnskemal[docId]||{}).sort(([a],[b])=>svs(a,b)).forEach(([ds,v])=>{
      const dt=new Date(ds+'T12:00:00');const note=_wishEntryNote(v);
      rows.push(`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;flex:1">🗂 ${svDay(dt)} ${dt.getDate()} ${svMonth(dt)}${note?' — <em>'+note+'</em>':''}</span><button onclick="rejectAdminOnskemal('${docId}','${ds}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0">×</button></div>`);
    });
  }
  el.innerHTML=rows.length?rows.join(''):'<div style="font-size:11px;color:var(--text3);padding:4px 0">Inga önskemål</div>';
}

// Approve/reject utbildning (render() now added)
function renderOpLedighetTab(docId){renderOpLedighetJourfriPanel();}
function submitLedighetDagOnskemal(docId){} // kept for compat, no longer used
function approveLedighetDagOnskemal(docId,ds){
  if(!ledighetRequests[docId])ledighetRequests[docId]={};
  ledighetRequests[docId][ds]=true;
  if(ledighetOnskemal[docId])delete ledighetOnskemal[docId][ds];
  autoSave();render();renderOpLedighetJourfriPanel();
  const doc=docById(docId);showToast(`✅ Ledighet godkänd — ${doc?docShortName(doc):''} ${ds}`);
}
function rejectLedighetDagOnskemal(docId,ds){
  if(ledighetOnskemal[docId])delete ledighetOnskemal[docId][ds];
  autoSave();render();renderOpLedighetJourfriPanel();
}
function approveLedighetVeckaOnskemal(docId,wk){
  const wishVal=ledighetVeckorOnskemal[docId]?.[wk];
  if(!ledighetVeckor[docId])ledighetVeckor[docId]={};
  // Preserve the original wish value (including flexible flag) so ↩ can restore it
  ledighetVeckor[docId][wk]=wishVal||true;
  if(ledighetVeckorOnskemal[docId])delete ledighetVeckorOnskemal[docId][wk];
  autoSave();render();renderOpLedighetJourfriPanel();
  const p=wk.split('-W');const doc=docById(docId);showToast(`✅ Ledighet godkänd — ${doc?docShortName(doc):''} v.${p[1]}`);
}
function rejectLedighetVeckaOnskemal(docId,wk){
  if(ledighetVeckorOnskemal[docId])delete ledighetVeckorOnskemal[docId][wk];
  autoSave();render();renderOpLedighetJourfriPanel();
}

function renderOpUtbildningTab(docId){_renderOpWishCal('utbildning');}
function submitUtbildningOnskemal(docId){} // kept for compat
function approveUtbildningOnskemal(docId,ds){
  if(!utbildningDagar[docId])utbildningDagar[docId]={};
  utbildningDagar[docId][ds]=true;
  if(utbildningOnskemal[docId])delete utbildningOnskemal[docId][ds];
  autoSave();render();_renderOpWishCal('utbildning');
  const doc=docById(docId);showToast(`✅ Utbildning godkänd — ${doc?docShortName(doc):''} ${ds}`);
}
function revokeLedighetDag(docId,ds){
  if(ledighetRequests[docId]){delete ledighetRequests[docId][ds];}
  if(!ledighetOnskemal[docId])ledighetOnskemal[docId]={};
  ledighetOnskemal[docId][ds]=true;
  const doc=docById(docId);logChange(`Ledighet återställd till önskemål: ${doc?doc.name:docId} ${ds}`);
  autoSave();render();renderOpLedighetJourfriPanel();
}
function revokeLedighetVecka(docId,wk){
  const savedVal=ledighetVeckor[docId]?.[wk];
  if(ledighetVeckor[docId]){delete ledighetVeckor[docId][wk];}
  if(!ledighetVeckorOnskemal[docId])ledighetVeckorOnskemal[docId]={};
  // Restore original wish value with flexible flag intact
  ledighetVeckorOnskemal[docId][wk]=savedVal||true;
  const doc=docById(docId);const p=wk.split('-W');logChange(`Ledighet v.${p[1]} återställd till önskemål: ${doc?doc.name:docId}`);
  autoSave();render();renderOpLedighetJourfriPanel();
}
function revokeUtbildning(docId,ds){
  const v=utbildningDagar[docId]?.[ds];
  if(utbildningDagar[docId]){delete utbildningDagar[docId][ds];}
  if(!utbildningOnskemal[docId])utbildningOnskemal[docId]={};
  utbildningOnskemal[docId][ds]=v||true;
  const doc=docById(docId);logChange(`Utbildning återställd till önskemål: ${doc?doc.name:docId} ${ds}`);
  autoSave();render();_renderOpWishCal('utbildning');
}
function approveAllUtbildningOnskemal(docId){
  const dates=Object.keys(utbildningOnskemal[docId]||{});
  if(!dates.length)return;
  if(!utbildningDagar[docId])utbildningDagar[docId]={};
  dates.forEach(ds=>{ utbildningDagar[docId][ds]=true; });
  utbildningOnskemal[docId]={};
  const doc=docById(docId);
  logChange(`Utbildning godkänd (alla dagar): ${doc?doc.name:docId}`);
  autoSave();render();_renderOpWishCal('utbildning');
  showToast(`✅ ${dates.length} utbildningsdagar godkända — ${doc?docShortName(doc):''}`);
}
function rejectUtbildningOnskemal(docId,ds){
  if(utbildningOnskemal[docId])delete utbildningOnskemal[docId][ds];
  autoSave();render();_renderOpWishCal('utbildning');
}

// ── FL ÖNSKEMÅL ──
function approveFlOnskemal(docId,ds){
  if(!foraldraledig[ds])foraldraledig[ds]=[];
  if(!foraldraledig[ds].some(e=>e.docId===docId))foraldraledig[ds].push({id:'fl_'+docId+'_'+ds,docId});
  if(foraldraledigenOnskemal[docId])delete foraldraledigenOnskemal[docId][ds];
  autoSave();render();_renderOpWishCal('fl');
  const doc=docById(docId);showToast(`✅ Föräldraledig godkänd — ${doc?docShortName(doc):''} ${ds}`);
}
function approveAllFlAsPeriod(docId){
  const dates=Object.keys(foraldraledigenOnskemal[docId]||{});
  if(!dates.length){showToast('Inga önskemål att godkänna');return;}
  dates.sort();
  const from=dates[0],to=dates[dates.length-1];
  const doc=docById(docId);if(!doc)return;
  doc.flFrom=from;
  doc.flTo=to;
  foraldraledigenOnskemal[docId]={};
  logChange(`FL-period satt: ${doc.name} ${from}–${to}`);
  autoSave();render();_renderOpWishCal('fl');
  showToast(`📅 FL-period satt: ${doc?docShortName(doc):''} ${from} – ${to}`);
}
function clearFlPeriod(docId){
  const doc=docById(docId);if(!doc)return;
  doc.flFrom='';doc.flTo='';
  logChange(`FL-period borttagen: ${doc.name}`);
  autoSave();render();_renderOpWishCal('fl');
  showToast(`FL-period borttagen — ${docShortName(doc)}`);
}
function rejectFlOnskemal(docId,ds){
  if(foraldraledigenOnskemal[docId])delete foraldraledigenOnskemal[docId][ds];
  autoSave();render();_renderOpWishCal('fl');
}

// ── JOURFRITT ÖNSKEMÅL ──
function toggleJourfriOnskemal(docId,wk,scope){
  if(!jourfriOnskemal[docId])jourfriOnskemal[docId]={};
  if(jourfriOnskemal[docId][wk])delete jourfriOnskemal[docId][wk];
  else{const note=document.getElementById('opWishNote_ledjour')?.value?.trim()||null;jourfriOnskemal[docId][wk]={scope,note};}
  autoSave();render();renderOpLedighetJourfriPanel();
}
function approveJourfriOnskemal(docId,wk){
  const v=jourfriOnskemal[docId]&&jourfriOnskemal[docId][wk];
  if(!v)return;
  if(!jourfriOnskad[docId])jourfriOnskad[docId]={};
  jourfriOnskad[docId][wk]={scope:v.scope,note:v.note||''};
  delete jourfriOnskemal[docId][wk];
  autoSave();render();renderOpLedighetJourfriPanel();
  const p=wk.split('-W');const doc=docById(docId);showToast(`✅ Jourfritt godkänt — ${doc?docShortName(doc):''} v.${p[1]}`);
}
function rejectJourfriOnskemal(docId,wk){
  if(jourfriOnskemal[docId])delete jourfriOnskemal[docId][wk];
  autoSave();render();renderOpLedighetJourfriPanel();
}
function renderOpJourfriWeekList(){
  const docId=document.getElementById('opDocSelect').value;
  const el=document.getElementById('opJourfriWeekContent');
  if(!el||!docId)return;
  const first=new Date(_opWishCalYear,_opWishCalMonth,1);
  const last=new Date(_opWishCalYear,_opWishCalMonth+1,0);
  const startMon=getMonday(first);
  let html='<div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.05em;margin-bottom:4px">VECKOVIS JOURFRITT</div>';
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===_opWishCalMonth){
    const wn=weekNum(cur),yr=weekYear(cur),wk=wkey(wn,yr);
    const inMonth=cur.getMonth()===_opWishCalMonth||(addDays(cur,6)).getMonth()===_opWishCalMonth;
    if(!inMonth){cur.setDate(cur.getDate()+7);continue;}
    const pending=jourfriOnskemal[docId]&&jourfriOnskemal[docId][wk];
    const active=jourfriOnskad[docId]&&jourfriOnskad[docId][wk];
    const sun=addDays(cur,6);
    const rangeStr=`${cur.getDate()} ${svMonth(cur).slice(0,3)} – ${sun.getDate()} ${svMonth(sun).slice(0,3)}`;
    html+=`<div style="display:flex;align-items:center;gap:5px;padding:4px 0;border-bottom:1px solid var(--border)44">
      <span style="font-size:10px;color:var(--text3);width:28px;flex-shrink:0">v${wn}</span>
      <span style="font-size:10px;color:var(--text2);flex:1">${rangeStr}</span>`;
    if(active){
      html+=`<span style="font-size:9px;color:var(--jourledigt);background:var(--jourledigt-light);border-radius:3px;padding:1px 5px">✓ ${active.scope==='week'?'Hel vecka':'Helgen'}</span>`;
    } else if(pending){
      html+=`<span style="font-size:9px;color:#854d0e;background:#fefce8;border:1px solid #ca8a04;border-radius:3px;padding:1px 5px">✋ ${pending.scope==='week'?'Hel vecka':'Helgen'}</span>
      <button onclick="approveJourfriOnskemal('${docId}','${wk}')" style="font-size:9px;padding:1px 5px;border-radius:3px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer">✓</button>
      <button onclick="rejectJourfriOnskemal('${docId}','${wk}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0;line-height:1">×</button>`;
    } else {
      html+=`<button onclick="toggleJourfriOnskemal('${docId}','${wk}','week')" class="btn sm" style="font-size:9px;padding:1px 5px">Hel v.</button>
      <button onclick="toggleJourfriOnskemal('${docId}','${wk}','weekend')" class="btn sm" style="font-size:9px;padding:1px 5px">Helg</button>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==_opWishCalMonth&&cur>last)break;
  }
  el.innerHTML=html;
}
// ── JOURFRI DAG ÖNSKEMÅL ──
function approveJourfriDagOnskemal(docId,ds){
  if(!jourfriOnskadDag[docId])jourfriOnskadDag[docId]={};
  jourfriOnskadDag[docId][ds]=true;
  if(jourfriOnskemalDag[docId])delete jourfriOnskemalDag[docId][ds];
  autoSave();render();renderOpLedighetJourfriPanel();
  const doc=docById(docId);showToast(`✅ Jourfritt godkänt — ${doc?docShortName(doc):''} ${ds}`);
}
function rejectJourfriDagOnskemal(docId,ds){
  if(jourfriOnskemalDag[docId])delete jourfriOnskemalDag[docId][ds];
  autoSave();render();renderOpLedighetJourfriPanel();
}
function revokeJourfriDag(docId,ds){
  const v=jourfriOnskadDag[docId]?.[ds];
  if(jourfriOnskadDag[docId])delete jourfriOnskadDag[docId][ds];
  if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};
  jourfriOnskemalDag[docId][ds]=v||true;
  const doc=docById(docId);logChange(`Jourfritt återställt till önskemål: ${doc?doc.name:docId} ${ds}`);
  autoSave();render();renderOpLedighetJourfriPanel();
}
function revokeJourfriVecka(docId,wk){
  const v=jourfriOnskad[docId]?.[wk];
  if(jourfriOnskad[docId])delete jourfriOnskad[docId][wk];
  if(!jourfriOnskemal[docId])jourfriOnskemal[docId]={};
  jourfriOnskemal[docId][wk]=v||{scope:'week',note:''};
  const doc=docById(docId);const p=wk.split('-W');logChange(`Jourfritt v.${p[1]} återställt till önskemål: ${doc?doc.name:docId}`);
  autoSave();render();renderOpLedighetJourfriPanel();
}
// ── ADMIN ÖNSKEMÅL ──
function rejectAdminOnskemal(docId,ds){
  if(adminOnskemal[docId])delete adminOnskemal[docId][ds];
  autoSave();render();_renderOpWishCal('admin');
}

// ═══════════════════════════════════════════════
// DOCTOR MODE
// ═══════════════════════════════════════════════
function initDoctorMode(){
  if(!IS_DOCTOR_MODE)return;
  // Show doctor toolbar, hide admin toolbar
  const doctorToolbar=document.getElementById('doctorToolbar');
  if(doctorToolbar)doctorToolbar.style.display='flex';
  const adminToolbar=document.querySelector('.toolbar');
  if(adminToolbar)adminToolbar.style.display='none';
  if(ACTIVE_DOCTOR_ID){
    const doc=docById(ACTIVE_DOCTOR_ID);
    const lbl=document.getElementById('doctorModeLabel');
    if(lbl)lbl.textContent=doc?`Läkarvy — ${doc.name}`:'Läkarvy';
    // Hide selector overlay
    const overlay=document.getElementById('doctorSelectorOverlay');
    if(overlay)overlay.style.display='none';
    // Lock personschema to this doctor
    const psSel=document.getElementById('personScheduleDocSelect');
    if(psSel&&doc){psSel.value=ACTIVE_DOCTOR_ID;}
  } else {
    showDoctorSelector();
  }
}

// ═══════════════════════════════════════════════
// BEMANNING (STAFFING SUMMARY)
// ═══════════════════════════════════════════════
function renderStaffingBar(containerId,month,year,inclWished){
  const el=document.getElementById(containerId);
  if(!el)return;
  const inclW=inclWished!==false;
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const startMon=getMonday(first);
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  let html=`<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">`;
  html+=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);margin-bottom:4px">Läkare i tjänst — ${months[month]} ${year}${inclW?' (inkl. önskad)':''}</div>`;
  html+=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:3px"><div></div>`;
  ['M','T','O','T','F','L','S'].forEach(d=>html+=`<div style="font-size:9px;font-weight:700;color:var(--text3);text-align:center">${d}</div>`);
  html+='</div>';
  let hasWarning=false;
  let cur=new Date(startMon);
  while(cur<=last||cur.getMonth()===month){
    const wn=weekNum(cur);
    html+=`<div style="display:grid;grid-template-columns:28px repeat(7,1fr);gap:2px;margin-bottom:2px">`;
    html+=`<div style="font-size:9px;color:var(--text3);text-align:center;padding-top:3px">v${wn}</div>`;
    for(let i=0;i<7;i++){
      const dt=new Date(cur);dt.setDate(dt.getDate()+i);
      const ds=isoDate(dt);
      const inMonth=dt.getMonth()===month;
      if(!inMonth){html+=`<div></div>`;continue;}
      const s=_staffingStatsOnDay(ds,inclW);
      if(s.warned)hasWarning=true;
      const bg=s.isWeekend?'transparent':s.warned?'#fee2e2':s.total<=s.minTotal?'#fef3c7':'#f0fdf4';
      const col=s.isWeekend?'var(--text3)':s.warned?'#b91c1c':s.total<=s.minTotal?'#92400e':'#166534';
      const brd=s.isWeekend?'var(--border)':s.warned?'#fca5a5':s.total<=s.minTotal?'#fde68a':'#bbf7d0';
      const olWarn=!s.isWeekend&&s.minOL>0&&s.ol<s.minOL;
      const tip=s.isWeekend?`Helg: ${s.total} i tjänst (ÖL:${s.ol}, UL:${s.ul})`:`I tjänst: ${s.total} (ÖL:${s.ol}, UL:${s.ul}) | Minimum: ${s.minTotal} (ÖL:${s.minOL})${s.warned?' ⚠ Underbemannat':''}`;
      html+=`<div style="font-size:9px;text-align:center;padding:2px 0;border-radius:4px;background:${bg};color:${col};border:1px solid ${brd}" title="${tip}">${s.total}`;
      if(!s.isWeekend)html+=`<div style="font-size:7px;color:${olWarn?'#b91c1c':col};opacity:.8">ÖL${s.ol}</div>`;
      html+=`</div>`;
    }
    html+='</div>';
    cur.setDate(cur.getDate()+7);
    if(cur.getMonth()!==month&&cur>last)break;
  }
  if(hasWarning){
    const posNames=[...mandatoryPositions].map(id=>{const p=positions.find(x=>x.id===id);return p?p.name:id;}).join(', ');
    html+=`<div style="font-size:10px;color:#b91c1c;background:#fee2e2;padding:3px 7px;border-radius:4px;margin-top:4px">⚠ Bemanning understiger minimum för: ${posNames}</div>`;
  }
  html+=`</div>`;
  el.innerHTML=html;
}

let _bemanningMonth=new Date().getMonth(),_bemanningYear=new Date().getFullYear();
function openBemanningModal(){
  _bemanningMonth=currentDate.getMonth();_bemanningYear=currentDate.getFullYear();
  _renderBemanningModal();
  openModal('bemanningModal');
}
function _renderBemanningModal(){
  const months=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  document.getElementById('bemanningMonthLabel').textContent=`${months[_bemanningMonth]} ${_bemanningYear}`;
  renderStaffingBar('bemanningContainer',_bemanningMonth,_bemanningYear,true);
}
function bemanningNavMonth(dir){
  _bemanningMonth+=dir;
  if(_bemanningMonth>11){_bemanningMonth=0;_bemanningYear++;}
  if(_bemanningMonth<0){_bemanningMonth=11;_bemanningYear--;}
  _renderBemanningModal();
}

function showDoctorSelector(){
  const overlay=document.getElementById('doctorSelectorOverlay');
  const list=document.getElementById('doctorSelectorList');
  if(!overlay||!list)return;
  const sorted=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  list.innerHTML=sorted.map(d=>`
    <button onclick="selectDoctorMode('${d.id}')" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;text-align:left;width:100%;font-size:13px;font-weight:500">
      <div style="width:32px;height:32px;border-radius:50%;background:${d.color[0]};color:${d.color[1]};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${docInitials(d.name)}</div>
      <span>${d.name}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--text3)">${d.roles[0]||''}</span>
    </button>`).join('');
  overlay.style.display='flex';
}

function selectDoctorMode(docId){
  const url=new URL(location.href);
  url.searchParams.set('docId',docId);
  location.href=url.toString();
}

function goToDoctorSelector(){
  const url=new URL(location.href);
  url.searchParams.delete('docId');
  location.href=url.toString();
}
