function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);}
function openModal(id){
  const el=document.getElementById(id);
  const open=[...document.querySelectorAll('.modal-overlay.visible')];
  const maxZ=open.reduce((m,n)=>Math.max(m,parseInt(n.style.zIndex||500)),500);
  el.style.zIndex=maxZ+(open.length?1:0);
  el.classList.add('visible');
}
function closeModal(id){document.getElementById(id).classList.remove('visible');}
function openDoctorListModal(){openModal('doctorListModal');}

function setSpan(n){daySpan=n;viewMode='week';document.getElementById('btn5').classList.toggle('active',n===5);document.getElementById('btn7').classList.toggle('active',n===7);document.getElementById('btnMonth').classList.remove('active');render();}
function setViewMode(mode){
  viewMode=mode;
  document.getElementById('btn5').classList.toggle('active',mode==='week'&&daySpan===5);
  document.getElementById('btn7').classList.toggle('active',mode==='week'&&daySpan===7);
  document.getElementById('btnMonth').classList.toggle('active',mode==='month');
  render();
}
function navigate(dir){
  if(viewMode==='month'){currentDate.setMonth(currentDate.getMonth()+dir);render();}
  else{currentDate.setDate(currentDate.getDate()+dir*7);render();}
}
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
function render(){renderSidebar();renderStats();renderWarnings();if(viewMode==='month')renderMonth();else renderWeek();requestAnimationFrame(updateStickyOffsets);}

function renderSidebar(){
  document.getElementById('docCount').textContent=doctors.length;
  const mon=getMonday(currentDate),wn=weekNum(mon),yr=weekYear(mon);
  const prevMon=addDays(mon,-7),jv=getJV(weekNum(prevMon),weekYear(prevMon)),jvCur=getJV(wn,yr);
  const days=weekDays(mon,5),list=document.getElementById('doctorsList');
  list.innerHTML='';
  const sortedDocs=[...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv'));
  function makeDocItem(doc){
    const passes=days.filter(d=>docIsAssignedOnDate(doc.id,isoDate(d))).length;
    const hasJV=jv.JV1===doc.id||jv.JV2===doc.id||jvCur.NLO===doc.id;
    const jvBadge=jv.JV1===doc.id?`<span class="tag" style="background:var(--jv1-light);color:var(--jv1)">JV1</span>`:jv.JV2===doc.id?`<span class="tag" style="background:var(--jv2-light);color:var(--jv2)">JV2</span>`:jvCur.NLO===doc.id?`<span class="tag" style="background:var(--nlo-light);color:var(--nlo)">NLÖ</span>`:'';
    const roleCls=docIsOL(doc)?'tag-ol':docIsUL(doc)?'tag-ul':'';
    const allowedBadges=(doc.allowedPositions||[]).slice(0,3).map(pid=>{const p=positions.find(x=>x.id===pid);if(!p)return'';const[bg,fg]=posColor(p.colorIdx);return`<span class="tag" style="background:${bg};color:${fg}">${p.name}</span>`;}).join('');
    const todayDs=isoDate(currentDate);
    const deltidToday=deltidOnDay(doc.id,todayDs);
    const isOffToday=deltidToday==='hel';
    const deltidBadge=deltidToday?`<span class="tag" style="background:var(--deltid-light);color:var(--deltid);font-size:8px">${deltidToday==='hel'?'Deltid hel':deltidToday==='fm'?'Deltid fm':'Deltid em'}</span>`:'';
    const todayDsStr=todayDs;
    const isActive=docIsActive(doc,todayDsStr);
    const notYetStarted=doc.employmentStart&&todayDsStr<doc.employmentStart;
    const hasEnded=doc.employmentEnd&&todayDsStr>doc.employmentEnd;
    const empBadge=notYetStarted
      ?`<span class="tag" style="background:#e0f0ff;color:#1a5fa0;font-size:8px">Börjar ${doc.employmentStart}</span>`
      :hasEnded
      ?`<span class="tag" style="background:#f0e0e0;color:#9a1a1a;font-size:8px">Slutade ${doc.employmentEnd}</span>`
      :doc.employmentEnd
      ?`<span class="tag" style="background:#f5f5f5;color:var(--text3);font-size:8px">Slutar ${doc.employmentEnd}</span>`
      :'';
    const div=document.createElement('div');div.className='doctor-item';if(!IS_DOCTOR_MODE)div.onclick=()=>openEditDoctorModal(doc.id);else div.style.cursor='default';
    if(isOffToday||!isActive)div.style.opacity=isActive?'0.45':'0.35';
    div.innerHTML=`<div class="doc-avatar" style="background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><div class="doc-info"><div class="doc-name">${doc.name}</div><div class="doc-meta"><span class="tag ${roleCls}">${doc.roles[0]||'?'}</span>${jvBadge}${deltidBadge}${empBadge}${allowedBadges}</div></div><span class="doc-passes">${passes}p</span>`;
    return{div,placed:passes>0||hasJV||isOffToday||!isActive};
  }
  const placed=[],unplaced=[];
  sortedDocs.forEach(doc=>{const{div,placed:p}=makeDocItem(doc);(p?placed:unplaced).push(div);});
  placed.forEach(d=>list.appendChild(d));
  unplaced.forEach(d=>list.appendChild(d));
}

function renderStats(){
  const mon=getMonday(currentDate),wn=weekNum(mon),yr=weekYear(mon);
  const prevMon=addDays(mon,-7),jv=getJV(weekNum(prevMon),weekYear(prevMon)),jvCur=getJV(wn,yr);
  const days=weekDays(mon,5);
  let filled=0,warns=0;
  let totalSlots=0;
  days.forEach(d=>{const dow=d.getDay();const ds=isoDate(d);allSlots().forEach(slot=>{const pos=posOfSlot(slot.slotId);if(pos&&pos.days&&pos.days.length&&!pos.days.includes(dow))return;totalSlots++;const v=getSlot(slot.slotId,ds);if(v){filled++;const doc=docById(v);if(doc&&!docCanFillSlot(doc,slot,ds))warns++;}});});
  const jv1d=jv.JV1?docById(jv.JV1):null,jv2d=jv.JV2?docById(jv.JV2):null,nlod=jvCur.NLO?docById(jvCur.NLO):null;
  const yr2s=mon.getFullYear(),mos=mon.getMonth();const nightWarnDocs=doctors.filter(doc=>countNightShiftsInMonth(doc.id,yr2s,mos)>4).map(d=>docShortName(d)).join(', ')||'Ingen';
  document.getElementById('statsBar').innerHTML=`
    <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${filled}/${totalSlots}</div><div class="stat-label">Dagslots tillsatta</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--jv1);font-size:13px;padding-top:3px">${jv1d?docShortName(jv1d):'—'}</div><div class="stat-label">JV1 denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--jv2);font-size:13px;padding-top:3px">${jv2d?docShortName(jv2d):'—'}</div><div class="stat-label">JV2 denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--nlo);font-size:13px;padding-top:3px">${nlod?docShortName(nlod):'—'}</div><div class="stat-label">NLÖ denna vecka</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--warn)">${warns}</div><div class="stat-label">Varningar</div></div>
    <div class="stat-card"><div class="stat-val" style="color:var(--bjnv);font-size:12px;padding-top:2px">${nightWarnDocs}</div><div class="stat-label">Över 4 journätter</div></div>`;
}

function renderWarnings(){
  const mon=getMonday(currentDate),days=weekDays(mon,5),wn=weekNum(mon),yr=weekYear(mon);
  const warns=[];
  // Slot qualification warnings — visa specifik orsak, inte bara "ej kvalificerad"
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v){const doc=docById(v);if(doc&&!docCanFillSlot(doc,slot,ds)){const pos=posOfSlot(slot.slotId);const reasons=missingReqs(doc,slot,ds);warns.push(`${docShortName(doc)}: ${pos?.name||'slot'} — ${reasons.join(', ')}`);}}}); });
  // Mandatory positions not filled (weekdays only, respect day restrictions)
  days.forEach(d=>{if(d.getDay()===0||d.getDay()===6)return;const ds=isoDate(d),dow2=d.getDay();mandatoryPositions.forEach(posId=>{const pos=positions.find(p=>p.id===posId);if(!pos)return;if(!posDayActiveThisWeek(pos,dow2,wn))return;const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];if(!posDays.includes(dow2))return;const minReq=getMinFill(posId,ds);const filled=pos.slots.filter(s=>!s.noBlock&&getSlot(s.slotId,ds)).length;if(filled<minReq)warns.push(`${svDay(d)} ${d.getDate()}: "${pos.name}" — ${filled}/${minReq} tillsatt`);});});
  // BJNV mandatory mån–tor
  days.forEach(d=>{const dow=d.getDay();if(dow<1||dow>4)return;const ds=isoDate(d);if(!getBJ(ds,'BJNV'))warns.push(`${svDay(d)} ${d.getDate()}: nattbakjour (BJNV) ej tillsatt`);});
  // BJNV: max 1 per vecka och inte i anslutning till helgbakjour
  days.forEach(d=>{const dow=d.getDay();if(dow<1||dow>4)return;const ds=isoDate(d);const docId=getBJ(ds,'BJNV');if(!docId)return;const doc=docById(docId);const c=bjnvConflict(docId,ds);if(c)warns.push(`${(doc?docShortName(doc):docId)}: BJNV ${svDay(d)} ${d.getDate()} — ${c}`);});
  // BJFS/BJLO: minst 2 jourfria helger mellan helgbakjourer
  {const mon=getMonday(currentDate);const friDs=isoDate(addDays(mon,4)),satDs=isoDate(addDays(mon,5));
  [['BJFS',friDs],['BJLO',satDs]].forEach(([type,ds])=>{const docId=getBJ(ds,type);if(!docId)return;const c=weekendBJConflict(docId,ds);if(c){const doc=docById(docId);warns.push(`${(doc?docShortName(doc):docId)}: ${type} — ${c}`);}});}
  // Night shift > 4/month warning
  const yr2=mon.getFullYear(),mo=mon.getMonth();
  doctors.forEach(doc=>{const cnt=countNightShiftsInMonth(doc.id,yr2,mo);if(cnt>4)warns.push(`${docShortName(doc)}: ${cnt} journätter denna månad (max 4)`);});
  // Ledighet conflict: doctor assigned but has approved leave
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docHasAnyLedighet(v,ds))warns.push(`${(docById(v)?docShortName(docById(v)):v)}: schemalagd på godkänd ledighetsdag`);});});
  // Ledighet önskemål: doctor assigned but has pending leave request
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&!docHasAnyLedighet(v,ds)&&docHasLedighetOnskemal(v,ds))warns.push(`${(docById(v)?docShortName(docById(v)):v)}: schemalagd på dag med önskat ledigt`);});});
  // Jourledig conflict: doctor assigned but is on post-call rest
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docIsJourledigt(v,ds))warns.push(`${(docById(v)?docShortName(docById(v)):v)}: schemalagd på jourledigdag`);});});
  // Utbildning conflict: doctor assigned but has training
  days.forEach(d=>{const ds=isoDate(d);allSlots().forEach(slot=>{const v=getSlot(slot.slotId,ds);if(v&&docHasUtbildning(v,ds))warns.push(`${(docById(v)?docShortName(docById(v)):v)}: schemalagd på utbildningsdag`);});});
  // Too many ledighet requests on same day (>half the doctors)
  days.forEach(d=>{const ds=isoDate(d);const cnt=doctors.filter(doc=>docHasAnyLedighet(doc.id,ds)).length;if(cnt>Math.floor(doctors.length/2)&&cnt>2)warns.push(`${svDay(d)} ${d.getDate()}: ${cnt} läkare har begärt ledigt`);});
  window._lastWarns=warns;
  const badge=document.getElementById('warnBadge');
  if(warns.length>0){badge.style.display='flex';badge.innerHTML=`<div class="warn-badge" onclick="toggleWarnPopover(event)" style="cursor:pointer">⚠ ${warns.length} varning${warns.length>1?'ar':''}</div>`;}else badge.style.display='none';
}

