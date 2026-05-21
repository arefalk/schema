function openSlotCtx(e,slotId,ds){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxTarget={slotId,ds};
  const slot=slotById(slotId),pos=posOfSlot(slotId);
  const isNoBlock=!!slot?.noBlock;
  const[,fg]=posColor(pos?pos.colorIdx:0);
  document.getElementById('ctxHead').innerHTML=`<span style="color:${fg}">${pos?pos.name:'Slot'}</span>`;
  const list=document.getElementById('ctxDocList');list.innerHTML='';
  const curVal=getSlot(slotId,ds);
  const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);
  // Qualification without the "assigned elsewhere" constraint (that's handled separately)
  function intrinsicQual(doc){
    if(!docIsActive(doc,ds))return false;
    if(!slot)return true;
    if(pos&&!docAllowedOnPos(doc,pos))return false;
    if(!docMatchRole(doc,slot.roleReq))return false;
    if(deltidOnDay(doc.id,ds)==='hel')return false;
    const r=docRestrictedOnDate(doc.id,ds);
    if(r&&r!=='Deltid')return false;
    return true;
  }
  const sorted=[...doctors].sort((a,b)=>{
    const aQ=intrinsicQual(a),bQ=intrinsicQual(b);
    const aP=pos&&(a.prefPositions||[]).includes(pos.id)&&aQ,bP=pos&&(b.prefPositions||[]).includes(pos.id)&&bQ;
    const aE=!!docAssignedElsewhere(a.id,ds,slotId),bE=!!docAssignedElsewhere(b.id,ds,slotId);
    const aRank=aP?0:aQ?1:2,bRank=bP?0:bQ?1:2;
    if(aRank!==bRank)return aRank-bRank;
    return (aE?1:0)-(bE?1:0);
  });
  let shP=false,shQ=false,shU=false;
  sorted.forEach(doc=>{
    const qual=intrinsicQual(doc);
    const pref=pos&&(doc.prefPositions||[]).includes(pos.id)&&qual;
    const hasJV=docHasJVThisWeek(doc.id,wn,yr);
    const elsewhere=docAssignedElsewhere(doc.id,ds,slotId);
    const hasLed=docHasAnyLedighet(doc.id,ds);
    const isJL=docIsJourledigt(doc.id,ds);
    const docDeltid=deltidOnDay(doc.id,ds);
    const deltidHalf=docDeltid==='fm'?'em':docDeltid==='em'?'fm':null;
    const restriction=qual?null:docRestrictedOnDate(doc.id,ds);
    const notAllowed=!qual&&pos&&!docAllowedOnPos(doc,pos);
    if(pref&&!shP){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#856404;padding:3px 7px 1px">★ Föredragna</div>');shP=true;}
    else if(!pref&&qual&&!shQ){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px">Kvalificerade</div>');shQ=true;}
    else if(!qual&&!shU){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px;opacity:.5">Ej kvalificerade</div>');shU=true;}
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(pref?' preferred':'')+(curVal===doc.id?' selected':'')+(qual?'':' incompatible');
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    let notes='';
    if(elsewhere)notes+=`<span style="font-size:9px;color:var(--warn);white-space:nowrap;flex-shrink:0">→&nbsp;${elsewhere}</span>`;
    else if(hasLed)notes+=`<span style="font-size:9px;color:#b45309;flex-shrink:0">Ledig</span>`;
    else if(isJL)notes+=`<span style="font-size:9px;color:var(--jourledigt);flex-shrink:0">Jourledig</span>`;
    else if(deltidHalf)notes+=`<span style="font-size:9px;color:var(--deltid);font-weight:700;flex-shrink:0">${deltidHalf.toUpperCase()}</span>`;
    else if(restriction)notes+=`<span style="font-size:9px;color:var(--text3);opacity:.8;flex-shrink:0">${restriction}</span>`;
    else if(notAllowed)notes+=`<span style="font-size:9px;color:var(--text3);opacity:.8;flex-shrink:0">Ej tillåten</span>`;
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${hasJV?`<span style="font-size:9px;color:var(--jv1)">JV</span>`:''}${pref?'<span style="color:#856404">★</span>':''}${notes}`;
    btn.onclick=()=>{
      const targetSlotObj=pos?.slots.find(s=>s.slotId===slotId);
      if(!isNoBlock){
        // Clear doctor from other blocking slots on same day (but not noBlock slots like Rond)
        Object.entries(schedule[ds]||{}).forEach(([sid,did])=>{
          if(did!==doc.id||sid===slotId||getSlotHalf(sid,ds))return;
          const sp=posOfSlot(sid);const ss=sp?.slots.find(s=>s.slotId===sid);
          if(!ss?.noBlock)setSlot(sid,ds,'');
        });
      }
      setSlot(slotId,ds,doc.id);
      logChange(`Placerade ${docShortName(doc)} på ${pos?pos.name:'pass'} (${ds})`);
      if(!getSlotHalf(slotId,ds)){
        const dt=deltidOnDay(doc.id,ds);
        if(dt==='fm')setSlotHalf(slotId,ds,'em');
        else if(dt==='em')setSlotHalf(slotId,ds,'fm');
        else{const h=docHandledningHalfOn(doc.id,ds);if(h)setSlotHalf(slotId,ds,h==='fm'?'em':'fm');}
      }
      // Rensa från mottagning bara om målpositionen INTE är en mottagnings/specmott-position
      const _isMottPos=pos&&(pos.id==='pos_mott'||pos.section==='mott'||pos.section==='specmott');
      if(!_isMottPos&&!isNoBlock)clearDocFromMottagning(doc.id,ds);
      closeAllCtx();render();
    };
    list.appendChild(btn);
  });
  // Show FM/EM toggle row only when a doctor is already assigned
  const halfRow=document.getElementById('ctxHalfRow');
  if(curVal){
    const curHalf=getSlotHalf(slotId,ds);
    halfRow.innerHTML=['fm','','em'].map(h=>{
      const lbl=h==='fm'?'FM':h===''?'Heldag':'EM';
      const on=curHalf===h;
      return `<button onclick="setCtxHalf('${h}')" style="flex:1;padding:3px 0;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?'var(--accent)':'var(--border)'};background:${on?'var(--accent-light)':'transparent'};color:${on?'var(--accent)':'var(--text2)'};cursor:pointer">${lbl}</button>`;
    }).join('');
    halfRow.style.display='flex';
  } else {
    halfRow.innerHTML='';halfRow.style.display='none';
  }
  // Location row — only for multi-slot positions (e.g. Mottagning)
  const locRow=document.getElementById('ctxLocRow');
  if(pos&&pos.slots.length>1){
    // Om positionen använder KH-kryssrute-systemet (khDays) och detta är slot[0] → default KH
    const _ctxDow=new Date(ds+'T12:00:00').getDay();
    const _isKhSlot=!!(pos.khDays&&pos.khDays.includes(_ctxDow)&&pos.slots[0]?.slotId===slotId);
    const _defaultLoc=_isKhSlot?'Karlshamn':'Karlskrona';
    const curLoc=(slotLocations[ds]&&slotLocations[ds][slotId])||_defaultLoc;
    locRow.innerHTML=['Karlskrona','Karlshamn'].map(loc=>{
      const on=curLoc===loc;const short=loc==='Karlshamn'?'KH':'KSK';
      return `<button onclick="setCtxLocation('${loc}')" style="flex:1;padding:2px 0;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?(loc==='Karlshamn'?'#1d4ed8':'var(--accent)'):'var(--border)'};background:${on?(loc==='Karlshamn'?'#dbeafe':'var(--accent-light)'):'transparent'};color:${on?(loc==='Karlshamn'?'#1d4ed8':'var(--accent)'):'var(--text2)'};cursor:pointer">${short}</button>`;
    }).join('');
    locRow.style.display='flex';
  } else {
    locRow.innerHTML='';locRow.style.display='none';
  }
  // Activity row — shown when the position has a predefined activity list
  const actRow=document.getElementById('ctxActivityRow');
  const activities=pos&&!isNoBlock?(pos.activities||[]):[];
  if(activities.length){
    const curNote=getSlotNote(slotId,ds);
    actRow.innerHTML=activities.map(act=>{
      const on=curNote===act;
      return `<button onclick="setCtxActivity('${act.replace(/'/g,"\\'")}')"`+
        ` style="padding:2px 7px;font-size:10px;border-radius:12px;border:1px solid ${on?'#0f766e':'var(--border)'};background:${on?'#ccfbf1':'transparent'};color:${on?'#0f766e':'var(--text2)'};cursor:pointer;white-space:nowrap">${act}</button>`;
    }).join('');
    actRow.style.display='flex';
  } else {
    actRow.innerHTML='';actRow.style.display='none';
  }
  // Note row — always visible so you can add a note even before assigning
  const noteRow=document.getElementById('ctxNoteRow');
  const noteInput=document.getElementById('ctxNoteInput');
  noteRow.style.display='block';
  noteInput.value=getSlotNote(slotId,ds);
  // Copy row — only when a doctor is assigned
  document.getElementById('ctxCopyRow').style.display=curVal?'block':'none';
  positionCtx('ctxMenu',e);
}
function setCtxActivity(act){
  if(!ctxTarget)return;
  const{slotId,ds}=ctxTarget;
  const cur=getSlotNote(slotId,ds);
  const newVal=cur===act?'':act; // toggle
  setSlotNote(slotId,ds,newVal);
  document.getElementById('ctxNoteInput').value=newVal;
  // Refresh activity buttons
  const pos=posOfSlot(slotId);
  const activities=pos?pos.activities||[]:[];
  const actRow=document.getElementById('ctxActivityRow');
  actRow.innerHTML=activities.map(a=>{
    const on=newVal===a;
    return `<button onclick="setCtxActivity('${a.replace(/'/g,"\\'")}')"`+
      ` style="padding:2px 7px;font-size:10px;border-radius:12px;border:1px solid ${on?'#0f766e':'var(--border)'};background:${on?'#ccfbf1':'transparent'};color:${on?'#0f766e':'var(--text2)'};cursor:pointer;white-space:nowrap">${a}</button>`;
  }).join('');
  autoSave();render();
}
function setCtxLocation(loc){
  if(!ctxTarget)return;
  const{slotId,ds}=ctxTarget;
  if(!slotLocations[ds])slotLocations[ds]={};
  if(loc==='Karlskrona')delete slotLocations[ds][slotId];
  else slotLocations[ds][slotId]=loc;
  if(!Object.keys(slotLocations[ds]).length)delete slotLocations[ds];
  // Update the buttons in place
  const locRow=document.getElementById('ctxLocRow');
  const curLoc=(slotLocations[ds]&&slotLocations[ds][slotId])||'Karlskrona';
  locRow.innerHTML=['Karlskrona','Karlshamn'].map(l=>{
    const on=curLoc===l;const short=l==='Karlshamn'?'KH':'KSK';
    return `<button onclick="setCtxLocation('${l}')" style="flex:1;padding:2px 0;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?(l==='Karlshamn'?'#1d4ed8':'var(--accent)'):'var(--border)'};background:${on?(l==='Karlshamn'?'#dbeafe':'var(--accent-light)'):'transparent'};color:${on?(l==='Karlshamn'?'#1d4ed8':'var(--accent)'):'var(--text2)'};cursor:pointer">${short}</button>`;
  }).join('');
  autoSave();render();
}
function ctxNoteChanged(val){
  if(!ctxTarget)return;
  setSlotNote(ctxTarget.slotId,ctxTarget.ds,val.trim());
  autoSave();
  // Re-render the slot cell without closing the menu
  render();
}
function setCtxHalf(half){
  if(!ctxTarget)return;
  setSlotHalf(ctxTarget.slotId,ctxTarget.ds,half);
  const halfRow=document.getElementById('ctxHalfRow');
  halfRow.innerHTML=['fm','','em'].map(h=>{
    const lbl=h==='fm'?'FM':h===''?'Heldag':'EM';const on=half===h;
    return `<button onclick="setCtxHalf('${h}')" style="flex:1;padding:3px 0;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?'var(--accent)':'var(--border)'};background:${on?'var(--accent-light)':'transparent'};color:${on?'var(--accent)':'var(--text2)'};cursor:pointer">${lbl}</button>`;
  }).join('');
  render();
}
// ── LEDIGHET CONTEXT MENUS ──
let _ledigCtxMode=null; // 'day'|'week'|'utb'|'sjuk'|'ausk'|'fl'|'jourfri'
let _ledigCtxDs=null;
let _ledigCtxWk=null;
let _sjukCtxType='sjuk'; // 'sjuk'|'vab'
let _jourfriCtxScope='week'; // 'week'|'weekend'

