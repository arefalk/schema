function openSlotCtx(e,slotId,ds){
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxTarget={slotId,ds};
  const slot=slotById(slotId),pos=posOfSlot(slotId);
  const[,fg]=posColor(pos?pos.colorIdx:0);
  const roleLabel=slot&&slot.roleReq?` <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${slot.roleReq==='ÖL'?'var(--ol-bg)':'var(--ul-bg)'};color:${slot.roleReq==='ÖL'?'var(--ol)':'var(--ul)'}">${slot.roleReq}</span>`:'';
  document.getElementById('ctxHead').innerHTML=`<span style="color:${fg}">${pos?pos.name:'Slot'}</span>${roleLabel}`;
  const list=document.getElementById('ctxDocList');list.innerHTML='';
  const curVal=getSlot(slotId,ds);
  const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);
  const sorted=[...doctors].sort((a,b)=>{
    const aQ=slot?docCanFillSlot(a,slot,ds):true,bQ=slot?docCanFillSlot(b,slot,ds):true;
    const aP=pos&&(a.prefPositions||[]).includes(pos.id),bP=pos&&(b.prefPositions||[]).includes(pos.id);
    if(aP&&aQ&&!(bP&&bQ))return -1;if(bP&&bQ&&!(aP&&aQ))return 1;if(aQ&&!bQ)return -1;if(!aQ&&bQ)return 1;return 0;
  });
  let shP=false,shQ=false,shU=false;
  sorted.forEach(doc=>{
    const qual=slot?docCanFillSlot(doc,slot,ds):true;
    const pref=pos&&(doc.prefPositions||[]).includes(pos.id)&&qual;
    const hasJV=docHasJVThisWeek(doc.id,wn,yr);
    if(pref&&!shP){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#856404;padding:3px 7px 1px">★ Föredragna</div>');shP=true;}
    else if(!pref&&qual&&!shQ){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px">Kvalificerade</div>');shQ=true;}
    else if(!qual&&!shU){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);padding:3px 7px 1px;opacity:.5">Ej kvalificerade</div>');shU=true;}
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(pref?' preferred':'')+(curVal===doc.id?' selected':'')+(qual?'':' incompatible');
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${hasJV?`<span style="font-size:9px;color:var(--jv1)">JV</span>`:''}${pref?'<span style="color:#856404">★</span>':''}`;
    btn.onclick=()=>{if(qual){setSlot(slotId,ds,doc.id);if(pos&&pos.id!=='pos_mott')clearDocFromMottagning(doc.id,ds);closeAllCtx();render();}};
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
  positionCtx('ctxMenu',e);
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
function ctxClear(){if(ctxTarget){setSlot(ctxTarget.slotId,ctxTarget.ds,'');closeAllCtx();render();}}

function openJVCtx(e,key,wn,yr){
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxJVTarget={key,wn,yr};
  const colors={'JV1':'var(--jv1)','JV2':'var(--jv2)','NLO':'var(--nlo)'};
  document.getElementById('ctxJVHead').innerHTML=`<span style="color:${colors[key]}">${key==='NLO'?'NLÖ':key}</span> — vecka ${wn}`;
  const list=document.getElementById('ctxJVList');list.innerHTML='';
  const curDocId=getJV(wn,yr)[key];
  const eligible=doctors.filter(d=>(d.jv||[]).includes(key));
  const others=doctors.filter(d=>!(d.jv||[]).includes(key));
  if(eligible.length)list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:2px 4px 3px">Jourveckeläkare</div>');
  [...eligible,...(others.length?[{_sep:true}]:[]),...others].forEach(doc=>{
    if(doc._sep){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:4px 4px 2px;opacity:.6">Övriga</div>');return;}
    const isOther=!eligible.includes(doc);
    const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===doc.id);
    const div=document.createElement('div');div.style.cssText=`padding:5px 7px;border-radius:6px;border:1px solid var(--border);font-size:11px;cursor:${conflict?'not-allowed':'pointer'};background:var(--surface);display:flex;align-items:center;gap:6px;margin-bottom:3px;${isOther||conflict?'opacity:.45':''}`;
    if(curDocId===doc.id)div.style.cssText+=`border-color:${colors[key]};background:${key==='JV1'?'var(--jv1-light)':key==='JV2'?'var(--jv2-light)':'var(--nlo-light)'};`;
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    div.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1;font-weight:600">${doc.name}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${conflict?`<span style="font-size:9px;color:var(--red)">${conflict[0]}</span>`:''}`;
    div.title=conflict?`Har redan ${conflict[0]} denna vecka`:'';
    div.onclick=()=>{
      const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===doc.id);
      if(conflict){showToast(`⚠ ${doc.name.split(' ')[0]} har redan ${conflict[0]} denna vecka`);return;}
      setJV(wn,yr,key,doc.id);closeAllCtx();render();
    };
    list.appendChild(div);
  });
  positionCtx('ctxJV',e);
}
function clearJVCtx(){if(ctxJVTarget){setJV(ctxJVTarget.wn,ctxJVTarget.yr,ctxJVTarget.key,null);closeAllCtx();render();}}