function renderWeek(){
  const mon=getMonday(currentDate),days=weekDays(mon,daySpan),wn=weekNum(mon),yr=weekYear(mon);
  const from=`${mon.getDate()} ${svMonth(mon)}`,to=`${days[days.length-1].getDate()} ${svMonth(days[days.length-1])} ${days[days.length-1].getFullYear()}`;
  document.getElementById('weekTitle').innerHTML=`Vecka ${wn} <span>${from} – ${to}</span>`;
  const cols=days.length+1;

  // Bemanningsindikator: räkna fyllda/totala obligatoriska slots per dag
  function staffingIndicator(ds){
    const d2=new Date(ds+'T12:00:00'),dow=d2.getDay();
    if(dow===0||dow===6||isHoliday(ds))return null;
    let total=0,filled=0;
    positions.forEach(pos=>{
      if(!mandatoryPositions.has(pos.id))return;
      const pd=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
      if(!pd.includes(dow))return;
      const minReq=getMinFill(pos.id,ds);
      const filledN=pos.slots.filter(s=>!s.noBlock&&getSlot(s.slotId,ds)).length;
      total+=minReq;
      filled+=Math.min(filledN,minReq);
    });
    if(!total)return null;
    const pct=filled/total;
    const col=pct===1?'#16a34a':pct>=0.5?'#d97706':'#dc2626';
    const bg=pct===1?'#dcfce7':pct>=0.5?'#fef3c7':'#fee2e2';
    return`<div title="Bemannat: ${filled}/${total} obligatoriska pass" style="display:inline-flex;align-items:center;gap:3px;margin-top:3px;padding:1px 5px;border-radius:10px;background:${bg};border:1px solid ${col}44;font-size:8px;font-weight:700;color:${col};cursor:default"><span style="width:5px;height:5px;border-radius:50%;background:${col};display:inline-block"></span>${filled}/${total}</div>`;
  }

  let html=`<table class="week-table${daySpan===7?' span7':''}"><thead><tr><th style="min-width:130px">Position</th>`;
  days.forEach(d=>{
    const we=d.getDay()===0||d.getDay()===6;
    const ds=isoDate(d);
    const hdName=isHoliday(ds);
    const dow_h=d.getDay();
    const hasFmOnly=!we&&positions.some(p=>posIsFmOnly(p,dow_h));
    html+=`<th class="day-th${isToday(d)?' today-th':''}${we?' we-th':''}${hdName&&!we?' hd-th':''}">`;
    if(hdName)html+=`<div class="hd-name">${hdName}</div>`;
    html+=`<span class="day-num">${d.getDate()}</span><span class="day-wd">${svDay(d)}</span>`;
    const hasEmOnly=!we&&positions.some(p=>posIsEmOnly(p,dow_h));
    if(hasFmOnly)html+=`<div style="font-size:9px;font-weight:700;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:3px;padding:0 4px;margin-top:2px;display:inline-block">FM</div>`;
    if(hasEmOnly)html+=`<div style="font-size:9px;font-weight:700;color:#1e3a8a;background:#eff6ff;border:1px solid #bfdbfe;border-radius:3px;padding:0 4px;margin-top:2px;display:inline-block">EM</div>`;
    const ind=staffingIndicator(ds);
    if(ind)html+=ind;
    html+=`</th>`;
  });
  html+=`</tr></thead><tbody>`;

  const isDJPos=p=>/dagjour|bakjour|kvällsjour/i.test(p.name)||p.id==='pos_dj'||p.id==='pos_dbj'||p.id==='pos_kj';
  const isDagvard=p=>p.id==='pos_dagvard'||p.section==='dagvard';
  const isBVC=p=>p.id==='pos_bvc';
  const isGenMott=p=>p.id==='pos_mott'||p.name?.toLowerCase().trim()==='mottagning'||p.section==='mott';
  const isSpecMott=p=>!isDJPos(p)&&!isDagvard(p)&&!isBVC(p)&&!isGenMott(p)&&(p.section==='specmott'||/mottagning$/i.test(p.name?.trim()));
  const posSortPriority=p=>/neonatal/i.test(p.name)?0:/avdelning/i.test(p.name)?1:5;
  const avdPos=positions.filter(p=>!isDJPos(p)&&!isDagvard(p)&&!isBVC(p)&&!isSpecMott(p)&&!isGenMott(p)).sort((a,b)=>posSortPriority(a)-posSortPriority(b));
  const dagvardPos=positions.filter(isDagvard);
  const bvcPos=positions.filter(isBVC);
  const specMottPos=positions.filter(isSpecMott);
  const genMottPos=positions.filter(p=>!isDJPos(p)&&!isBVC(p)&&isGenMott(p));

  function renderPosRow(pos){
    const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
    if(!posDays.some(d=>posDayActiveThisWeek(pos,d,wn)))return;
    const[bg,fg]=posColor(pos.colorIdx);
    const s0=pos.slots[0];
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':'onclick="openWeekFillCtx(event,\''+pos.id+'\')" title="Klicka för att placera läkare hela veckan"'}><div class="pos-name-el" style="color:${fg}">${pos.name}</div></td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      const hdRed=!we&&!!isHoliday(ds);
      const _daySlotCount=pos.slotsPerDay?pos.slotsPerDay[dow]:null;
      const _dayInactive=_daySlotCount===0||(_daySlotCount===null&&!posDays.includes(dow))||(!we&&!hdRed&&!posDayActiveThisWeek(pos,dow,wn));
      if(!we&&!hdRed&&_dayInactive){html+=`<td class="day-cell pos-inactive-day${isToday(d)?' today-cell':''}"></td>`;return;}
      if(we||hdRed){html+=`<td class="day-cell we-cell${isToday(d)?' today-cell':''}"></td>`;return;}
      const posLoc=(pos.locationDays||{})[dow]||'Karlskrona';
      const dayKH=posLoc==='Karlshamn';
      const dayNeo=posLoc==='Neomott';
      const khDay=!!(pos.khDays?.includes(dow));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}"><div class="slots-stack">`;
      // Sort KH slots first (explicit overrides), then slice to per-day count if defined
      const sortedSlotsFull=[...pos.slots].sort((a,b)=>{
        const aKH=(slotLocations[ds]&&slotLocations[ds][a.slotId])==='Karlshamn';
        const bKH=(slotLocations[ds]&&slotLocations[ds][b.slotId])==='Karlshamn';
        return (bKH?0:1)-(aKH?0:1);
      });
      const _slotParDay=pos.slotParity&&pos.slotParity[dow];
      const sortedSlotsTrimmed=_daySlotCount!==null?sortedSlotsFull.slice(0,_daySlotCount):sortedSlotsFull;
      // Use original pos.slots order (stable, not affected by slotLocations sort) for parity/KH logic
      const _origSlots=_daySlotCount!==null?pos.slots.slice(0,_daySlotCount):pos.slots;
      // KH-kryssrutan (khDay) aktiverar alt-systemet: slot[0] = KH-slot, oavsett slotParity.
      // slotParity styr bara synlighet (jämn/ojämn vecka), oberoende av banner.
      const _altSystem=khDay;
      const _parVisibleIds=(_altSystem&&_slotParDay)
        ? new Set(_origSlots.filter((_,si)=>{
            const par=si===0?(_slotParDay.kh||''):(_slotParDay.ksk||'');
            return !par||(par==='even'?wn%2===0:wn%2!==0);
          }).map(s=>s.slotId))
        : null;
      const sortedSlots=_parVisibleIds?sortedSlotsTrimmed.filter(s=>_parVisibleIds.has(s.slotId)):sortedSlotsTrimmed;
      // KH-slotten är alltid pos.slots[0] (konvention: slot 0 = KH-slot)
      const _khSlotId=_altSystem?(_origSlots[0]?.slotId):null;
      sortedSlots.forEach((slot,slotIdx)=>{
        const val=getSlot(slot.slotId,ds),doc=val?docById(val):null,isWarn=doc&&!docCanFillSlot(doc,slot,ds),isPref=doc&&(doc.prefPositions||[]).includes(pos.id),isLed=doc&&docHasAnyLedighet(doc.id,ds),isLedOnskemal=doc&&!isLed&&docHasLedighetOnskemal(doc.id,ds);
        const slotLoc=(slotLocations[ds]&&slotLocations[ds][slot.slotId])||null;
        // KH-kryssrutan (khDay/altSystem): slot[0] = KH-slot → banner, ignorera gamla slotLoc-overrides.
        // Annars: gammalt system med locationDays (dayKH) eller explicit slotLoc.
        const showKH=_altSystem
          ?(slot.slotId===_khSlotId)
          :(slotLoc==='Karlshamn'||(dayKH&&!slotLoc));
        const isNoBlock=!!slot.noBlock;
        const isFmOnlySlot=!isNoBlock&&(posIsFmOnly(pos,dow)||(slot.fmOnlyDow||[]).includes(dow));
        const isEmOnlySlot=!isNoBlock&&(posIsEmOnly(pos,dow)||(slot.emOnlyDow||[]).includes(dow));
        const note=getSlotNote(slot.slotId,ds);
        // Karlshamn: colored top banner
        const khBanner=showKH?`<div style="font-size:9px;font-weight:700;color:#1d4ed8;background:#dbeafe;padding:2px 10px;border-radius:5px 5px 0 0;letter-spacing:.03em">Karlshamn</div>`:'';
        // Neomott: lila banner (Karlskrona men separat lokal)
        const neoBanner=(!showKH&&dayNeo)?`<div style="font-size:9px;font-weight:700;color:#6d28d9;background:#ede9fe;padding:2px 10px;border-radius:5px 5px 0 0;letter-spacing:.03em">Neomott</div>`:'';
        const anyBanner=showKH||dayNeo;
        // slotName (e.g. "Rond 08:30–09:00") inline above name; hidden for DJ
        const slotNameTag=(slot.slotName&&!anyBanner&&!isFmOnlySlot&&pos.id!=='pos_dj'&&pos.id!=='pos_dbj')?`<span style="font-size:9px;color:${fg};opacity:.65">${slot.slotName}</span>`:'';
        const metaLine=slotNameTag?`<div style="display:flex;gap:5px;align-items:center;padding:3px 7px 0 10px">${slotNameTag}</div>`:'';
        // –13:00 shown inline in the name row (added to si below)
        const fmBadge=isFmOnlySlot?`<span style="font-size:8px;font-weight:800;color:#9a3412;flex-shrink:0">FM</span>`:'';
        const emBadge=isEmOnlySlot?`<span style="font-size:8px;font-weight:800;color:#1e3a8a;flex-shrink:0">EM</span>`:'';
        // Prominent note bar for non-noBlock dagvård slots
        const prominentNote=note&&!isNoBlock&&pos.id==='pos_dagvard'?`<div style="font-size:9px;font-weight:700;color:#92400e;background:#fef3c7;margin:0 0 0;padding:2px 10px;border-radius:0 0 5px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${note}">📋 ${note}</div>`:'';
        if(doc){
          const rc=isNoBlock?'var(--text3)':docIsOL(doc)?'var(--ol)':docIsUL(doc)?'var(--ul)':'var(--text3)';
          const half=(()=>{
            if(isNoBlock)return null;
            const explicit=getSlotHalf(slot.slotId,ds);
            if(explicit)return explicit;
            const dt=deltidOnDay(doc.id,ds);
            if(dt==='fm')return 'em'; // ledig FM → arbetar EM
            if(dt==='em')return 'fm'; // ledig EM → arbetar FM
            const handlHalf=docHandledningHalfOn(doc.id,ds);
            if(handlHalf)return handlHalf==='fm'?'em':'fm';
            return null;
          })();
          const halfBadge=half?`<span style="font-size:8px;font-weight:800;padding:0 3px;border-radius:2px;background:${fg}22;color:${fg};letter-spacing:.02em">${half.toUpperCase()}</span>`:'';
          const noteInline=note&&!prominentNote?`<span style="font-size:9px;color:${fg};opacity:.65;font-style:italic;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:4px">${note}</span>`:`<span style="flex:1"></span>`;
          const slotBg=isNoBlock?(isLed?'#fce8e6':isLedOnskemal?'#fefce8':'transparent'):isLed?'#fce8e6':isLedOnskemal?'#fefce8':bg;
          const slotBorder=isLed?'var(--red)':isLedOnskemal?'#ca8a04':isNoBlock?`${fg}22`:fg+'33';
          const opacity=isNoBlock?'opacity:.75;':'';
          html+=`<div class="aslot filled${isWarn?' warn':isLed?' warn':isLedOnskemal?' warn':''}" style="background:${slotBg};border-color:${slotBorder};${opacity}${anyBanner?'justify-content:flex-start;':''}${IS_DOCTOR_MODE?'cursor:default':''}" title="${isLed?'⚠ Godkänd ledighet':isLedOnskemal?'✋ Önskad ledighet (ej godkänd)':note||''}" ${IS_DOCTOR_MODE?'':'onclick="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')" oncontextmenu="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')"'}>
            ${khBanner}${neoBanner}<div class="stripe" style="background:${rc}"></div>
            ${metaLine}<div class="si"><span class="sname" style="color:${fg};flex:0 auto">${docShortName(doc)}</span>${noteInline}${halfBadge}<span class="sbadge ${docIsOL(doc)?'ol':docIsUL(doc)?'ul':''}">${doc.roles[0]||''}</span>${fmBadge}${emBadge}${isPref?'<span style="font-size:9px;color:#856404">★</span>':''}${isWarn?`<span style="position:absolute;right:4px;font-size:10px" title="${missingReqs(doc,slot,ds).join(', ')}">⚠</span>`:''}</div>${prominentNote}</div>`;
        } else {
          const emptyNote=note&&!isNoBlock&&pos.id==='pos_dagvard'?`<div style="font-size:9px;font-weight:700;color:#92400e;background:#fef3c7;margin:2px -4px -3px;padding:2px 6px;border-radius:0 0 3px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${note}">📋 ${note}</div>`:'';
          const emptyFmEm=!isNoBlock&&(isFmOnlySlot||isEmOnlySlot)?`<span style="font-size:8px;font-weight:800;color:${isFmOnlySlot?'#9a3412':'#1e3a8a'};margin-left:auto">${isFmOnlySlot?'FM':'EM'}</span>`:'';
          html+=`<div class="aslot${isNoBlock?' rond-slot':''}" ${IS_DOCTOR_MODE?'':'onclick="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')" oncontextmenu="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')"'} style="${isNoBlock?'border-style:dashed;opacity:.7;':''}${IS_DOCTOR_MODE?'cursor:default;':''}">${khBanner}${neoBanner}${metaLine}<span class="splus">${IS_DOCTOR_MODE?'':'+'}</span>${emptyFmEm}${emptyNote}</div>`;
        }
      });
      html+=`</div></td>`;
    });
    html+=`</tr>`;
  }

  if(avdPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Avdelningsplaceringar</td></tr>`;
    avdPos.forEach(renderPosRow);
  }

  const djPos=positions.filter(isDJPos);
  if(djPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Dagjour</td></tr>`;
    djPos.forEach(renderPosRow);
  }

  if(specMottPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Specialistmottagningar</td></tr>`;
    specMottPos.forEach(renderPosRow);
  }

  if(genMottPos.length||bvcPos.length){
    html+=`<tr class="section-hdr"><td colspan="${cols}">Mottagning</td></tr>`;
    genMottPos.forEach(renderPosRow);
    bvcPos.forEach(renderPosRow);
  }

  // ── DAGVÅRD: varje slot = egen rad ──
  if(dagvardPos.length){
    let _dvHtml='';
    dagvardPos.forEach(pos=>{
      const[bg,fg]=posColor(pos.colorIdx);
      const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
      pos.slots.forEach(slot=>{
        const isNoBlock=!!slot.noBlock;
        const rowLabel=slot.slotName||pos.name;
        _dvHtml+=`<tr class="pos-row"><td class="label-cell"><div class="pos-name-el" style="color:${fg};font-size:11px">${rowLabel}</div></td>`;
        days.forEach(d=>{
          const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
          const hdRed2=!we&&!!isHoliday(ds);
          if(!we&&!hdRed2&&!posDays.includes(dow)){_dvHtml+=`<td class="day-cell pos-inactive-day${isToday(d)?' today-cell':''}"></td>`;return;}
          if(we||hdRed2){_dvHtml+=`<td class="day-cell we-cell${isToday(d)?' today-cell':''}"></td>`;return;}
          _dvHtml+=`<td class="day-cell${isToday(d)?' today-cell':''}"><div class="slots-stack">`;
          const val=getSlot(slot.slotId,ds),doc=val?docById(val):null;
          const isWarn=doc&&!docCanFillSlot(doc,slot,ds),isLed=doc&&docHasAnyLedighet(doc.id,ds),isLedOnskemal=doc&&!isLed&&docHasLedighetOnskemal(doc.id,ds);
          const note=getSlotNote(slot.slotId,ds);
          const isActivity=!isNoBlock&&note&&(pos.activities||[]).includes(note);
          // Activity badge (like KH bar) — top of slot when a predefined activity is selected
          const actBar=isActivity?`<div style="font-size:9px;font-weight:700;color:#0f766e;background:#ccfbf1;margin:-3px -4px 3px;padding:1px 6px;border-radius:3px 3px 0 0;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${note}</div>`:'';
          // Fallback prominent note for free-text (non-activity) notes
          const freeNote=note&&!isActivity&&!isNoBlock?`<div style="font-size:9px;font-weight:700;color:#92400e;background:#fef3c7;margin:2px -4px -3px;padding:2px 6px;border-radius:0 0 3px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${note}">📋 ${note}</div>`:'';
          if(doc){
            const rc=isNoBlock?'var(--text3)':docIsOL(doc)?'var(--ol)':docIsUL(doc)?'var(--ul)':'var(--text3)';
            const slotBg=isNoBlock?(isLed?'#fce8e6':isLedOnskemal?'#fefce8':'transparent'):isLed?'#fce8e6':isLedOnskemal?'#fefce8':bg;
            const slotBorder=isLed?'var(--red)':isLedOnskemal?'#ca8a04':isNoBlock?`${fg}22`:fg+'33';
            _dvHtml+=`<div class="aslot filled${isWarn||isLed?' warn':isLedOnskemal?' warn':''}" style="background:${slotBg};border-color:${slotBorder}${isNoBlock?';opacity:.85':''}${IS_DOCTOR_MODE?';cursor:default':''}" title="${isLed?'⚠ Godkänd ledighet':isLedOnskemal?'✋ Önskad ledighet (ej godkänd)':note||''}" ${IS_DOCTOR_MODE?'':'onclick="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')" oncontextmenu="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')"'}>
              ${actBar}<div class="stripe" style="background:${rc}"></div>
              <div class="si"><span class="sname" style="color:${fg};flex:0 auto">${docShortName(doc)}</span><span style="flex:1"></span><span class="sbadge ${docIsOL(doc)?'ol':docIsUL(doc)?'ul':''}">${doc.roles[0]||''}</span>${isWarn?`<span style="position:absolute;right:4px;font-size:10px">⚠</span>`:''}</div>${freeNote}</div>`;
          } else {
            const isFmOnlySlot=!isNoBlock&&posIsFmOnly(pos,dow);
            const isEmOnlySlot=!isNoBlock&&posIsEmOnly(pos,dow);
            const emptyFmEm=isFmOnlySlot||isEmOnlySlot?`<span style="font-size:8px;font-weight:800;color:${isFmOnlySlot?'#9a3412':'#1e3a8a'};margin-left:auto">${isFmOnlySlot?'FM':'EM'}</span>`:'';
            const emptyAct=isActivity||(!isNoBlock&&note)?`<div style="font-size:9px;font-weight:700;color:${isActivity?'#0f766e':'#92400e'};background:${isActivity?'#ccfbf1':'#fef3c7'};margin:2px -4px -3px;padding:2px 6px;border-radius:0 0 3px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${isActivity?note:'📋 '+note}</div>`:'';
            _dvHtml+=`<div class="aslot" style="${isNoBlock?'border-style:dashed;opacity:.6;':''}${IS_DOCTOR_MODE?'cursor:default;':''}" ${IS_DOCTOR_MODE?'':'onclick="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')" oncontextmenu="openSlotCtx(event,\''+slot.slotId+'\',\''+ds+'\')"'}><span class="splus">${IS_DOCTOR_MODE?'':'+'}</span>${emptyFmEm}${emptyAct}</div>`;
          }
          _dvHtml+=`</div></td>`;
        });
        _dvHtml+=`</tr>`;
      });
    });
    if(_dvHtml) html+=`<tr class="section-hdr"><td colspan="${cols}">Dagvård</td></tr>`+_dvHtml;
  }

  html+=`<tr class="section-hdr"><td colspan="${cols}">Primärjour</td></tr>`;
  [
    {key:'JV1', label:'JV1', color:'var(--jv1)', bg:'var(--jv1-light)'},
    {key:'JV2', label:'JV2', color:'var(--jv2)', bg:'var(--jv2-light)'},
    {key:'NLO', label:'NLÖ', color:'var(--nlo)', bg:'var(--nlo-light)'},
  ].forEach(({key,label,color,bg})=>{
    const useSpill=key==='JV1'||key==='JV2';
    const labelMon=useSpill?addDays(mon,-7):mon;
    const labelWn=weekNum(labelMon),labelYr=weekYear(labelMon);
    const jv=getJV(labelWn,labelYr),docId=jv[key],doc=docId?docById(docId):null;
    html+=`<tr class="pos-row"><td class="jv-label-cell" ${IS_DOCTOR_MODE?'':'onclick="openJVCtx(event,\''+key+'\','+labelWn+','+labelYr+')"'} style="${IS_DOCTOR_MODE?'cursor:default':''}">
      <div class="jv-label-name" style="color:${color}">${label}</div>
      <div class="jv-label-who">`;
    if(doc){html+=`<div class="savatar" style="width:18px;height:18px;font-size:8px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div><span style="font-size:11px;font-weight:600;color:${color}">${docShortName(doc)}</span>`;}
    else{html+=`<span style="font-size:11px;color:var(--text3)">+ Tilldela</span>`;}
    html+=`</div></td>`;
    days.forEach(d=>{
      const we=d.getDay()===0||d.getDay()===6;
      const shifts=jvShiftsOnDate(d,key);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(!shifts.length){html+=`<div style="min-height:28px"></div>`;}
      else{shifts.forEach(({shift,doc:sd,isOverride,overrideKey,ds:sds,jvType:sjvType,jourledigKey})=>{
        if(!sd&&shift.type!=='jourledigt'&&overrideKey&&sds){
          html+=`<div class="bj-slot empty-cell" onclick="openJVOverrideModal('${sds}','${sjvType}','${overrideKey}')" title="${shift.label} — klicka för att tilldela"><span class="splus">+</span></div>`;
          return;
        }
        if(!sd)return;
        const cls=shift.type==='night'?'jb-night':shift.type==='jourledigt'?'jb-jourledigt':'jb-day';
        const icon=shift.type==='night'?'🌙':shift.type==='jourledigt'?'✦':'☀';
        const clickable=overrideKey&&sds;
        const jourledigClickable=jourledigKey&&!IS_DOCTOR_MODE;
        const overrideDot=isOverride?`<span style="position:absolute;top:1px;right:2px;width:5px;height:5px;border-radius:50%;background:var(--accent)" title="Manuellt ändrad"></span>`:'';
        const clickAttr=clickable?`onclick="openJVOverrideModal('${sds}','${sjvType}','${overrideKey}')"`
          :jourledigClickable?`onclick="openJourledigMoveCtx(event,'${jourledigKey}')" title="Klicka för att flytta jourledigt"`:'';
        html+=`<div class="jv-block ${cls}" style="position:relative;${clickable||jourledigClickable?'cursor:pointer':''}" ${clickAttr}>${overrideDot}<span class="jv-icon">${icon}</span><span class="jv-name">${sd?docShortName(sd):'—'}</span><span class="jv-sub">${shift.type==='night'?'natt':shift.type==='jourledigt'?'ledigt':'dag'}</span></div>`;
      });}
      html+=`</td>`;
    });
    html+=`</tr>`;
  });

  // ── HJ (Helgjour dagtid på röda vardagar) — manuell tillsättning ──
  {
    const hdWeekdays=days.filter(d=>isHoliday(isoDate(d))&&d.getDay()!==0&&d.getDay()!==6);
    if(hdWeekdays.length){
      const hjColor='var(--hd)',hjBg='var(--hd-light)';
      html+=`<tr class="pos-row"><td class="label-cell" style="background:${hjBg}">
        <div class="pos-name-el" style="color:${hjColor}">HJ</div>
        <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Primärjour dag · Röd dag</span></div>
      </td>`;
      days.forEach(d=>{
        const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
        const hdName=isHoliday(ds);
        html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
        if(hdName&&!we){
          const existing=getBJ(ds,'HJ'),edoc=existing?docById(existing):null;
          if(edoc){
            html+=`<div class="jv-block jb-day" style="border-color:var(--hd)44;cursor:pointer" onclick="openBJCtx(event,'HJ','${ds}')"><span class="jv-icon">☀</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">dag</span></div>`;
          } else {
            html+=`<div class="bj-slot empty-cell" onclick="openBJCtx(event,'HJ','${ds}')"><span class="splus">+</span></div>`;
          }
        } else {
          html+=`<div style="min-height:28px"></div>`;
        }
        html+=`</td>`;
      });
      html+=`</tr>`;
    }
  }

  html+=`<tr class="section-hdr"><td colspan="${cols}">Bakjour</td></tr>`;
  function bjBlock(s){
    const cls=s.type==='night'?'jb-night':s.type==='jourledigt'?'jb-jourledigt':'jb-day';
    const icon=s.type==='night'?'🌙':s.type==='jourledigt'?'✦':'☀';
    const moveable=s.jourledigKey&&!IS_DOCTOR_MODE;
    const moveAttr=moveable?`onclick="openJourledigMoveCtx(event,'${s.jourledigKey}')" title="Klicka för att flytta jourledigt" style="cursor:pointer"`:'' ;
    return`<div class="jv-block ${cls}" ${moveAttr}><span class="jv-icon">${icon}</span><span class="jv-name">${s.doc?docShortName(s.doc):'—'}</span><span class="jv-sub">${s.type==='jourledigt'?'ledigt':s.type}</span></div>`;
  }

  {
    const bjColor='var(--bjfs)',bjBg='var(--bjfs-light)';
    const thisFriDs=isoDate(addDays(mon,4));
    const bjfsDocId=getBJ(thisFriDs,'BJFS');
    const bjfsDoc=bjfsDocId?docById(bjfsDocId):null;
    html+=`<tr class="pos-row"><td class="label-cell" style="background:${bjBg};cursor:pointer" onclick="openBJCtx(event,'BJFS','${thisFriDs}')">
      <div class="pos-name-el" style="color:${bjColor}">BJFS</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Fre n · Sön d+n</span></div>
      ${bjfsDoc?`<div style="display:flex;align-items:center;gap:4px;margin-top:3px"><div class="savatar" style="width:16px;height:16px;font-size:7px;background:${bjfsDoc.color[0]};color:${bjfsDoc.color[1]}">${docInitials(bjfsDoc.name)}</div><span style="font-size:10px;font-weight:600;color:${bjColor}">${docShortName(bjfsDoc)}</span></div>`:'<div style="font-size:10px;color:var(--text3);margin-top:2px">+ Tilldela</div>'}
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      const shifts=bjfsShiftsOnDate(d);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(dow===5){
        // Show jourledigt from previous week's BJFS (if any), then this week's assignment
        const jlShift=shifts.find(s=>s.type==='jourledigt');
        if(jlShift)html+=bjBlock(jlShift);
        const existing=getBJ(ds,'BJFS'),edoc=existing?docById(existing):null;
        if(edoc){html+=`<div class="jv-block jb-night" style="cursor:pointer" onclick="openBJCtx(event,'BJFS','${ds}')"><span class="jv-icon">🌙</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">natt</span></div>`;}
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
      ${bjloDoc?`<div style="display:flex;align-items:center;gap:4px;margin-top:3px"><div class="savatar" style="width:16px;height:16px;font-size:7px;background:${bjloDoc.color[0]};color:${bjloDoc.color[1]}">${docInitials(bjloDoc.name)}</div><span style="font-size:10px;font-weight:600;color:${bjColor}">${docShortName(bjloDoc)}</span></div>`:'<div style="font-size:10px;color:var(--text3);margin-top:2px">+ Tilldela</div>'}
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      const shifts=bjloShiftsOnDate(d);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(dow===6){
        const existing=getBJ(ds,'BJLO'),edoc=existing?docById(existing):null;
        if(edoc){html+=`<div style="display:flex;flex-direction:column;gap:2px;cursor:pointer" onclick="openBJCtx(event,'BJLO','${ds}')"><div class="jv-block jb-day"><span class="jv-icon">☀</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">dag</span></div><div class="jv-block jb-night"><span class="jv-icon">🌙</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">natt</span></div></div>`;}
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
          html+=`<div class="jv-block jb-night" style="cursor:pointer" onclick="openBJCtx(event,'BJNV','${ds}')"><span class="jv-icon">🌙</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">natt</span></div>`;
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


  // ── HBJ (Helgbakjour dag+natt på röda vardagar) ──
  {
    const hdWeekdays=days.filter(d=>isHoliday(isoDate(d))&&d.getDay()!==0&&d.getDay()!==6);
    if(hdWeekdays.length){
      const bjColor='var(--bjhd)',bjBg='var(--bjhd-light)';
      html+=`<tr class="pos-row"><td class="label-cell" style="background:${bjBg}">
        <div class="pos-name-el" style="color:${bjColor}">HBJ</div>
        <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Bakjour dag+natt · Röd dag</span></div>
      </td>`;
      days.forEach(d=>{
        const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
        const hdName=isHoliday(ds);
        html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
        if(hdName&&!we){
          const existing=getBJ(ds,'HBJ'),edoc=existing?docById(existing):null;
          if(edoc){
            html+=`<div style="display:flex;flex-direction:column;gap:2px;cursor:pointer" onclick="openBJCtx(event,'HBJ','${ds}')">
              <div class="jv-block jb-day" style="border-color:var(--bjhd)44"><span class="jv-icon">☀</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">dag</span></div>
              <div class="jv-block jb-night"><span class="jv-icon">🌙</span><span class="jv-name">${docShortName(edoc)}</span><span class="jv-sub">natt</span></div>
            </div>`;
          } else {
            html+=`<div class="bj-slot empty-cell" onclick="openBJCtx(event,'HBJ','${ds}')"><span class="splus">+</span></div>`;
          }
        } else {
          html+=`<div style="min-height:28px"></div>`;
        }
        html+=`</td>`;
      });
      html+=`</tr>`;
    }
  }

  // ── SEKTION: ÖVRIGT OCH ADMINISTRATION ──
  html+=`<tr class="section-hdr"><td colspan="${cols}">Övrigt och Administration</td></tr>`;

  // ── ÖVRIGT ──
  {
    html+=`<tr class="pos-row"><td class="label-cell">
      <div class="pos-name-el" style="color:var(--text2)">Övrigt</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text3)">Möten & åtaganden</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const notes=ovrigtForDate(ds);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      notes.forEach(n=>{
        const recIcon=n._recurring?'<span style="font-size:8px;opacity:.6">🔁</span>':'';
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--bg2);border:1px solid ${n._recurring?'#93c5fd':'var(--border)'};cursor:pointer" onclick="openOvrigtModal('${ds}')">${recIcon}<span style="font-size:9px;color:var(--text2)">${n.text}</span></div>`;
      });
      html+=`<div class="bj-slot empty-cell" style="min-height:20px" onclick="openOvrigtModal('${ds}')"><span style="font-size:12px;color:var(--border)">+</span></div>`;
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
      const recAdm=specialRecurringOnDate(ds,'adm');
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      entries.forEach(([k,v])=>{const doc=docById(v.docId);if(!doc)return;
        const admLabel=v.note||'ADM';
        html+=`<div class="adm-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;cursor:pointer" onclick="openEditSpecialModal('${ds}','${k}')"><span style="max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.note||''}">${admLabel}</span><span style="font-size:9px;color:var(--text2)">${docShortName(doc)}${v.halfDay?` (${v.halfDay})`:''}</span></div>`;
      });
      recAdm.forEach(r=>{const doc=docById(r.docId);if(!doc)return;
        const admLabel=r.note||'ADM';
        html+=`<div class="adm-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;border-left:2px solid #3b82f6" title="Återkommande${r.note?' – '+r.note:''}"><span style="max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${admLabel}</span><span style="font-size:9px;color:var(--text2)">${docShortName(doc)}${r.halfDay?` (${r.halfDay})`:''}</span><span style="font-size:8px;opacity:.6">🔁</span></div>`;
      });
      html+=`<div class="bj-slot empty-cell" style="min-height:22px;font-size:10px;color:var(--text3)" onclick="openAddSpecialModal('${ds}','adm')"><span style="font-size:12px;color:var(--border)">+</span></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── SEKTION: UTBILDNING ──
  html+=`<tr class="section-hdr"><td colspan="${cols}">Utbildning</td></tr>`;

  // ── UTBILDNING ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?`onclick="openUtbildningModal()"`:` onclick="openInlineWeekCtx(event,'utb',${wn},${yr})" title="Klicka för att hantera utbildning hela veckan"`}>
      <div class="pos-name-el" style="color:var(--utb)">Utbildning</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Önskemål / Godkänd</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const utbDocs=doctors.filter(doc=>docHasUtbildning(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      const utbOnskemalDocs=doctors.filter(doc=>!docHasUtbildning(doc.id,ds)&&docHasUtbildningOnskemal(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openInlineDayCtx(event,'utb','${ds}')">`;
      // Pending önskemål
      utbOnskemalDocs.forEach(doc=>{
        const v=utbildningOnskemal[doc.id]&&utbildningOnskemal[doc.id][ds];
        const note=v&&typeof v==='object'?v.note:'';
        html+=`<div style="display:flex;align-items:center;gap:2px;margin-bottom:2px;padding:2px 4px;border-radius:4px;background:#fefce8;border:1px solid #ca8a0488;font-size:9px;font-weight:700;color:#854d0e;white-space:nowrap" title="${note?note:'Önskad utbildning — ej godkänd'}">✋ ${docShortName(doc)}<button style="margin-left:3px;font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#16a34a;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();approveUtbildningOnskemal('${doc.id}','${ds}')" title="Godkänn">✓</button><button style="font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#dc2626;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();rejectUtbildningOnskemal('${doc.id}','${ds}')" title="Avslå">✕</button></div>`;
      });
      // Godkänd utbildning
      utbDocs.forEach(doc=>{
        const recEntry=specialRecurringOnDate(ds,'utb').find(r=>r.docId===doc.id);
        const isRec=!!recEntry;
        const note=isRec?(recEntry.note||''):(getUtbNote(doc.id,ds));
        html+=`<div class="utb-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;${isRec?'border-left:2px solid #3b82f6':''}" title="${note}">
          <span style="font-size:9px">✓ ${docShortName(doc)}</span>
          ${note?`<span style="font-size:9px;color:var(--text3);font-style:italic;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${note}</span>`:''}
          ${isRec?'<span style="font-size:8px;opacity:.6">🔁</span>':''}
        </div>`;
      });
      html+=`<div style="min-height:10px"></div>`;
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
          const supStr=sup?` / ${docShortName(sup)}`:'';
          html+=`<div class="handl-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px;cursor:pointer" onclick="openSpecialCtx(event,'${ds}','${k}')"><span>🎓</span><span style="font-size:9px">${docShortName(st)}${supStr}${v.halfDay?' ('+v.halfDay+')':''}</span></div>`;
        });
      }
      html+=`<div class="bj-slot empty-cell" style="min-height:22px;font-size:10px;color:var(--text3)" onclick="openAddSpecialModal('${ds}','handledning')"><span style="font-size:12px;color:var(--border)">+</span></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── AUSKULTATION ──
  {
    const askColor='#7c3aed',askBg='#ede9fe';
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':` onclick="openInlineWeekCtx(event,'ausk',${wn},${yr})" title="Klicka för att hantera auskultation/intro hela veckan"`}>
      <div class="pos-name-el" style="color:${askColor}">Auskultation/Intro</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Manuell</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const entries=auskultationEntries[ds]||[];
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openInlineDayCtx(event,'ausk','${ds}')">`;
      entries.forEach(e=>{const doc=docById(e.docId);if(!doc)return;
        const place=e.place||e.desc||'';
        const note=e.note||'';
        html+=`<div style="display:flex;flex-direction:column;margin-bottom:3px;padding:3px 5px;border-radius:4px;background:${askBg};border:1px solid ${askColor}44">
          <div style="display:flex;align-items:center;gap:3px">
            <div class="savatar" style="width:14px;height:14px;font-size:7px;background:${doc.color[0]};color:${doc.color[1]}">${docInitials(doc.name)}</div>
            <span style="font-size:9px;font-weight:700;color:${askColor}">${docShortName(doc)}</span>
            ${place?`<span style="font-size:8px;color:${askColor};opacity:.8">· ${place}</span>`:''}
          </div>
          ${note?`<div style="font-size:8px;color:${askColor};opacity:.75;font-style:italic;padding-left:17px">${note}</div>`:''}
        </div>`;
      });
      html+=`<div style="min-height:10px"></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── RANDNING ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':` onclick="openInlineDayCtx(event,'rand',isoDate(days[0]))" title="Klicka på en dag för att lägga till/ta bort randning"`}>
      <div class="pos-name-el" style="color:#b45309">Randning</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Blockerar schemaläggning</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const randDocs=doctors.filter(doc=>docHasRandning(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openInlineDayCtx(event,'rand','${ds}')">`;
      randDocs.forEach(doc=>{
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:#fef9c3;border:1px solid #b4530944">
          <span style="font-size:9px;font-weight:700;color:#b45309">✓ ${docShortName(doc)}</span>
        </div>`;
      });
      html+=`<div style="min-height:10px"></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── SEKTION: FRÅNVARO ──
  html+=`<tr class="section-hdr"><td colspan="${cols}">Frånvaro</td></tr>`;

  // ── JOURFRITT ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':` onclick="openJourfriCtx(event,${wn},${yr})" title="Klicka för att hantera jourfritt"`}>
      <div class="pos-name-el" style="color:var(--jourledigt)">Jourfritt</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Önskemål / Godkänt</span></div>
    </td>`;
    days.forEach(d=>{
      const dow=d.getDay(),we=dow===0||dow===6;
      const wmon=getMonday(d),dwn2=weekNum(wmon),dyr2=weekYear(wmon),wk=wkey(dwn2,dyr2);
      const ds=isoDate(d);
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openJourfriCtx(event,${dwn2},${dyr2})">`;
      [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
        // Pending önskemål (jourfriOnskemal)
        const pending=jourfriOnskemal[doc.id]&&jourfriOnskemal[doc.id][wk];
        if(pending){
          if(pending.scope==='weekend'&&!we)return;
          const lbl=pending.scope==='weekend'?'helg':'v';
          html+=`<div style="display:flex;align-items:center;gap:2px;margin-bottom:2px;padding:2px 4px;border-radius:4px;background:#fefce8;border:1px solid #ca8a0488;font-size:9px;font-weight:700;color:#854d0e;white-space:nowrap" title="Önskat jourfritt — ej godkänt">✋ ${docShortName(doc)} (${lbl})<button style="margin-left:3px;font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#16a34a;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();approveJourfriOnskemal('${doc.id}','${wk}')" title="Godkänn">✓</button><button style="font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#dc2626;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();rejectJourfriOnskemal('${doc.id}','${wk}')" title="Avslå">✕</button></div>`;
          return;
        }
        // Godkänt jourfritt (jourfriOnskad)
        const active=jourfriOnskad[doc.id]&&jourfriOnskad[doc.id][wk];
        if(!active)return;
        if(active.scope==='weekend'&&!we)return;
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--jourledigt-light);border:1px solid var(--jourledigt)44;font-size:9px;font-weight:700;color:var(--jourledigt)" onclick="event.stopPropagation()">✓ ${docShortName(doc)}${active.scope==='weekend'?' (helg)':' (v)'}</div>`;
      });
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── DELTIDSSCHEMA ──
  {
    html+=`<tr class="pos-row"><td class="label-cell" style="cursor:pointer" onclick="openDeltidModal()">
      <div class="pos-name-el" style="color:var(--deltid)">Deltidsschema</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Hel- eller halvdag</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openDeltidModal()">`;
      [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
        const val=deltidOnDay(doc.id,ds);
        if(!val)return;
        html+=`<div class="deltid-cell" style="display:flex;align-items:center;gap:3px;margin-bottom:2px"><span style="font-size:9px">${docShortName(doc)}${val!=='hel'?` (${val})`:''}</span></div>`;
      });
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── LEDIGHET ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?`onclick="openLedighetModal()"`:` onclick="openLedigWeekCtx(event,${wn},${yr})" title="Klicka för att lägga till/ta bort veckoledighet"`}>
      <div class="pos-name-el" style="color:var(--ledighet)">Ledighet</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Önskemål / Godkänd</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const mon2=getMonday(d),wn2=weekNum(mon2),yr2=weekYear(mon2),wk=wkey(wn2,yr2);
      const ledDocs=doctors.filter(doc=>docHasAnyLedighet(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      const onskemalDocs=doctors.filter(doc=>!docHasAnyLedighet(doc.id,ds)&&docHasLedighetOnskemal(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      const clickAttr=IS_DOCTOR_MODE?`onclick="openLedighetModal('${ds}')"`:
        `onclick="openLedigCtx(event,'${ds}')" oncontextmenu="openLedigCtx(event,'${ds}')"`;
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" ${clickAttr}>`;
      onskemalDocs.forEach(doc=>{
        const isVecka=!!(ledighetVeckorOnskemal[doc.id]&&ledighetVeckorOnskemal[doc.id][wk]);
        const approveCall=isVecka?`approveLedighetVeckaOnskemal('${doc.id}','${wk}')`:`approveLedighetDagOnskemal('${doc.id}','${ds}')`;
        const rejectCall=isVecka?`rejectLedighetVeckaOnskemal('${doc.id}','${wk}')`:`rejectLedighetDagOnskemal('${doc.id}','${ds}')`;
        html+=`<div style="display:flex;align-items:center;gap:2px;margin-bottom:2px;padding:2px 4px;border-radius:4px;background:#fefce8;border:1px solid #ca8a0488;font-size:9px;font-weight:700;color:#854d0e;white-space:nowrap" title="Önskat ledigt — ej godkänt">✋ ${docShortName(doc)}${isVecka?' (v)':''}<button style="margin-left:3px;font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#16a34a;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();${approveCall}" title="Godkänn">✓</button><button style="font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#dc2626;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();${rejectCall}" title="Avslå">✕</button></div>`;
      });
      ledDocs.forEach(doc=>{html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--ledighet-light);border:1px solid var(--ledighet)44;font-size:9px;font-weight:700;color:var(--ledighet)">✓ ${docShortName(doc)}</div>`;});
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── SJUKSKRIVNING / VAB ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':` onclick="openInlineWeekCtx(event,'sjuk',${wn},${yr})" title="Klicka för att hantera sjukskrivning/VAB hela veckan"`}>
      <div class="pos-name-el" style="color:var(--sjuk)">Sjukskrivning/VAB</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text3)">Blockerar hela dagen</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const entries=sjukskrivning[ds]||[];
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openInlineDayCtx(event,'sjuk','${ds}')">`;
      entries.forEach(e=>{
        const doc=docById(e.docId);if(!doc)return;
        const t=e.type||'sjuk';
        const c=t==='vab'?'var(--vab)':'var(--sjuk)';
        const bg=t==='vab'?'var(--vab-light)':'var(--sjuk-light)';
        const lbl=t==='vab'?'VAB':'Sjuk';
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:${bg};border:1px solid ${c}44">
          <span style="font-size:9px;font-weight:700;color:${c}">${docShortName(doc)}</span>
          <span style="font-size:8px;color:${c};opacity:.8">(${lbl})</span>
        </div>`;
      });
      html+=`<div style="min-height:10px"></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── FÖRÄLDRALEDIG ──
  {
    html+=`<tr class="pos-row"><td class="label-cell${IS_DOCTOR_MODE?'':' clickable'}" ${IS_DOCTOR_MODE?'':` onclick="openInlineWeekCtx(event,'fl',${wn},${yr})" title="Klicka för att hantera föräldraledig hela veckan"`}>
      <div class="pos-name-el" style="color:var(--fl)">Föräldraledig</div>
      <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Önskemål / Godkänd</span></div>
    </td>`;
    days.forEach(d=>{
      const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
      const entries=foraldraledig[ds]||[];
      // Doctors on period-based FL (flFrom/flTo) who are not already in day-entries
      const dayEntryIds=new Set(entries.map(e=>e.docId));
      const periodFlDocs=doctors.filter(doc=>doc.flFrom&&ds>=doc.flFrom&&(!doc.flTo||ds<=doc.flTo)&&!dayEntryIds.has(doc.id)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      const flOnskemalDocs=doctors.filter(doc=>docHasFlOnskemal(doc.id,ds)&&!docHasForaldraledig(doc.id,ds)).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openInlineDayCtx(event,'fl','${ds}')">`;
      // Pending FL-önskemål
      flOnskemalDocs.forEach(doc=>{
        html+=`<div style="display:flex;align-items:center;gap:2px;margin-bottom:2px;padding:2px 4px;border-radius:4px;background:#fefce8;border:1px solid #ca8a0488;font-size:9px;font-weight:700;color:#854d0e;white-space:nowrap" onclick="event.stopPropagation()" title="Önskad föräldraledig — ej godkänd">✋ ${docShortName(doc)}<button style="margin-left:3px;font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#16a34a;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();approveFlOnskemal('${doc.id}','${ds}')" title="Godkänn">✓</button><button style="font-size:9px;padding:0 4px;border-radius:3px;border:none;background:#dc2626;color:#fff;cursor:pointer;line-height:15px" onclick="event.stopPropagation();rejectFlOnskemal('${doc.id}','${ds}')" title="Avslå">✕</button></div>`;
      });
      // Period-based FL (flFrom/flTo on doctor) — click to edit doctor (admin only)
      periodFlDocs.forEach(doc=>{
        const _flOnclick=IS_DOCTOR_MODE?'event.stopPropagation()':`event.stopPropagation();openEditDoctorModal('${doc.id}')`;
        const _flTitle=IS_DOCTOR_MODE?'FL-period':'FL-period — klicka för att redigera';
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--fl-light);border:1px solid var(--fl)88;${IS_DOCTOR_MODE?'':'cursor:pointer'}" onclick="${_flOnclick}" title="${_flTitle}">
          <span style="font-size:9px;font-weight:700;color:var(--fl)">📅 ${docShortName(doc)}</span>
        </div>`;
      });
      // Day-by-day approved FL
      entries.forEach(e=>{
        const doc=docById(e.docId);if(!doc)return;
        html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:var(--fl-light);border:1px solid var(--fl)44">
          <span style="font-size:9px;font-weight:700;color:var(--fl)">✓ ${docShortName(doc)}</span>
          <span style="font-size:8px;color:var(--fl);opacity:.8">(FL)</span>
        </div>`;
      });
      html+=`<div style="min-height:10px"></div>`;
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  // ── ÖNSKEPASS ──
  {
    const hasAny=days.some(d=>doctors.some(doc=>onskadPass[doc.id]&&onskadPass[doc.id][isoDate(d)]));
    if(hasAny){
      html+=`<tr class="pos-row"><td class="label-cell" style="cursor:pointer" onclick="openOnskadPassModal()">
        <div class="pos-name-el" style="color:#854d0e">Önskepass</div>
        <div class="pos-reqs"><span style="font-size:9px;color:var(--text2)">Önskade pass ⭐</span></div>
      </td>`;
      days.forEach(d=>{
        const ds=isoDate(d),we=d.getDay()===0||d.getDay()===6;
        html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}" style="cursor:pointer" onclick="openOnskadPassModal()">`;
        [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
          const op=onskadPass[doc.id]&&onskadPass[doc.id][ds];
          if(!op)return;
          const pos=op.posId?positions.find(p=>p.id===op.posId):null;
          html+=`<div style="display:flex;align-items:center;gap:3px;margin-bottom:2px;padding:2px 5px;border-radius:4px;background:#fef9c3;border:1px solid #ca8a0444;font-size:9px;font-weight:700;color:#854d0e">⭐ ${docShortName(doc)}${pos?' → '+pos.name.slice(0,6):''}</div>`;
        });
        html+=`</td>`;
      });
      html+=`</tr>`;
    }
  }

  // ── Ej placerade per dag ──
  {
    html+=`<tr class="section-hdr" style="border-top:2px solid var(--border)"><td colspan="${cols}">Ej placerade</td></tr>`;
    html+=`<tr class="pos-row"><td class="label-cell"><div class="pos-name-el" style="color:var(--text2);font-size:11px">Ej placerade</div></td>`;
    days.forEach(d=>{
      const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
      html+=`<td class="day-cell${isToday(d)?' today-cell':''}${we?' we-cell':''}">`;
      if(we){html+=`</td>`;return;}
      const unplaced=doctors.filter(doc=>{
        const id=doc.id;
        if(docIsAssignedOnDate(id,ds))return false;
        if(getBJ(ds,'BJFS')===id||getBJ(ds,'BJLO')===id||getBJ(ds,'BJNV')===id||getBJ(ds,'HBJ')===id||getBJ(ds,'HJ')===id)return false;
        if(specialsOnDate(ds).some(([,v])=>v.docId===id||v.supervisorId===id))return false;
        // JV1: shifts on Fri(5), Mon(1), Wed(3)
        if([5,1,3].includes(dow)){const a=getJVAnchorWk(d,'JV1');if(getJV(a.wn,a.yr).JV1===id)return false;}
        // JV2: shifts on Sun(0), Tue(2), Thu(4)
        if([0,2,4].includes(dow)){const a=getJVAnchorWk(d,'JV2');if(getJV(a.wn,a.yr).JV2===id)return false;}
        // NLÖ: shift on Sat(6); Mon(1) carries over from prev week NLÖ
        if(dow===6&&getJV(wn,yr).NLO===id)return false;
        if(dow===1&&getJV(weekNum(addDays(mon,-7)),weekYear(addDays(mon,-7))).NLO===id)return false;
        if(docHasAnyLedighet(id,ds))return false;
        if(docRestrictedOnDate(id,ds))return false;
        {
          const dt=deltidOnDay(id,ds);
          const _ob=ovrigtForDate(ds).find(n=>ovrigtNoteDocIds(n).includes(id)&&n.blocks)?.blocks||null;
          const ob=(_ob===true||_ob==='hel')?'hel':_ob;
          const bFM=(dt==='fm'||dt==='hel')||(ob==='fm'||ob==='hel');
          const bEM=(dt==='em'||dt==='hel')||(ob==='em'||ob==='hel');
          if(bFM&&bEM)return false;
        }
        return true;
      }).sort((a,b)=>a.name.localeCompare(b.name,'sv'));
      unplaced.forEach(doc=>{
        const dt=deltidOnDay(doc.id,ds);
        const _ob2=ovrigtForDate(ds).find(n=>ovrigtNoteDocIds(n).includes(doc.id)&&n.blocks)?.blocks||null;
        const ob=(_ob2===true||_ob2==='hel')?'hel':_ob2;
        const handlHalf=docHandledningHalfOn(doc.id,ds);
        const bFM=(dt==='fm'||dt==='hel')||(ob==='fm'||ob==='hel');
        const bEM=(dt==='em'||dt==='hel')||(ob==='em'||ob==='hel');
        let availHalf=null;
        if(bFM&&!bEM)availHalf='em';
        else if(bEM&&!bFM)availHalf='fm';
        else if(!bFM&&!bEM&&handlHalf)availHalf=handlHalf==='fm'?'em':'fm';
        const halfTag=availHalf?` <span style="font-size:8px;opacity:.7">${availHalf.toUpperCase()}</span>`:'';
        html+=`<div style="padding:1px 5px;border-radius:3px;font-size:9px;font-weight:600;color:var(--text2);background:var(--bg2);margin-bottom:2px;white-space:nowrap">${docShortName(doc)}${halfTag}</div>`;
      });
      html+=`</td>`;
    });
    html+=`</tr>`;
  }

  html+=`</tbody></table>`;
  document.getElementById('scheduleContainer').innerHTML=html;
}

// ─── Månadsvy ─────────────────────────────────────────────────────────────
function renderMonth(){
  const yr=currentDate.getFullYear(), mo=currentDate.getMonth();
  const svMonths=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];
  const svMon=['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  document.getElementById('weekTitle').innerHTML=`${svMonths[mo]} ${yr}`;

  // Build array of days for the month grid (Mon-first, padded to full weeks)
  const firstDay=new Date(yr,mo,1);
  const lastDay=new Date(yr,mo+1,0);
  // Mon=0..Sun=6
  const startDow=(firstDay.getDay()+6)%7; // Mon-based
  const gridStart=new Date(firstDay);gridStart.setDate(firstDay.getDate()-startDow);

  // Key positions to show in month view (mandatory ones only, top 3)
  const keyPositions=positions.filter(p=>mandatoryPositions.has(p.id)).slice(0,4);

  let html=`<div class="month-grid">`;
  // Header row
  svMon.forEach(d=>{html+=`<div class="month-hdr">${d}</div>`;});

  // Day cells
  let cursor=new Date(gridStart);
  while(cursor<=lastDay||cursor.getDay()!==1){
    const ds=isoDate(cursor);
    const isThisMonth=cursor.getMonth()===mo;
    const dow=cursor.getDay(); // 0=Sun
    const isWe=dow===0||dow===6;
    const holiday=isHoliday(ds);
    const isToday2=isoDate(new Date())===ds;

    // Staffing indicator
    let sfTotal=0,sfFilled=0;
    if(isThisMonth&&!isWe&&!holiday){
      const dowN=cursor.getDay();
      positions.forEach(pos=>{
        if(!mandatoryPositions.has(pos.id))return;
        const pd=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
        if(!pd.includes(dowN))return;
        const _minReq=getMinFill(pos.id,ds);const _filledN=pos.slots.filter(s=>!s.noBlock&&getSlot(s.slotId,ds)).length;sfTotal+=_minReq;sfFilled+=Math.min(_filledN,_minReq);
      });
    }
    const sfPct=sfTotal?sfFilled/sfTotal:-1;
    const sfCol=sfPct<0?'transparent':sfPct===1?'#16a34a':sfPct>=0.5?'#d97706':'#dc2626';
    const sfBg=sfPct<0?'transparent':sfPct===1?'#dcfce7':sfPct>=0.5?'#fef3c7':'#fee2e2';

    // Assigned doctors for key positions
    let assignedHtml='';
    if(isThisMonth&&!isWe){
      keyPositions.forEach(pos=>{
        const slot=pos.slots.find(s=>!s.noBlock);
        if(!slot)return;
        const docId=getSlot(slot.slotId,ds);
        const doc=docId?docById(docId):null;
        if(!doc)return;
        const[bg,fg]=posColor(pos.colorIdx);
        assignedHtml+=`<div style="display:flex;align-items:center;gap:2px;margin-top:1px">
          <span style="font-size:8px;padding:0 3px;border-radius:3px;background:${bg};color:${fg};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px">${pos.name.slice(0,4)}: ${docShortName(doc)}</span>
        </div>`;
      });
      // Sjukskrivning/FL indicators
      const sjuk=(sjukskrivning[ds]||[]).map(e=>{const d=docById(e.docId);return d?`<span style="font-size:8px;color:${e.type==='vab'?'var(--vab)':'var(--sjuk)'}">● ${docShortName(d)}</span>`:''}).join('');
      const fl=(foraldraledig[ds]||[]).map(e=>{const d=docById(e.docId);return d?`<span style="font-size:8px;color:var(--fl)">● ${docShortName(d)}</span>`:''}).join('');
      if(sjuk||fl)assignedHtml+=`<div style="margin-top:1px;display:flex;flex-wrap:wrap;gap:2px">${sjuk}${fl}</div>`;
    }

    // Click to go to week view for this date
    const clickDs=ds;
    html+=`<div class="month-cell${!isThisMonth?' other-month':''}${isWe?' we-cell':''}${isToday2?' today-month':''}" onclick="currentDate=new Date('${clickDs}T12:00:00');setViewMode('week')" style="cursor:pointer">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
        <span class="month-day-num${isToday2?' today-num':''}">${cursor.getDate()}</span>
        ${sfPct>=0?`<span style="font-size:8px;font-weight:700;color:${sfCol};background:${sfBg};padding:0 3px;border-radius:6px;border:1px solid ${sfCol}33">${sfFilled}/${sfTotal}</span>`:''}
      </div>
      ${holiday?`<div style="font-size:8px;color:#b45309;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${holiday}</div>`:''}
      ${assignedHtml}
    </div>`;

    cursor.setDate(cursor.getDate()+1);
    // Stop when we've passed the last day of the month AND we're at the start of a new week (Monday)
    if(cursor>lastDay&&cursor.getDay()===1)break;
    // Safety: don't go more than 42 days (6 weeks)
    if(cursor>lastDay&&(cursor-lastDay)>7*24*3600000)break;
  }
  html+=`</div>`;
  document.getElementById('scheduleContainer').innerHTML=html;
}

