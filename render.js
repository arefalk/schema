function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);}
function openModal(id){document.getElementById(id).classList.add('visible');}
function closeModal(id){document.getElementById(id).classList.remove('visible');}

function setSpan(n){daySpan=n;document.getElementById('btn5').classList.toggle('active',n===5);document.getElementById('btn7').classList.toggle('active',n===7);render();}
function navigate(dir){currentDate.setDate(currentDate.getDate()+dir*7);render();}
function goToday(){currentDate=new Date();render();}

function initDragNav(){
  const el=document.getElementById('scheduleContainer');
  if(!el)return;

  // Trackpad horizontal swipe (wheel event)
  let lastNav=0;
  el.addEventListener('wheel',e=>{
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return; // ignore vertical-dominant scroll
    if(Math.abs(e.deltaX)<40)return;
    const now=Date.now();if(now-lastNav<800)return; // cooldown prevents momentum runaway
    lastNav=now;
    navigate(e.deltaX>0?1:-1);
  },{passive:true});

  // Touch swipe
  let tx=0,ty=0;
  el.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)navigate(dx<0?1:-1);
  },{passive:true});

  // Mouse drag (desktop)
  let mx=0,dragging=false;
  el.addEventListener('pointerdown',e=>{if(e.button!==0)return;mx=e.clientX;dragging=true;});
  window.addEventListener('pointerup',e=>{
    if(!dragging)return;dragging=false;
    const dx=e.clientX-mx;
    if(Math.abs(dx)>80)navigate(dx<0?1:-1);
  });
}
function updateStickyOffsets(){
  const wh=document.querySelector('.week-header');
  if(wh)document.documentElement.style.setProperty('--sched-th-top',wh.getBoundingClientRect().height+'px');
}
function render(){renderSidebar();renderStats();renderWarnings();renderWeek();autoSave();requestAnimationFrame(updateStickyOffsets);}

function renderSidebar(){
  document.getElementById('docCount').textContent=doctors.length;
  const mon=getMonday(currentDate),wn=weekNum(mon),yr=weekYear(mon),jv=getJV(wn,yr);
  const days=weekDays(mon,5),list=document.getElementById('doctorsList');
  list.innerHTML='';
  const ROLE_SORT={'ÖL':0,'BÖL':0,'Spec':1,'Konsult':2,'ST':3,'AT':3,'Rand':4};
  const sortedDocs=[...doctors].sort((a,b)=>(ROLE_SORT[a.roles[0]]??5)-(ROLE_SORT[b.roles[0]]??5));
  sortedDocs.forEach(doc=>{
    const passes=days.filter(d=>docIsAssignedOnDate(doc.id,isoDate(d))).length;
    const jvBadge=jv.JV1===doc.id?`<span class="tag" style="background:var(--jv1-light);color:var(--jv1)">JV1</span>`:jv.JV2===doc.id?`<span class="tag" style="background:var(--jv2-light);color:var(--jv2)">JV2</span>`:jv.NLO===doc.id?`<span class="tag" style="background:var(--nlo-light);color:var(--nlo)">NLÖ</span>`:'';
    const roleCls=docIsOL(doc)?'tag-ol':docIsUL(doc)?'tag-ul':'';
    const allowedBadges=(doc.allowedPositions||[]).slice(0,3).map(pid=>{const p=positions.find(x=>x.id===pid);if(!p)return'';const[bg,fg]=posColor(p.colorIdx);return`<span class="tag" style="background:${bg};color:${fg}">${p.name}</span>`;}).join('');
    const div=document.createElement('div');div.className='doctor-item';div.onclick=()=>openEditDoctorModal(doc.id);
    div.innerHTML=`<div class="doc-avatar" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><div class="doc-info"><div class="doc-name">${doc.name}</div><div class="doc-meta"><span class="tag ${roleCls}">${doc.roles[0]||'?'}</span>${jvBadge}${allowedBadges}</div></div><span class="doc-passes">${passes}p</span>`;
    list.appendChild(div);
  });
}

