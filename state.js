const _urlParams=new URLSearchParams(location.search);
const IS_DOCTOR_MODE=_urlParams.get('mode')==='doctor';
const ACTIVE_DOCTOR_ID=_urlParams.get('docId')||null;

const AVATAR_COLORS=[['#d8ede4','#2d6a4f'],['#ede8f5','#7b3ac7'],['#e0ecf8','#3a7bc8'],['#faebd6','#c77b3a'],['#fce8e6','#c0392b'],['#e8f4e4','#3a8a3a'],['#f5e8f4','#8a3a89'],['#e8f0fa','#3a4e8a'],['#fdf5e0','#a07800'],['#e0f5f5','#1a8a8a'],['#f5e8e0','#8a4a1a'],['#eaf5e8','#2d6a2d']];
const POS_COLORS=[['#d8ede4','#2d6a4f'],['#e0ecf8','#3a7bc8'],['#ede8f5','#7b3ac7'],['#faebd6','#c77b3a'],['#e8f4e4','#3a8a3a'],['#f0e8fa','#6a3a9a'],['#fde8d8','#9a3a1a'],['#e8f0f5','#1a5a8a']];

const JV_DEFS = {
  // JV1: fre natt, sön dag, mån natt, ons natt
  JV1: [
    {dow:5, type:'night', label:'Fre natt'},
    {dow:0, type:'day',   label:'Sön dag'},
    {dow:1, type:'night', label:'Mån natt'},
    {dow:3, type:'night', label:'Ons natt'},
  ],
  // JV2: lör dag, sön natt, tis natt, tor natt
  JV2: [
    {dow:6, type:'day',   label:'Lör dag'},
    {dow:0, type:'night', label:'Sön natt'},
    {dow:2, type:'night', label:'Tis natt'},
    {dow:4, type:'night', label:'Tor natt'},
  ],
  // NLÖ: lör natt. Jourledigt måndag hanteras separat i jvShiftsOnDate (cross-week).
  NLO: [
    {dow:6, type:'night', label:'Lör natt'},
  ],
};

