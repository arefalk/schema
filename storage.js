const LS_KEY = 'barnkliniken_v2';
const LS_BAK = 'barnkliniken_v2_bak';

function autoSave() {
  try {
    const data = {
      version: 2,
      savedAt: new Date().toISOString(),
      roleTags, positions, doctors, schedule, scheduleHalfDay, scheduleNotes, slotLocations, flPerioder, jourveckor, jourveckorManual, jourledigOverride, bjScheduleManual, nightOverrides, bjSchedule,
      ledighetRequests, ledighetVeckor, specialSlots, bvcSchedule,
      handledningPairs, mandatoryPositions: [...mandatoryPositions], schedulePeriod,
      utbildningDagar, utbildningVeckor, randningDagar, jourfriOnskad, deltidDagar, deltidVeckor,
      dagvardEntries, auskultationEntries, ovrigtNotes, ovrigtRecurring, sjukskrivning, foraldraledig, onskadPass, specialRecurring, onskadJourvecka, onskadBJ,
      ledighetOnskemal, ledighetVeckorOnskemal, utbildningOnskemal, jourfriOnskemal, jourfriOnskemalDag, jourfriOnskadDag, adminOnskemal, foraldraledigenOnskemal,
      posMinFillOverrides, daySpan, roleDefaultPositions
    };
    // Rotate backup before overwriting main save
    const prev = localStorage.getItem(LS_KEY);
    if (prev) {
      try { const p = JSON.parse(prev); if (Object.keys(p.schedule||{}).length > 0) localStorage.setItem(LS_BAK, prev); } catch(e){}
    }
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { /* localStorage full eller ej tillgänglig */ }
}

function loadFromBackup() {
  try {
    const raw = localStorage.getItem(LS_BAK);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 2) return false;
    localStorage.setItem(LS_KEY, raw);
    return loadFromLocalStorage();
  } catch(e) { return false; }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 2) return false;
    if (data.daySpan) daySpan = data.daySpan;
    if (data.roleTags) roleTags = data.roleTags;
    if (data.positions) positions = data.positions;
    if (data.doctors) doctors = data.doctors;
    // Migration: move doc.flFrom/flTo → flPerioder (run before flPerioder is loaded so we can merge)
    doctors.forEach(doc=>{
      if(doc.flFrom){
        if(!flPerioder[doc.id])flPerioder[doc.id]=[];
        if(!flPerioder[doc.id].some(p=>p.from===doc.flFrom))
          flPerioder[doc.id].push({id:'flp_mig_'+doc.id,from:doc.flFrom,to:doc.flTo||''});
        delete doc.flFrom;delete doc.flTo;
      }
    });
    if (data.schedule) schedule = data.schedule;
    if (data.scheduleHalfDay) scheduleHalfDay = data.scheduleHalfDay;
    if (data.scheduleNotes) scheduleNotes = data.scheduleNotes;
    if (data.slotLocations) slotLocations = data.slotLocations;
    if(data.flPerioder) flPerioder=data.flPerioder;
    if (data.jourveckor) jourveckor = data.jourveckor;
    if(data.jourledigOverride) jourledigOverride=data.jourledigOverride;
    if(data.jourveckorManual!==undefined) jourveckorManual=data.jourveckorManual;
    else{
      // Migration: data saved before jourveckorManual existed — mark all existing JV entries as manual
      // so clearRotation doesn't wipe them
      Object.entries(jourveckor).forEach(([wk,jv])=>{
        const m={};
        if(jv.JV1)m.JV1=true;
        if(jv.JV2)m.JV2=true;
        if(jv.NLO)m.NLO=true;
        if(Object.keys(m).length)jourveckorManual[wk]=m;
      });
    }
    if(data.bjScheduleManual) bjScheduleManual=data.bjScheduleManual;
    if (data.nightOverrides) nightOverrides = data.nightOverrides;
    if (data.bjSchedule) bjSchedule = data.bjSchedule;
    if (data.ledighetRequests) ledighetRequests = data.ledighetRequests;
    if (data.ledighetVeckor) ledighetVeckor = data.ledighetVeckor;
    if (data.specialSlots) specialSlots = data.specialSlots;
    if (data.bvcSchedule) bvcSchedule = data.bvcSchedule;
    if (data.handledningPairs) handledningPairs = data.handledningPairs;
    if (data.mandatoryPositions) mandatoryPositions = new Set(data.mandatoryPositions);
    if (data.schedulePeriod) schedulePeriod = data.schedulePeriod;
    if (data.utbildningDagar) utbildningDagar = data.utbildningDagar;
    if (data.randningDagar) randningDagar = data.randningDagar;
    if (data.utbildningVeckor) utbildningVeckor = data.utbildningVeckor;
    if (data.jourfriOnskad) jourfriOnskad = data.jourfriOnskad;
    if (data.deltidDagar) deltidDagar = data.deltidDagar;
    if (data.deltidVeckor) deltidVeckor = data.deltidVeckor;
    if (data.dagvardEntries) dagvardEntries = data.dagvardEntries;
    if (data.auskultationEntries) auskultationEntries = data.auskultationEntries;
    if (data.ovrigtNotes) ovrigtNotes = data.ovrigtNotes;
    if (data.ovrigtRecurring) ovrigtRecurring = data.ovrigtRecurring;
    if (data.sjukskrivning) sjukskrivning = data.sjukskrivning;
    if (data.foraldraledig) foraldraledig = data.foraldraledig;
    if (data.onskadPass) onskadPass = data.onskadPass;
    if (data.specialRecurring) specialRecurring = data.specialRecurring;
    if (data.onskadJourvecka) onskadJourvecka = data.onskadJourvecka;
    if (data.onskadBJ) onskadBJ = data.onskadBJ;
    if (data.ledighetOnskemal) ledighetOnskemal = data.ledighetOnskemal;
    if (data.ledighetVeckorOnskemal) ledighetVeckorOnskemal = data.ledighetVeckorOnskemal;
    if (data.utbildningOnskemal) utbildningOnskemal = data.utbildningOnskemal;
    if (data.jourfriOnskemal) jourfriOnskemal = data.jourfriOnskemal;
    if (data.jourfriOnskemalDag) jourfriOnskemalDag = data.jourfriOnskemalDag;
    if (data.jourfriOnskadDag) jourfriOnskadDag = data.jourfriOnskadDag;
    if (data.adminOnskemal) adminOnskemal = data.adminOnskemal;
    if (data.foraldraledigenOnskemal) foraldraledigenOnskemal = data.foraldraledigenOnskemal;
    if (data.posMinFillOverrides) posMinFillOverrides = data.posMinFillOverrides;
    if(data.roleDefaultPositions) roleDefaultPositions=data.roleDefaultPositions;
    // Migration: ensure pos_dj has 2 slots and minFill
    const djPos=positions.find(p=>p.id==='pos_dj');
    if(djPos){
      djPos.minFill=djPos.minFill??1;
      if(!djPos.slots.find(s=>s.slotId==='s_dj')) djPos.slots.unshift({slotId:'s_dj',slotName:'Dagjour 1',roleReq:'',requiredComps:[]});
      else { const s=djPos.slots.find(s=>s.slotId==='s_dj'); if(!s.slotName)s.slotName='Dagjour 1'; }
      if(!djPos.slots.find(s=>s.slotId==='s_dj_2')) djPos.slots.push({slotId:'s_dj_2',slotName:'Dagjour 2',roleReq:'',requiredComps:[],fmOnlyDow:[5]});
      else { const s=djPos.slots.find(s=>s.slotId==='s_dj_2'); if(!s.slotName)s.slotName='Dagjour 2'; if(!(s.fmOnlyDow&&s.fmOnlyDow.includes(5)))s.fmOnlyDow=[5]; }
    }
    // Migration: ensure pos_kj exists
    if(!positions.find(p=>p.id==='pos_kj')){
      const djIdx=positions.findIndex(p=>p.id==='pos_dbj');
      positions.splice(djIdx+1,0,{id:'pos_kj',name:'Kvällsjour',colorIdx:4,slots:[{slotId:'s_kj',roleReq:'',requiredComps:[]}]});
    }
    // Migration: set fmOnlyDow on built-in positions that close at 13:00 on Fridays
    const _fmFri=['pos_mott','pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul','pos_dagvard','pos_dbj'];
    positions.forEach(p=>{if(_fmFri.includes(p.id)&&!(p.fmOnlyDow&&p.fmOnlyDow.length))p.fmOnlyDow=[5];});
    // Migration: dela pos_dagvard i två separata positioner — pos_rond + pos_dagvard
    {
      const dvPos=positions.find(p=>p.id==='pos_dagvard');
      if(!dvPos){
        // Nyinstallation: skapa båda direkt
        positions.push(
          {id:'pos_rond',name:'Rond 08:30–09:00',colorIdx:6,section:'dagvard',days:[1,2,3,4,5],fmOnlyDow:[5],slots:[{slotId:'s_dagvard_1',noBlock:true,roleReq:'',requiredComps:[]}]},
          {id:'pos_dagvard',name:'Dagvård',colorIdx:6,section:'dagvard',days:[1,2,3,4,5],fmOnlyDow:[5],activities:['Provokationer','Botox','Skopier'],slots:[{slotId:'s_dagvard_2',roleReq:'',requiredComps:[]}]}
        );
      } else {
        // Befintlig installation: split om pos_rond saknas
        if(!positions.find(p=>p.id==='pos_rond')){
          const dvIdx=positions.indexOf(dvPos);
          positions.splice(dvIdx,0,{id:'pos_rond',name:'Rond 08:30–09:00',colorIdx:dvPos.colorIdx,section:'dagvard',days:[1,2,3,4,5],fmOnlyDow:[5],slots:[{slotId:'s_dagvard_1',noBlock:true,roleReq:'',requiredComps:[]}]});
        }
        // Ta bort s_dagvard_1 från pos_dagvard (den bor nu i pos_rond)
        dvPos.slots=dvPos.slots.filter(s=>s.slotId!=='s_dagvard_1');
        // Säkerställ att s_dagvard_2 finns i pos_dagvard
        if(!dvPos.slots.find(s=>s.slotId==='s_dagvard_2')){
          dvPos.slots.push({slotId:'s_dagvard_2',roleReq:'',requiredComps:[]});
        }
        if(!dvPos.activities)dvPos.activities=['Provokationer','Botox','Skopier'];
        dvPos.section=dvPos.section||'dagvard';
        delete dvPos.slotsPerDay;
        dvPos.days=[1,2,3,4,5];
        if(!(dvPos.fmOnlyDow&&dvPos.fmOnlyDow.length))dvPos.fmOnlyDow=[5];
        // Säkerställ att pos_rond-slotten har rätt flaggor
        const rondPos=positions.find(p=>p.id==='pos_rond');
        if(rondPos){
          if(!rondPos.slots||!rondPos.slots.length)rondPos.slots=[{slotId:'s_dagvard_1',noBlock:true,roleReq:'',requiredComps:[]}];
          else{const s1=rondPos.slots.find(s=>s.slotId==='s_dagvard_1');if(s1)s1.noBlock=true;}
          if(!rondPos.section)rondPos.section='dagvard';
          rondPos.days=[1,2,3,4,5];
          if(!(rondPos.fmOnlyDow&&rondPos.fmOnlyDow.length))rondPos.fmOnlyDow=[5];
        }
      }
    }
    if(!positions.find(p=>p.id==='pos_bvc')){
      positions.push({id:'pos_bvc',name:'BVC',colorIdx:7,days:[4],slots:[
        {slotId:'s_bvc_1',roleReq:'',requiredComps:[]},
      ]});
    }
    // Migrate bvcSchedule → pos_bvc slot (engångsmigration — töm efteråt så det inte upprepas)
    if(data.bvcSchedule&&Object.keys(data.bvcSchedule).length){
      Object.entries(data.bvcSchedule).forEach(([ds,docId])=>{
        if(docId&&!getSlot('s_bvc_1',ds))setSlot('s_bvc_1',ds,docId);
      });
      bvcSchedule={};
      // Patcha localStorage direkt och synkront så att migrationskoden inte kör igen vid nästa laddning
      try{const _raw=localStorage.getItem(LS_KEY);if(_raw){const _d=JSON.parse(_raw);_d.bvcSchedule={};localStorage.setItem(LS_KEY,JSON.stringify(_d));}}catch(e){}
    }
    // Migration: ta bort utbildningsönskemål på helger, omvandla ledighetönskemål på helger till jourfri
    let _migChanged=false;
    const _isWe=ds=>{const d=new Date(ds+'T12:00:00').getDay();return d===0||d===6;};
    Object.keys(utbildningOnskemal).forEach(docId=>{
      Object.keys(utbildningOnskemal[docId]||{}).forEach(ds=>{
        if(_isWe(ds)){delete utbildningOnskemal[docId][ds];_migChanged=true;}
      });
    });
    Object.keys(ledighetOnskemal).forEach(docId=>{
      Object.keys(ledighetOnskemal[docId]||{}).forEach(ds=>{
        if(_isWe(ds)){
          const val=ledighetOnskemal[docId][ds];
          delete ledighetOnskemal[docId][ds];
          if(!jourfriOnskemalDag[docId])jourfriOnskemalDag[docId]={};
          if(!jourfriOnskemalDag[docId][ds])jourfriOnskemalDag[docId][ds]=val;
          _migChanged=true;
        }
      });
    });
    if(_migChanged)setTimeout(()=>autoSave(),0);
    return true;
  } catch(e) { return false; }
}

function clearLocalStorage() {
  localStorage.removeItem(LS_KEY);
}
