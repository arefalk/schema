function docIsOL(d){return['ÖL','BÖL','Konsult'].some(r=>d.roles.includes(r));}
function docIsUL(d){return['ST','AT','Rand'].some(r=>d.roles.includes(r));}
function docIsHandledare(d){return['ÖL','BÖL','Konsult','Spec'].some(r=>d.roles.includes(r));}
function docMatchRole(doc,req){if(!req)return true;if(req==='ÖL')return docIsOL(doc);if(req==='UL')return docIsUL(doc);return true;}
function docAllowedOnPos(doc,pos){const a=doc.allowedPositions||[];return a.length===0||a.includes(pos.id);}

// Returns a reason string if doc cannot work a DAY SHIFT on given dateStr, else null.
function docRestrictedOnDate(docId,ds){
  const dt=new Date(ds);
  const mon=getMonday(dt),wn=weekNum(mon),yr=weekYear(mon);
  const jv=getJV(wn,yr);

  // Rule 1: JV1 or JV2 that jourvecka → no weekday day shifts
  // JV1 jourvecka spans fri–thu. JV2 spans sat–fri.
  // Check if this doctor has JV1/JV2 in the anchor week for this date.
  const jv1Anchor=getJVAnchorWk(dt,'JV1');
  const jv2Anchor=getJVAnchorWk(dt,'JV2');
  const isJV1Week=getJV(jv1Anchor.wn,jv1Anchor.yr).JV1===docId;
  const isJV2Week=getJV(jv2Anchor.wn,jv2Anchor.yr).JV2===docId;
  // JV1 jourvecka: fre(ankarvecka) + mån–fre(spillvecka) = inga dagpass mån–fre i spillveckan
  // plus fredagen i ankarveckan blockeras av nattjour-regeln nedan
  // JV2 jourvecka: lör(ankarvecka) + mån–fre(spillvecka)
  if(isJV1Week&&dt.getDay()>=1&&dt.getDay()<=5) return 'Jourvecka';
  if(isJV2Week&&dt.getDay()>=1&&dt.getDay()<=5) return 'Jourvecka';
  // Also block the anchor Friday for JV1 (the night shift day itself)
  if(dt.getDay()===5){const calMon=getMonday(dt),calWn=weekNum(calMon),calYr=weekYear(calMon);if(getJV(calWn,calYr).JV1===docId)return 'Jourvecka';}

  // Rule 2: no day shift the day before or after a night shift
  // Collect all night-shift dates for this doctor across JV/BJ/NLO
  // We check yesterday and tomorrow for night duty
  const yesterday=isoDate(addDays(dt,-1));
  const tomorrow=isoDate(addDays(dt,1));

  function hasNightOn(dateStr){
    const d2=new Date(dateStr);
    const dow2=d2.getDay();
    // JV1 nights (fre=5, mån=1, ons=3) — use anchor week
    const a1=getJVAnchorWk(d2,'JV1');
    if(getJV(a1.wn,a1.yr).JV1===docId&&[5,1,3].includes(dow2)) return true;
    // JV2 nights (sön=0, tis=2, tor=4) — use anchor week
    const a2=getJVAnchorWk(d2,'JV2');
    if(getJV(a2.wn,a2.yr).JV2===docId&&[0,2,4].includes(dow2)) return true;
    // NLO: lör(6) — same calendar week
    const m2=getMonday(d2);
    if(getJV(weekNum(m2),weekYear(m2)).NLO===docId&&dow2===6) return true;
    return false;
  }

  if(hasNightOn(ds))      return 'Nattjour denna dag';
  if(hasNightOn(yesterday)) return 'Nattjour dagen innan';
  if(hasNightOn(tomorrow))  return 'Nattjour dagen efter';

  if(docIsJourledigt(docId,ds)) return 'Jourledig';

  return null;
}

function docIsJourledigt(docId,ds){
  const dt=new Date(ds),dow=dt.getDay();
  if(dow<1||dow>5)return false;
  // BJNV (mån–tor natt) → nästa vardag jourledig
  if(dow>=2&&dow<=5){const prev=isoDate(addDays(dt,-1));if(getBJ(prev,'BJNV')===docId)return true;}
  // BJFS (fre natt + sön dag+natt) → jourledig fredagen efter; ankar = förra fredagen = addDays(fre,-7)
  if(dow===5){if(getBJ(isoDate(addDays(dt,-7)),'BJFS')===docId)return true;}
  // BJLO (lör natt) → mån ledigdag; ankar = lördagen = addDays(mån,-2)
  if(dow===1){if(getBJ(isoDate(addDays(dt,-2)),'BJLO')===docId)return true;}
  return false;
}