function renderStats(){
  const mon=getMonday(currentDate),wn=weekNum(mon),yr=weekYear(mon),jv=getJV(wn,yr);
  const days=weekDays(mon,5);
  let filled=0,warns=0;
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v){filled++;const doc=docById(v);if(doc&&!docCanFillSlot(doc,slot,ds))warns++;}});});
  const jv1d=jv.JV1?docById(jv.JV1):null,jv2d=jv.JV2?docById(jv.JV2):null,nlod=jv.NLO?docById(jv.NLO):null;
  const yr2s=mon.getFullYear(),mos=mon.getMonth();const nightWarnDocs=doctors.filter(doc=>countNightShiftsInMonth(doc.id,yr2s,mos)>4).map(d=>d.name.split(' ')[0]).join(', ')||'Ingen';
  document.getElementById('statsBar').innerHTML=`
    <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${filled}/${allSlots().length*5}</div><div class="stat-label">Dagslots tillsatta</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--jv1);font-size:13px;padding-top:3px">${jv1d?jv1d.name.split(' ')[0]:'—'}</div><div class="stat-label">JV1 denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--jv2);font-size:13px;padding-top:3px">${jv2d?jv2d.name.split(' ')[0]:'—'}</div><div class="stat-label">JV2 denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--nlo);font-size:13px;padding-top:3px">${nlod?nlod.name.split(' ')[0]:'—'}</div><div class="stat-label">NLÖ denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--warn)">${warns}</div><div class="stat-label">Varningar</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--bjnv);font-size:12px;padding-top:2px">${nightWarnDocs}</div><div class="stat-label">Över 4 journätter</div></div>`;
}

function renderWarnings(){
  const mon=getMonday(currentDate),days=weekDays(mon,5),wn=weekNum(mon),yr=weekYear(mon);
  const warns=[];
  // Slot qualification warnings
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v){const doc=docById(v);if(doc&&!docCanFillSlot(doc,slot,ds))warns.push(`${doc.name.split(' ')[0]}: ej kvalificerad för ${posOfSlot(slot.slotId)?.name||'slot'}`);}});});
  // Mandatory positions not filled (weekdays only, respect day restrictions)
  days.forEach(d=>{if(d.getDay()===0||d.getDay()===6)return;const ds=isoDate(d);mandatoryPositions.forEach(posId=>{const pos=positions.find(p=>p.id===posId);if(!pos)return;const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];if(!posDays.includes(d.getDay()))return;const allFilled=pos.slots.every(slot=>getSlot(slot.slotId,ds));if(!allFilled)warns.push(`${svDay(d)} ${d.getDate()}: obligatorisk position "${pos.name}" ej tillsatt`);});});
  // BJNV mandatory mån–tor
  days.forEach(d=>{const dow=d.getDay();if(dow<1||dow>4)return;const ds=isoDate(d);if(!getBJ(ds,'BJNV'))warns.push(`${svDay(d)} ${d.getDate()}: nattbakjour (BJNV) ej tillsatt`);});
  // BJNV: max 1 per vecka och inte i anslutning till helgbakjour
  days.forEach(d=>{const dow=d.getDay();if(dow<1||dow>4)return;const ds=isoDate(d);const docId=getBJ(ds,'BJNV');if(!docId)return;const doc=docById(docId);const c=bjnvConflict(docId,ds);if(c)warns.push(`${doc?.name.split(' ')[0]||docId}: BJNV ${svDay(d)} ${d.getDate()} — ${c}`);});
  // BJFS/BJLO: minst 2 jourfria helger mellan helgbakjourer
  {const mon=getMonday(currentDate);const friDs=isoDate(addDays(mon,4)),satDs=isoDate(addDays(mon,5));
  [['BJFS',friDs],['BJLO',satDs]].forEach(([type,ds])=>{const docId=getBJ(ds,type);if(!docId)return;const c=weekendBJConflict(docId,ds);if(c){const doc=docById(docId);warns.push(`${doc?.name.split(' ')[0]||docId}: ${type} — ${c}`);}});}
  // Night shift > 4/month warning
  const yr2=mon.getFullYear(),mo=mon.getMonth();
  doctors.forEach(doc=>{const cnt=countNightShiftsInMonth(doc.id,yr2,mo);if(cnt>4)warns.push(`${doc.name.split(' ')[0]}: ${cnt} journätter denna månad (max 4)`);});
  // Ledighet conflict: doctor assigned but has requested leave
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docHasAnyLedighet(v,ds))warns.push(`${docById(v)?.name.split(' ')[0]||v}: schemalagd på begärd ledighetsdag`);});});
  // Jourledig conflict: doctor assigned but is on post-call rest
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docIsJourledigt(v,ds))warns.push(`${docById(v)?.name.split(' ')[0]||v}: schemalagd på jourledigdag`);});});
  // Utbildning conflict: doctor assigned but has training
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docHasUtbildning(v,ds))warns.push(`${docById(v)?.name.split(' ')[0]||v}: schemalagd på utbildningsdag`);});});
  // Too many ledighet requests on same day (>half the doctors)
  days.forEach(d=>{const ds=isoDate(d);const cnt=doctors.filter(doc=>docHasAnyLedighet(doc.id,ds)).length;if(cnt>Math.floor(doctors.length/2)&&cnt>2)warns.push(`${svDay(d)} ${d.getDate()}: ${cnt} läkare har begärt ledigt`);});
  const badge=document.getElementById('warnBadge');
  if(warns.length>0){badge.style.display='flex';badge.innerHTML=`<div class="warn-badge" title="${warns.join('\n')}" style="cursor:help">⚠ ${warns.length} varning${warns.length>1?'ar':''}</div>`;}else badge.style.display='none';
}

