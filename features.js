
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

// ═══════════════════════════════════════════════
// EXCEL IMPORT — ÖNSKAD LEDIGHET / UTBILDNING
// ═══════════════════════════════════════════════
let _pendingImport=[];

function openImportOnskadeModal(){
  _pendingImport=[];
  document.getElementById('importPreview').innerHTML='';
  document.getElementById('importConfirmBtn').disabled=true;
  document.getElementById('importExcelInput').value='';
  openModal('importOnskadeModal');
}

function parseImportDate(val){
  if(!val&&val!==0)return null;
  if(val instanceof Date&&!isNaN(val))return isoDate(val);
  const s=String(val).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return null;
}

function matchDoctorName(name){
  if(!name)return null;
  const n=String(name).trim().toLowerCase();
  let doc=doctors.find(d=>d.name.toLowerCase()===n);
  if(doc)return doc;
  // first + last word match
  const parts=n.split(/\s+/);
  doc=doctors.find(d=>{const dp=d.name.toLowerCase().split(/\s+/);return parts[0]===dp[0]&&parts[parts.length-1]===dp[dp.length-1];});
  if(doc)return doc;
  // last name only
  const last=parts[parts.length-1];
  const byLast=doctors.filter(d=>d.name.toLowerCase().split(/\s+/).pop()===last);
  if(byLast.length===1)return byLast[0];
  return null;
}

function parseImportFile(){
  const input=document.getElementById('importExcelInput');
  if(!input.files.length)return;
  if(typeof XLSX==='undefined'){showToast('SheetJS kunde inte laddas — kontrollera internetanslutning');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      processImportRows(rows);
    }catch(err){showToast('Kunde inte läsa filen: '+err.message);}
  };
  reader.readAsArrayBuffer(input.files[0]);
}

function processImportRows(rows){
  const col=(row,...names)=>{
    const keys=Object.keys(row);
    for(const n of names){const k=keys.find(k=>k.trim().toLowerCase()===n.toLowerCase());if(k!==undefined)return row[k];}
    return'';
  };
  _pendingImport=[];
  const preview=[];
  rows.forEach((row,i)=>{
    const docName=String(col(row,'Läkare','Lakare','Namn','Name')||'').trim();
    const startRaw=col(row,'Startdatum','Datum','Start','Date','Från','Fran');
    const endRaw=col(row,'Slutdatum','Slut','End','Till');
    const typRaw=String(col(row,'Typ','Type','Art')||'').trim().toLowerCase();
    const note=String(col(row,'Notering','Anteckning','Kommentar','Note','Comment')||'').trim();
    if(!docName&&!startRaw)return;
    const doc=matchDoctorName(docName);
    const startDs=parseImportDate(startRaw);
    const endDs=parseImportDate(endRaw)||startDs;
    const type=/utb|kurs|kongress|fortb|conf/.test(typRaw)?'utb':'led';
    const status=!doc?'Läkare ej hittad':!startDs?'Ogiltigt datum':'ok';
    if(status==='ok'){
      let d=new Date(startDs);const end=new Date(endDs);
      while(d<=end){
        if(d.getDay()>=1&&d.getDay()<=5)_pendingImport.push({docId:doc.id,docName:doc.name,ds:isoDate(d),type,note});
        d=addDays(d,1);
      }
    }
    preview.push({rowNum:i+2,docName,docMatched:doc?doc.name:null,startDs,endDs,type,note,status});
  });
  const el=document.getElementById('importPreview');
  if(!preview.length){el.innerHTML='<p style="color:var(--text3);padding:8px 0">Inga rader hittades.</p>';return;}
  const dateStr=p=>p.startDs?(p.endDs&&p.endDs!==p.startDs?`${p.startDs} – ${p.endDs}`:p.startDs):'—';
  let html=`<div style="margin:10px 0 6px;font-size:12px;color:var(--text2)"><strong>${_pendingImport.length} vardagar</strong> att importera från ${preview.length} rader</div>`;
  html+=`<div style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:11px">`;
  html+=`<thead><tr style="background:var(--surface2);position:sticky;top:0"><th style="padding:6px 8px;text-align:left">Rad</th><th style="padding:6px 8px;text-align:left">Läkare (fil)</th><th style="padding:6px 8px;text-align:left">Matchad</th><th style="padding:6px 8px;text-align:left">Datum</th><th style="padding:6px 8px;text-align:left">Typ</th></tr></thead><tbody>`;
  preview.forEach(p=>{
    const ok=p.status==='ok';
    html+=`<tr style="border-top:1px solid var(--border);${ok?'':'background:#fff0f0'}">
      <td style="padding:5px 8px;color:var(--text3)">${p.rowNum}</td>
      <td style="padding:5px 8px">${p.docName||'—'}</td>
      <td style="padding:5px 8px;color:${ok?'#16a34a':'var(--red)'}">${ok?'✓ '+p.docMatched:'✗ '+p.status}</td>
      <td style="padding:5px 8px;font-family:monospace;font-size:10px">${dateStr(p)}</td>
      <td style="padding:5px 8px">${p.type==='utb'?'Utbildning':'Ledighet'}</td>
    </tr>`;
  });
  html+=`</tbody></table></div>`;
  el.innerHTML=html;
  document.getElementById('importConfirmBtn').disabled=_pendingImport.length===0;
}