function docCanFillSlot(doc,slot,ds){
  const pos=posOfSlot(slot.slotId);
  if(pos&&!docAllowedOnPos(doc,pos))return false;
  if(!docMatchRole(doc,slot.roleReq))return false;
  if(ds&&docRestrictedOnDate(doc.id,ds))return false;
  return true;
}
function missingReqs(doc,slot,ds){
  const m=[];
  const pos=posOfSlot(slot.slotId);
  if(pos&&!docAllowedOnPos(doc,pos))m.push('Ej tillåten');
  if(slot.roleReq==='ÖL'&&!docIsOL(doc))m.push('ÖL');
  if(slot.roleReq==='UL'&&!docIsUL(doc))m.push('UL');
  if(ds){const r=docRestrictedOnDate(doc.id,ds);if(r)m.push(r);}
  return m;
}
function getMonday(d){const dt=new Date(d),day=dt.getDay(),diff=day===0?-6:1-day;dt.setDate(dt.getDate()+diff);dt.setHours(0,0,0,0);return dt;}
function isoDate(d){return d.toISOString().slice(0,10);}
function isToday(d){return isoDate(d)===isoDate(new Date());}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function weekDays(mon,n){return Array.from({length:n},(_,i)=>addDays(mon,i));}
function weekNum(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));dt.setUTCDate(dt.getUTCDate()+4-(dt.getUTCDay()||7));const ys=new Date(Date.UTC(dt.getUTCFullYear(),0,1));return Math.ceil((((dt-ys)/86400000)+1)/7);}
function weekYear(d){const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));dt.setUTCDate(dt.getUTCDate()+4-(dt.getUTCDay()||7));return dt.getUTCFullYear();}
function svDay(d){return['Sön','Mån','Tis','Ons','Tor','Fre','Lör'][d.getDay()];}
function svMonth(d){return['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()];}
function docInitials(n){return n.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();}
function posColor(idx){return POS_COLORS[idx%POS_COLORS.length];}
function getSlot(sid,ds){return(schedule[ds]&&schedule[ds][sid])||'';}
function setSlot(sid,ds,val){if(!schedule[ds])schedule[ds]={};schedule[ds][sid]=val;if(!val){if(scheduleHalfDay[ds])delete scheduleHalfDay[ds][sid];}}
function getSlotHalf(sid,ds){return(scheduleHalfDay[ds]&&scheduleHalfDay[ds][sid])||'';}
function setSlotHalf(sid,ds,half){if(!scheduleHalfDay[ds])scheduleHalfDay[ds]={};scheduleHalfDay[ds][sid]=half;}
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
function docIsAssignedOnDate(docId,ds){return!!(schedule[ds]&&Object.values(schedule[ds]).includes(docId));}
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
  const prevJV=getJV(wn-1,yr);
  if(prevJV.JV1===docId||prevJV.JV2===docId) return true;
  return false;
}
function getBJ(ds,t){return(bjSchedule[ds]&&bjSchedule[ds][t])||null;}
function setBJ(ds,t,docId){if(!bjSchedule[ds])bjSchedule[ds]={};bjSchedule[ds][t]=docId;}
function docHasLedighet(docId,ds){return !!(ledighetRequests[docId]&&ledighetRequests[docId][ds]);}
function docHasLedighetVecka(docId,wn,yr){return !!(ledighetVeckor[docId]&&ledighetVeckor[docId][wkey(wn,yr)]);}
function docHasAnyLedighet(docId,ds){const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);return docHasLedighet(docId,ds)||docHasLedighetVecka(docId,wn,yr);}
function docHasUtbildning(docId,ds){
  if(utbildningDagar[docId]&&utbildningDagar[docId][ds])return true;
  const mon=getMonday(new Date(ds)),wn=weekNum(mon),yr=weekYear(mon);
  return !!(utbildningVeckor[docId]&&utbildningVeckor[docId][wkey(wn,yr)]);
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
function clearDocFromMottagning(docId,ds){
  positions.filter(p=>p.id==='pos_mott').forEach(pos=>{
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
function getJVAnchorWk(date, jvType){
  const dow=date.getDay();
  // Days that are "overflow" into next calendar week for each JV type
  const overflowDays={JV1:[0,1,3], JV2:[0,2,4]};
  const overflow=(overflowDays[jvType]||[]).includes(dow);
  const anchorDate=overflow?addDays(date,-7):date;
  const mon=getMonday(anchorDate);
  return{wn:weekNum(mon),yr:weekYear(mon)};
}

function jvShiftsOnDate(date,jvType){
  const result=[];
  const dowToOffset={1:0,2:1,3:2,4:3,5:4,6:5,0:6};

  if(jvType==='NLO'){
    // NLO: lör natt — anchor = same calendar week
    const mon=getMonday(date),wn=weekNum(mon),yr=weekYear(mon);
    const docId=getJV(wn,yr)['NLO'];
    const doc=docId?docById(docId):null;
    if(docId&&doc){
      JV_DEFS['NLO'].forEach(shift=>{
        const candidate=addDays(mon,dowToOffset[shift.dow]);
        if(isoDate(candidate)===isoDate(date)) result.push({shift,doc});
      });
    }
    // NLÖ jourledigt: måndag after Saturday night → check previous week's NLO
    if(date.getDay()===1){
      const prevMon=addDays(mon,-7);
      const prevNloId=getJV(weekNum(prevMon),weekYear(prevMon))['NLO'];
      if(prevNloId){const prevDoc=docById(prevNloId);if(prevDoc)result.push({shift:{dow:1,type:'jourledigt',label:'Mån jourledigt (NLÖ)'},doc:prevDoc});}
    }
    return result;
  }

  // JV1 / JV2: find anchor week (the week containing the first day of the jourvecka)
  const {wn,yr}=getJVAnchorWk(date,jvType);
  const anchorMon=getMonday(new Date(yr,0,1+(wn-1)*7)); // approximate, refine below
  // Better: find the actual Monday of that ISO week
  const anchorMonCorrect=(()=>{
    // Find Monday of week wn in year yr
    const jan4=new Date(Date.UTC(yr,0,4));
    const jan4Mon=getMonday(jan4);
    return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
  })();

  const docId=getJV(wn,yr)[jvType];
  const doc=docId?docById(docId):null;
  if(docId&&doc){
    JV_DEFS[jvType].forEach(shift=>{
      // For days in the "overflow" week (sun,mon,wed for JV1 / sun,tue,thu for JV2),
      // they physically appear 7 days after anchor Monday's corresponding day.
      const overflowDays={JV1:[0,1,3],JV2:[0,2,4]};
      const isOverflow=(overflowDays[jvType]||[]).includes(shift.dow);
      const shiftDate=isOverflow
        ? addDays(anchorMonCorrect,7+dowToOffset[shift.dow])
        : addDays(anchorMonCorrect,dowToOffset[shift.dow]);
      if(isoDate(shiftDate)===isoDate(date)) result.push({shift,doc});
    });
  }
  return result;
}

function bjfsShiftsOnDate(date){
  const mon=getMonday(date);
  const fri=addDays(mon,4),sun=addDays(mon,6);
  const nextFri=addDays(fri,7);
  const shifts=[];
  const ds=isoDate(date);
  if(ds===isoDate(fri)){const docId=getBJ(isoDate(fri),'BJFS');if(docId){const doc=docById(docId);if(doc)shifts.push({type:'night',label:'Fre natt',doc});}}
  if(ds===isoDate(sun)){const docId=getBJ(isoDate(fri),'BJFS');if(docId){const doc=docById(docId);if(doc){shifts.push({type:'day',label:'Sön dag',doc});shifts.push({type:'night',label:'Sön natt',doc});}}}
  if(ds===isoDate(nextFri)){const prevFri=addDays(nextFri,-7);const docId=getBJ(isoDate(prevFri),'BJFS');if(docId){const doc=docById(docId);if(doc)shifts.push({type:'jourledigt',label:'Jourledigt (BJFS)',doc});}}
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