function renderWeek(){
  const mon=getMonday(currentDate),days=weekDays(mon,daySpan),wn=weekNum(mon),yr=weekYear(mon);
  const from=`${mon.getDate()} ${svMonth(mon)}`,to=`${days[days.length-1].getDate()} ${svMonth(days[days.length-1])} ${days[days.length-1].getFullYear()}`;
  document.getElementById('weekTitle').innerHTML=`Vecka ${wn} <span>${from} – ${to}</span>`;
  const cols=days.length+1;

  let html=`<table class="week-table"><thead><tr><th style="min-width:130px">Position</th>`;
  days.forEach(d=>{
    const we=d.getDay()===0||d.getDay()===6;
    html+=`<th class="day-th${isToday(d)?' today-th':''}${we?' we-th':''}"><span class="day-num">${d.getDate()}</span><span class="day-wd">${svDay(d)}</span></th>`;
  });
  html+=`</tr></thead><tbody>`;

  const isDJPos=p=>/dagjour|bakjour/i.test(p.name)||p.id==='pos_dj'||p.id==='pos_dbj';
  const isMottPos=p=>p.section==='mott'||p.id==='pos_mott'||/mottagning/i.test(p.name);
  const posSortPriority=p=>/neonatal/i.test(p.name)?0:/avdelning/i.test(p.name)?1:5;
  const normalPos=positions.filter(p=>!isDJPos(p)&&!isMottPos(p)).sort((a,b)=>posSortPriority(a)-posSortPriority(b));
  const mottPos=positions.filter(p=>!isDJPos(p)&&isMottPos(p));

  function renderPosRow(pos){
    const[bg,fg]=posColor(pos.colorIdx);
    const s0=pos.slots[0];
    const roleLabel=s0.roleReq?`<span class="req-tag" style="background:${s0.roleReq==='ÖL'?'var(--ol-bg)':'var(--ul-bg)'};color:${s0.roleReq==='ÖL'?'var(--ol)':'var(--ul)'}">${s0.roleReq}</span>`:'';
    const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
    html+=`<tr class="pos-row"><td class="label-cell"><div class="pos-name-el" style="color:${fg}">${pos.name}</div><div class="pos-reqs">${roleLabel||'<span style="font-size:9px;color:var(--text3)">Alla befattningar</span>'}</div></td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      if(!we&&!posDays.includes(dow)){html+=`<td class="day-cell pos-inactive-day${isToday(d)?' today-cell':''}"></td>`;return;}
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}"><div class="slots-stack">`;
      pos.slots.forEach(slot=>{
        const val=getSlot(slot.slotId,ds),doc=val?docById(val):null,isWarn=doc&&!docCanFillSlot(doc,slot,ds),isPref=doc&&(doc.prefPositions||[]).includes(pos.id),isLed=doc&&docHasAnyLedighet(doc.id,ds);
        if(doc){
          const rc=docIsOL(doc)?'var(--ol)':docIsUL(doc)?'var(--ul)':'var(--text3)';
          const half=getSlotHalf(slot.slotId,ds);
          const halfBadge=half?`<span style="font-size:8px;font-weight:800;padding:0 3px;border-radius:2px;background:${fg}22;color:${fg};letter-spacing:.02em">${half.toUpperCase()}</span>`:'';
          html+=`<div class="aslot filled${isWarn?' warn':isLed?' warn':''}" style="background:${isLed?'#fce8e6':bg};border-color:${isLed?'var(--red)':fg+'33'}" title="${isLed?'⚠ Begärd ledighet':''}" onclick="openSlotCtx(event,'${slot.slotId}','${ds}')" oncontextmenu="openSlotCtx(event,'${slot.slotId}','${ds}')">
            <div class="stripe" style="background:${rc}"></div>
            <div class="si"><div class="savatar" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span class="sname" style="color:${fg}">${doc.name.split(' ')[0]}</span>${halfBadge}<span class="sbadge ${docIsOL(doc)?'ol':docIsUL(doc)?'ul':''}">${doc.roles[0]||''}</span>${isPref?'<span style="font-size:9px;color:#856404">★</span>':''}${isWarn?`<span style="position:absolute;right:4px;font-size:10px" title="${missingReqs(doc,slot,ds).join(', ')}">⚠</span>`:''}</div></div>`;
        } else {
          html+=`<div class="aslot" onclick="openSlotCtx(event,'${slot.slotId}','${ds}')" oncontextmenu="openSlotCtx(event,'${slot.slotId}','${ds}')"><span class="splus">+</span></div>`;
        }
      });
      html+=`</div></td>`;
    });
    html+=`</tr>`;
  }

  normalPos.forEach(renderPosRow);

  const djPos=positions.filter(isDJPos);
  if(djPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Dagjour</td></tr>`;
    djPos.forEach(pos=>{
      const[bg,fg]=posColor(pos.colorIdx);
      html+=`<tr class="pos-row"><td class="label-cell"><div class="pos-name-el" style="color:${fg}">${pos.name}</div></td>`;
      days.forEach(d=>{
        const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
        const slot=pos.slots[0],val=getSlot(slot.slotId,ds),doc=val?docById(val):null;
        html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
        if(doc){html+=`<div class="aslot filled jb-day" style="border-color:${fg}44" onclick="openSlotCtx(event,'${slot.slotId}','${ds}')" oncontextmenu="openSlotCtx(event,'${slot.slotId}','${ds}')"><div class="si"><div class="savatar" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span class="sname" style="color:${fg}">${doc.name.split(' ')[0]}</span><span class="sbadge ${docIsOL(doc)?'ol':docIsUL(doc)?'ul':''}">${doc.roles[0]}</span></div></div>`;}
        else{html+=`<div class="aslot" onclick="openSlotCtx(event,'${slot.slotId}','${ds}')" oncontextmenu="openSlotCtx(event,'${slot.slotId}','${ds}')"><span class="splus">+</span></div>`;}
        html+=`</td>`;
      });
      html+=`</tr>`;
    });
  }

  if(mottPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Mottagning</td></tr>`;
    mottPos.forEach(renderPosRow);
  }

  html+=`<tr class="section-hdr"><td colspan="${cols}">Primärjour</td></tr>`;
  [
    {key:'JV1', label:'JV1', color:'var(--jv1)', bg:'var(--jv1-light)'},
    {key:'JV2', label:'JV2', color:'var(--jv2)', bg:'var(--jv2-light)'},
    {key:'NLO', label:'NLÖ', color:'var(--nlo)', bg:'var(--nlo-light)'},
  ].forEach(({key,label,color,bg})=>{
    const jv=getJV(wn,yr),docId=jv[key],doc=docId?docById(docId):null;
    html+=`<tr class="pos-row"><td class="jv-label-cell" onclick="openJVCtx(event,'${key}',${wn},${yr})">
      <div class="jv-label-name" style="color:${color}">${label}</div>
      <div class="jv-label-who">`;
    if(doc){html+=`<div class="savatar" style="width:18px;height:18px;font-size:8px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="font-size:11px;font-weight:600;color:${color}">${doc.name.split(' ')[0]}</span>`;}
    else{html+=`<span style="font-size:11px;color:var(--text3)">+ Tilldela</span>`;}
    html+=`</div></td>`;
    days.forEach(d=>{
      const we=d.getDay()===0||d.getDay()===6;
      const shifts=jvShiftsOnDate(d,key);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(!shifts.length){html+=`<div style="min-height:28px"></div>`;}
      else{shifts.forEach(({shift,doc:sd})=>{const cls=shift.type==='night'?'jb-night':shift.type==='jourledigt'?'jb-jourledigt':'jb-day';const icon=shift.type==='night'?'🌙':shift.type==='jourledigt'?'✦':'☀';html+=`<div class="jv-block ${cls}" title="${shift.label}${sd?' — '+sd.name:''}"><span class="jv-icon">${icon}</span><span class="jv-name">${sd?sd.name.split(' ')[0]:'—'}</span><span class="jv-sub">${shift.type==='night'?'natt':shift.type==='jourledigt'?'ledigt':'dag'}</span></div>`;});}
      html+=`</td>`;
    });
    html+=`</tr>`;
  });

  html+=`<tr class="section-hdr"><td colspan="${cols}">Bakjour helg</td></tr>`;
  function bjBlock(s){const cls=s.type==='night'?'jb-night':s.type==='jourledigt'?'jb-jourledigt':'jb-day';const icon=s.type==='night'?'🌙':s.type==='jourledigt'?'✦':'☀';return`<div class="jv-block ${cls}"><span class="jv-icon">${icon}</span><span class="jv-name">${s.doc?s.doc.name.split(' ')[0]:'—'}</span><span class="jv-sub">${s.type==='jourledigt'?'ledigt':s.type}</span></div>`;}

  {
    const bjColor='var(--bjfs)',bjBg='var(--bjfs-light)';
    const thisFriDs=isoDate(addDays(mon,4));
    const bjfsDocId=getBJ(thisFriDs,'BJFS');
    const bjfsDoc=bjfsDocId?docById(bjfsDocId):null;
    html+=`<tr class="pos-row"><td class="label-cell" style="background:${bjBg};cursor:pointer" onclick="openBJCtx(event,'BJFS','${thisFriDs}')">
      <div class="pos-name-el" style="color:${bjColor}">BJFS</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Fre n · Sön d+n</span></div>
      ${bjfsDoc?`<div style="display:flex;align-items:center;gap:4px;margin-top:3px"><div class="savatar" style="width:16px;height:16px;font-size:7px;background:${bjfsDoc.color[0]};color:${bjfsDoc.color[1]}">${docInitials(bjfsDoc.name)}</div><span style="font-size:10px;font-weight:600;color:${bjColor}">${bjfsDoc.name.split(' ')[0]}</span></div>`:'<div style="font-size:10px;color:var(--text3);margin-top:2px">+ Tilldela</div>'}
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      const shifts=bjfsShiftsOnDate(d);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(dow===5){
        const existing=getBJ(ds,'BJFS'),edoc=existing?docById(existing):null;
        if(edoc){html+=`<div class="jv-block jb-night" style="cursor:pointer" onclick="openBJCtx(event,'BJFS','${ds}')"><span class="jv-icon">🌙</span><span class="jv-name">${edoc.name.split(' ')[0]}</span><span class="jv-sub">natt</span></div>`;}
        else{html+=`<div class="bj-slot empty-cell" onclick="openBJCtx(event,'BJFS','${ds}')"><span class="splus">+</span></div>`;}
      } else if(shifts.length){
        shifts.forEach(s=>{html+=bjBlock(s);});
      } else {html+=`<div style="min-height:28px"></div>`;}
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  {
    const bjColor='var(--bjlo)',bjBg='var(--bjlo-light)';
    const thisSatDs=isoDate(addDays(mon,5));
    const bjloDocId=getBJ(thisSatDs,'BJLO');
    const bjloDoc=bjloDocId?docById(bjloDocId):null;
    html+=`<tr class="pos-row"><td class="label-cell" style="background:${bjBg};cursor:pointer" onclick="openBJCtx(event,'BJLO','${thisSatDs}')">
      <div class="pos-name-el" style="color:${bjColor}">BJLÖ</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Lör d+n · Led mån</span></div>
      ${bjloDoc?`<div style="display:flex;align-items:center;gap:4px;margin-top:3px"><div class="savatar" style="width:16px;height:16px;font-size:7px;background:${bjloDoc.color[0]};color:${bjloDoc.color[1]}">${docInitials(bjloDoc.name)}</div><span style="font-size:10px;font-weight:600;color:${bjColor}">${bjloDoc.name.split(' ')[0]}</span></div>`:'<div style="font-size:10px;color:var(--text3);margin-top:2px">+ Tilldela</div>'}
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      const shifts=bjloShiftsOnDate(d);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(dow===6){
        const existing=getBJ(ds,'BJLO'),edoc=existing?docById(existing):null;
        if(edoc){html+=`<div style="display:flex;flex-direction:column;gap:2px;cursor:pointer" onclick="openBJCtx(event,'BJLO','${ds}')"><div class="jv-block jb-day"><span class="jv-icon">☀</span><span class="jv-name">${edoc.name.split(' ')[0]}</span><span class="jv-sub">dag</span></div><div class="jv-block jb-night"><span class="jv-icon">🌙</span><span class="jv-name">${edoc.name.split(' ')[0]}</span><span class="jv-sub">natt</span></div></div>`;}
        else{html+=`<div class="bj-slot empty-cell" onclick="openBJCtx(event,'BJLO','${ds}')"><span class="splus">+</span></div>`;}
      } else if(shifts.length){
        shifts.forEach(s=>{html+=bjBlock(s);});
      } else {html+=`<div style="min-height:28px"></div>`;}
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── NATTBAKJOUR VARDAG: BJNV — mån(1), tis(2), ons(3), tor(4) ──
  {
    const bjColor='var(--bjnv)',bjBg='var(--bjnv-light)';
    html+=`<tr class="section-hdr"><td colspan="${cols}">Bakjour vardag</td></tr>`;
    html+=`<tr class="pos-row"><td class="label-cell" style="background:${bjBg}">
      <div class="pos-name-el" style="color:${bjColor}">BJNV</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Mån–Tor natt</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      // Only show on Mon(1), Tue(2), Wed(3), Thu(4)
      if(dow>=1&&dow<=4){
        const existing=getBJ(ds,'BJNV'),edoc=existing?docById(existing):null;
        if(edoc){
          html+=`<div class="jv-block jb-night" style="cursor:pointer" onclick="openBJCtx(event,'BJNV','${ds}')"><span class="jv-icon">🌙</span><span class="jv-name">${edoc.name.split(' ')[0]}</span><span class="jv-sub">natt</span></div>`;
        } else {
          html+=`<div class="bj-slot empty-cell" onclick="openBJCtx(event,'BJNV','${ds}')"><span class="splus">+</span></div>`;
        }
      } else {
        html+=`<div style="min-height:28px"></div>`;
      }
      html+=`</td>`;
    });
    html+=`</tr>`;
  }


  // ── BVC: varje torsdag (dow=4) ──
  {
    const bvcColor='var(--bvc)',bvcBg='var(--bvc-light)';
    html+=`<tr class="section-hdr"><td colspan="${cols}">BVC &amp; Övrigt</td></tr>`;
    html+=`<tr class="pos-row"><td class="label-cell" style="background:${bvcBg}">
      <div class="pos-name-el" style="color:${bvcColor}">BVC</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Torsdag</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(dow===4){
        const docId=getBVC(ds),doc=docId?docById(docId):null;
        if(doc){html+=`<div class="jv-block jb-day" style="cursor:pointer;background:var(--bvc-light);border-color:#60c090;color:var(--bvc)" onclick="openBVCCtx(event,'${ds}')"><span class="jv-icon">🏥</span><span class="jv-name">${doc.name.split(' ')[0]}</span></div>`;}
        else{html+=`<div class="bj-slot empty-cell" onclick="openBVCCtx(event,'${ds}')"><span class="splus">+</span></div>`;}
      } else {html+=`<div style="min-height:28px"></div>`;}
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── JOURLEDIG ──
  {
    html+=`<tr class="pos-row"><td class="label-cell">
      <div class="pos-name-el" style="color:var(--jourledigt)">Jourledig</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Vila efter jour</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const jlDocs=doctors.filter(doc=>docIsJourledigt(doc.id,ds));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      jlDocs.forEach(doc=>{html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--jourledigt-light);border:1px solid var(--jourledigt)44;font-size:9px;font-weight:700;color:var(--jourledigt)">${doc.name.split(' ')[0]}</div>`;});
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── UTBILDNING ──
  {
    html+=`<tr class="pos-row"><td class="label-cell" style="cursor:pointer" onclick="openUtbildningModal()">
      <div class="pos-name-el" style="color:var(--utb)">Utbildning</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Kurser &amp; extern utb</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const utbDocs=doctors.filter(doc=>docHasUtbildning(doc.id,ds));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openUtbildningModal()">`;
      utbDocs.forEach(doc=>{
        html+=`<div class="utb-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px"><span style="font-size:9px">${doc.name.split(' ')[0]}</span></div>`;
      });
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── FÖRÄLDRALEDIGHET ──
  {
    html+=`<tr class="pos-row"><td class="label-cell" style="cursor:pointer" onclick="openForaldraledModal()">
      <div class="pos-name-el" style="color:var(--fl)">Föräldraledighet</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Hel- eller halvdag</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const flEntries=specialsOnDate(ds).filter(([k,v])=>v.type==='fl');
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openForaldraledModal()">`;
      flEntries.forEach(([k,v])=>{const doc=docById(v.docId);if(!doc)return;
        html+=`<div class="fl-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;cursor:pointer" onclick="event.stopPropagation();openSpecialCtx(event,'${ds}','${k}')"><span style="font-size:9px">${doc.name.split(' ')[0]}${v.halfDay?` (${v.halfDay})`:''}</span></div>`;
      });
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── ADMINISTRATION ──
  {
    html+=`<tr class="pos-row"><td class="label-cell">
      <div class="pos-name-el" style="color:#666">Administration</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Admin vid behov</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const entries=specialsOnDate(ds).filter(([k,v])=>v.type==='adm');
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      entries.forEach(([k,v])=>{const doc=docById(v.docId);if(!doc)return;
        html+=`<div class="adm-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;cursor:pointer" onclick="openSpecialCtx(event,'${ds}','${k}')"><span>ADM</span><span style="font-size:9px">${doc.name.split(' ')[0]}${v.halfDay?` (${v.halfDay})`:''}</span></div>`;
      });
      html+=`<div class="bj-slot empty-cell" style="min-height:22px;font-size:10px;color:var(--text3)" onclick="openAddSpecialModal('${ds}','adm')"><span style="font-size:12px;color:var(--border)">+</span></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── HANDLEDNING ──
  {
    html+=`<tr class="pos-row"><td class="label-cell">
      <div class="pos-name-el" style="color:#8a2060">Handledning</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">1 fm/em per ST/mån</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const entries=specialsOnDate(ds).filter(([k,v])=>v.type==='handledning');
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(entries.length){
        entries.forEach(([k,v])=>{const st=docById(v.docId),sup=docById(v.supervisorId);if(!st)return;
          html+=`<div class="handl-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;cursor:pointer" onclick="openSpecialCtx(event,'${ds}','${k}')"><span>🎓</span><span style="font-size:9px">${st.name.split(' ')[0]}${v.halfDay?' ('+v.halfDay+')':''}</span></div>`;
        });
      }
      html+=`<div class="bj-slot empty-cell" style="min-height:22px;font-size:10px;color:var(--text3)" onclick="openAddSpecialModal('${ds}','handledning')"><span style="font-size:12px;color:var(--border)">+</span></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  html+=`</tbody></table>`;
  document.getElementById('scheduleContainer').innerHTML=html;
}