function openLedigCtx(e,ds){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();
  closeAllCtx();
  _ledigCtxMode='day';_ledigCtxDs=ds;
  const d=new Date(ds+'T12:00:00');
  document.getElementById('ctxLedigHead').innerHTML=
    `<span style="color:var(--ledighet)">Ledighet</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">${svDay(d)} ${d.getDate()} ${svMonth(d)}</span>`;
  document.getElementById('ctxLedigSubRow').style.display='none';
  _renderLedigCtxList();
  positionCtx('ctxLedig',e);
}

function openLedigWeekCtx(e,wn,yr){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();
  closeAllCtx();
  const wk=wkey(wn,yr);
  _ledigCtxMode='week';_ledigCtxWk=wk;
  document.getElementById('ctxLedigHead').innerHTML=
    `<span style="color:var(--ledighet)">Veckoledighet</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">v.${wn}</span>`;
  document.getElementById('ctxLedigSubRow').style.display='none';
  _renderLedigCtxList();
  positionCtx('ctxLedig',e);
}

function _wkDays(wk){
  const[yrStr,wnStr]=wk.split('-W');
  const mon=isoWeekMon(Number(wnStr),Number(yrStr));
  return [0,1,2,3,4].map(i=>isoDate(addDays(mon,i)));
}

function openInlineWeekCtx(e,mode,wn,yr){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();
  closeAllCtx();
  const wk=wkey(wn,yr);
  _ledigCtxMode=mode+'-week';_ledigCtxWk=wk;
  const labels={utb:'Utbildning',sjuk:'Sjukskrivning/VAB',ausk:'Auskultation/Intro',fl:'Föräldraledig',rand:'Randning'};
  const colors={utb:'var(--utb)',sjuk:'var(--sjuk)',ausk:'#7c3aed',fl:'var(--fl)',rand:'#b45309'};
  document.getElementById('ctxLedigHead').innerHTML=
    `<span style="color:${colors[mode]}">Hel vecka — ${labels[mode]}</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">v.${wn}</span>`;
  const subRow=document.getElementById('ctxLedigSubRow');
  if(mode==='sjuk'){subRow.style.display='flex';_renderSjukSubRow();}
  else{subRow.style.display='none';}
  const noteEl=document.getElementById('ctxLedigNote');if(noteEl&&mode==='utb')noteEl.value='';
  _renderLedigCtxList();
  positionCtx('ctxLedig',e);
}