function openBJCtx(e,bjType,anchorDs){
  e.preventDefault();e.stopPropagation();closeAllCtx();
  ctxBJTarget={bjType,anchorDs};
  const colors={'BJFS':'var(--bjfs)','BJLO':'var(--bjlo)','BJNV':'var(--bjnv)'};
  const labels={'BJFS':'BJFS','BJLO':'BJLÖ','BJNV':'BJNV'};
  document.getElementById('ctxBJHead').innerHTML=`<span style="color:${colors[bjType]}">${labels[bjType]}</span>`;
  const list=document.getElementById('ctxBJList');list.innerHTML='';
  const cur=getBJ(anchorDs,bjType);
  const anyHasBJ=doctors.some(d=>(d.bj||[]).includes(bjType));
  const eligible=anyHasBJ?doctors.filter(d=>(d.bj||[]).includes(bjType)):doctors;
  const others=anyHasBJ?doctors.filter(d=>!(d.bj||[]).includes(bjType)):[];
  if(anyHasBJ)list.insertAdjacentHTML('beforeend',`<div style="font-size:9px;font-weight:700;color:${colors[bjType]};text-transform:uppercase;letter-spacing:.06em;padding:3px 7px 1px">Bakjourläkare</div>`);
  [...eligible,...(others.length?[{_sep:true}]:[]),...others].forEach(doc=>{
    if(doc._sep){list.insertAdjacentHTML('beforeend','<div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;padding:3px 7px 1px;opacity:.5">Övriga</div>');return;}
    const isOther=others.includes(doc);
    const conflict=bjType==='BJNV'?bjnvConflict(doc.id,anchorDs):null;
    const btn=document.createElement('button');
    btn.className='ctx-doc-btn'+(cur===doc.id?' selected':'')+(isOther||conflict?' incompatible':'');
    btn.title=conflict||'';
    const rc=docIsOL(doc)?'ol':docIsUL(doc)?'ul':'';
    btn.innerHTML=`<div class="ctx-dav" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="flex:1">${doc.name.split(' ')[0]} ${doc.name.split(' ').slice(-1)[0]}</span><span class="sbadge ${rc}">${doc.roles[0]||''}</span>${conflict?`<span style="font-size:9px;color:var(--red)">${conflict}</span>`:''}`;
    btn.onclick=()=>{if(conflict){showToast(`⚠ ${doc.name.split(' ')[0]}: ${conflict}`);return;}setBJ(anchorDs,bjType,doc.id);closeAllCtx();render();};
    list.appendChild(btn);
  });
  positionCtx('ctxBJ',e);
}
function clearBJCtx(){if(ctxBJTarget){setBJ(ctxBJTarget.anchorDs,ctxBJTarget.bjType,null);closeAllCtx();render();}}

function positionCtx(id,e){const menu=document.getElementById(id);menu.style.left=Math.min(e.clientX,window.innerWidth-230)+'px';menu.style.top=Math.min(e.clientY,window.innerHeight-320)+'px';menu.classList.add('visible');}
function closeAllCtx(){['ctxMenu','ctxJV','ctxBJ','ctxBVC','ctxSpecial'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('visible');});ctxTarget=null;ctxJVTarget=null;ctxBJTarget=null;ctxBVCTarget=null;ctxSpecialTarget=null;}
document.addEventListener('click',closeAllCtx);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAllCtx();document.querySelectorAll('.modal-overlay.visible').forEach(m=>m.classList.remove('visible'));}});

function openRotationModal(){
  const {fromWn,toWn}=periodForRotation();
  const fEl=document.getElementById('rotFrom');
  const tEl=document.getElementById('rotTo');
  if(!fEl.value) fEl.value=fromWn;
  if(!tEl.value) tEl.value=toWn;
  renderRotationTable();renderBJRotationTable();openModal('rotationModal');
}
