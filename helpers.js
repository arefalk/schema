function docIsActive(doc,ds){if(doc.employmentStart&&ds<doc.employmentStart)return false;if(doc.employmentEnd&&ds>doc.employmentEnd)return false;return true;}
function docIsOL(d){return['ÖL','BÖL','Konsult'].some(r=>d.roles.includes(r));}
function docIsUL(d){return['ST','AT','Rand','Spec'].some(r=>d.roles.includes(r));}
function docIsHandledare(d){return['ÖL','BÖL','Konsult','Spec'].some(r=>d.roles.includes(r));}
function docMatchRole(doc,roleReq){if(!roleReq)return true;if(roleReq==='ÖL')return docIsOL(doc);if(roleReq==='UL')return docIsUL(doc);return doc.roles.includes(roleReq);}
function docAllowedOnPos(doc,pos){const a=doc.allowedPositions||[];return!a.length||a.includes(pos.id);}
function posIsFmOnly(pos,dow){return !!(pos.fmOnlyDow&&pos.fmOnlyDow.includes(dow));}
function posIsEmOnly(pos,dow){return !!(pos.emOnlyDow&&pos.emOnlyDow.includes(dow));}
function posDayMode(pos,dow){if(posIsFmOnly(pos,dow))return 'fm';if(posIsEmOnly(pos,dow))return 'em';return 'hel';}
function getMinFill(posId,ds){
  const overrides=(posMinFillOverrides[posId]||[]);
  for(const o of overrides){if(ds>=o.from&&ds<=o.to)return o.min;}
  const pos=positions.find(p=>p.id===posId);
  if(!pos)return 1;
  if(pos.minFill!==undefined)return pos.minFill;
  return pos.slots.filter(s=>!s.noBlock).length;
}
// Returns 'fm'|'em'|'hel' or null for a doctor's deltid on a given date.
function deltidOnDay(docId,ds){
  const dt=new Date(ds);
  const dow=dt.getDay();
  const wk=wkey(weekNum(dt),weekYear(dt));
  const wkVal=deltidVeckor[docId]&&deltidVeckor[docId][wk];
  if(wkVal){
    if(wkVal!=='hel'&&(dow===0||dow===6))return null; // fm/em gäller ej helg
    return wkVal;
  }
  return(deltidDagar[docId]&&deltidDagar[docId][ds])||null;
}
function docIsOffDay(docId,ds){return deltidOnDay(docId,ds)==='hel';}

// Returns a reason string if doc cannot work a DAY SHIFT on given dateStr, else null.
function docRestrictedOnDate(docId,ds){
  const dt=new Date(ds+'T12:00:00');
  if(docIsOffDay(docId,ds))return 'Deltid';
  if(docHasAnyLedighet(docId,ds))return 'Ledighet';
  if(docHasUtbildning(docId,ds))return 'Utbildning';

  // Nattjour: ej dagpass samma dag eller dagen efter (vila)
  const yesterday=isoDate(addDays(dt,-1));
  function hasNightOn(dateStr){
    const d2=new Date(dateStr),dow2=d2.getDay();
    const a1=getJVAnchorWk(d2,'JV1');
    if(getJV(a1.wn,a1.yr).JV1===docId&&[5,1,3].includes(dow2)) return true;
    const a2=getJVAnchorWk(d2,'JV2');
    if(getJV(a2.wn,a2.yr).JV2===docId&&[0,2,4].includes(dow2)) return true;
    const m2=getMonday(d2);
    if(getJV(weekNum(m2),weekYear(m2)).NLO===docId&&dow2===6) return true;
    return false;
  }
  if(hasNightOn(ds))        return 'Nattjour denna dag';
  if(hasNightOn(yesterday)) return 'Nattjour dagen innan';

  // Fredag i JV1:s spillvecka (mån+ons nätter) är blockerad
  if(dt.getDay()===5){const prevMon=addDays(getMonday(dt),-7);if(getJV(weekNum(prevMon),weekYear(prevMon)).JV1===docId)return 'Jourvecka';}

  if(docIsJourledigt(docId,ds)) return 'Jourledig';
  // Övrigt: hel-dagsblockering
  const _ovrIds=n=>(n.docIds&&n.docIds.length?n.docIds:n.docId?[n.docId]:[]);
  const ovrHel=ovrigtForDate(ds).find(n=>_ovrIds(n).includes(docId)&&(n.blocks===true||n.blocks==='hel'));
  if(ovrHel) return 'Övrigt';
  // Sjukskrivning/VAB
  if(docHasSjukskrivning(docId,ds)) return 'Sjukskrivning/VAB';
  // Föräldraledig
  if(docHasForaldraledig(docId,ds)) return 'Föräldraledig';
  return null;
}
function docHasSjukskrivning(docId,ds){
  return !!(sjukskrivning[ds]&&sjukskrivning[ds].some(e=>e.docId===docId));
}
function docHasForaldraledig(docId,ds){
  if(foraldraledig[ds]&&foraldraledig[ds].some(e=>e.docId===docId))return true;
  // Check doctor-level FL period (covers future dates not yet entered day-by-day)
  const doc=docById(docId);
  if(doc&&doc.flFrom&&ds>=doc.flFrom&&(!doc.flTo||ds<=doc.flTo))return true;
  return false;
}