function openInlineDayCtx(e,mode,ds){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();
  closeAllCtx();
  _ledigCtxMode=mode;_ledigCtxDs=ds;
  const d=new Date(ds+'T12:00:00');
  const labels={utb:'Utbildning',sjuk:'Sjukskrivning/VAB',ausk:'Auskultation/Intro',fl:'Föräldraledig',rand:'Randning'};
  const colors={utb:'var(--utb)',sjuk:'var(--sjuk)',ausk:'#7c3aed',fl:'var(--fl)',rand:'#b45309'};
  document.getElementById('ctxLedigHead').innerHTML=
    `<span style="color:${colors[mode]}">${labels[mode]}</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">${svDay(d)} ${d.getDate()} ${svMonth(d)}</span>`;
  const subRow=document.getElementById('ctxLedigSubRow');
  if(mode==='sjuk'){subRow.style.display='flex';_renderSjukSubRow();}
  else{subRow.style.display='none';}
  const noteEl=document.getElementById('ctxLedigNote');if(noteEl&&mode==='utb')noteEl.value='';
  _renderLedigCtxList();
  positionCtx('ctxLedig',e);
}

function openJourfriCtx(e,wn,yr){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();
  closeAllCtx();
  _ledigCtxMode='jourfri';_ledigCtxWk=wkey(wn,yr);
  document.getElementById('ctxLedigHead').innerHTML=
    `<span style="color:var(--jourledigt)">Jourfritt</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">v.${wn}</span>`;
  const subRow=document.getElementById('ctxLedigSubRow');
  subRow.style.display='flex';
  _renderJourfriSubRow();
  _renderLedigCtxList();
  positionCtx('ctxLedig',e);
}

function _renderSjukSubRow(){
  const subRow=document.getElementById('ctxLedigSubRow');
  subRow.innerHTML=['sjuk','vab'].map(t=>{
    const on=_sjukCtxType===t;
    const lbl=t==='sjuk'?'Sjuk':'VAB';
    const c=t==='vab'?'var(--vab)':'var(--sjuk)';
    const onBg=on?(t==='vab'?'var(--vab-light)':'var(--sjuk-light)'):'transparent';
    return `<button onclick="setSjukCtxType('${t}')" style="padding:2px 10px;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?c:'var(--border)'};background:${onBg};color:${on?c:'var(--text2)'};cursor:pointer">${lbl}</button>`;
  }).join('');
}
function setSjukCtxType(t){_sjukCtxType=t;_renderSjukSubRow();}

function _renderJourfriSubRow(){
  const subRow=document.getElementById('ctxLedigSubRow');
  subRow.innerHTML=['week','weekend'].map(s=>{
    const on=_jourfriCtxScope===s;
    const lbl=s==='week'?'Hela veckan':'Helg';
    return `<button onclick="setJourfriCtxScope('${s}')" style="padding:2px 10px;font-size:10px;font-weight:700;border-radius:4px;border:1px solid ${on?'var(--jourledigt)':'var(--border)'};background:${on?'var(--jourledigt-light)':'transparent'};color:${on?'var(--jourledigt)':'var(--text2)'};cursor:pointer">${lbl}</button>`;
  }).join('');
}
function setJourfriCtxScope(s){_jourfriCtxScope=s;_renderJourfriSubRow();_renderLedigCtxList();}