let roleTags=['ÖL','BÖL','Spec','ST','AT','Konsult','Rand'];
// compTags removed — replaced by allowedPositions per doctor
let positions=[
  {id:'pos_mott',   name:'Mottagning',   colorIdx:0, fmOnlyDow:[5], slots:[
    {slotId:'s_mott_1', roleReq:'', requiredComps:[]},
    {slotId:'s_mott_2', roleReq:'', requiredComps:[]},
    {slotId:'s_mott_3', roleReq:'', requiredComps:[]},
    {slotId:'s_mott_4', roleReq:'', requiredComps:[]},
    {slotId:'s_mott_5', roleReq:'', requiredComps:[]},
    {slotId:'s_mott_6', roleReq:'', requiredComps:[]},
  ]},
  {id:'pos_sit',      name:'SIT',      colorIdx:0, section:'mott', fmOnlyDow:[5], slots:[{slotId:'s_sit', roleReq:'', requiredComps:[]}]},
  {id:'pos_barnahus', name:'Barnahus', colorIdx:0, section:'mott', fmOnlyDow:[5], slots:[{slotId:'s_barnahus', roleReq:'', requiredComps:[]}]},
  {id:'pos_avd_ol', name:'Avdelning',    colorIdx:2, fmOnlyDow:[5], slots:[{slotId:'s_avdol', roleReq:'ÖL', requiredComps:[]}]},
  {id:'pos_avd_ul', name:'Avdelning',    colorIdx:2, fmOnlyDow:[5], slots:[{slotId:'s_avdul', roleReq:'UL', requiredComps:[]}]},
  {id:'pos_neo_ol', name:'Neonatal',     colorIdx:3, fmOnlyDow:[5], slots:[{slotId:'s_neool', roleReq:'ÖL', requiredComps:[]}]},
  {id:'pos_neo_ul', name:'Neonatal',     colorIdx:3, fmOnlyDow:[5], slots:[{slotId:'s_neoul', roleReq:'UL', requiredComps:[]}]},
  {id:'pos_dj',  name:'Dagjour',    colorIdx:4, minFill:1, slots:[
    {slotId:'s_dj',   slotName:'Dagjour 1', roleReq:'', requiredComps:[]},
    {slotId:'s_dj_2', slotName:'Dagjour 2', roleReq:'', requiredComps:[], fmOnlyDow:[5]},
  ]},
  {id:'pos_dbj', name:'Dagbakjour', colorIdx:5, slots:[{slotId:'s_dbj', roleReq:'', requiredComps:[]}]},
  {id:'pos_kj',  name:'Kvällsjour', colorIdx:4, slots:[{slotId:'s_kj',  roleReq:'', requiredComps:[]}]},
  {id:'pos_dagvard', name:'Dagvård',    colorIdx:6, fmOnlyDow:[5], activities:['Provokationer','Botox','Skopier'], slots:[
    {slotId:'s_dagvard_1', slotName:'Rond 08:30–09:00', noBlock:true, roleReq:'', requiredComps:[]},
    {slotId:'s_dagvard_2', slotName:'Dagvård', roleReq:'', requiredComps:[]},
  ]},
  {id:'pos_bvc', name:'BVC', colorIdx:7, days:[4], slots:[
    {slotId:'s_bvc_1', roleReq:'', requiredComps:[]},
  ]},
];
let doctors=[
  {id:'d0', name:'Anna Lindström',  roles:['ÖL'],  allowedPositions:['pos_mott','pos_avd_ol','pos_avd_ul'], prefPositions:['pos_mott','pos_avd_ol','pos_avd_ul'], prefJV:'', jv:['JV1']},
  {id:'d1', name:'Björn Eriksson',  roles:['ÖL'],  allowedPositions:['pos_neo_ol','pos_neo_ul'], prefPositions:['pos_neo_ol','pos_neo_ul'], prefJV:'', jv:['JV2']},
  {id:'d2', name:'Cecilia Holm',    roles:['ST'],   allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV1']},
  {id:'d3', name:'David Nygren',    roles:['ÖL'],  allowedPositions:['pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul'], prefPositions:['pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul'], prefJV:'', jv:['JV2']},
  {id:'d4', name:'Emma Sjöberg',    roles:['AT'],   allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV1']},
  {id:'d5', name:'Fredrik Lund',    roles:['ÖL'],  allowedPositions:['pos_avd_ol','pos_avd_ul'], prefPositions:['pos_avd_ol','pos_avd_ul'], prefJV:'', jv:['JV2']},
  {id:'d6', name:'Gabriella Berg',  roles:['ST'],   allowedPositions:['pos_neo_ol','pos_neo_ul'], prefPositions:['pos_neo_ol','pos_neo_ul'], prefJV:'', jv:['JV1']},
  {id:'d7', name:'Henrik Strand',   roles:['ÖL'],  allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV1','NLO']},
  {id:'d8', name:'Ida Karlsson',    roles:['BÖL'], allowedPositions:['pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul'], prefPositions:['pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul'], prefJV:'', jv:['JV2','NLO']},
  {id:'d9', name:'Jonas Persson',   roles:['ST'],   allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV1']},
  {id:'d10',name:'Karin Johansson', roles:['ÖL'],  allowedPositions:['pos_neo_ol','pos_neo_ul'], prefPositions:['pos_neo_ol','pos_neo_ul'], prefJV:'', jv:['JV2']},
  {id:'d11',name:'Lars Nilsson',    roles:['ÖL'],  allowedPositions:['pos_avd_ol','pos_avd_ul'], prefPositions:['pos_avd_ol','pos_avd_ul'], prefJV:'', jv:['JV1','NLO']},
  {id:'d12',name:'Maria Olsson',    roles:['AT'],   allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV2']},
  {id:'d13',name:'Nils Gustafsson', roles:['ÖL'],  allowedPositions:[], prefPositions:[], prefJV:'', jv:['JV1']},
  {id:'d14',name:'Olivia Andersen', roles:['ST'],   allowedPositions:['pos_neo_ol','pos_neo_ul','pos_avd_ol','pos_avd_ul'], prefPositions:['pos_neo_ol','pos_neo_ul','pos_avd_ol','pos_avd_ul'], prefJV:'', jv:['JV2']},
  {id:'d15',name:'Petra Magnusson', roles:['BÖL'], allowedPositions:['pos_mott'], prefPositions:['pos_mott'], prefJV:'', jv:['JV1','NLO']},
  {id:'d16',name:'Robert Larsson',  roles:['ÖL'],  allowedPositions:['pos_avd_ol','pos_avd_ul'], prefPositions:['pos_avd_ol','pos_avd_ul'], prefJV:'', jv:['JV2']},
  {id:'d17',name:'Sofia Hansson',   roles:['ST'],   allowedPositions:['pos_neo_ol','pos_neo_ul','pos_mott'], prefPositions:['pos_neo_ol','pos_neo_ul','pos_mott'], prefJV:'', jv:['JV2']},
].map((d,i)=>({...d,color:AVATAR_COLORS[i%AVATAR_COLORS.length]}));

// posMinFillOverrides[posId] = [{from:'YYYY-MM-DD', to:'YYYY-MM-DD', min:N}]
let posMinFillOverrides={};
let jourveckor={};
let jourveckorManual={}; // {wkey:{JV1:bool,JV2:bool,NLO:bool}} — true = manually set by user
let bjScheduleManual={}; // {ds:{BJFS:bool,BJLO:bool}} — true = manually set by user
let nightOverrides={}; // { ds: { 'JV1'|'JV2'|'NLO': docId|null } }
let schedule={};
// scheduleHalfDay[dateStr][slotId] = 'fm'|'em'|''
let scheduleHalfDay={};
// scheduleNotes[dateStr][slotId] = string
let scheduleNotes={};
let bjSchedule={};
// ledighetRequests[docId][dateStr] = true  (day-level, beviljad)
// ledighetVeckor[docId][wkey] = true        (week-level, beviljad)
let ledighetRequests={};
let ledighetVeckor={};
// deltidDagar[docId][dateStr] = 'fm'|'em'|'hel'  (dag- eller halvdag-schema)
// deltidVeckor[docId][wkey] = 'hel'               (hel vecka ledig pga deltid)
let deltidDagar={};
let deltidVeckor={};
// utbildningDagar[docId][dateStr] = true  (day-level, beviljad)
// utbildningVeckor[docId][wkey] = true     (week-level, beviljad)
let utbildningDagar={};
let utbildningVeckor={};
// randningDagar[docId][dateStr] = true  — blockerar schemaläggning precis som utbildning
let randningDagar={};
// jourfriOnskad[docId][wkey] = {note, scope:'week'|'weekend'} — direkt aktiv scheduling-begränsning
let jourfriOnskad={};
// specialSlots[dateStr][slotKey] = {type:'utb'|'adm'|'handledning', docId, note, halfDay:'fm'|'em'|''}
// specialRecurring = [{id, type:'utb'|'adm', docId, halfDay, note, startDate, recurrence}]
let specialSlots={};
let specialRecurring=[];
let bvcSchedule={};
// handledning pairs: [{stId, supervisorId}]
let handledningPairs=[];
// mandatory positions: set of positionIds that must be filled every weekday
let mandatoryPositions=new Set(['pos_mott','pos_avd_ol','pos_dj']);

// slotLocations[dateStr][slotId] = 'Karlshamn' (default = Karlskrona, only overrides stored)
let slotLocations={};
// dagvardEntries[dateStr] = {docs:[docId,...], note:string}
let dagvardEntries={};
// auskultationEntries[dateStr] = [{id, docId, desc}]
let auskultationEntries={};
// ovrigtNotes[dateStr] = [{id, text}]  — blockerar EJ andra positioner
let ovrigtNotes={};
// ovrigtRecurring = [{id, text, docIds, blocks, startDate, recurrence:'weekly'|'biweekly'|'monthly'}]
let ovrigtRecurring=[];
// sjukskrivning[dateStr] = [{id, docId, type:'sjuk'|'vab'}]
let sjukskrivning={};
// foraldraledig[dateStr] = [{id, docId}]
let foraldraledig={};
// changeLog = [{ts, action, desc}]  — max 200 entries, not persisted
let changeLog=[];
// onskadPass[docId][ds] = {posId, note}  — önskat arbetspass
let onskadPass={};
// onskadJourvecka[docId][wk] = 'JV1'|'JV2'  — önskad jourvecka
let onskadJourvecka={};
let onskadBJ={};  // {docId:{wk:'BJFS'|'BJLO'}}
let roleDefaultPositions={};  // {roleName: [posId, ...]}
// Önskemål som väntar på schemaläggarbeslut
let ledighetOnskemal={};       // {docId:{ds:true|{note}}} — enskilda dagar
let ledighetVeckorOnskemal={};  // {docId:{wk:true|{note}}} — hela veckor
let utbildningOnskemal={};     // {docId:{ds:true|{note}}} — utbildningsdagar
let jourfriOnskemal={};        // {docId:{wk:{note,scope:'week'|'weekend'}}} — väntar godkännande
let jourfriOnskemalDag={};     // {docId:{ds:true|{note}}} — per-dag jourfritt önskemål
let jourfriOnskadDag={};       // {docId:{ds:true|{note}}} — godkänt per-dag jourfritt
let adminOnskemal={};          // {docId:{ds:true|{note}}} — admin-tid önskemål
let foraldraledigenOnskemal={}; // {docId:{ds:true|{note}}} — FL-önskemål

let daySpan=7, currentDate=new Date(), viewMode='week'; // 'week'|'month'
let schedulePeriod={from:null,to:null}; // ISO date strings or null
let ctxTarget=null, ctxJVTarget=null, ctxBJTarget=null, ctxWeekTarget=null, deleteTargetId=null;