function confirmImport(){
  let cnt=0;
  _pendingImport.forEach(({docId,ds,type,note})=>{
    if(type==='utb'){if(!utbildningOnskad[docId])utbildningOnskad[docId]={};utbildningOnskad[docId][ds]={note};}
    else{if(!ledighetOnskad[docId])ledighetOnskad[docId]={};ledighetOnskad[docId][ds]={note};}
    cnt++;
  });
  _pendingImport=[];
  closeModal('importOnskadeModal');
  autoSave();render();
  showToast(`${cnt} önskemålsdagar importerade`);
}

// ─── GRANSKA ÖNSKEMÅL ───
function openReviewModal(){
  renderReviewModal();
  openModal('reviewOnskadeModal');
}

function renderReviewModal(){
  const allDocs=doctors.filter(d=>countOnskadForDoc(d.id)>0);
  const el=document.getElementById('reviewOnskadeBody');
  if(!allDocs.length){el.innerHTML='<p style="color:var(--text3);text-align:center;padding:24px">Inga önskemål att granska.</p>';return;}
  let html='';
  allDocs.forEach(doc=>{
    const entries=[];
    Object.entries(ledighetOnskad[doc.id]||{}).forEach(([ds,v])=>entries.push({ds,type:'led',note:v.note||''}));
    Object.entries(utbildningOnskad[doc.id]||{}).forEach(([ds,v])=>entries.push({ds,type:'utb',note:v.note||''}));
    entries.sort((a,b)=>a.ds.localeCompare(b.ds));
    html+=`<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden">
      <div style="padding:8px 12px;background:var(--surface2);display:flex;align-items:center;gap:8px">
        <div class="savatar" style="background:${doc.color[0]};color:${doc.color[1]};width:22px;height:22px;font-size:9px">${docInitials(doc.name)}</div>
        <span style="font-weight:600;font-size:12px;flex:1">${doc.name}</span>
        <span style="font-size:10px;color:var(--text3)">${entries.length} dag${entries.length>1?'ar':''}</span>
        <button class="btn sm primary" onclick="approveAllForDoc('${doc.id}')">Bevilja alla</button>
        <button class="btn sm" style="color:var(--red);border-color:var(--red)" onclick="rejectAllForDoc('${doc.id}')">Avslå alla</button>
      </div>
      <div style="padding:4px 10px">
        ${entries.map(e=>`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)22">
          <span style="font-family:monospace;font-size:11px;min-width:90px">${e.ds}</span>
          <span style="font-size:10px;padding:1px 6px;border-radius:3px;background:${e.type==='utb'?'#dbeafe':'#fef9c3'};color:${e.type==='utb'?'#1d4ed8':'#854d0e'}">${e.type==='utb'?'Utbildning':'Ledighet'}</span>
          <span style="font-size:10px;color:var(--text3);flex:1">${e.note}</span>
          <button class="btn sm primary" title="Bevilja" onclick="approveSingle('${doc.id}','${e.ds}','${e.type}')">✓</button>
          <button class="btn sm" style="color:var(--red);border-color:var(--red)" title="Avslå" onclick="rejectSingle('${doc.id}','${e.ds}','${e.type}')">✗</button>
        </div>`).join('')}
      </div>
    </div>`;
  });
  el.innerHTML=html;
}

function approveAllForDoc(docId){
  Object.keys({...(ledighetOnskad[docId]||{})}).forEach(ds=>approveOnskadLedighet(docId,ds));
  Object.keys({...(utbildningOnskad[docId]||{})}).forEach(ds=>approveOnskadUtbildning(docId,ds));
  renderReviewModal();autoSave();render();
}
function rejectAllForDoc(docId){
  ledighetOnskad[docId]={};utbildningOnskad[docId]={};
  renderReviewModal();autoSave();render();
}
function approveSingle(docId,ds,type){
  if(type==='utb')approveOnskadUtbildning(docId,ds);else approveOnskadLedighet(docId,ds);
  renderReviewModal();autoSave();render();
}
function rejectSingle(docId,ds,type){
  if(type==='utb')rejectOnskadUtbildning(docId,ds);else rejectOnskadLedighet(docId,ds);
  renderReviewModal();autoSave();render();
}