function _renderLedigCtxList(){
  const list=document.getElementById('ctxLedigList');
  list.innerHTML='';
  // Show note input only for utbildning modes
  const noteRow=document.getElementById('ctxLedigNoteRow');
  if(noteRow){const showNote=_ledigCtxMode==='utb'||_ledigCtxMode==='utb-week';noteRow.style.display=showNote?'block':'none';}
  const sorted=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  const modeColor={day:'var(--ledighet)',week:'var(--ledighet)',utb:'var(--utb)','utb-week':'var(--utb)',sjuk:'var(--sjuk)','sjuk-week':'var(--sjuk)',ausk:'#7c3aed','ausk-week':'#7c3aed',fl:'var(--fl)','fl-week':'var(--fl)',jourfri:'var(--jourledigt)',rand:'#b45309'};
  const modeBg={day:'var(--ledighet-light)',week:'var(--ledighet-light)',utb:'#f0fdf4','utb-week':'#f0fdf4',sjuk:'var(--sjuk-light)','sjuk-week':'var(--sjuk-light)',ausk:'#ede9fe','ausk-week':'#ede9fe',fl:'var(--fl-light)','fl-week':'var(--fl-light)',jourfri:'var(--jourledigt-light)',rand:'#fef9c3'};
  sorted.forEach(doc=>{
    let active=false,onskemal=false,badge='';
    const col=modeColor[_ledigCtxMode]||'var(--ledighet)';
    const bg=modeBg[_ledigCtxMode]||'var(--ledighet-light)';
    if(_ledigCtxMode==='day'){
      active=docHasLedighet(doc.id,_ledigCtxDs);
      onskemal=docHasLedighetOnskemal(doc.id,_ledigCtxDs);
    } else if(_ledigCtxMode==='week'){
      active=!!(ledighetVeckor[doc.id]&&ledighetVeckor[doc.id][_ledigCtxWk]);
    } else if(_ledigCtxMode==='utb'){
      active=!!(utbildningDagar[doc.id]&&utbildningDagar[doc.id][_ledigCtxDs]);
      onskemal=docHasUtbildningOnskemal(doc.id,_ledigCtxDs);
      if(active){const n=getUtbNote(doc.id,_ledigCtxDs);badge=`<span style="font-size:9px;color:${col};font-weight:700;flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✓${n?` <em>${n}</em>`:''}</span>`;}
    } else if(_ledigCtxMode==='sjuk'){
      const entry=(sjukskrivning[_ledigCtxDs]||[]).find(e=>e.docId===doc.id);
      active=!!entry;
      if(active){const t=entry.type||'sjuk';const tc=t==='vab'?'var(--vab)':'var(--sjuk)';badge=`<span style="font-size:9px;color:${tc};font-weight:700;flex-shrink:0">✓ ${t==='vab'?'VAB':'Sjuk'}</span>`;}
    } else if(_ledigCtxMode==='ausk'){
      active=(auskultationEntries[_ledigCtxDs]||[]).some(e=>e.docId===doc.id);
    } else if(_ledigCtxMode==='fl'){
      active=(foraldraledig[_ledigCtxDs]||[]).some(e=>e.docId===doc.id);
      onskemal=docHasFlOnskemal(doc.id,_ledigCtxDs);
    } else if(_ledigCtxMode==='rand'){
      active=!!(randningDagar[doc.id]&&randningDagar[doc.id][_ledigCtxDs]);
    } else if(_ledigCtxMode==='jourfri'){
      const entry=jourfriOnskad[doc.id]&&jourfriOnskad[doc.id][_ledigCtxWk];
      active=!!entry;
      onskemal=!!(jourfriOnskemal[doc.id]&&jourfriOnskemal[doc.id][_ledigCtxWk]);
      if(active){const lbl=entry.scope==='weekend'?'Helg':'Hela v.';badge=`<span style="font-size:9px;color:${col};font-weight:700;flex-shrink:0">✓ ${lbl}</span>`;}
    } else if(_ledigCtxMode==='utb-week'){
      active=!!(utbildningVeckor[doc.id]&&utbildningVeckor[doc.id][_ledigCtxWk]);
      if(active){const wv=utbildningVeckor[doc.id][_ledigCtxWk];const n=wv&&typeof wv==='object'?wv.note||'':'';badge=`<span style="font-size:9px;color:${col};font-weight:700;flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✓${n?` <em>${n}</em>`:''}</span>`;}
    } else if(_ledigCtxMode==='sjuk-week'){
      const wds=_wkDays(_ledigCtxWk);
      active=wds.some(ds=>(sjukskrivning[ds]||[]).some(e=>e.docId===doc.id));
      if(active){const t=(wds.map(ds=>(sjukskrivning[ds]||[]).find(e=>e.docId===doc.id)).find(Boolean)||{}).type||'sjuk';const tc=t==='vab'?'var(--vab)':'var(--sjuk)';badge=`<span style="font-size:9px;color:${tc};font-weight:700;flex-shrink:0">✓ ${t==='vab'?'VAB':'Sjuk'}</span>`;}
    } else if(_ledigCtxMode==='ausk-week'){
      const wds=_wkDays(_ledigCtxWk);
      active=wds.some(ds=>(auskultationEntries[ds]||[]).some(e=>e.docId===doc.id));
    } else if(_ledigCtxMode==='fl-week'){
      const wds=_wkDays(_ledigCtxWk);
      active=wds.some(ds=>(foraldraledig[ds]||[]).some(e=>e.docId===doc.id));
      onskemal=_wkDays(_ledigCtxWk).some(ds=>docHasFlOnskemal(doc.id,ds));
    }
    if(!badge){
      if(active)badge=`<span style="font-size:9px;color:${col};font-weight:700;flex-shrink:0">✓</span>`;
      else if(onskemal)badge=`<span style="font-size:9px;color:#b45309;flex-shrink:0">✋ Önskad</span>`;
    }
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(active?' selected':'');
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${badge}`;
    btn.style.background=active?bg:'';
    btn.onclick=()=>_toggleLedigCtxDoc(doc.id);
    list.appendChild(btn);
  });
}

function _toggleLedigCtxDoc(docId){
  const doc=docById(docId);
  if(_ledigCtxMode==='day'){
    const ds=_ledigCtxDs;
    const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);
    const wk=wkey(wn,yr);
    const hadDay=docHasLedighet(docId,ds);
    const hadWeek=!!(ledighetVeckor[docId]&&ledighetVeckor[docId][wk]);
    if(hadDay){
      if(ledighetRequests[docId])delete ledighetRequests[docId][ds];
    } else if(hadWeek){
      // Veckoledighet — ta bort hela veckoposten
      if(ledighetVeckor[docId])delete ledighetVeckor[docId][wk];
    } else {
      if(!ledighetRequests[docId])ledighetRequests[docId]={};
      ledighetRequests[docId][ds]=true;
      if(ledighetOnskemal[docId])delete ledighetOnskemal[docId][ds];
    }
    logChange(`${hadDay||hadWeek?'Tog bort':'Lade till'} ledighet: ${docShortName(doc)} (${hadWeek?wk:ds})`);
  } else if(_ledigCtxMode==='week'){
    const wk=_ledigCtxWk;
    const had=!!(ledighetVeckor[docId]&&ledighetVeckor[docId][wk]);
    if(had){
      if(ledighetVeckor[docId])delete ledighetVeckor[docId][wk];
    } else {
      if(!ledighetVeckor[docId])ledighetVeckor[docId]={};
      ledighetVeckor[docId][wk]=true;
      if(ledighetVeckorOnskemal[docId])delete ledighetVeckorOnskemal[docId][wk];
    }
    logChange(`${had?'Tog bort':'Lade till'} veckoledighet: ${docShortName(doc)} (${wk})`);
  } else if(_ledigCtxMode==='utb'){
    const ds=_ledigCtxDs;
    const had=!!(utbildningDagar[docId]&&utbildningDagar[docId][ds]);
    if(had){
      delete utbildningDagar[docId][ds];
    } else {
      if(!utbildningDagar[docId])utbildningDagar[docId]={};
      const noteVal=(document.getElementById('ctxLedigNote')?.value||'').trim();
      utbildningDagar[docId][ds]=noteVal?{note:noteVal}:true;
      if(utbildningOnskemal[docId])delete utbildningOnskemal[docId][ds];
    }
    logChange(`${had?'Tog bort':'Lade till'} utbildning: ${docShortName(doc)} (${ds})`);
  } else if(_ledigCtxMode==='sjuk'){
    const ds=_ledigCtxDs;
    const existing=(sjukskrivning[ds]||[]).find(e=>e.docId===docId);
    if(existing){
      sjukskrivning[ds]=sjukskrivning[ds].filter(e=>e.docId!==docId);
      if(!sjukskrivning[ds].length)delete sjukskrivning[ds];
    } else {
      if(!sjukskrivning[ds])sjukskrivning[ds]=[];
      sjukskrivning[ds].push({id:'sjuk_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),docId,type:_sjukCtxType});
    }
    logChange(`${existing?'Tog bort':'Lade till'} ${_sjukCtxType}: ${docShortName(doc)} (${ds})`);
  } else if(_ledigCtxMode==='ausk'){
    const ds=_ledigCtxDs;
    const existing=(auskultationEntries[ds]||[]).find(e=>e.docId===docId);
    if(existing){
      auskultationEntries[ds]=auskultationEntries[ds].filter(e=>e.docId!==docId);
      if(!auskultationEntries[ds].length)delete auskultationEntries[ds];
    } else {
      if(!auskultationEntries[ds])auskultationEntries[ds]=[];
      auskultationEntries[ds].push({id:'ausk_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),docId,place:'',note:''});
    }
    logChange(`${existing?'Tog bort':'Lade till'} auskultation: ${docShortName(doc)} (${ds})`);
  } else if(_ledigCtxMode==='fl'){
    const ds=_ledigCtxDs;
    const existing=(foraldraledig[ds]||[]).find(e=>e.docId===docId);
    if(existing){
      foraldraledig[ds]=foraldraledig[ds].filter(e=>e.docId!==docId);
      if(!foraldraledig[ds].length)delete foraldraledig[ds];
    } else {
      if(!foraldraledig[ds])foraldraledig[ds]=[];
      foraldraledig[ds].push({id:'fl_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),docId});
      if(foraldraledigenOnskemal[docId])delete foraldraledigenOnskemal[docId][ds];
    }
    logChange(`${existing?'Tog bort':'Lade till'} FL: ${docShortName(doc)} (${ds})`);
  } else if(_ledigCtxMode==='rand'){
    const ds=_ledigCtxDs;
    const had=!!(randningDagar[docId]&&randningDagar[docId][ds]);
    if(had){delete randningDagar[docId][ds];}
    else{if(!randningDagar[docId])randningDagar[docId]={};randningDagar[docId][ds]=true;}
    logChange(`${had?'Tog bort':'Lade till'} randning: ${docShortName(doc)} (${ds})`);
  } else if(_ledigCtxMode==='jourfri'){
    const wk=_ledigCtxWk;
    const had=!!(jourfriOnskad[docId]&&jourfriOnskad[docId][wk]);
    if(had){
      if(jourfriOnskad[docId])delete jourfriOnskad[docId][wk];
    } else {
      if(!jourfriOnskad[docId])jourfriOnskad[docId]={};
      jourfriOnskad[docId][wk]={scope:_jourfriCtxScope};
      if(jourfriOnskemal[docId])delete jourfriOnskemal[docId][wk];
    }
    logChange(`${had?'Tog bort':'Lade till'} jourfritt: ${docShortName(doc)} (${wk}, ${_jourfriCtxScope})`);
  } else if(_ledigCtxMode==='utb-week'){
    const wk=_ledigCtxWk;
    const had=!!(utbildningVeckor[docId]&&utbildningVeckor[docId][wk]);
    if(had){
      if(utbildningVeckor[docId])delete utbildningVeckor[docId][wk];
    } else {
      if(!utbildningVeckor[docId])utbildningVeckor[docId]={};
      const noteVal=(document.getElementById('ctxLedigNote')?.value||'').trim();
      utbildningVeckor[docId][wk]=noteVal?{note:noteVal}:true;
      if(utbildningOnskemal[docId]){_wkDays(wk).forEach(ds=>delete utbildningOnskemal[docId][ds]);}
    }
    logChange(`${had?'Tog bort':'Lade till'} utbildningsvecka: ${docShortName(doc)} (${wk})`);
  } else if(_ledigCtxMode==='sjuk-week'){
    const wds=_wkDays(_ledigCtxWk);
    const had=wds.some(ds=>(sjukskrivning[ds]||[]).some(e=>e.docId===docId));
    if(had){
      wds.forEach(ds=>{if(sjukskrivning[ds]){sjukskrivning[ds]=sjukskrivning[ds].filter(e=>e.docId!==docId);if(!sjukskrivning[ds].length)delete sjukskrivning[ds];}});
    } else {
      wds.forEach(ds=>{if(!(sjukskrivning[ds]||[]).some(e=>e.docId===docId)){if(!sjukskrivning[ds])sjukskrivning[ds]=[];sjukskrivning[ds].push({id:'sjuk_'+Date.now()+'_'+ds.slice(5),docId,type:_sjukCtxType});}});
    }
    logChange(`${had?'Tog bort':'Lade till'} ${_sjukCtxType} hela veckan: ${docShortName(doc)} (${_ledigCtxWk})`);
  } else if(_ledigCtxMode==='ausk-week'){
    const wds=_wkDays(_ledigCtxWk);
    const had=wds.some(ds=>(auskultationEntries[ds]||[]).some(e=>e.docId===docId));
    if(had){
      wds.forEach(ds=>{if(auskultationEntries[ds]){auskultationEntries[ds]=auskultationEntries[ds].filter(e=>e.docId!==docId);if(!auskultationEntries[ds].length)delete auskultationEntries[ds];}});
    } else {
      wds.forEach(ds=>{if(!(auskultationEntries[ds]||[]).some(e=>e.docId===docId)){if(!auskultationEntries[ds])auskultationEntries[ds]=[];auskultationEntries[ds].push({id:'ausk_'+Date.now()+'_'+ds.slice(5),docId,place:'',note:''});}});
    }
    logChange(`${had?'Tog bort':'Lade till'} auskultation hela veckan: ${docShortName(doc)} (${_ledigCtxWk})`);
  } else if(_ledigCtxMode==='fl-week'){
    const wds=_wkDays(_ledigCtxWk);
    const had=wds.some(ds=>(foraldraledig[ds]||[]).some(e=>e.docId===docId));
    if(had){
      wds.forEach(ds=>{if(foraldraledig[ds]){foraldraledig[ds]=foraldraledig[ds].filter(e=>e.docId!==docId);if(!foraldraledig[ds].length)delete foraldraledig[ds];}});
    } else {
      wds.forEach(ds=>{if(!(foraldraledig[ds]||[]).some(e=>e.docId===docId)){if(!foraldraledig[ds])foraldraledig[ds]=[];foraldraledig[ds].push({id:'fl_'+Date.now()+'_'+ds.slice(5),docId});if(foraldraledigenOnskemal[docId])delete foraldraledigenOnskemal[docId][ds];}});
    }
    logChange(`${had?'Tog bort':'Lade till'} FL hela veckan: ${docShortName(doc)} (${_ledigCtxWk})`);
  }
  autoSave();render();
  _renderLedigCtxList();
}

let _copySlotSource=null;
function openCopySlot(){
  if(!ctxTarget)return;
  _copySlotSource={...ctxTarget};
  closeAllCtx();
  renderCopySlotModal();
  openModal('copySlotModal');
}
function renderCopySlotModal(){
  if(!_copySlotSource)return;
  const{slotId,ds}=_copySlotSource;
  const pos=posOfSlot(slotId);
  const docId=getSlot(slotId,ds);
  const doc=docId?docById(docId):null;
  const[,fg]=posColor(pos?pos.colorIdx:0);
  document.getElementById('copySlotDesc').innerHTML=
    `<span style="color:${fg};font-weight:700">${pos?pos.name:'Pass'}</span>`+
    (doc?` — <strong>${docShortName(doc)}</strong>`:'')+
    ` <span style="color:var(--text3)">${svDay(new Date(ds))} ${new Date(ds).getDate()} ${svMonth(new Date(ds))}</span>`;
  // Active days for this position
  const spd=pos?.slotsPerDay;
  const posDays=spd?[1,2,3,4,5].filter(d=>spd[d]>0):(pos?.days?.length?pos.days:[1,2,3,4,5]);
  // Collect next 8 weeks of active days
  const today=new Date();today.setHours(0,0,0,0);
  const end=addDays(today,56);
  const weeks=[];
  let cur=new Date(today);
  while(cur<=end){
    const dow=cur.getDay(),cds=isoDate(cur);
    if(dow!==0&&dow!==6&&!isHoliday(cds)&&posDays.includes(dow)&&cds!==ds){
      const mon=getMonday(cur),wn=weekNum(mon),yr=weekYear(mon),wk=wkey(wn,yr);
      let wObj=weeks.find(w=>w.wk===wk);
      if(!wObj){wObj={wk,wn,days:[]};weeks.push(wObj);}
      wObj.days.push(new Date(cur));
    }
    cur=addDays(cur,1);
  }
  let html='';
  weeks.forEach(({wn,days})=>{
    html+=`<div style="font-size:10px;font-weight:700;color:var(--text3);padding:6px 2px 2px;letter-spacing:.04em;text-transform:uppercase">Vecka ${wn}</div>`;
    days.forEach(d=>{
      const dds=isoDate(d);
      const already=docId&&getSlot(slotId,dds)===docId;
      const elsewhere=docId?docAssignedElsewhere(docId,dds,slotId):null;
      const hasLed=docId?docHasAnyLedighet(docId,dds):false;
      const restricted=docId?(docRestrictedOnDate(docId,dds)&&docRestrictedOnDate(docId,dds)!=='Deltid'):false;
      const warnTxt=restricted?'⛔ Ej tillgänglig':hasLed?'Ledig':elsewhere?`→ ${elsewhere}`:'';
      const warnCol=restricted?'var(--red)':hasLed?'#b45309':'var(--warn)';
      html+=`<label style="display:flex;align-items:center;gap:8px;padding:4px 4px;border-radius:5px;cursor:${already||restricted?'default':'pointer'};${already?'opacity:.45':''}">
        <input type="checkbox" class="copySlotCb" value="${dds}" ${already||restricted?'disabled':''}${already?` title="Redan tillsatt"`:`${restricted?' title="Ej tillgänglig"':''}`} style="margin:0;accent-color:var(--accent)">
        <span style="flex:1;font-size:12px">${svDay(d)} ${d.getDate()} ${svMonth(d)}</span>
        ${warnTxt&&!already?`<span style="font-size:10px;color:${warnCol};flex-shrink:0">${warnTxt}</span>`:''}
        ${already?`<span style="font-size:10px;color:var(--text3)">✓ tillsatt</span>`:''}
      </label>`;
    });
  });
  if(!weeks.length)html=`<p style="font-size:12px;color:var(--text3);padding:8px 4px">Inga aktiva dagar hittades (8 veckor framåt).</p>`;
  document.getElementById('copySlotList').innerHTML=html;
}
function toggleCopySlotAll(checked){
  document.querySelectorAll('.copySlotCb:not(:disabled)').forEach(cb=>cb.checked=checked);
}
function confirmCopySlot(){
  if(!_copySlotSource)return;
  const{slotId,ds}=_copySlotSource;
  const docId=getSlot(slotId,ds);
  const note=getSlotNote(slotId,ds);
  const half=getSlotHalf(slotId,ds);
  const loc=slotLocations[ds]?.[slotId]||null;
  const pos=posOfSlot(slotId);
  const doc=docId?docById(docId):null;
  const targets=[...document.querySelectorAll('.copySlotCb:checked')].map(cb=>cb.value);
  if(!targets.length){showToast('Välj minst ett datum');return;}
  targets.forEach(tds=>{
    if(docId){
      // Clear doc from other blocking slots on target day (same logic as normal assignment)
      Object.entries(schedule[tds]||{}).forEach(([sid,did])=>{
        if(did!==docId||sid===slotId||getSlotHalf(sid,tds))return;
        const sp=posOfSlot(sid);const ss=sp?.slots.find(s=>s.slotId===sid);
        if(!ss?.noBlock)setSlot(sid,tds,'');
      });
      if(pos&&pos.id!=='pos_mott'&&!pos.slots[0]?.noBlock)clearDocFromMottagning(docId,tds);
      setSlot(slotId,tds,docId);
      if(half)setSlotHalf(slotId,tds,half);
      else{const dt=deltidOnDay(docId,tds);if(dt==='fm')setSlotHalf(slotId,tds,'em');else if(dt==='em')setSlotHalf(slotId,tds,'fm');}
    }
    if(note)setSlotNote(slotId,tds,note);
    if(loc){if(!slotLocations[tds])slotLocations[tds]={};slotLocations[tds][slotId]=loc;}
  });
  const docName=doc?docShortName(doc):'Passet';
  logChange(`Kopierade ${docName} (${pos?pos.name:slotId}) till ${targets.length} dag${targets.length>1?'ar':''}`);
  autoSave();render();
  closeModal('copySlotModal');
  showToast(`✓ Kopierat till ${targets.length} dag${targets.length>1?'ar':''}`);
}

function openWeekFillCtx(e,posId){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();closeAllCtx();
  const pos=positions.find(p=>p.id===posId);if(!pos)return;
  const[,fg]=posColor(pos.colorIdx);
  const mon=getMonday(currentDate);
  const wn=weekNum(mon),yr=weekYear(mon);
  const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
  const activeDays=Array.from({length:daySpan},(_,i)=>addDays(mon,i)).filter(d=>{
    const dow=d.getDay();
    return dow!==0&&dow!==6&&!isHoliday(isoDate(d))&&posDays.includes(dow);
  });
  if(!activeDays.length)return;
  ctxWeekTarget={posId,activeDays,wn,yr};
  document.getElementById('ctxHead').innerHTML=`<span style="color:${fg}">${pos.name}</span><span style="font-size:9px;font-weight:400;color:var(--text3);margin-left:5px">hela veckan</span>`;
  document.getElementById('ctxHalfRow').style.display='none';
  document.getElementById('ctxLocRow').style.display='none';
  document.getElementById('ctxActivityRow').style.display='none';
  document.getElementById('ctxNoteRow').style.display='none';
  const list=document.getElementById('ctxDocList');list.innerHTML='';
  function weekQual(doc){
    if(!docAllowedOnPos(doc,pos))return false;
    if(!pos.slots.some(s=>docMatchRole(doc,s.roleReq)))return false;
    return true;
  }
  const sorted=[...doctors].sort((a,b)=>{
    const aQ=weekQual(a),bQ=weekQual(b);
    const aP=(a.prefPositions||[]).includes(pos.id)&&aQ,bP=(b.prefPositions||[]).includes(pos.id)&&bQ;
    return(aP?0:aQ?1:2)-(bP?0:bQ?1:2);
  });
  let shP=false,shQ=false,shU=false;
  sorted.forEach(doc=>{
    const qual=weekQual(doc),pref=(doc.prefPositions||[]).includes(pos.id)&&qual;
    if(pref&&!shP){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#856404;padding:3px 7px 1px">★ Föredragna</div>');shP=true;}
    else if(!pref&&qual&&!shQ){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px">Kvalificerade</div>');shQ=true;}
    else if(!qual&&!shU){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px;opacity:.5">Ej kvalificerade</div>');shU=true;}
    const blockedCount=activeDays.filter(d=>{const r=docRestrictedOnDate(doc.id,isoDate(d));return r&&r!=='Deltid';}).length;
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    let notes='';
    if(blockedCount===activeDays.length)notes='<span style="font-size:9px;color:var(--warn);flex-shrink:0">Ej tillgänglig</span>';
    else if(blockedCount)notes=`<span style="font-size:9px;color:var(--warn);flex-shrink:0">${blockedCount}d blockad</span>`;
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(pref?' preferred':'')+(qual?'':' incompatible');
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${pref?'<span style="color:#856404">★</span>':''}${notes}`;
    btn.onclick=()=>{
      activeDays.forEach(d=>{
        const ds=isoDate(d);
        if(docRestrictedOnDate(doc.id,ds)&&docRestrictedOnDate(doc.id,ds)!=='Deltid')return;
        pos.slots.forEach(slot=>{
          if(!slot.noBlock)clearDocFromMottagning(doc.id,ds);
          setSlot(slot.slotId,ds,doc.id);
          if(!getSlotHalf(slot.slotId,ds)){
            const dt=deltidOnDay(doc.id,ds);
            if(dt==='fm')setSlotHalf(slot.slotId,ds,'em');
            else if(dt==='em')setSlotHalf(slot.slotId,ds,'fm');
          }
        });
      });
      logChange(`Placerade ${docShortName(doc)} på ${pos.name} hela veckan (v.${wn})`);
      autoSave();closeAllCtx();render();
    };
    list.appendChild(btn);
  });
  positionCtx('ctxMenu',e);
}
function ctxClear(){
  if(ctxWeekTarget){
    const{posId,activeDays}=ctxWeekTarget;
    const pos=positions.find(p=>p.id===posId);
    if(pos){
      activeDays.forEach(d=>{const ds=isoDate(d);pos.slots.forEach(slot=>setSlot(slot.slotId,ds,''));});
      logChange(`Rensade ${pos.name} hela veckan`);autoSave();
    }
    closeAllCtx();render();return;
  }
  if(ctxTarget){
    const prev=getSlot(ctxTarget.slotId,ctxTarget.ds);
    const prevDoc=prev?docById(prev):null;
    const pos=posOfSlot(ctxTarget.slotId);
    setSlot(ctxTarget.slotId,ctxTarget.ds,'');
    if(prevDoc)logChange(`Tog bort ${docShortName(prevDoc)} från ${pos?pos.name:'pass'} (${ctxTarget.ds})`);
    closeAllCtx();render();
  }
}