function docIsJourledigt(docId,ds){
  const dt=new Date(ds+'T12:00:00'),dow=dt.getDay();
  if(dow<1||dow>5)return false;
  // BJFS (fre natt + sön dag+natt) → jourledig efterföljande fredag
  if(dow===5){if(getBJ(isoDate(addDays(dt,-7)),'BJFS')===docId)return true;}
  // BJLO (lör dag+natt) → jourledig måndag
  if(dow===1){if(getBJ(isoDate(addDays(dt,-2)),'BJLO')===docId)return true;}
  // NLÖ (lör natt) → jourledig måndag; ankar = NLO i föregående vecka (respektera override)
  if(dow===1){
    const prevMon=addDays(dt,-7);
    const prevSatDs=isoDate(addDays(prevMon,5));
    const effectiveNLO=getJVOverride(prevSatDs,'NLO_night')||getJV(weekNum(prevMon),weekYear(prevMon)).NLO;
    if(effectiveNLO===docId)return true;
  }
  return false;
}

function docAssignedElsewhere(docId,ds,excludeSlotId){
  if(schedule[ds]){
    for(const[sid,did]of Object.entries(schedule[ds])){
      if(did===docId&&sid!==excludeSlotId){
        if(getSlotHalf(sid,ds))continue;
        const p=posOfSlot(sid);
        const ss=p&&p.slots.find(s=>s.slotId===sid);
        if(ss?.noBlock)continue; // noBlock-slots (t.ex. Rond) blockerar inte andra tilldelningar
        return p?p.name:'Annan position';
      }
    }
  }
  if((auskultationEntries[ds]||[]).some(e=>e.docId===docId))return'Auskultation/Intro';
  return null;
}
function docHasHandledningOn(docId,ds){
  return specialsOnDate(ds).some(([k,v])=>v.type==='handledning'&&(v.docId===docId||v.supervisorId===docId));
}
// Returns 'fm'|'em'|''(full)|null(ingen) for doctor's handledning on date
function docHandledningHalfOn(docId,ds){
  const e=specialsOnDate(ds).find(([k,v])=>v.type==='handledning'&&(v.docId===docId||v.supervisorId===docId));
  if(!e)return null;
  return e[1].halfDay||'';
}
function djWeekCount(docId,ds,excludeDs,posId){
  const mon=getMonday(new Date(ds+'T12:00:00'));
  const djSlotIds=positions.filter(p=>p.id===posId).flatMap(p=>p.slots.map(s=>s.slotId));
  let cnt=0;
  weekDays(mon,5).forEach(d=>{const wds=isoDate(d);if(wds===excludeDs)return;djSlotIds.forEach(sid=>{if(getSlot(sid,wds)===docId)cnt++;});});
  return cnt;
}
function docCanFillSlot(doc,slot,ds){
  const pos=posOfSlot(slot.slotId);
  if(pos&&!docAllowedOnPos(doc,pos))return false;
  if(!docMatchRole(doc,slot.roleReq))return false;
  if(ds&&docRestrictedOnDate(doc.id,ds))return false;
  if(ds&&!slot.noBlock&&docAssignedElsewhere(doc.id,ds,slot.slotId))return false;
  if(ds&&(auskultationEntries[ds]||[]).some(e=>e.docId===doc.id))return false;
  if(ds){
    const handlHalf=docHandledningHalfOn(doc.id,ds);
    if(handlHalf!==null){
      const slotHalf=getSlotHalf(slot.slotId,ds);
      if(!slotHalf||slotHalf===handlHalf)return false;
    }
    // Övrigt FM/EM-blockering
    const _ovrIds=n=>(n.docIds&&n.docIds.length?n.docIds:n.docId?[n.docId]:[]);
    const ovrHalf=ovrigtForDate(ds).find(n=>_ovrIds(n).includes(doc.id)&&(n.blocks==='fm'||n.blocks==='em'));
    if(ovrHalf){const slotHalf=getSlotHalf(slot.slotId,ds);if(!slotHalf||slotHalf===ovrHalf.blocks)return false;}
  }
  if(ds&&pos&&pos.id==='pos_dbj'&&djWeekCount(doc.id,ds,ds,pos.id)>=2)return false;
  return true;
}
function missingReqs(doc,slot,ds){
  const m=[];
  const pos=posOfSlot(slot.slotId);
  if(pos&&!docAllowedOnPos(doc,pos))m.push('Ej tillåten');
  if(!docMatchRole(doc,slot.roleReq))m.push('Fel roll för slotten');
  if(ds){const r=docRestrictedOnDate(doc.id,ds);if(r)m.push(r);}
  if(ds){const r=docAssignedElsewhere(doc.id,ds,slot.slotId);if(r)m.push(`Redan på ${r}`);}
  if(ds){const handlHalf=docHandledningHalfOn(doc.id,ds);if(handlHalf!==null){const slotHalf=getSlotHalf(slot.slotId,ds);if(!slotHalf||slotHalf===handlHalf)m.push('Handledning');}}
  if(ds&&pos&&pos.id==='pos_dbj'&&djWeekCount(doc.id,ds,ds,pos.id)>=2)m.push('Max 2 dagbakjour/vecka');
  return m;
}
// Normalize to noon to avoid UTC-midnight crossing in Swedish timezone (UTC+1/+2)
function getMonday(d){const dt=new Date(d),day=dt.getDay(),diff=day===0?-6:1-day;dt.setDate(dt.getDate()+diff);dt.setHours(12,0,0,0);return dt;}
function isoWeekMon(wn,yr){const jan4=new Date(Date.UTC(yr,0,4));const j=getMonday(jan4);return addDays(j,(wn-weekNum(j))*7);}
// Night shift dates for a JV jourvecka (offsets from anchor Monday)
function jvNightDates(wn,yr,jvType){const m=isoWeekMon(wn,yr);if(jvType==='JV1')return[4,7,9].map(o=>isoDate(addDays(m,o)));if(jvType==='JV2')return[6,8,10].map(o=>isoDate(addDays(m,o)));if(jvType==='NLO')return[5].map(o=>isoDate(addDays(m,o)));return[];}
// True if doctor cannot do a night shift on ds: has ledighet/utbildning on that day or the next morning
function docBlockedForNight(docId,ds){
  const next=isoDate(addDays(new Date(ds),1));
  return docHasAnyLedighet(docId,ds)||docHasUtbildning(docId,ds)||docHasForaldraledig(docId,ds)||docHasSjukskrivning(docId,ds)
    ||docHasAnyLedighet(docId,next)||docHasUtbildning(docId,next)||docHasForaldraledig(docId,next)||docHasSjukskrivning(docId,next);
}
function isoDate(d){return d.toISOString().slice(0,10);}
function isToday(d){return isoDate(d)===isoDate(new Date());}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function weekDays(mon,n){return Array.from({length:n},(_,i)=>addDays(mon,i));}
function weekNum(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));dt.setUTCDate(dt.getUTCDate()+4-(dt.getUTCDay()||7));const ys=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-ys)/86400000)+1)/7);}
function weekYear(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));dt.setUTCDate(dt.getUTCDate()+4-(dt.getUTCDay()||7));return dt.getUTCFullYear();}
function svDay(d){return['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][d.getDay()];}
function svMonth(d){return['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()];}
function docInitials(n){return n.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();}
function docShortName(doc){
  const parts=doc.name.split(' ');
  return parts.length>1?parts[0]+' '+parts[1][0]:parts[0];
}
function posColor(idx){return POS_COLORS[idx%POS_COLORS.length];}
function getSlot(sid,ds){return(schedule[ds]&&schedule[ds][sid])||'';}
function setSlot(sid,ds,val){if(!schedule[ds])schedule[ds]={};schedule[ds][sid]=val;if(!val){if(scheduleHalfDay[ds])delete scheduleHalfDay[ds][sid];}}
function getSlotHalf(sid,ds){return(scheduleHalfDay[ds]&&scheduleHalfDay[ds][sid])||'';}
function setSlotHalf(sid,ds,half){if(!scheduleHalfDay[ds])scheduleHalfDay[ds]={};scheduleHalfDay[ds][sid]=half;}
function getSlotNote(sid,ds){return(scheduleNotes[ds]&&scheduleNotes[ds][sid])||'';}
function setSlotNote(sid,ds,note){if(!scheduleNotes[ds])scheduleNotes[ds]={};if(note)scheduleNotes[ds][sid]=note;else delete scheduleNotes[ds][sid];}
function docById(id){return doctors.find(d=>d.id===id);}
function allSlots(){return positions.flatMap(p=>p.slots);}

// Returns how many BJNV nights the doctor has Mon–Thu of the week containing ds
function docBJNVCountThisWeek(docId,ds){
  const mon=getMonday(new Date(ds));
  let n=0;for(let i=0;i<4;i++){if(getBJ(isoDate(addDays(mon,i)),'BJNV')===docId)n++;}
  return n;
}
// Returns true if the doctor has BJFS or BJLO for the weekend bracketing this weekday
// Checks both the immediately preceding weekend and the upcoming weekend of the same week
function docHasWeekendBJNear(docId,ds){
  const mon=getMonday(new Date(ds));
  const prevFri=isoDate(addDays(mon,-3)),prevSat=isoDate(addDays(mon,-2));
  const thisFri=isoDate(addDays(mon,4)),thisSat=isoDate(addDays(mon,5));
  return getBJ(thisFri,'BJFS')===docId||getBJ(thisSat,'BJLO')===docId||
         getBJ(prevFri,'BJFS')===docId||getBJ(prevSat,'BJLO')===docId;
}
// Returns a conflict string if doctor has any weekend BJ within MIN_GAP-1 weeks of anchorDs, or null
// Hard minimum: 3 veckor (2 jourfria helger). Preferred: 4 veckor (3 jourfria helger).
function weekendBJConflict(docId,anchorDs){
  const mon=getMonday(new Date(anchorDs));
  for(let offset=-3;offset<=3;offset++){
    if(offset===0)continue;
    const cm=addDays(mon,offset*7);
    const friDs=isoDate(addDays(cm,4)),satDs=isoDate(addDays(cm,5));
    if(getBJ(friDs,'BJFS')===docId||getBJ(satDs,'BJLO')===docId){
      const gap=Math.abs(offset);
      const label=gap<=2?'kräver minst 3 jourfria helger':'nära gränsen (helst 4 jourfria helger)';
      return`Bakjourhelg v.${weekNum(cm)} — ${label}`;
    }
  }
  return null;
}
// Hard check only — returns true if gap is strictly too short (< 3 weeks)
function weekendBJTooClose(docId,anchorDs){
  const mon=getMonday(new Date(anchorDs));
  for(let offset=-2;offset<=2;offset++){
    if(offset===0)continue;
    const cm=addDays(mon,offset*7);
    const friDs=isoDate(addDays(cm,4)),satDs=isoDate(addDays(cm,5));
    if(getBJ(friDs,'BJFS')===docId||getBJ(satDs,'BJLO')===docId)return true;
  }
  return false;
}

// Returns a conflict string for BJNV, or null if ok
function bjnvConflict(docId,ds){
  if(docBJNVCountThisWeek(docId,ds)>=1){
    // Check if the existing one is today (editing same slot) — count excluding current day
    const mon=getMonday(new Date(ds));
    let others=0;for(let i=0;i<4;i++){const d2=isoDate(addDays(mon,i));if(d2!==ds&&getBJ(d2,'BJNV')===docId)others++;}
    if(others>=1)return 'Redan BJNV denna vecka';
  }
  if(docHasWeekendBJNear(docId,ds))return 'Helgbakjour i anslutning';
  return null;
}
function slotById(sid){return allSlots().find(s=>s.slotId===sid);}
function posOfSlot(sid){return positions.find(p=>p.slots.some(s=>s.slotId===sid));}
function docIsAssignedOnDate(docId,ds){
  // Only count blocking slots — noBlock slots (like Rond) don't prevent other assignments
  if(schedule[ds]){
    for(const [sid,did] of Object.entries(schedule[ds])){
      if(did!==docId)continue;
      const sp=posOfSlot(sid);const ss=sp?.slots.find(s=>s.slotId===sid);
      if(!ss?.noBlock)return true;
    }
  }
  if((auskultationEntries[ds]||[]).some(e=>e.docId===docId))return true;
  return false;
}
function wkey(wn,yr){return`${yr}-W${String(wn).padStart(2,'0')}`;}
function getJV(wn,yr){return jourveckor[wkey(wn,yr)]||{JV1:null,JV2:null,NLO:null};}
function setJV(wn,yr,t,docId){
  if(!jourveckor[wkey(wn,yr)])jourveckor[wkey(wn,yr)]={JV1:null,JV2:null,NLO:null};
  const jv=jourveckor[wkey(wn,yr)];
  // Block if same doctor already holds another JV slot this week
  if(docId){
    const conflict=Object.entries(jv).find(([k,v])=>k!==t&&v===docId);
    if(conflict){const doc=docById(docId);showToast(`⚠ ${doc?doc.name.split(' ')[0]:'Läkaren'} har redan ${conflict[0]} denna vecka`);return false;}
  }
  jv[t]=docId;
  // Warn if this pushes doctor over 4 nights in any month (soft warning, doesn't block)
  if(docId&&t!=='NLO'){
    const doc=docById(docId);
    // Check month of the anchor date
    const jan4=new Date(Date.UTC(yr,0,4));
    const jan4Mon=getMonday(jan4);
    const mon2=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
    const anchorDt=t==='JV1'?addDays(mon2,4):addDays(mon2,5);
    const mo=anchorDt.getMonth(),y=anchorDt.getFullYear();
    const cnt=countNightShiftsInMonth(docId,y,mo);
    if(cnt>4)showToast(`⚠ ${doc?doc.name.split(' ')[0]:'Läkaren'} får ${cnt} journätter i ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][mo]} (max 4)`);
  }
  return true;
}
function docHasJVThisWeek(docId,wn,yr){
  // Check this calendar week's direct assignment
  const jv=getJV(wn,yr);
  if(jv.JV1===docId||jv.JV2===docId||jv.NLO===docId) return true;
  // Overflow from PREVIOUS week's JV spills sun/mon/wed(/fri for JV1) into this week
  const prevMon=addDays(isoWeekMon(wn,yr),-7);
  const prevJV=getJV(weekNum(prevMon),weekYear(prevMon));
  if(prevJV.JV1===docId||prevJV.JV2===docId) return true;
  return false;
}
function getBJ(ds,t){return(bjSchedule[ds]&&bjSchedule[ds][t])||null;}
function setBJ(ds,t,docId){if(!bjSchedule[ds])bjSchedule[ds]={};bjSchedule[ds][t]=docId;}

// Återkommande Övrigt: returnerar alla övrigt-poster (engångs + återkommande) för ett datum
function ovrigtForDate(ds){
  const notes=[...(ovrigtNotes[ds]||[])];
  (ovrigtRecurring||[]).forEach(r=>{
    if(!r.startDate||ds<r.startDate)return;
    if(r.endDate&&ds>r.endDate)return;
    const start=new Date(r.startDate+'T12:00:00'),target=new Date(ds+'T12:00:00');
    const diffDays=Math.round((target-start)/86400000);
    if(r.recurrence==='weekly'&&diffDays%7===0)notes.push({...r,_recurring:true});
    else if(r.recurrence==='biweekly'&&diffDays%14===0)notes.push({...r,_recurring:true});
    else if(r.recurrence==='quadweekly'&&diffDays%28===0)notes.push({...r,_recurring:true});
    // Legacy 'monthly' support for previously saved data
    else if(r.recurrence==='monthly'){
      if(target.getDate()===start.getDate()&&target.getMonth()!==start.getMonth())notes.push({...r,_recurring:true});
    }
  });
  return notes;
}
function docHasLedighet(docId,ds){return !!(ledighetRequests[docId]&&ledighetRequests[docId][ds]);}
function docHasLedighetVecka(docId,wn,yr){return !!(ledighetVeckor[docId]&&ledighetVeckor[docId][wkey(wn,yr)]);}
function docHasAnyLedighet(docId,ds){const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);return docHasLedighet(docId,ds)||docHasLedighetVecka(docId,wn,yr);}
// Önskat (ej godkänt) ledighetönskemål — dag- eller veckonivå
function docHasLedighetOnskemal(docId,ds){
  if(ledighetOnskemal[docId]&&ledighetOnskemal[docId][ds])return true;
  const mon=getMonday(new Date(ds));
  return !!(ledighetVeckorOnskemal[docId]&&ledighetVeckorOnskemal[docId][wkey(weekNum(mon),weekYear(mon))]);
}
// Önskat (ej godkänt) utbildningsönskemål
function docHasUtbildningOnskemal(docId,ds){return !!(utbildningOnskemal[docId]&&utbildningOnskemal[docId][ds]);}
// Önskat (ej godkänt) FL-önskemål
function docHasFlOnskemal(docId,ds){return !!(foraldraledigenOnskemal[docId]&&foraldraledigenOnskemal[docId][ds]);}
// Önskat (ej godkänt) jourfritt-önskemål — pending, ej ännu i jourfriOnskad
function docHasJourfriOnskemal(docId,wn,yr){return !!(jourfriOnskemal[docId]&&jourfriOnskemal[docId][wkey(wn,yr)]);}
// scope: null=any, 'week'=only week-scope, 'weekend'=week OR weekend
function docHasJourfriOnskad(docId,wn,yr,scope=null){
  const e=jourfriOnskad[docId]&&jourfriOnskad[docId][wkey(wn,yr)];
  if(!e)return false;
  if(!scope)return true;
  if(scope==='week')return e.scope==='week';
  if(scope==='weekend')return e.scope==='week'||e.scope==='weekend';
  return false;
}
function specialRecurringOnDate(ds,type){
  return(specialRecurring||[]).filter(r=>{
    if(r.type!==type)return false;
    if(!r.startDate||ds<r.startDate)return false;
    if(r.endDate&&ds>r.endDate)return false;
    const start=new Date(r.startDate+'T12:00:00'),target=new Date(ds+'T12:00:00');
    const diffDays=Math.round((target-start)/86400000);
    if(r.recurrence==='weekly')return diffDays%7===0;
    if(r.recurrence==='biweekly')return diffDays%14===0;
    if(r.recurrence==='quadweekly')return diffDays%28===0;
    return false;
  });
}
function docHasUtbildning(docId,ds){
  if(utbildningDagar[docId]&&utbildningDagar[docId][ds])return true;
  const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);
  if(utbildningVeckor[docId]&&utbildningVeckor[docId][wkey(wn,yr)])return true;
  return specialRecurringOnDate(ds,'utb').some(r=>r.docId===docId);
}
function docHasRandning(docId,ds){return!!(randningDagar[docId]&&randningDagar[docId][ds]);}
// utbildningDagar[docId][ds] = true (ingen notering) eller {note:'text'}
function getUtbNote(docId,ds){
  const v=utbildningDagar[docId]&&utbildningDagar[docId][ds];
  return(v&&typeof v==='object')?v.note||'':'';
}
function setUtbNote(docId,ds,note){
  if(!utbildningDagar[docId]||!utbildningDagar[docId][ds])return;
  utbildningDagar[docId][ds]=note?{note}:true;
}
function countNightShiftsInMonth(docId,year,month){
  // Count all night shifts (JV1 nights, JV2 nights, NLO, BJFS nights, BJLO nights, BJNV) in given month
  let count=0;
  const daysInMonth=new Date(year,month+1,0).getDate();
  for(let d=1;d<=daysInMonth;d++){
    const dt=new Date(year,month,d);
    const ds=isoDate(dt);
    const dow=dt.getDay();
    const mon2=getMonday(dt),wn=weekNum(mon2),yr2=weekYear(mon2);
    const jv=getJV(wn,yr2);
    // JV1 nights: fri(5), mon(1), wed(3) — use anchor week
    {const a=getJVAnchorWk(dt,'JV1');if(getJV(a.wn,a.yr).JV1===docId&&[5,1,3].includes(dow))count++;}
    // JV2 nights: sun(0), tue(2), thu(4) — use anchor week
    {const a=getJVAnchorWk(dt,'JV2');if(getJV(a.wn,a.yr).JV2===docId&&[0,2,4].includes(dow))count++;}
    // NLO: sat night
    if(jv.NLO===docId&&dow===6) count++;
    // BJFS: fri night (anchor=fri), sun night (anchor=fri of same weekend = sun-2)
    if([5,0].includes(dow)){const bjfsDoc=getBJ(isoDate(dow===0?addDays(dt,-2):dt),'BJFS');if(bjfsDoc===docId)count++;}
    // BJLO: sat night
    if(dow===6&&getBJ(ds,'BJLO')===docId) count++;
    // BJNV: mon-thu night
    if(dow>=1&&dow<=4&&getBJ(ds,'BJNV')===docId) count++;
  }
  return count;
}
function scheduleHandledningMottagning(stId,supId,ds,handlHalf){
  if(!handlHalf)return; // full-day handledning — no auto mottagning
  const motHalf=handlHalf==='fm'?'em':'fm';
  const mottPos=positions.filter(p=>p.section==='mott'||p.id==='pos_mott'||/mottagning/i.test(p.name));
  [stId,supId].filter(Boolean).forEach(docId=>{
    if(!docById(docId))return;
    if(docIsAssignedOnDate(docId,ds))return; // already assigned, don't override
    for(const pos of mottPos){
      for(const slot of pos.slots){
        if(!getSlot(slot.slotId,ds)){
          setSlot(slot.slotId,ds,docId);
          setSlotHalf(slot.slotId,ds,motHalf);
          return;
        }
      }
    }
  });
}
function clearDocFromMottagning(docId,ds){
  positions.filter(p=>p.id==='pos_mott'||p.section==='mott'||p.section==='specmott'||/mottagning/i.test(p.name)).forEach(pos=>{
    pos.slots.forEach(slot=>{if(getSlot(slot.slotId,ds)===docId)setSlot(slot.slotId,ds,'');});
  });
}
function getBVC(ds){return bvcSchedule[ds]||null;}
function setBVC(ds,docId){bvcSchedule[ds]=docId;}
function getSpecial(ds,key){return(specialSlots[ds]&&specialSlots[ds][key])||null;}
function setSpecial(ds,key,val){if(!specialSlots[ds])specialSlots[ds]={};specialSlots[ds][key]=val;}
function delSpecial(ds,key){if(specialSlots[ds])delete specialSlots[ds][key];}
function specialsOnDate(ds){return Object.entries(specialSlots[ds]||{});}

// Returns {wn,yr} of the anchor week for a JV assignment on a given date.
// JV1 anchor = the week containing the Friday.
//   Passes on Sun(0), Mon(1), Wed(3) belong to the anchor week starting the PREVIOUS Friday.
// JV2 anchor = the week containing the Saturday.
//   Passes on Sun(0), Tue(2), Thu(4) belong to the anchor week starting the PREVIOUS Saturday.
// Override key = jvType+'_'+shiftType, e.g. 'JV1_night', 'JV2_day', 'NLO_night'
function getJVOverride(ds,key){return(nightOverrides[ds]||{})[key]||null;}
function setJVOverride(ds,key,docId){
  if(!nightOverrides[ds])nightOverrides[ds]={};
  if(docId)nightOverrides[ds][key]=docId;
  else{delete nightOverrides[ds][key];if(!Object.keys(nightOverrides[ds]).length)delete nightOverrides[ds];}
}
// Returns the effective docId for a specific JV shift (override takes precedence over JV week)
function getEffectiveJVDoc(ds,jvType,shiftType){
  const key=jvType+'_'+shiftType;
  const ov=getJVOverride(ds,key);
  if(ov)return ov;
  const dt=new Date(ds+'T12:00:00');
  const {wn,yr}=getJVAnchorWk(dt,jvType);
  return getJV(wn,yr)[jvType]||null;
}
function getJVAnchorWk(date, jvType){
  const dow=date.getDay();
  // Days that overflow into the next ISO week and need -7 to find the anchor week.
  // JV1 starts Friday → Fri+Sat+Sun are in the anchor ISO week; Mon+Wed are in the next.
  // JV2 starts Saturday → Sat+Sun are in the anchor ISO week; Mon–Fri are in the next.
  const overflowDays={JV1:[1,3], JV2:[1,2,3,4,5]};
  const overflow=(overflowDays[jvType]||[]).includes(dow);
  const anchorDate=overflow?addDays(date,-7):date;
  const mon=getMonday(anchorDate);
  return{wn:weekNum(mon),yr:weekYear(mon)};
}

function jvShiftsOnDate(date,jvType){
  const result=[];
  const dowToOffset={1:0,2:1,3:2,4:3,5:4,6:5,0:6};

  if(jvType==='NLO'){
    const mon=getMonday(date),wn=weekNum(mon),yr=weekYear(mon);
    const ds=isoDate(date);
    const docId=getJV(wn,yr)['NLO'];
    if(date.getDay()===6){
      const key='NLO_night';
      const ovId=getJVOverride(ds,key);
      const effectiveId=ovId||docId;
      const doc=effectiveId?docById(effectiveId):null;
      result.push({shift:JV_DEFS['NLO'][0],doc,isOverride:!!ovId,overrideKey:key,ds,jvType:'NLO'});
    }
    if(date.getDay()===1){
      const prevMon=addDays(mon,-7);
      const prevSatDs=isoDate(addDays(prevMon,5));
      const ovId=getJVOverride(prevSatDs,'NLO_night');
      const effectiveId=ovId||getJV(weekNum(prevMon),weekYear(prevMon))['NLO'];
      if(effectiveId){const prevDoc=docById(effectiveId);if(prevDoc)result.push({shift:{dow:1,type:'jourledigt',label:'Mån jourledigt (NLÖ)'},doc:prevDoc});}
    }
    return result;
  }

  // JV1 / JV2
  const {wn,yr}=getJVAnchorWk(date,jvType);
  const anchorMonCorrect=(()=>{
    const jan4=new Date(Date.UTC(yr,0,4));
    const jan4Mon=getMonday(jan4);
    return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
  })();
  const docId=getJV(wn,yr)[jvType];
  const ovDays={JV1:[1,3],JV2:[2,4]};
  JV_DEFS[jvType].forEach(shift=>{
    const isOverflow=(ovDays[jvType]||[]).includes(shift.dow);
    const shiftDate=isOverflow?addDays(anchorMonCorrect,7+dowToOffset[shift.dow]):addDays(anchorMonCorrect,dowToOffset[shift.dow]);
    if(isoDate(shiftDate)!==isoDate(date))return;
    const ds=isoDate(shiftDate);
    const isWeekend=(shift.dow===0||shift.dow===6);
    // Night shifts and HJ (weekend day shifts) support manual override
    if(shift.type==='night'||isWeekend){
      const key=jvType+'_'+shift.type;
      const ovId=getJVOverride(ds,key);
      const effectiveId=ovId||docId;
      const doc=effectiveId?docById(effectiveId):null;
      result.push({shift,doc,isOverride:!!ovId,overrideKey:key,ds,jvType});
    } else {
      // Weekday jourledigt — always follows JV week doc
      const doc=docId?docById(docId):null;
      if(docId&&doc)result.push({shift,doc});
    }
  });
  return result;
}

function bjfsShiftsOnDate(date){
  const mon=getMonday(date);
  const fri=addDays(mon,4),sun=addDays(mon,6);
  const shifts=[];
  const ds=isoDate(date);
  if(ds===isoDate(fri)){const docId=getBJ(isoDate(fri),'BJFS');if(docId){const doc=docById(docId);if(doc)shifts.push({type:'night',label:'Fre natt',doc});}}
  if(ds===isoDate(sun)){const docId=getBJ(isoDate(fri),'BJFS');if(docId){const doc=docById(docId);if(doc){shifts.push({type:'day',label:'Sön dag',doc});shifts.push({type:'night',label:'Sön natt',doc});}}}
  // Jourledigt the Friday AFTER the BJFS weekend (7 days after anchor Friday)
  if(date.getDay()===5){const prevFri=addDays(date,-7);const docId=getBJ(isoDate(prevFri),'BJFS');if(docId){const doc=docById(docId);if(doc)shifts.push({type:'jourledigt',label:'Jourledigt (BJFS)',doc});}}
  return shifts;
}
function bjloShiftsOnDate(date){
  const mon=getMonday(date);
  const sat=addDays(mon,5);
  const ds=isoDate(date);
  const shifts=[];
  if(ds===isoDate(sat)){const docId=getBJ(isoDate(sat),'BJLO');if(docId){const doc=docById(docId);if(doc){shifts.push({type:'day',label:'Lör dag',doc});shifts.push({type:'night',label:'Lör natt',doc});}}}
  // Jourledigt måndag EFTER lördagen (2 dagar efter lördag)
  if(date.getDay()===1){const prevSat=addDays(date,-2);const docId=getBJ(isoDate(prevSat),'BJLO');if(docId){const doc=docById(docId);if(doc)shifts.push({type:'jourledigt',label:'Jourledigt (BJLÖ)',doc});}}
  return shifts;
}


function posActiveThisWeek(pos,wn){if(!pos.weekParity)return true;if(pos.weekParity==='even')return wn%2===0;if(pos.weekParity==='odd')return wn%2!==0;return true;}
function posDayActiveThisWeek(pos,dow,wn){
  const sp=pos.slotParity&&pos.slotParity[dow];
  if(sp){
    // Day is active if at least one slot's parity matches
    const _ok=p=>!p||(p==='even'?wn%2===0:wn%2!==0);
    const khOk=_ok(sp.kh);
    const kskOk=_ok(sp.ksk);
    if(khOk||kskOk)return true;
    return false;
  }
  const p=(pos.parityPerDay&&pos.parityPerDay[dow])||pos.weekParity;
  if(!p)return true;
  if(p==='even')return wn%2===0;
  if(p==='odd')return wn%2!==0;
  return true;
}

// ── Svenska helgdagar ──
function easterSunday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31)-1;
  const day=((h+l-7*m+114)%31)+1;
  // Use noon to avoid UTC midnight timezone shift in isoDate()
  const dt=new Date(year,month,day);dt.setHours(12,0,0,0);return dt;
}
function getSwedishHolidays(year){
  const map=new Map();
  // mk() creates dates at noon to avoid UTC offset issue with isoDate()
  const mk=(y,m,d)=>{const dt=new Date(y,m,d);dt.setHours(12,0,0,0);return dt;};
  const add=(d,name)=>map.set(isoDate(d),name);
  add(mk(year,0,1),'Nyårsdagen');
  add(mk(year,0,6),'Trettondedag jul');
  const e=easterSunday(year);
  add(addDays(e,-2),'Långfredagen');
  add(e,'Påskdagen');
  add(addDays(e,1),'Annandag påsk');
  add(mk(year,4,1),'Första maj');
  add(addDays(e,39),'Kristi himmelsfärd');
  add(addDays(e,49),'Pingstdagen');
  add(mk(year,5,6),'Nationaldagen');
  // Midsommarafton (fredag) + Midsommardag (lördag): 20–26 juni
  {const s=mk(year,5,20);while(s.getDay()!==6)s.setDate(s.getDate()+1);add(addDays(s,-1),'Midsommarafton');add(new Date(s),'Midsommardagen');}
  // Alla helgons dag: lördagen 31 okt – 6 nov
  {const s=mk(year,9,31);while(s.getDay()!==6)s.setDate(s.getDate()+1);add(new Date(s),'Alla helgons dag');}
  add(mk(year,11,24),'Julafton');
  add(mk(year,11,25),'Juldagen');
  add(mk(year,11,26),'Annandag jul');
  add(mk(year,11,31),'Nyårsafton');
  return map;
}
// Returns holiday name string or null
const _holidayCache={};
function isHoliday(ds){
  const year=parseInt(ds.slice(0,4));
  if(!_holidayCache[year])_holidayCache[year]=getSwedishHolidays(year);
  return _holidayCache[year].get(ds)||null;
}