function openJVCtx(e,key,wn,yr){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxJVTarget={key,wn,yr};
  const colors={'JV1':'var(--jv1)','JV2':'var(--jv2)','NLO':'var(--nlo)'};
  document.getElementById('ctxJVHead').innerHTML=`<span style="color:${colors[key]}">${key==='NLO'?'NLÖ':key}</span> — vecka ${wn}`;
  const list=document.getElementById('ctxJVList');list.innerHTML='';
  const curDocId=getJV(wn,yr)[key];
  const _svA=(a,b)=>a.name.localeCompare(b.name,'sv');
  const eligible=doctors.filter(d=>(d.jv||[]).includes(key)).sort(_svA);
  const olOthers=doctors.filter(d=>!(d.jv||[]).includes(key)&&docIsOL(d)).sort(_svA);
  const rest=doctors.filter(d=>!(d.jv||[]).includes(key)&&!docIsOL(d)).sort(_svA);
  if(eligible.length)list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:2px 4px 3px">Jourveckeläkare</div>');
  // Precompute ledighet check dates: helg + spillvecka (ej ankarveckans mån–tor)
  // JV1: fre(+4) t.o.m. ons nästa vecka(+9); JV2: lör(+5) t.o.m. tor nästa vecka(+10); NLÖ: lör(+5)
  const _jvMon=isoWeekMon(wn,yr);
  const _offsets=key==='JV1'?[4,5,6,7,8,9]:key==='JV2'?[5,6,7,8,9,10]:[5];
  const _checkDs=_offsets.map(o=>isoDate(addDays(_jvMon,o)));
  const _groups=[...eligible,...(olOthers.length?[{_sep:'ol'}]:[]),...olOthers,...(rest.length?[{_sep:'rest'}]:[]),...rest];
  _groups.forEach(doc=>{
    if(doc._sep==='ol'){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:4px 4px 2px">Övriga ÖL</div>');return;}
    if(doc._sep==='rest'){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:4px 4px 2px;opacity:.5">Övriga</div>');return;}
    const isOther=rest.includes(doc);
    const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===doc.id);
    const blocked=!!conflict;
    // Kolla veckoledighet direkt på ankarveckan + dagsspecifik ledighet på helg/spill-datumen
    const hasLedighet=docHasLedighetVecka(doc.id,wn,yr)||_checkDs.some(ds=>docHasLedighet(doc.id,ds));
    const isOlOther=olOthers.includes(doc);
    const opacityVal=blocked?'.45':hasLedighet?'.55':isOther?'.45':isOlOther?'.85':'1';
    const div=document.createElement('div');div.style.cssText=`padding:5px 7px;border-radius:6px;border:1px solid var(--border);font-size:11px;cursor:${blocked?'not-allowed':'pointer'};background:var(--surface);display:flex;align-items:center;gap:6px;margin-bottom:3px;opacity:${opacityVal}`;
    if(curDocId===doc.id)div.style.cssText+=`border-color:${colors[key]};background:${key==='JV1'?'var(--jv1-light)':key==='JV2'?'var(--jv2-light)':'var(--nlo-light)'};`;
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    const noteHtml=conflict?`<span style="font-size:9px;color:var(--red)">${conflict[0]}</span>`:hasLedighet?`<span style="font-size:9px;color:#b45309;flex-shrink:0">Ledig</span>`:'';
    div.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1;font-weight:600">${doc.name}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${noteHtml}`;
    div.title=conflict?`Har redan ${conflict[0]} denna vecka`:hasLedighet?'Har godkänd ledighet denna vecka':'';
    div.onclick=()=>{
      const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===doc.id);
      if(conflict){showToast(`⚠ ${doc.name.split(' ')[0]} har redan ${conflict[0]} denna vecka`);return;}
      setJV(wn,yr,key,doc.id);
      const wk=wkey(wn,yr);if(!jourveckorManual[wk])jourveckorManual[wk]={};jourveckorManual[wk][key]=true;
      autoSave();closeAllCtx();render();
    };
    list.appendChild(div);
  });
  positionCtx('ctxJV',e);
}
function clearJVCtx(){if(ctxJVTarget){setJV(ctxJVTarget.wn,ctxJVTarget.yr,ctxJVTarget.key,null);closeAllCtx();render();}}