// ── Bemanning ─────────────────────────────────────
// Returns true if docId is absent (frånvaro) on ds.
// Excludes jourfritt and jourveckor/nattjour — only dagsschema frånvaro.
// inclWished: if false, only count approved absences (default: true = include wished).
function _docAbsentOnDay(docId,ds,inclWished){
  if(docHasAnyLedighet(docId,ds))return true;
  if(docHasUtbildning(docId,ds))return true;
  if(docHasRandning(docId,ds))return true;
  if(docHasForaldraledig(docId,ds))return true;
  if(docHasSjukskrivning(docId,ds))return true;
  if(deltidOnDay(docId,ds)==='hel')return true;
  const _ovrIds=n=>(n.docIds&&n.docIds.length?n.docIds:n.docId?[n.docId]:[]);
  if(ovrigtForDate(ds).some(n=>_ovrIds(n).includes(docId)&&(n.blocks===true||n.blocks==='hel')))return true;
  if(inclWished!==false){
    if(docHasLedighetOnskemal(docId,ds))return true;
    if(docHasUtbildningOnskemal(docId,ds))return true;
    if(docHasFlOnskemal(docId,ds))return true;
  }
  return false;
}
// Returns staffing stats for a given day.
// {total, ol, ul, minTotal, minOL, warned, isWeekend}
function _staffingStatsOnDay(ds,inclWished){
  let ol=0,ul=0;
  doctors.forEach(doc=>{
    if(_docAbsentOnDay(doc.id,ds,inclWished))return;
    if(docIsOL(doc))ol++;else ul++;
  });
  const total=ol+ul;
  const dt=new Date(ds+'T12:00:00'),dow=dt.getDay();
  const isWeekend=dow===0||dow===6;
  let minTotal=0,minOL=0;
  if(!isWeekend){
    mandatoryPositions.forEach(posId=>{
      const pos=positions.find(p=>p.id===posId);
      if(!pos)return;
      if(pos.days&&!pos.days.includes(dow))return;
      const fill=pos.minFill||pos.slots.length;
      minTotal+=fill;
      const olSlots=pos.slots.filter(s=>s.roleReq==='ÖL').length;
      minOL+=Math.min(olSlots,fill);
    });
  }
  const warned=!isWeekend&&(total<minTotal||ol<minOL);
  return{total,ol,ul,minTotal,minOL,warned,isWeekend};
}

// ── Ändringslogg ──────────────────────────────────
function logChange(desc){
  changeLog.unshift({ts:new Date().toISOString(),desc});
  if(changeLog.length>300)changeLog.length=300;
}