function openBJCtx(e,bjType,anchorDs){
  if(IS_DOCTOR_MODE)return;
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxBJTarget={bjType,anchorDs};
  const colors={'BJFS':'var(--bjfs)','BJLO':'var(--bjlo)','BJNV':'var(--bjnv)','HBJ':'var(--bjhd)','HJ':'var(--hd)'};
  const labels={'BJFS':'BJFS','BJLO':'BJLÖ','BJNV':'BJNV','HBJ':'HBJ','HJ':'HJ'};
  document.getElementById('ctxBJHead').innerHTML=`<span style="color:${colors[bjType]}">${labels[bjType]}</span>`;
  const list=document.getElementById('ctxBJList');list.innerHTML='';
  const cur=getBJ(anchorDs,bjType);
  const _svA2=(a,b)=>a.name.localeCompare(b.name,'sv');
  const _isEligibleBJ=d=>(d.bj||[]).includes(bjType)||(d.roles||[]).includes('Spec');
  const eligible=doctors.filter(_isEligibleBJ).sort(_svA2);
  const others=doctors.filter(d=>!_isEligibleBJ(d)).sort(_svA2);
  if(eligible.length)list.insertAdjacentHTML('beforeend',`<div style="font-size:9px;font-weight:700;color:${colors[bjType]};text-transform:uppercase;letter-spacing:.06em;padding:3px 7px 1px">Bakjourläkare</div>`);
  [...eligible,...(others.length?[{_sep:true}]:[]),...others].forEach(doc=>{
    if(doc._sep){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:3px 7px 1px;opacity:.5">Övriga</div>');return;}
    const isOther=others.includes(doc);
    const conflict=bjType==='BJNV'?bjnvConflict(doc.id,anchorDs):(bjType==='HBJ'||bjType==='HJ')?null:weekendBJConflict(doc.id,anchorDs);
    const hardBlock=bjType==='BJNV'?!!conflict:(bjType==='HBJ'||bjType==='HJ')?false:weekendBJTooClose(doc.id,anchorDs);
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(cur===doc.id?' selected':'')+(isOther||hardBlock?' incompatible':conflict?' incompatible':'');
    btn.title=conflict||'';
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${conflict?`<span style="font-size:9px;color:${hardBlock?'var(--red)':'var(--text2)'}">${conflict}</span>`:''}`;
    btn.onclick=()=>{if(hardBlock){showToast(`⚠ ${doc.name.split(' ')[0]}: ${conflict}`);return;}setBJ(anchorDs,bjType,doc.id);closeAllCtx();render();};
    list.appendChild(btn);
  });
  positionCtx('ctxBJ',e);
}
function clearBJCtx(){if(ctxBJTarget){setBJ(ctxBJTarget.anchorDs,ctxBJTarget.bjType,null);closeAllCtx();render();}}

function positionCtx(id,e){
  const menu=document.getElementById(id);
  // Place off-screen first to measure true dimensions
  menu.style.left='-9999px';menu.style.top='0px';
  menu.classList.add('visible');
  const mw=menu.offsetWidth||230,mh=menu.offsetHeight||400;
  const pad=8;
  const x=Math.min(e.clientX,window.innerWidth-mw-pad);
  const y=Math.min(e.clientY,window.innerHeight-mh-pad);
  menu.style.left=Math.max(pad,x)+'px';
  menu.style.top=Math.max(pad,y)+'px';
}
function closeAllCtx(){['ctxMenu','ctxJV','ctxBJ','ctxSpecial','ctxLedig'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('visible');});ctxTarget=null;ctxJVTarget=null;ctxBJTarget=null;ctxWeekTarget=null;ctxSpecialTarget=null;_ledigCtxMode=null;_ledigCtxDs=null;_ledigCtxWk=null;_sjukCtxType='sjuk';_jourfriCtxScope='week';}
document.addEventListener('click',closeAllCtx);
['ctxMenu','ctxJV','ctxBJ','ctxSpecial','ctxLedig'].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener('click',e=>e.stopPropagation());});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAllCtx();document.querySelectorAll('.modal-overlay.visible').forEach(m=>m.classList.remove('visible'));}});

function openRotationModal(){
  const {fromWn,toWn}=periodForRotation();
  const fEl=document.getElementById('rotFrom');
  const tEl=document.getElementById('rotTo');
  if(!fEl.value) fEl.value=fromWn;
  if(!tEl.value) tEl.value=toWn;
  renderRotationTable();renderBJRotationTable();renderBJNVRotationTable();openModal('rotationModal');
  setTimeout(_rotScrollToToday,50);
}

// ── Snabbtagning direkt från schemavyn ──
function quickRemoveUtb(e,docId,ds){
  e.stopPropagation();
  const mon=getMonday(new Date(ds+'T12:00:00'));
  const wk=wkey(weekNum(mon),weekYear(mon));
  let removed=false;
  if(utbildningDagar[docId]&&utbildningDagar[docId][ds]){delete utbildningDagar[docId][ds];removed=true;}
  else if(utbildningVeckor[docId]&&utbildningVeckor[docId][wk]){delete utbildningVeckor[docId][wk];removed=true;}
  if(removed){const doc=docById(docId);if(doc)logChange(`Tog bort utbildning: ${docShortName(doc)} (${ds})`);autoSave();render();}
}

function quickRemoveLedighet(e,docId,ds){
  e.stopPropagation();
  const mon=getMonday(new Date(ds+'T12:00:00'));
  const wk=wkey(weekNum(mon),weekYear(mon));
  let removed=false;
  if(ledighetRequests[docId]&&ledighetRequests[docId][ds]){delete ledighetRequests[docId][ds];removed=true;}
  else if(ledighetVeckor[docId]&&ledighetVeckor[docId][wk]){delete ledighetVeckor[docId][wk];removed=true;}
  if(removed){const doc=docById(docId);if(doc)logChange(`Tog bort ledighet: ${docShortName(doc)} (${ds})`);autoSave();render();}
}
