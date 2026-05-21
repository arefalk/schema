function _rotScrollToToday(){
  ['rotTableWrap','bjRotTableWrap','bjNVRotTableWrap'].forEach(id=>{
    const wrap=document.getElementById(id);
    if(!wrap)return;
    const cur=wrap.querySelector('tr[data-cur="1"]');
    if(cur)wrap.scrollTop=Math.max(0,cur.offsetTop-wrap.offsetTop-8);
  });
}
function rotNav(dir){
  if(dir===0){_rotScrollToToday();return;}
  ['rotTableWrap','bjRotTableWrap','bjNVRotTableWrap'].forEach(id=>{
    const wrap=document.getElementById(id);
    if(!wrap)return;
    const rows=wrap.querySelectorAll('tbody tr');
    if(!rows.length)return;
    const rowH=rows[0].getBoundingClientRect().height||44;
    wrap.scrollTop+=dir*rowH;
  });
}
function renderRotationTable(){
  const mon=getMonday(currentDate),curWn=weekNum(mon),curYr=weekYear(mon);
  const rows=[];for(let d=-4;d<=60;d++){const dt=addDays(mon,d*7);rows.push({wn:weekNum(dt),yr:weekYear(dt),dt});}
  const _svA=(a,b)=>a.name.localeCompare(b.name,'sv');
  const jv1docs=doctors.filter(d=>(d.jv||[]).includes('JV1')).sort(_svA);
  const jv2docs=doctors.filter(d=>(d.jv||[]).includes('JV2')).sort(_svA);
  const nloDocs=doctors.filter(d=>(d.jv||[]).includes('NLO')).sort(_svA);
  const mkSel=(wn,yr,key,docs,color)=>{
    const jv=getJV(wn,yr),cur=jv[key];
    const wkStr=wkey(wn,yr);
    const _wkMon=isoDate(isoWeekMon(wn,yr));
    const poolDocs=docs.filter(d=>docIsActive(d,_wkMon));
    const olExtraDocs=doctors.filter(d=>docIsActive(d,_wkMon)&&!poolDocs.find(p=>p.id===d.id)&&docIsOL(d)).sort(_svA);
    if(cur&&![...poolDocs,...olExtraDocs].find(d=>d.id===cur)){const doc=docById(cur);if(doc)poolDocs.push(doc);}
    poolDocs.sort((a,b)=>a.name.localeCompare(b.name,'sv'));
    olExtraDocs.sort((a,b)=>a.name.localeCompare(b.name,'sv'));
    const allDocs=poolDocs; // keep for wish/conflict code below
    const wishDoc=allDocs.find(d=>onskadJourvecka[d.id]&&onskadJourvecka[d.id][wkStr]===key&&!cur);
    const wishBadge=wishDoc&&!cur
      ?`<div style="font-size:10px;color:var(--accent);margin-top:2px;display:flex;align-items:center;gap:4px">✋ ${docShortName(wishDoc)}<button style="font-size:9px;padding:1px 5px;border-radius:4px;border:1px solid var(--accent);background:var(--accent-light);color:var(--accent);cursor:pointer" onclick="acceptJVWish(${wn},${yr},'${key}','${wishDoc.id}')">Acceptera</button></div>`:'';
    const _jvMon2=isoWeekMon(wn,yr);
    const _offs2=key==='JV1'?[4,5,6,7,8,9]:key==='JV2'?[5,6,7,8,9,10]:[5];
    const _spillDts2=_offs2.map(o=>addDays(_jvMon2,o));
    // Konfliktkoll — godkänd/önskad ledighet eller jourfritt under spillveckan
    const _jvDts=_offs2.map(o=>isoDate(addDays(_jvMon2,o)));
    const _getConflict=docId=>{
      // Föräldraledig under jourveckan
      if(_jvDts.some(ds=>(foraldraledig[ds]||[]).some(e=>e.docId===docId)))return{msg:'Föräldraledig under jourveckan'};
      // Önskad ledighetsvecka (inkl. spillvecka)
      const wkWishes=ledighetVeckorOnskemal[docId];
      if(wkWishes){
        const w=wkWishes[wkey(wn,yr)];
        if(w)return{msg:'Önskad ledighet denna vecka',flex:_wishEntryFlexible(w)};
        if(key!=='NLO'){const spillMon=addDays(isoWeekMon(wn,yr),7);const ws=wkWishes[wkey(weekNum(spillMon),weekYear(spillMon))];if(ws)return{msg:'Önskad ledighet spillveckan',flex:_wishEntryFlexible(ws)};}
      }
      // Godkänd ledighetsvecka
      if(docHasLedighetVecka(docId,wn,yr))return{msg:'Godkänd ledighet denna vecka'};
      if(key!=='NLO'){const spillMon=addDays(isoWeekMon(wn,yr),7);if(docHasLedighetVecka(docId,weekNum(spillMon),weekYear(spillMon)))return{msg:'Godkänd ledighet spillveckan'};}
      // Godkänd/önskad ledighetsdag under jourveckan
      if(_jvDts.some(ds=>docHasLedighet(docId,ds)))return{msg:'Godkänd ledighet under jourveckan'};
      if(_jvDts.some(ds=>{const od=ledighetOnskemal[docId];return od&&od[ds];}))return{msg:'Önskad ledighetsdag under jourveckan'};
      // Jourfritt (godkänt eller önskat) under jourveckan
      if(_jvDts.some(ds=>{const dt2=new Date(ds+'T12:00:00'),dow=dt2.getDay(),isWe=dow===0||dow===6,dwn=weekNum(dt2),dyr=weekYear(dt2);return docHasJourfriOnskad(docId,dwn,dyr,isWe?'weekend':'week');}))return{msg:'Jourfritt under jourveckan'};
      return null;
    };
    const _curConflict=cur?_getConflict(cur):null;
    const _flexLabel=_curConflict&&_curConflict.flex?` — flexibelt (${_curConflict.flex==='both'?'±1v':'+1v'})`:'';
    const _forcedWarn=_curConflict
      ?`<div style="font-size:9px;color:#b91c1c;background:#fee2e2;padding:2px 6px;border-radius:3px;margin-bottom:2px">⚠ ${_curConflict.msg}${_flexLabel}</div>`
      :'';
    // --- Täthet- och takvarn för tilldelad läkare ---
    const _JV_HARD=2,_JV_PREF=4,_NLO_MIN=6,_NLO_AFTER_JV=2;
    // Helper: scan ±N weeks to find gap to nearest same-key assignment for a given doc
    const _scanGap=(docId,keyK,maxBack,maxFwd)=>{
      let prev=null,next=null;
      for(let b=1;b<=maxBack;b++){const pd=addDays(isoWeekMon(wn,yr),-b*7);if(getJV(weekNum(pd),weekYear(pd))[keyK]===docId){prev=b;break;}}
      for(let f=1;f<=maxFwd;f++){const fd=addDays(isoWeekMon(wn,yr),f*7);if(getJV(weekNum(fd),weekYear(fd))[keyK]===docId){next=f;break;}}
      return{prev,next};
    };
    const _freqWarns=[];
    if(cur){
      const keyLbl=key==='NLO'?'NLÖ':key;
      const gapHard=key==='NLO'?_NLO_MIN:_JV_HARD;
      const gapPref=key==='NLO'?_NLO_MIN:_JV_PREF;
      const {prev}=_scanGap(cur,key,52,0);
      if(prev!==null&&prev<gapPref){
        const sev=prev<gapHard?'hard':'soft';
        _freqWarns.push({sev,msg:`${prev}v sedan senaste ${keyLbl} — rekommenderat ≥${gapPref}v`});
      }
      if(key==='NLO'){
        // NLÖ måste ligga minst 2v EFTER JV1/2 (bakåt)
        for(let b=1;b<_NLO_AFTER_JV;b++){
          const nd=addDays(isoWeekMon(wn,yr),-b*7);
          const njv=getJV(weekNum(nd),weekYear(nd));
          if(njv.JV1===cur||njv.JV2===cur){
            _freqWarns.push({sev:'hard',msg:`NLÖ ${b}v efter JV — kräver minst ${_NLO_AFTER_JV}v`});
            break;
          }
        }
      } else {
        // JV1/JV2: check forward gap too (next assignment of same key)
        const {next}=_scanGap(cur,key,0,52);
        if(next!==null&&next<gapPref){
          const sev=next<gapHard?'hard':'soft';
          _freqWarns.push({sev,msg:`${next}v till nästa ${keyLbl} — rekommenderat ≥${gapPref}v`});
        }
      }
    }
    const _freqWarnHtml=_freqWarns.map(w=>`<div style="font-size:9px;color:${w.sev==='hard'?'#b91c1c':'#92400e'};background:${w.sev==='hard'?'#fee2e2':'#fef3c7'};padding:2px 6px;border-radius:3px;margin-bottom:2px">⚠ ${w.msg}</div>`).join('');
    // Helper: compute gap/cap icon for a dropdown option ('' | '⏱ ' | '⚡ ')
    const _optFreqIcon=d=>{
      if(d.id===cur)return'';
      const gapH=key==='NLO'?_NLO_MIN:_JV_HARD,gapP=key==='NLO'?_NLO_MIN:_JV_PREF;
      const {prev,next}=_scanGap(d.id,key,52,52);
      const minGap=Math.min(prev??999,next??999);
      if(minGap<gapH)return'⚡ ';
      if(minGap<gapP)return'⏱ ';
      return'';
    };
    const _mkOpt=d=>{
      const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===d.id);
      const hasFL=_spillDts2.some(dt=>(foraldraledig[isoDate(dt)]||[]).some(e=>e.docId===d.id));
      const hasLed=docHasLedighetVecka(d.id,wn,yr)||_spillDts2.some(dt=>docHasLedighet(d.id,isoDate(dt)));
      const jf=_spillDts2.some(dt=>{const dow=dt.getDay(),isWe=dow===0||dow===6,dwn=weekNum(dt),dyr=weekYear(dt);return docHasJourfriOnskad(d.id,dwn,dyr,isWe?'weekend':'week');});
      const hasWish=!!(onskadJourvecka[d.id]&&onskadJourvecka[d.id][wkStr]===key);
      const freqIcon=conflict?'':_optFreqIcon(d);
      const prefix=conflict?'⚠ ':hasFL?'👶 ':hasLed?'🏖 ':jf?'🚫 ':hasWish?'✋ ':freqIcon;
      return`<option value="${d.id}"${cur===d.id?' selected':''}${conflict?' disabled':''}>${prefix}${d.name.split(' ')[0]} ${d.name.split(' ').slice(-1)[0]}${conflict?' ('+conflict[0]+')':''}</option>`;
    };
    const extraGroup=olExtraDocs.length?`<optgroup label="Övriga ÖL">${olExtraDocs.map(_mkOpt).join('')}</optgroup>`:'';
    return`<div>${_forcedWarn}${_freqWarnHtml}${wishBadge}<select onchange="setJVFromTable(${wn},${yr},'${key}',this.value)" style="width:100%;font-size:11px;padding:3px 6px;background:${cur?'var(--'+color+'-light)':'var(--bg)'};color:${cur?'var(--'+color+')':'var(--text2)'};border:1px solid ${cur?'var(--'+color+')':'var(--border)'};border-radius:5px"><option value="">— —</option>${allDocs.map(_mkOpt).join('')}${extraGroup}</select></div>`;
  };
  let html=`<thead><tr><th>Vecka</th><th style="color:var(--jv1)">JV1</th><th style="color:var(--jv2)">JV2</th><th style="color:var(--nlo)">NLÖ</th></tr></thead><tbody>`;
  rows.forEach(({wn,yr,dt})=>{
    const isCur=wn===curWn&&yr===curYr;
    html+=`<tr style="${isCur?'background:var(--accent-light)':''}" ${isCur?'data-cur="1"':''}>
      <td><strong style="font-family:'DM Mono',monospace;font-size:12px">v.${wn}</strong><span style="font-size:10px;color:var(--text3);margin-left:5px">${dt.getDate()} ${svMonth(dt)}</span>${isCur?'<span style="font-size:9px;font-weight:700;color:var(--accent);margin-left:5px">↑</span>':''}</td>
      <td>${mkSel(wn,yr,'JV1',jv1docs,'jv1')}</td>
      <td>${mkSel(wn,yr,'JV2',jv2docs,'jv2')}</td>
      <td>${mkSel(wn,yr,'NLO',nloDocs,'nlo')}</td>
    </tr>`;
  });
  document.getElementById('rotTable').innerHTML=html+`</tbody>`;
}
function setJVFromTable(wn,yr,key,docId){
  setJV(wn,yr,key,docId||null);
  const wk=wkey(wn,yr);
  if(!jourveckorManual[wk])jourveckorManual[wk]={};
  if(docId)jourveckorManual[wk][key]=true; else delete jourveckorManual[wk]?.[key];
  autoSave();renderRotationTable();render();
}
function acceptJVWish(wn,yr,key,docId){
  if(setJV(wn,yr,key,docId)!==false){
    const wk=wkey(wn,yr);if(!jourveckorManual[wk])jourveckorManual[wk]={};jourveckorManual[wk][key]=true;
    // Ta bort önskemålet när det accepterats
    if(onskadJourvecka[docId])delete onskadJourvecka[docId][wkey(wn,yr)];
    autoSave();renderRotationTable();render();
    const doc=docById(docId);showToast(`✅ ${doc?docShortName(doc):'Läkaren'} satt som ${key} v.${wn}`);
  }
}

function renderBJRotationTable(){
  const mon=getMonday(currentDate),curWn=weekNum(mon),curYr=weekYear(mon);
  const rows=[];for(let d=-4;d<=60;d++){const dt=addDays(mon,d*7);rows.push({wn:weekNum(dt),yr:weekYear(dt),dt});}
  const _isBJEligible=(d,type)=>(d.bj||[]).includes(type)||(d.roles||[]).includes('Spec');
  const bjfsDocs=doctors.filter(d=>_isBJEligible(d,'BJFS'));
  const bjloDocs=doctors.filter(d=>_isBJEligible(d,'BJLO'));
  function mkBJSel(wn,yr,type,docs,color){
    const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);
    const wkMon=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
    const anchorDs=isoDate(addDays(wkMon,type==='BJFS'?4:5));
    const cur=getBJ(anchorDs,type);
    const allDocs=docs.filter(d=>docIsActive(d,isoDate(wkMon)));
    if(cur&&!allDocs.find(d=>d.id===cur)){const doc=docById(cur);if(doc)allDocs.push(doc);}
    const otherType=type==='BJFS'?'BJLO':'BJFS';
    const otherDs=isoDate(addDays(wkMon,type==='BJFS'?5:4));
    const otherDoc=getBJ(otherDs,otherType);
    // Weekend dates covered by this BJ type
    const bjDts=type==='BJFS'
      ?[isoDate(addDays(wkMon,4)),isoDate(addDays(wkMon,6))]  // fre + sön
      :[isoDate(addDays(wkMon,5))];                             // lör
    const _getBJConflict=docId=>{
      if(bjDts.some(ds=>(foraldraledig[ds]||[]).some(e=>e.docId===docId)))return'Föräldraledig under helgen';
      if(docHasJourfriOnskad(docId,wn,yr,'weekend'))return'Jourfritt denna helg';
      if(bjDts.some(ds=>docHasLedighet(docId,ds)))return'Godkänd ledighet under helgen';
      if(bjDts.some(ds=>{const od=ledighetOnskemal[docId];return od&&od[ds];}))return'Önskad ledighet under helgen';
      return null;
    };
    const _bjWarn=cur?_getBJConflict(cur):null;
    const _bjBanner=_bjWarn?`<div style="font-size:9px;color:#b91c1c;background:#fee2e2;padding:2px 6px;border-radius:3px;margin-bottom:3px">⚠ ${_bjWarn}</div>`:'';
    return`<div>${_bjBanner}<select onchange="setBJFromTable('${type}',${wn},${yr},this.value)" style="width:100%;font-size:11px;padding:3px 6px;background:${cur?'var(--'+color+'-light)':'var(--bg)'};color:${cur?'var(--'+color+')':'var(--text2)'};border:1px solid ${cur?'var(--'+color+')':'var(--border)'};border-radius:5px"><option value="">— —</option>${allDocs.map(d=>{const conflict=d.id===otherDoc;const hasFL=bjDts.some(ds=>(foraldraledig[ds]||[]).some(e=>e.docId===d.id));const jf=docHasJourfriOnskad(d.id,wn,yr,'weekend');return`<option value="${d.id}"${cur===d.id?' selected':''}${conflict?' disabled':''}>${conflict?'⚠ ':hasFL?'👶 ':jf?'🏠 ':''}${d.name.split(' ')[0]} ${d.name.split(' ').slice(-1)[0]}${conflict?' ('+otherType+')':''}</option>`;}).join('')}</select></div>`;
  }
  let html=`<thead><tr><th>Vecka</th><th style="color:var(--bjfs)">BJFS</th><th style="color:var(--bjlo)">BJLÖ</th></tr></thead><tbody>`;
  rows.forEach(({wn,yr,dt})=>{
    const isCur=wn===curWn&&yr===curYr;
    html+=`<tr style="${isCur?'background:var(--accent-light)':''}" ${isCur?'data-cur="1"':''}>
      <td><strong style="font-family:'DM Mono',monospace;font-size:12px">v.${wn}</strong><span style="font-size:10px;color:var(--text3);margin-left:5px">${dt.getDate()} ${svMonth(dt)}</span>${isCur?'<span style="font-size:9px;font-weight:700;color:var(--accent);margin-left:5px">↑</span>':''}</td>
      <td>${mkBJSel(wn,yr,'BJFS',bjfsDocs,'bjfs')}</td>
      <td>${mkBJSel(wn,yr,'BJLO',bjloDocs,'bjlo')}</td>
    </tr>`;
  });
  document.getElementById('bjRotTable').innerHTML=html+`</tbody>`;
}
function setBJFromTable(type,wn,yr,docId){
  const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);
  const wkMon=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
  const anchorDs=isoDate(addDays(wkMon,type==='BJFS'?4:5));
  setBJ(anchorDs,type,docId||null);
  const _jan4=new Date(Date.UTC(yr,0,4));const _jan4Mon=getMonday(_jan4);
  const _wkMon=addDays(_jan4Mon,(wn-weekNum(_jan4Mon))*7);
  const _anchorDs=isoDate(addDays(_wkMon,type==='BJFS'?4:5));
  if(!bjScheduleManual[_anchorDs])bjScheduleManual[_anchorDs]={};
  if(docId)bjScheduleManual[_anchorDs][type]=true; else delete bjScheduleManual[_anchorDs]?.[type];
  autoSave();renderBJRotationTable();render();
}
function renderBJNVRotationTable(){
  const mon=getMonday(currentDate),curWn=weekNum(mon),curYr=weekYear(mon);
  const rows=[];for(let d=-4;d<=60;d++){const dt=addDays(mon,d*7);rows.push({wn:weekNum(dt),yr:weekYear(dt),dt});}
  const bjnvDocs=doctors.filter(d=>(d.bj||[]).includes('BJNV'));
  function mkBJNVSel(ds,docs){
    const cur=getBJ(ds,'BJNV');
    const allDocs=docs.filter(d=>docIsActive(d,ds));
    if(cur&&!allDocs.find(d=>d.id===cur)){const doc=docById(cur);if(doc)allDocs.push(doc);}
    const _dt=new Date(ds),_wn=weekNum(_dt),_yr=weekYear(_dt);
    return`<select onchange="setBJNVFromTable('${ds}',this.value)" style="width:100%;font-size:11px;padding:2px 4px;background:${cur?'var(--bjnv-light)':'var(--bg)'};color:${cur?'var(--bjnv)':'var(--text2)'};border:1px solid ${cur?'var(--bjnv)':'var(--border)'};border-radius:5px"><option value="">—</option>${allDocs.map(d=>{const c=bjnvConflict(d.id,ds)&&cur!==d.id;const hasFL=(foraldraledig[ds]||[]).some(e=>e.docId===d.id);const jf=docHasJourfriOnskad(d.id,_wn,_yr,'week');return`<option value="${d.id}"${cur===d.id?' selected':''}${c?' disabled':''}>${c?'⚠ ':hasFL?'👶 ':jf?'🚫 ':''}${d.name.split(' ')[0]} ${d.name.split(' ').slice(-1)[0]}</option>`;}).join('')}</select>`;
  }
  let html=`<thead><tr><th>Vecka</th><th>Mån</th><th>Tis</th><th>Ons</th><th>Tor</th></tr></thead><tbody>`;
  rows.forEach(({wn,yr,dt})=>{
    const isCur=wn===curWn&&yr===curYr;
    const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);
    const wkMon=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
    html+=`<tr style="${isCur?'background:var(--accent-light)':''}" ${isCur?'data-cur="1"':''}>
      <td><strong style="font-family:'DM Mono',monospace;font-size:12px">v.${wn}</strong><span style="font-size:10px;color:var(--text3);margin-left:5px">${dt.getDate()} ${svMonth(dt)}</span>${isCur?'<span style="font-size:9px;font-weight:700;color:var(--accent);margin-left:5px">↑</span>':''}</td>
      ${[0,1,2,3].map(i=>`<td>${mkBJNVSel(isoDate(addDays(wkMon,i)),bjnvDocs)}</td>`).join('')}
    </tr>`;
  });
  document.getElementById('bjNVRotTable').innerHTML=html+`</tbody>`;
}
function setBJNVFromTable(ds,docId){setBJ(ds,'BJNV',docId||null);autoSave();renderBJNVRotationTable();render();}
function autoBJNVRotate(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  const elig=doctors.filter(d=>(d.bj||[]).includes('BJNV'));
  const cnt={};const lastWk={};
  elig.forEach(d=>{cnt[d.id]=0;lastWk[d.id]=-99;});
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    for(let i=0;i<4;i++){
      const ds=isoDate(addDays(mon,i));
      const existing=getBJ(ds,'BJNV');
      if(existing){
        // Manuell tilldelning — uppdatera cnt/lastWk för korrekt fördelning
        if(cnt[existing]!==undefined){cnt[existing]++;lastWk[existing]=Math.max(lastWk[existing],wn);}
        continue;
      }
      // bjnvConflict checks both max-1/week and adjacent weekend BJ
      const pool=elig.filter(d=>!bjnvConflict(d.id,ds)&&!docHasJourfriOnskad(d.id,wn,yr,'week')&&!docBlockedForNight(d.id,ds));
      if(!pool.length)continue;
      pool.sort((a,b)=>cnt[a.id]-cnt[b.id]||lastWk[a.id]-lastWk[b.id]);
      const chosen=pool[0];
      setBJ(ds,'BJNV',chosen.id);cnt[chosen.id]++;lastWk[chosen.id]=wn;
    }
  }
  renderBJNVRotationTable();render();showToast(`BJNV-rotation satt v.${fromWn}–${toWn}`);
}
function clearBJNVRotation(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    for(let i=0;i<4;i++)setBJ(isoDate(addDays(mon,i)),'BJNV',null);
  }
  renderBJNVRotationTable();render();showToast('BJNV-rotation rensad');
}
function autoBJRotate(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  _bjScheduleSnapshot=JSON.stringify(bjSchedule);
  _bjScheduleManualSnapshot=JSON.stringify(bjScheduleManual);
  const MIN_GAP=3; // minst 3 veckors mellanrum (2 jourfria helger) — hård regel
  const PREF_GAP=4; // helst 4 veckors mellanrum (3 jourfria helger) — mjuk preferens
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  const last={};const cnt={};
  doctors.forEach(d=>{last[d.id]=-99;cnt[d.id]={BJFS:0,BJLO:0};});
  for(let wn=Math.max(1,fromWn-20);wn<fromWn;wn++){
    const mon=getMon(wn);
    const fds=isoDate(addDays(mon,4)),sds=isoDate(addDays(mon,5));
    const bf=getBJ(fds,'BJFS'),bl=getBJ(sds,'BJLO');
    if(bf&&last[bf]!==undefined)last[bf]=Math.max(last[bf],wn);
    if(bl&&last[bl]!==undefined)last[bl]=Math.max(last[bl],wn);
  }
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    const friDs=isoDate(addDays(mon,4)),satDs=isoDate(addDays(mon,5));
    // Manuella tilldelningar: uppdatera last/cnt så gap-kontrollen fungerar för resten av rotationen
    const exBJFS=getBJ(friDs,'BJFS'),exBJLO=getBJ(satDs,'BJLO');
    if(exBJFS&&last[exBJFS]!==undefined){last[exBJFS]=Math.max(last[exBJFS],wn);cnt[exBJFS].BJFS++;}
    if(exBJLO&&last[exBJLO]!==undefined){last[exBJLO]=Math.max(last[exBJLO],wn);cnt[exBJLO].BJLO++;}
    if(!exBJFS){
      const bjloDoc=exBJLO;
      const elig=doctors.filter(d=>(d.bj||[]).includes('BJFS')&&d.id!==bjloDoc&&!docHasJourfriOnskad(d.id,wn,yr,'weekend')&&!docBlockedForNight(d.id,friDs));
      const prefPool=elig.filter(d=>(wn-last[d.id])>=PREF_GAP);
      const minPool=elig.filter(d=>(wn-last[d.id])>=MIN_GAP);
      // Gap är hårt — bryt bara som absolut sista utväg, sort ger då minst dåliga val
      const final=prefPool.length?prefPool:minPool.length?minPool:elig;
      final.sort((a,b)=>cnt[a.id].BJFS-cnt[b.id].BJFS||last[a.id]-last[b.id]);
      if(final.length){setBJ(friDs,'BJFS',final[0].id);last[final[0].id]=wn;cnt[final[0].id].BJFS++;}
    }
    if(!exBJLO){
      const bjfsDoc=getBJ(friDs,'BJFS');
      const elig=doctors.filter(d=>(d.bj||[]).includes('BJLO')&&d.id!==bjfsDoc&&!docHasJourfriOnskad(d.id,wn,yr,'weekend')&&!docBlockedForNight(d.id,satDs));
      const prefPool=elig.filter(d=>(wn-last[d.id])>=PREF_GAP);
      const minPool=elig.filter(d=>(wn-last[d.id])>=MIN_GAP);
      const final=prefPool.length?prefPool:minPool.length?minPool:elig;
      final.sort((a,b)=>cnt[a.id].BJLO-cnt[b.id].BJLO||last[a.id]-last[b.id]);
      if(final.length){setBJ(satDs,'BJLO',final[0].id);last[final[0].id]=wn;cnt[final[0].id].BJLO++;}
    }
  }
  renderBJRotationTable();render();showToast(`BJ-rotation satt v.${fromWn}–${toWn}`);
}
let _bjScheduleSnapshot=null,_bjScheduleManualSnapshot=null;
function undoClearBJRotation(){
  if(!_bjScheduleSnapshot){showToast('Inget att ångra');return;}
  bjSchedule=JSON.parse(_bjScheduleSnapshot);
  bjScheduleManual=JSON.parse(_bjScheduleManualSnapshot);
  _bjScheduleSnapshot=null;_bjScheduleManualSnapshot=null;
  autoSave();renderBJRotationTable();render();showToast('BJ-rotation återställd');
}
function clearBJRotation(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  _bjScheduleSnapshot=JSON.stringify(bjSchedule);
  _bjScheduleManualSnapshot=JSON.stringify(bjScheduleManual);
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    const friDs=isoDate(addDays(mon,4)),satDs=isoDate(addDays(mon,5));
    if(!bjScheduleManual[friDs]?.BJFS)setBJ(friDs,'BJFS',null);
    if(!bjScheduleManual[satDs]?.BJLO)setBJ(satDs,'BJLO',null);
  }
  autoSave();renderBJRotationTable();render();showToast('Auto-BJ rensad (manuella bevarade)');
}
function autoRotate(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const curMon=getMonday(currentDate),yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  _jourveckorSnapshot=JSON.stringify(jourveckor);
  _jourveckorManualSnapshot=JSON.stringify(jourveckorManual);
  const HARD_GAP=3;     // absolut minimum — minst 3 veckors mellanrum (2 jourfria helger) — tillåts ALDRIG understiga detta
  const MIN_GAP=4;      // mjukt minimum: 4 veckors mellanrum (3 jourfria helger)
  const PREF_GAP=5;     // preferens: 5 veckors mellanrum (4 jourfria helger)
  const NLO_HARD_GAP=4; // NLÖ: absolut minimum mellan två NLÖ (samma läkare)

  // Helper: how many JV nights does a jourvecka assignment add in a given month?
  // JV1 = 3 nights (fre+mån+ons), JV2 = 3 nights (sön+tis+tor), NLO = 1 night
  function nightsForJV(key){ return key==='NLO'?1:3; }

  const NLO_MIN_GAP=6;    // hårt minimum: 6 veckors mellanrum mellan 2 NLÖ (samma läkare)
  const NLO_PREF_GAP=10;  // mjuk preferens: 10 veckors mellanrum
  const NLO_AFTER_JV=2;   // NLÖ måste ligga minst 2v EFTER JV1/2 (samma läkare)
  // Track last assigned week and total nights assigned so far (within rotation run)
  const lastAssigned={};
  const nightCount={};
  doctors.forEach(d=>{lastAssigned[d.id]={JV1:-99,JV2:-99,NLO:-99,any:-99,jv:-99};nightCount[d.id]=0;});
  // Seed från hela schemaperiodens start (eller upp till 52 veckor bakåt) —
  // nightCount måste reflektera alla nätter som redan tilldelats, inte bara de senaste 10 veckorna.
  // lastAssigned seedas parallellt (gap-kontroll kräver bara Max — går bra att titta längre bakåt).
  const seedFromWn=schedulePeriod.from
    ?weekNum(new Date(schedulePeriod.from))
    :Math.max(1,fromWn-52);
  for(let wn=Math.max(1,seedFromWn);wn<fromWn;wn++){
    const jv=getJV(wn,yr);
    ['JV1','JV2','NLO'].forEach(key=>{
      if(jv[key]){
        nightCount[jv[key]]=(nightCount[jv[key]]||0)+nightsForJV(key);
        if(key==='NLO'){lastAssigned[jv[key]].NLO=Math.max(lastAssigned[jv[key]].NLO,wn);lastAssigned[jv[key]].any=Math.max(lastAssigned[jv[key]].any,wn);}
        else{lastAssigned[jv[key]][key]=wn;lastAssigned[jv[key]].any=Math.max(lastAssigned[jv[key]].any,wn);lastAssigned[jv[key]].jv=Math.max(lastAssigned[jv[key]].jv,wn);}
      }
    });
  }

  for(let wn=fromWn;wn<=toWn;wn++){
    ['JV1','JV2','NLO'].forEach(key=>{
      const existingDoc=getJV(wn,yr)[key];
      if(existingDoc){
        // Manuellt satt — uppdatera lastAssigned så gapkontroll fungerar för resten av rotationen
        if(key==='NLO'){
          lastAssigned[existingDoc].NLO=Math.max(lastAssigned[existingDoc].NLO,wn);
          lastAssigned[existingDoc].any=Math.max(lastAssigned[existingDoc].any,wn);
        } else {
          lastAssigned[existingDoc][key]=wn;
          lastAssigned[existingDoc].any=Math.max(lastAssigned[existingDoc].any,wn);
          lastAssigned[existingDoc].jv=Math.max(lastAssigned[existingDoc].jv,wn);
        }
        nightCount[existingDoc]+=nightsForJV(key);
        return;
      }
      const _rotMon=isoWeekMon(wn,yr);
      const _rotOffs=key==='JV1'?[4,5,6,7,8,9]:key==='JV2'?[5,6,7,8,9,10]:[5];
      const _rotDts=_rotOffs.map(o=>addDays(_rotMon,o));
      const hasJfRot=d=>_rotDts.some(dt=>{const dow=dt.getDay(),isWe=dow===0||dow===6,dwn=weekNum(dt),dyr=weekYear(dt);return docHasJourfriOnskad(d.id,dwn,dyr,isWe?'weekend':'week');});
      // Kolla godkänd ledighet för ankarvecka + spillvecka — hårt krav, bryts aldrig
      const spillMon=addDays(isoWeekMon(wn,yr),7);
      const spillWn=weekNum(spillMon),spillYr=weekYear(spillMon);
      const hasApprovedLedig=d=>{
        if(docHasLedighetVecka(d.id,wn,yr)) return true;
        if(key!=='NLO'&&docHasLedighetVecka(d.id,spillWn,spillYr)) return true;
        return false;
      };
      // Kolla ledighetsönskemål — mjukt krav, kan åsidosättas som sista utväg
      const hasWishConflict=d=>{
        const wishes=ledighetVeckorOnskemal[d.id];if(!wishes)return false;
        if(wishes[wkey(wn,yr)])return true;
        if(key!=='NLO'&&wishes[wkey(spillWn,spillYr)])return true;
        return false;
      };
      const baseFilter=d=>(d.jv||[]).includes(key)&&!hasJfRot(d)&&!Object.entries(getJV(wn,yr)).some(([k,v])=>k!==key&&v===d.id)&&!jvNightDates(wn,yr,key).some(ds=>docBlockedForNight(d.id,ds))&&!hasApprovedLedig(d);
      // Primär pool: inga ledighetskonflikter alls. Fallback: ignorera önskemål men aldrig godkänd ledighet.
      const pool=doctors.filter(d=>baseFilter(d)&&!hasWishConflict(d));
      const allEligPool=doctors.filter(baseFilter); // baseFilter inkluderar redan godkänd-ledig-check
      if(!allEligPool.length) return;

      function njRoleRank(d){const r=d.roles||[];return r.includes('ST')||r.includes('Rand')?0:r.includes('Spec')?1:2;}
      function score(d){
        const wkStr=wkey(wn,yr);
        const gapOk=key==='NLO'
          ?(wn-lastAssigned[d.id].NLO)>=NLO_MIN_GAP&&(wn-lastAssigned[d.id].jv)>=NLO_AFTER_JV
          :(wn-lastAssigned[d.id].any)>=MIN_GAP;
        const prefGapOk=key==='NLO'
          ?(wn-lastAssigned[d.id].NLO)>=NLO_PREF_GAP&&(wn-lastAssigned[d.id].jv)>=NLO_AFTER_JV
          :(wn-lastAssigned[d.id].any)>=PREF_GAP;
        const nightsNorm=nightCount[d.id]/(d.fte||1);
        const roleAdj=njRoleRank(d)*1.0;
        const nights=nightsNorm+roleAdj;
        const pref=(d.prefJV===key)?0:1;
        const wish=(onskadJourvecka[d.id]&&onskadJourvecka[d.id][wkStr]===key)?0:1;
        const lastThis=lastAssigned[d.id][key];
        return{gapOk,prefGapOk,nights,pref,wish,lastThis};
      }

      const hardOk=d=>{
        // Direkt uppslag mot jourveckor — säkrare än enbart lastAssigned-spårning
        if(key==='NLO'){
          // NLÖ: minst NLO_AFTER_JV veckor efter JV1/2
          for(let b=1;b<NLO_AFTER_JV;b++){const p=getJV(wn-b,yr);if(p.JV1===d.id||p.JV2===d.id)return false;}
          // NLÖ: minst NLO_HARD_GAP veckor efter senaste NLÖ
          for(let b=1;b<NLO_HARD_GAP;b++){const p=getJV(wn-b,yr);if(p.NLO===d.id)return false;}
          return true;
        }
        // JV1/JV2: minst HARD_GAP veckor sedan senaste JV (inkl. NLÖ)
        for(let b=1;b<HARD_GAP;b++){const p=getJV(wn-b,yr);if(p.JV1===d.id||p.JV2===d.id||p.NLO===d.id)return false;}
        return true;
      };
      const hardPool=pool.filter(hardOk);
      const hardFallback=allEligPool.filter(hardOk); // inkl. ledighetskonflikter — absolut sista utväg
      const useHardPool=hardPool.length?hardPool:hardFallback;
      if(!useHardPool.length) return; // ingen tillgänglig läkare inom hårda gränser — lämna tomt

      // Välj bland kandidater som uppfyller hårda gränser: prioritera prefGap → minGap → alla
      const withPrefGap=useHardPool.filter(d=>score(d).prefGapOk);
      const withMinGap=useHardPool.filter(d=>score(d).gapOk);
      const finalPool=withPrefGap.length?withPrefGap:withMinGap.length?withMinGap:useHardPool;

      finalPool.sort((a,b)=>{
        const sa=score(a),sb=score(b);
        if(sa.wish!==sb.wish) return sa.wish-sb.wish;
        if(sa.nights!==sb.nights) return sa.nights-sb.nights;
        if(sa.lastThis!==sb.lastThis) return sa.lastThis-sb.lastThis;
        return sa.pref-sb.pref;
      });

      for(const candidate of finalPool){
        if(setJV(wn,yr,key,candidate.id)!==false){
          if(key==='NLO'){
            lastAssigned[candidate.id].NLO=wn;
            lastAssigned[candidate.id].any=Math.max(lastAssigned[candidate.id].any,wn);
          } else {
            lastAssigned[candidate.id][key]=wn;
            lastAssigned[candidate.id].any=Math.max(lastAssigned[candidate.id].any,wn);
            lastAssigned[candidate.id].jv=Math.max(lastAssigned[candidate.id].jv,wn);
          }
          nightCount[candidate.id]+=nightsForJV(key);
          break;
        }
      }
    });
  }
  renderRotationTable();render();showToast(`Rotation satt v.${fromWn}–${toWn}`);
}
let _jourveckorSnapshot=null,_jourveckorManualSnapshot=null;
function undoClearRotation(){
  if(!_jourveckorSnapshot){showToast('Inget att ångra');return;}
  jourveckor=JSON.parse(_jourveckorSnapshot);
  jourveckorManual=JSON.parse(_jourveckorManualSnapshot);
  _jourveckorSnapshot=null;_jourveckorManualSnapshot=null;
  autoSave();renderRotationTable();render();showToast('Rotation återställd');
}
function clearRotation(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  _jourveckorSnapshot=JSON.stringify(jourveckor);
  _jourveckorManualSnapshot=JSON.stringify(jourveckorManual);
  for(let wn=fromWn;wn<=toWn;wn++){
    const k=wkey(wn,yr);
    if(!jourveckor[k])continue;
    ['JV1','JV2','NLO'].forEach(key=>{
      if(jourveckorManual[k]?.[key])return; // preserve manually assigned
      jourveckor[k][key]=null;
    });
  }
  autoSave();renderRotationTable();render();showToast('Auto-rotation rensad (manuella bevarade)');
}

function buildGrid(elId,tags,sel){document.getElementById(elId).innerHTML=tags.map(t=>`<input type="checkbox" class="tc" id="${elId}_${t}"${sel.includes(t)?' checked':''}><label class="tl" for="${elId}_${t}">${t}</label>`).join('');}
function buildPosGrid(elId,sel){
  const seen=new Set();
  document.getElementById(elId).innerHTML=positions.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).map(p=>`<input type="checkbox" class="tc" id="${elId}_${p.id}"${sel.includes(p.id)?' checked':''}><label class="tl" for="${elId}_${p.id}">${p.name}</label>`).join('');
}
const buildAllowedGrid=buildPosGrid;
const buildPrefGrid=buildPosGrid;
function getChecked(elId,tags){return tags.filter(t=>document.getElementById(`${elId}_${t}`)?.checked);}
function getPrefChecked(elId){return positions.map(p=>p.id).filter(id=>document.getElementById(`${elId}_${id}`)?.checked);}

function openAddDoctorModal(){
  const inp=document.getElementById('newDoctorInput');document.getElementById('addDocName').value=inp.value.trim();inp.value='';
  buildGrid('addRoleGrid',roleTags,[]);buildAllowedGrid('addAllowedGrid',[]);buildPrefGrid('addPrefGrid',[]);
  ['addJV1','addJV2','addNLO'].forEach(id=>document.getElementById(id).checked=false);
  document.getElementById('addEmpStart').value='';document.getElementById('addEmpEnd').value='';
  document.getElementById('addTlFrom').value='';document.getElementById('addTlTo').value='';
  openModal('addDoctorModal');setTimeout(()=>document.getElementById('addDocName').focus(),80);
}
function confirmAddDoctor(){
  const name=document.getElementById('addDocName').value.trim();if(!name)return;
  const jv=[];if(document.getElementById('addJV1').checked)jv.push('JV1');if(document.getElementById('addJV2').checked)jv.push('JV2');if(document.getElementById('addNLO').checked)jv.push('NLO');
  const bj=[];if(document.getElementById('addBJFS').checked)bj.push('BJFS');if(document.getElementById('addBJLO').checked)bj.push('BJLO');if(document.getElementById('addBJNV').checked)bj.push('BJNV');
  const allowed=getPrefChecked('addAllowedGrid');const pref=getPrefChecked('addPrefGrid');const prefJV=[...document.querySelectorAll('input[name="addPrefJV"]')].find(r=>r.checked)?.value||'';const ftePct=parseInt(document.getElementById('addTjgrad').value)||100;const empStart=document.getElementById('addEmpStart').value||'';const empEnd=document.getElementById('addEmpEnd').value||'';const tlFrom=document.getElementById('addTlFrom').value||'';const tlTo=document.getElementById('addTlTo').value||'';doctors.push({id:'doc_'+Date.now(),name,roles:getChecked('addRoleGrid',roleTags),allowedPositions:allowed,prefPositions:pref,prefJV,jv,bj,fte:ftePct/100,employmentStart:empStart,employmentEnd:empEnd,tlFrom,tlTo,color:AVATAR_COLORS[doctors.length%AVATAR_COLORS.length]});
  closeModal('addDoctorModal');render();showToast(`${name} tillagd`);
}
let _editDocOpenedFromList=false;
function closeEditDoctorModal(){
  closeModal('editDoctorModal');
  if(_editDocOpenedFromList){_editDocOpenedFromList=false;openModal('doctorListModal');}
}
function openEditDoctorModalFL(docId){
  openFlPeriodModal(docId);
}
function openEditDoctorModal(docId){
  const doc=docById(docId);if(!doc)return;
  document.getElementById('editDocId').value=docId;document.getElementById('editDocName').value=doc.name;
  buildGrid('editRoleGrid',roleTags,doc.roles);buildAllowedGrid('editAllowedGrid',doc.allowedPositions||[]);buildPrefGrid('editPrefGrid',doc.prefPositions||[]);const pjv=doc.prefJV||'';document.querySelectorAll('input[name="editPrefJV"]').forEach(r=>r.checked=(r.value===pjv));
  document.getElementById('editTjgrad').value=Math.round((doc.fte||1)*100);
  document.getElementById('editEmpStart').value=doc.employmentStart||'';document.getElementById('editEmpEnd').value=doc.employmentEnd||'';
  document.getElementById('editTlFrom').value=doc.tlFrom||'';document.getElementById('editTlTo').value=doc.tlTo||'';
  document.getElementById('editJV1').checked=(doc.jv||[]).includes('JV1');
  document.getElementById('editJV2').checked=(doc.jv||[]).includes('JV2');
  document.getElementById('editNLO').checked=(doc.jv||[]).includes('NLO');
  document.getElementById('editBJFS').checked=(doc.bj||[]).includes('BJFS');
  document.getElementById('editBJLO').checked=(doc.bj||[]).includes('BJLO');
  document.getElementById('editBJNV').checked=(doc.bj||[]).includes('BJNV');
  _editDocOpenedFromList=document.getElementById('doctorListModal').classList.contains('visible');
  if(_editDocOpenedFromList)closeModal('doctorListModal');
  openModal('editDoctorModal');
}
function confirmEditDoctor(){
  const id=document.getElementById('editDocId').value,doc=docById(id);if(!doc)return;
  doc.name=document.getElementById('editDocName').value.trim()||doc.name;
  const allowed=getPrefChecked('editAllowedGrid');const pref=getPrefChecked('editPrefGrid');doc.roles=getChecked('editRoleGrid',roleTags);doc.allowedPositions=allowed;doc.prefPositions=pref;doc.prefJV=[...document.querySelectorAll('input[name="editPrefJV"]')].find(r=>r.checked)?.value||'';
  const ftePct=parseInt(document.getElementById('editTjgrad').value)||100;doc.fte=ftePct/100;
  doc.employmentStart=document.getElementById('editEmpStart').value||'';doc.employmentEnd=document.getElementById('editEmpEnd').value||'';
  doc.tlFrom=document.getElementById('editTlFrom').value||'';doc.tlTo=document.getElementById('editTlTo').value||'';
  const jv=[];if(document.getElementById('editJV1').checked)jv.push('JV1');if(document.getElementById('editJV2').checked)jv.push('JV2');if(document.getElementById('editNLO').checked)jv.push('NLO');doc.jv=jv;
  const bj=[];if(document.getElementById('editBJFS').checked)bj.push('BJFS');if(document.getElementById('editBJLO').checked)bj.push('BJLO');if(document.getElementById('editBJNV').checked)bj.push('BJNV');doc.bj=bj;
  delete doc.deltid;delete doc.deltidJamn;delete doc.deltidOjamn;
  closeEditDoctorModal();render();showToast('Läkare uppdaterad');
}
function promptDeleteFromEdit(){const id=document.getElementById('editDocId').value;closeModal('editDoctorModal');promptDelete(id);}
function promptDelete(docId){const doc=docById(docId);if(!doc)return;deleteTargetId=docId;document.getElementById('deleteModalText').textContent=`Ta bort ${doc.name}? All schemadata raderas.`;openModal('deleteModal');}
function confirmDelete(){
  if(!deleteTargetId)return;
  const doc=docById(deleteTargetId);
  const id=deleteTargetId;
  doctors=doctors.filter(d=>d.id!==id);
  // schedule
  Object.keys(schedule).forEach(ds=>{if(schedule[ds])Object.keys(schedule[ds]).forEach(k=>{if(schedule[ds][k]===id)schedule[ds][k]='';});});
  // jourveckor
  Object.keys(jourveckor).forEach(k=>{const jv=jourveckor[k];if(jv.JV1===id)jv.JV1=null;if(jv.JV2===id)jv.JV2=null;if(jv.NLO===id)jv.NLO=null;});
  // bjSchedule
  Object.keys(bjSchedule).forEach(ds=>{if(bjSchedule[ds])Object.keys(bjSchedule[ds]).forEach(k=>{if(bjSchedule[ds][k]===id)bjSchedule[ds][k]=null;});});
  // ledighet
  delete ledighetRequests[id];delete ledighetVeckor[id];
  delete ledighetOnskemal[id];delete ledighetVeckorOnskemal[id];
  // utbildning
  delete utbildningDagar[id];delete utbildningVeckor[id];delete utbildningOnskemal[id];
  // deltid
  delete deltidDagar[id];delete deltidVeckor[id];
  // jourfri
  delete jourfriOnskad[id];delete jourfriOnskemal[id];
  // föräldraledig
  delete foraldraledigenOnskemal[id];
  Object.keys(foraldraledig).forEach(ds=>{foraldraledig[ds]=(foraldraledig[ds]||[]).filter(e=>e.docId!==id);});
  // sjukskrivning/VAB
  Object.keys(sjukskrivning).forEach(ds=>{sjukskrivning[ds]=(sjukskrivning[ds]||[]).filter(e=>e.docId!==id);});
  // specialSlots
  Object.keys(specialSlots).forEach(ds=>{Object.keys(specialSlots[ds]||{}).forEach(k=>{if(specialSlots[ds][k]&&specialSlots[ds][k].docId===id)delete specialSlots[ds][k];});});
  // specialRecurring
  specialRecurring=specialRecurring.filter(e=>e.docId!==id);
  // handledning
  handledningPairs=handledningPairs.filter(p=>p.stId!==id&&p.supervisorId!==id);
  // nightOverrides
  Object.keys(nightOverrides).forEach(ds=>{if(nightOverrides[ds])Object.keys(nightOverrides[ds]).forEach(k=>{if(nightOverrides[ds][k]===id)delete nightOverrides[ds][k];});});
  // önskad pass / jourvecka
  delete onskadPass[id];delete onskadJourvecka[id];
  // auskultation
  Object.keys(auskultationEntries).forEach(ds=>{auskultationEntries[ds]=(auskultationEntries[ds]||[]).filter(e=>e.docId!==id);});
  autoSave();closeModal('deleteModal');render();showToast(`${doc?doc.name:'Läkaren'} borttagen`);deleteTargetId=null;
}

let _editPosId=null,_editPosColorIdx=0;
let _editDayModes={};
let _editDaySlots={};
let _editDayKH={};
let _editDayParity={};
let _editSlotParity={};

// Returns HTML for the parity section of a day column.
// When KH is checked AND slots >= 2: two rows (KH + KSK).
// Otherwise: one row (whole-day parity as before).
function _parityRowHtml(dow){
  const kh=!!_editDayKH[dow];
  const sc=_editDaySlots[dow]??0;
  if(kh&&sc>=2){
    const sp=_editSlotParity[dow]||{kh:'',ksk:''};
    return ['kh','ksk'].map(slot=>{
      const lbl=slot==='kh'?'KH':'KSK';
      const color=slot==='kh'?'#1d4ed8':'var(--accent)';
      const par=sp[slot]||'';
      const btns=[['','∀','Varje vecka'],['even','J','Jämna'],['odd','O','Ojämna']].map(([v,l,title])=>
        `<button type="button" onclick="setEditSlotParity(${dow},'${slot}','${v}')" title="${title}" style="flex:1;font-size:9px;padding:2px 1px;border:none;cursor:pointer;background:${par===v?'var(--accent)':'transparent'};color:${par===v?'#fff':'var(--text2)'}">${l}</button>`
      ).join('');
      return `<div style="display:flex;align-items:center;gap:2px;margin-top:2px"><span style="font-size:8px;font-weight:700;color:${color};min-width:22px;text-align:right">${lbl}</span><div style="display:flex;flex:1;border:1px solid var(--border);border-radius:4px;overflow:hidden">${btns}</div></div>`;
    }).join('');
  } else {
    const par=_editDayParity[dow]||'';
    const btns=[['','all','∀','Varje vecka'],['even','even','J','Jämna veckor'],['odd','odd','O','Ojämna veckor']].map(([v,k,lbl,title])=>
      `<button type="button" id="editDayParity_${dow}_${k}" onclick="setEditDayParity(${dow},'${v}')" title="${title}" style="flex:1;font-size:9px;padding:2px 1px;border:none;cursor:pointer;background:${par===v?'var(--accent)':'transparent'};color:${par===v?'#fff':'var(--text2)'}">${lbl}</button>`
    ).join('');
    return `<div style="display:flex;border:1px solid var(--border);border-radius:4px;overflow:hidden;margin-top:2px">${btns}</div>`;
  }
}
function _refreshParitySection(dow){
  const el=document.getElementById(`editParitySection_${dow}`);
  if(el)el.innerHTML=_parityRowHtml(dow);
}
function setEditSlotParity(dow,slot,val){
  if(!_editSlotParity[dow])_editSlotParity[dow]={kh:'',ksk:''};
  _editSlotParity[dow][slot]=val;
  _refreshParitySection(dow);
}
function setEditDayMode(dow,mode){
  _editDayModes[dow]=mode;
  ['hel','fm','em'].forEach(m=>{
    const btn=document.getElementById(`editDayMode_${dow}_${m}`);
    if(btn){btn.style.background=m===mode?'var(--accent)':'transparent';btn.style.color=m===mode?'#fff':'var(--text2)';}
  });
}
function setEditDaySlots(dow,val){
  _editDaySlots[dow]=Math.max(0,parseInt(val)||0);
  _refreshParitySection(dow);
}
function setEditDayKH(dow,checked){
  _editDayKH[dow]=!!checked;
  _refreshParitySection(dow);
}
function setEditDayParity(dow,val){
  _editDayParity[dow]=val;
  [['','all'],['even','even'],['odd','odd']].forEach(([v,k])=>{
    const btn=document.getElementById(`editDayParity_${dow}_${k}`);
    if(btn){btn.style.background=v===val?'var(--accent)':'transparent';btn.style.color=v===val?'#fff':'var(--text2)';}
  });
}
function openPositionsModal(){_editPosId=null;renderPositionsList();openModal('positionsModal');}
function renderPositionsList(){
  const el=document.getElementById('posListEl');el.innerHTML='';
  const dayNames=['Mån','Tis','Ons','Tor','Fre'];
  positions.forEach(pos=>{
    const[,fg]=posColor(pos.colorIdx);
    const isMand=mandatoryPositions.has(pos.id);
    const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
    const div=document.createElement('div');div.className='pos-edit-item';
    if(_editPosId===pos.id){
      _editDayModes={};
      [1,2,3,4].forEach(dow=>{_editDayModes[dow]=posDayMode(pos,dow);});
      _editDaySlots={};_editDayKH={};_editDayParity={};_editSlotParity={};
      const _posDays2=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
      [1,2,3,4,5].forEach(dow=>{_editDaySlots[dow]=pos.slotsPerDay?.[dow]!==undefined?pos.slotsPerDay[dow]:(_posDays2.includes(dow)?pos.slots.length:0);_editDayKH[dow]=(pos.khDays||[]).includes(dow);_editDayParity[dow]=(pos.parityPerDay&&pos.parityPerDay[dow])||'';_editSlotParity[dow]=(pos.slotParity&&pos.slotParity[dow])||{kh:'',ksk:''};});
      const swatches=POS_COLORS.map(([,c],i)=>`<div onclick="_editPosColorIdx=${i};renderPositionsList()" style="width:16px;height:16px;border-radius:3px;background:${c};cursor:pointer;flex-shrink:0;outline:${_editPosColorIdx===i?'2px solid #333':'none'};outline-offset:1px"></div>`).join('');
      div.innerHTML=`<div style="flex:1;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;gap:8px;align-items:flex-end">
          <div style="flex:1"><label class="fl">Namn</label><input id="editPosName" value="${pos.name}" style="width:100%"></div>
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1"><label class="fl">Sektion i schema</label><select id="editPosSection"><option value="">Avdelningsplaceringar</option><option value="mott"${pos.section==='mott'?' selected':''}>Mottagning</option><option value="specmott"${pos.section==='specmott'?' selected':''}>Specialistmottagningar</option><option value="dagvard"${pos.section==='dagvard'?' selected':''}>Dagvård</option></select></div>
          <div style="flex:1"><label class="fl">Veckofrekvens</label><select id="editPosWeekParity"><option value="">Varje vecka</option><option value="even"${pos.weekParity==='even'?' selected':''}>Jämna veckor</option><option value="odd"${pos.weekParity==='odd'?' selected':''}>Ojämna veckor</option></select></div>
        </div>
        <div><label class="fl">Aktiviteter <span style="font-weight:400;color:var(--text3)">(kommaseparerade, visas som valbar lista vid schemaläggning)</span></label><input id="editPosActivities" value="${(pos.activities||[]).join(', ')}" placeholder="t ex Provokationer, Botox, Skopier" style="width:100%"></div>
        <div><label class="fl">Slots och tid per dag <span style="font-weight:400;color:var(--text3)">(0 = inaktiv dag · Fre alltid FM)</span></label>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;margin-top:4px">
${[1,2,3,4,5].map((dow,i)=>{const n=dayNames[i];const mode=dow===5?'fm':(_editDayModes[dow]||'hel');const sc=_editDaySlots[dow]??0;const kh=!!_editDayKH[dow];const timeRow=dow===5?`<div style="font-size:9px;text-align:center;padding:2px 0;border:1px solid var(--border);border-radius:4px;color:var(--text3)">FM</div>`:`<div style="display:flex;border:1px solid var(--border);border-radius:4px;overflow:hidden">${['hel','fm','em'].map(m=>`<button type="button" id="editDayMode_${dow}_${m}" onclick="setEditDayMode(${dow},'${m}')" style="flex:1;font-size:9px;padding:2px 2px;border:none;cursor:pointer;background:${mode===m?'var(--accent)':'transparent'};color:${mode===m?'#fff':'var(--text2)'}">${m==='hel'?'Hel':m.toUpperCase()}</button>`).join('')}</div>`;const khRow=`<label style="display:flex;align-items:center;justify-content:center;gap:2px;font-size:9px;color:#1d4ed8;margin:2px 0;cursor:pointer" title="En av slots denna dag är Karlshamn"><input type="checkbox" ${kh?'checked':''} onchange="setEditDayKH(${dow},this.checked)" style="margin:0;accent-color:#1d4ed8">KH</label>`;return`<div style="text-align:center"><div style="font-size:9px;font-weight:700;color:var(--text3);margin-bottom:3px">${n}</div><input type="number" min="0" max="12" value="${sc}" oninput="setEditDaySlots(${dow},this.value)" style="width:100%;font-size:11px;padding:2px 0;text-align:center;border:1px solid var(--border);border-radius:4px;margin-bottom:2px" title="Slots denna dag (0=inaktiv)">${khRow}<div id="editParitySection_${dow}">${_parityRowHtml(dow)}</div>${timeRow}</div>`;}).join('')}
</div></div>
        ${pos.slots.filter(s=>!s.noBlock).length>1?`<div><label class="fl">Obligatorisk minimum per period <span style="font-weight:400;color:var(--text3)">(lämna tomt = alla slots krävs)</span></label>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
            <input type="date" id="editMFFrom" style="flex:1;font-size:11px" placeholder="Fr.o.m.">
            <input type="date" id="editMFTo" style="flex:1;font-size:11px" placeholder="T.o.m.">
            <select id="editMFMin" style="font-size:11px;padding:4px">${Array.from({length:pos.slots.filter(s=>!s.noBlock).length},(_,i)=>`<option value="${i+1}">${i+1} slot${i>0?'s':''}</option>`).join('')}</select>
            <button class="btn sm primary" onclick="addMinFillOverride('${pos.id}')">+</button>
          </div>
          <div id="editMFList">${(posMinFillOverrides[pos.id]||[]).map((o,i)=>`<div style="display:flex;align-items:center;gap:6px;font-size:11px;padding:2px 0"><span style="color:var(--text2)">${o.from} – ${o.to}: <strong>${o.min} slot${o.min>1?'s':''}</strong></span><button class="btn sm danger" style="padding:1px 6px" onclick="removeMinFillOverride('${pos.id}',${i})">×</button></div>`).join('')||'<span style="font-size:11px;color:var(--text3)">Inga perioder — standard: ${pos.minFill!==undefined?pos.minFill:pos.slots.filter(s=>!s.noBlock).length} slot(s) krävs alltid</span>'}</div>
        </div>`:''}
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;color:var(--text2)">Färg</span>${swatches}</div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn sm" onclick="_editPosId=null;renderPositionsList()">Avbryt</button>
          <button class="btn sm primary" onclick="savePositionEdit('${pos.id}')">Spara</button>
        </div></div>`;
    } else {
      const locDays=pos.locationDays||{};
      const dayBtns=[1,2,3,4,5].map(day=>{
        const on=posDays.includes(day);
        const isKH=locDays[day]==='Karlshamn',isNeo=locDays[day]==='Neomott';
        const locLbl=isKH?'KH':isNeo?'Neo':'KSK';
        const locBorder=isKH?'#1d4ed8':isNeo?'#7c3aed':'var(--border)';
        const locBg=isKH?'#dbeafe':isNeo?'#ede9fe':'transparent';
        const locCol=isKH?'#1d4ed8':isNeo?'#7c3aed':'var(--text3)';
        return `<span style="display:inline-flex;align-items:center;gap:1px">
          <button onclick="togglePositionDay('${pos.id}',${day},${!on})" style="padding:1px 5px;font-size:9px;border-radius:3px 0 0 3px;border:1px solid ${on?fg:'var(--border)'};background:${on?fg+'22':'transparent'};color:${on?fg:'var(--text3)'};cursor:pointer">${dayNames[day-1]}</button>${on?`<button onclick="togglePosLocation('${pos.id}',${day})" style="padding:1px 4px;font-size:8px;border-radius:0 3px 3px 0;border:1px solid ${locBorder};border-left:none;background:${locBg};color:${locCol};cursor:pointer" title="Klicka för att växla ort (KSK → KH → Neo)">${locLbl}</button>`:''}
        </span>`;
      }).join('');
      div.ondblclick=()=>{_editPosId=pos.id;_editPosColorIdx=pos.colorIdx;renderPositionsList();};
      div.title='Dubbelklicka för att redigera';
      div.innerHTML=`
        <div style="width:9px;height:9px;border-radius:2px;background:${fg};flex-shrink:0;margin-top:3px"></div>
        <div style="flex:1"><div style="font-weight:700;font-size:13px;color:${fg}">${pos.name}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:1px">${pos.slots.length} slot${pos.slots.length>1?'s':''}${pos.weekParity==='even'?' · Jämna veckor':pos.weekParity==='odd'?' · Ojämna veckor':''}${(pos.activities||[]).length?' · '+(pos.activities||[]).join(', '):''}${(pos.fmOnlyDow||[]).filter(d=>d!==5).length?' · FM '+['','Mån','Tis','Ons','Tor'].filter((_,i)=>(pos.fmOnlyDow||[]).filter(d=>d!==5).includes(i)).join('/'):''}${(pos.fmOnlyDow||[]).includes(5)?' · FM Fre':''}${(pos.emOnlyDow||[]).length?' · EM '+['','Mån','Tis','Ons','Tor'].filter((_,i)=>(pos.emOnlyDow||[]).includes(i)).join('/'):''}${!(pos.fmOnlyDow||[]).length&&!(pos.emOnlyDow||[]).length?' · Heltid':''}</div>
          <div style="display:flex;gap:3px;margin-top:5px;flex-wrap:wrap">${dayBtns}</div>
        </div>
        <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:${isMand?'var(--warn)':'var(--text3)'};cursor:pointer;white-space:nowrap" title="Genererar varning om positionen inte är tillsatt på aktiva dagar">
          <input type="checkbox" ${isMand?'checked':''} onchange="toggleMandatory('${pos.id}',this.checked)">
          Obligatorisk
        </label>
        <button class="btn sm danger" onclick="removePosition('${pos.id}')">Ta bort</button>`;
    }
    el.appendChild(div);
  });
}
function savePositionEdit(posId){
  const pos=positions.find(p=>p.id===posId);if(!pos)return;
  pos.name=document.getElementById('editPosName').value.trim()||pos.name;
  pos.section=document.getElementById('editPosSection').value||undefined;
  pos.weekParity=document.getElementById('editPosWeekParity').value||undefined;
  pos.colorIdx=_editPosColorIdx;
  const actRaw=document.getElementById('editPosActivities').value;
  pos.activities=actRaw.split(',').map(s=>s.trim()).filter(Boolean);
  pos.fmOnlyDow=[5]; // Fre always FM
  pos.emOnlyDow=[];
  [1,2,3,4].forEach(dow=>{
    const m=_editDayModes[dow]||'hel';
    if(m==='fm')pos.fmOnlyDow.push(dow);
    else if(m==='em'){if(!pos.emOnlyDow)pos.emOnlyDow=[];pos.emOnlyDow.push(dow);}
  });
  // Dagvård-positioner hanterar sina slots via migrationslogik — rör dem inte här
  const _isDagvardPos=pos.id==='pos_dagvard'||pos.section==='dagvard';
  if(_isDagvardPos){
    // Dagvård är alltid aktiv mån–fre, slots bevaras som de är
    pos.days=[1,2,3,4,5];
    delete pos.slotsPerDay;
  } else {
    // Per-day slot counts + KH days
    const _spd={};[1,2,3,4,5].forEach(dow=>{_spd[dow]=Math.max(0,_editDaySlots[dow]||0);});
    pos.slotsPerDay=_spd;
    pos.days=[1,2,3,4,5].filter(d=>_spd[d]>0);
    pos.khDays=[1,2,3,4,5].filter(d=>_editDayKH[d]&&_spd[d]>0);
    const _ppd={};[1,2,3,4,5].forEach(d=>{if(_editDayParity[d])_ppd[d]=_editDayParity[d];});
    pos.parityPerDay=Object.keys(_ppd).length?_ppd:undefined;
    const _spar={};[1,2,3,4,5].forEach(d=>{const sp=_editSlotParity[d]||{};if(_editDayKH[d]&&_spd[d]>=2)_spar[d]={kh:sp.kh||'',ksk:sp.ksk||''};});
    pos.slotParity=Object.keys(_spar).length?_spar:undefined;
    const newCount=Math.max(1,...Object.values(_spd));
    if(newCount>pos.slots.length){
      for(let i=pos.slots.length;i<newCount;i++)
        pos.slots.push({slotId:`s_${posId}_${i}_${Date.now()}`,requiredComps:[]});
    } else if(newCount<pos.slots.length){
      const removed=pos.slots.splice(newCount);
      removed.forEach(s=>{Object.keys(schedule).forEach(ds=>{if(schedule[ds])delete schedule[ds][s.slotId];});});
    }
  }
  autoSave();_editPosId=null;renderPositionsList();render();showToast('Position uppdaterad');
}
function addMinFillOverride(posId){
  const from=document.getElementById('editMFFrom').value;
  const to=document.getElementById('editMFTo').value;
  const min=parseInt(document.getElementById('editMFMin').value);
  if(!from||!to||from>to)return showToast('Ange giltiga datum (fr.o.m. ≤ t.o.m.)');
  if(!posMinFillOverrides[posId])posMinFillOverrides[posId]=[];
  posMinFillOverrides[posId].push({from,to,min});
  posMinFillOverrides[posId].sort((a,b)=>a.from.localeCompare(b.from));
  autoSave();_editPosId=posId;_editPosColorIdx=positions.find(p=>p.id===posId)?.colorIdx||0;renderPositionsList();
}
function removeMinFillOverride(posId,idx){
  if(posMinFillOverrides[posId])posMinFillOverrides[posId].splice(idx,1);
  autoSave();_editPosId=posId;_editPosColorIdx=positions.find(p=>p.id===posId)?.colorIdx||0;renderPositionsList();
}
function togglePosLocation(posId,day){
  const pos=positions.find(p=>p.id===posId);if(!pos)return;
  if(!pos.locationDays)pos.locationDays={};
  const cur=pos.locationDays[day];
  if(cur==='Karlshamn'){
    // KH → Neo
    pos.locationDays[day]='Neomott';
    if(pos.khDays)pos.khDays=pos.khDays.filter(d=>d!==day);
    if(pos.slotParity)delete pos.slotParity[day];
    if(pos.parityPerDay)delete pos.parityPerDay[day];
  } else if(cur==='Neomott'){
    // Neo → KSK
    delete pos.locationDays[day];
  } else {
    // KSK → KH
    pos.locationDays[day]='Karlshamn';
  }
  autoSave();renderPositionsList();render();
}
function toggleMandatory(posId,on){
  if(on)mandatoryPositions.add(posId);else mandatoryPositions.delete(posId);
  autoSave();renderPositionsList();render();
}
function togglePositionDay(posId,day,on){
  const pos=positions.find(p=>p.id===posId);if(!pos)return;
  if(!pos.days||!pos.days.length)pos.days=[1,2,3,4,5];
  if(on&&!pos.days.includes(day))pos.days.push(day);
  else if(!on)pos.days=pos.days.filter(d=>d!==day);
  pos.days.sort((a,b)=>a-b);
  autoSave();renderPositionsList();render();
}
function addPosition(){
  const name=document.getElementById('newPosName').value.trim();if(!name)return;
  const slotsPerDay={};
  [1,2,3,4,5].forEach(dow=>{slotsPerDay[dow]=Math.max(0,parseInt(document.getElementById(`newPosDay_${dow}`).value)||0);});
  const days=[1,2,3,4,5].filter(d=>slotsPerDay[d]>0);
  const slotsN=days.length?Math.max(...days.map(d=>slotsPerDay[d])):1;
  const khDays=[1,2,3,4,5].filter(dow=>slotsPerDay[dow]>0&&document.getElementById(`newPosKH_${dow}`)?.checked);
  const _ppd2={};[1,2,3,4,5].forEach(dow=>{const v=document.getElementById(`newPosParity_${dow}`)?.value||'';if(v&&slotsPerDay[dow]>0)_ppd2[dow]=v;});
  const parityPerDay=Object.keys(_ppd2).length?_ppd2:undefined;
  const section=document.getElementById('newPosSection').value||undefined;
  const weekParity=document.getElementById('newPosWeekParity').value||undefined;
  const posId='pos_'+Date.now(),colorIdx=positions.length%POS_COLORS.length;
  positions.push({id:posId,name,colorIdx,days,section,weekParity,slotsPerDay,khDays,parityPerDay,slots:Array.from({length:slotsN},(_,i)=>({slotId:`s_${posId}_${i}`,requiredComps:[]}))});
  document.getElementById('newPosName').value='';
  [1,2,3,4,5].forEach(dow=>{const el=document.getElementById(`newPosDay_${dow}`);if(el)el.value='1';const kh=document.getElementById(`newPosKH_${dow}`);if(kh)kh.checked=false;const ps=document.getElementById(`newPosParity_${dow}`);if(ps)ps.value='';});
  document.getElementById('newPosSection').value='';document.getElementById('newPosWeekParity').value='';
  renderPositionsList();render();showToast(`"${name}" tillagd`);
}
function removePosition(posId){
  const pos=positions.find(p=>p.id===posId);if(pos)pos.slots.forEach(s=>{Object.keys(schedule).forEach(ds=>{if(schedule[ds])delete schedule[ds][s.slotId];});});
  positions=positions.filter(p=>p.id!==posId);renderPositionsList();render();
}

function openRolesModal(){renderRoleTagsList();openModal('rolesModal');}
function renderRoleTagsList(){
  const el=document.getElementById('roleTagsList');
  el.innerHTML='';
  roleTags.forEach(r=>{
    const d=document.createElement('div');
    d.style.cssText='border:1px solid var(--border);border-radius:6px;padding:6px 8px;margin-bottom:6px';
    const defaults=roleDefaultPositions[r]||[];
    const posChecks=positions.map(p=>`<label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer"><input type="checkbox" data-role="${r}" data-pos="${p.id}" ${defaults.includes(p.id)?'checked':''}> ${p.name} <span style="font-size:9px;color:var(--text3)">(${p.id})</span></label>`).join('');
    d.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-weight:700;font-size:13px;flex:1">${r}</span>
      <button class="btn sm" onclick="saveRoleDefaultPositions('${r}')" style="font-size:10px">Spara standard</button>
      <button class="btn sm danger" onclick="removeRoleTag('${r}')">×</button>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:4px">Standardpositioner (tillåtna) för nya läkare med roll ${r}:</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px">${posChecks}</div>`;
    el.appendChild(d);
  });
}
function saveRoleDefaultPositions(role){
  const checked=[...document.querySelectorAll(`input[data-role="${role}"][data-pos]`)].filter(c=>c.checked).map(c=>c.dataset.pos);
  roleDefaultPositions[role]=checked;
  autoSave();
  showToast(`✅ Standardpositioner sparade för ${role}`);
}
function applyRoleDefaults(gridPrefix){
  const selectedRoles=getChecked(gridPrefix+'RoleGrid',roleTags);
  if(!selectedRoles.length)return;
  const allDefaults=new Set();
  selectedRoles.forEach(r=>(roleDefaultPositions[r]||[]).forEach(p=>allDefaults.add(p)));
  if(!allDefaults.size){showToast('Inga standardpositioner definierade för valda roller');return;}
  allDefaults.forEach(posId=>{
    const cb=document.getElementById(`${gridPrefix}AllowedGrid_${posId}`);
    if(cb)cb.checked=true;
  });
  allDefaults.forEach(posId=>{
    const cb=document.getElementById(`${gridPrefix}PrefGrid_${posId}`);
    if(cb)cb.checked=true;
  });
  showToast(`✅ Standardpositioner fyllda i`);
}
function addRoleTag(){const v=document.getElementById('newRoleInput').value.trim();if(v&&!roleTags.includes(v)){roleTags.push(v);document.getElementById('newRoleInput').value='';renderRoleTagsList();}}
function removeRoleTag(r){roleTags=roleTags.filter(x=>x!==r);renderRoleTagsList();}

function openAutoModal(){
  // Pre-fill clear period with schedule period (or current week)
  const cf=document.getElementById('clearFrom'),ct=document.getElementById('clearTo');
  if(!cf.value){
    cf.value=schedulePeriod.from||isoDate(getMonday(currentDate));
    ct.value=schedulePeriod.to||isoDate(addDays(getMonday(currentDate),4));
  }
  updateClearInfo();
  openModal('autoModal');
}
function updateClearInfo(){
  const f=document.getElementById('clearFrom').value,t=document.getElementById('clearTo').value;
  const el=document.getElementById('clearInfo');
  if(!f||!t){el.textContent='';return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){el.textContent='⚠ Ogiltigt intervall';return;}
  const nw=Math.round((td-fd)/(7*86400000))+1;
  el.textContent=`v.${weekNum(fd)}–v.${weekNum(td)} · ${nw} v.`;
}
function clearSchedule(all){
  if(all){
    if(!confirm('Töm hela schemat (alla dagpositioner)? Detta kan inte ångras.'))return;
    schedule={};scheduleHalfDay={};scheduleNotes={};
    closeModal('autoModal');render();showToast('Hela schemat tömt');
    return;
  }
  const f=document.getElementById('clearFrom').value,t=document.getElementById('clearTo').value;
  if(!f||!t){showToast('Ange från- och till-datum');return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){showToast('Ogiltigt datumintervall');return;}
  if(!confirm(`Rensa pass v.${weekNum(fd)}–v.${weekNum(td)}? Detta kan inte ångras.`))return;
  _scheduleSnapshot=JSON.stringify(schedule);
  // Iterate every day in range and clear schedule slots + notes
  let cur=new Date(f);
  while(cur<=td){
    const ds=isoDate(cur);
    if(schedule[ds])delete schedule[ds];
    if(scheduleHalfDay[ds])delete scheduleHalfDay[ds];
    if(scheduleNotes[ds])delete scheduleNotes[ds];
    cur=addDays(cur,1);
  }
  closeModal('autoModal');render();showToast(`Pass rensade v.${weekNum(fd)}–v.${weekNum(td)}`);
}

let _scheduleSnapshot=null;
function undoAutoDistribute(){
  if(!_scheduleSnapshot){showToast('Inget att ångra');return;}
  schedule=JSON.parse(_scheduleSnapshot);
  _scheduleSnapshot=null;
  render();showToast('Autofördelning ångrad');
}
function runAutoDistribute(){
  // Save snapshot for undo
  _scheduleSnapshot=JSON.stringify(schedule);
  // Collect all weeks to fill — period or just current week
  const allWeeks=periodWeeks()||[{mon:getMonday(currentDate),wn:weekNum(getMonday(currentDate)),yr:weekYear(getMonday(currentDate))}];
  const pc={};const posCnt={};doctors.forEach(d=>{pc[d.id]=0;});
  const djRoleRank=doc=>{const r=doc.roles||[];return r.includes('ST')||r.includes('Rand')?0:r.includes('Spec')?1:r.includes('ÖL')?2:3;};

  // Pre-count ALL existing assignments across the full schedule for long-term fairness
  Object.entries(schedule||{}).forEach(([ds,slotsMap])=>{
    Object.entries(slotsMap||{}).forEach(([slotId,docId])=>{
      if(!docId)return;
      const pos=positions.find(p=>p.slots.some(s=>s.slotId===slotId));
      if(!pos)return;
      if(!posCnt[pos.id]){posCnt[pos.id]={};doctors.forEach(doc=>{posCnt[pos.id][doc.id]=0;});}
      if(pc[docId]!==undefined){pc[docId]++;posCnt[pos.id][docId]=(posCnt[pos.id][docId]||0)+1;}
    });
  });

  if(document.getElementById('autoChkDJ').checked){
    ['pos_dj','pos_dbj'].forEach(posId=>{
      const pos=positions.find(p=>p.id===posId);if(!pos)return;
      const djSlots=pos.slots.filter(s=>!s.noBlock);
      allWeeks.forEach(({mon,wn,yr})=>{
        weekDays(mon,5).forEach(d=>{
          const ds=isoDate(d);if(isHoliday(ds))return;
          const minN=getMinFill(posId,ds);
          const djOpBoost=(doc)=>{const op=onskadPass[doc.id]&&onskadPass[doc.id][ds];return(op&&(!op.posId||op.posId===posId))?-1:0;};
          // Fill exactly minN slots (no more, no less if candidates exist)
          djSlots.slice(0,minN).forEach(slot=>{
            if(getSlot(slot.slotId,ds))return;
            const cands=doctors
              .filter(doc=>docCanFillSlot(doc,slot,ds))
              .sort((a,b)=>djOpBoost(a)-djOpBoost(b)||(posId==='pos_dj'?djRoleRank(a)-djRoleRank(b):0)||pc[a.id]-pc[b.id]);
            if(cands.length){setSlot(slot.slotId,ds,cands[0].id);pc[cands[0].id]++;}
          });
        });
      });
    });
  }

  if(document.getElementById('autoChkDag').checked){
    const dagPositions=positions.filter(p=>p.id!=='pos_dj'&&p.id!=='pos_dbj'&&p.id!=='pos_dagvard'&&p.id!=='pos_rond'&&p.section!=='dagvard');
    // Fill single-slot positions first (Avdelning, Neonatal) so they get week-consistent pick
    // then fill multi-slot positions (Mottagning) with whoever remains
    const isMand=p=>mandatoryPositions.has(p.id);
    const sorted=[
      ...dagPositions.filter(p=>isMand(p)&&p.slots.length===1),
      ...dagPositions.filter(p=>isMand(p)&&p.slots.length>1),
      ...dagPositions.filter(p=>!isMand(p)&&p.slots.length===1),
      ...dagPositions.filter(p=>!isMand(p)&&p.slots.length>1),
    ];
    sorted.forEach(pos=>{
      if(!posCnt[pos.id]){posCnt[pos.id]={};doctors.forEach(d=>{posCnt[pos.id][d.id]=0;});}
      const weekConsistent=pos.slots.length===1;
      const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
      // Sort: preferred doctors first; among preferred balance by per-position count; then by total count
      const ulRoleRank=doc=>{const r=doc.roles||[];return r.includes('ST')||r.includes('Rand')?0:1;};
      const isULPos=pos.slots.some(s=>s.roleReq==='UL');
      // Önskepass boost: doctor with exact position wish on this date gets top priority
      const opBoost=(doc,ds)=>{
        if(!ds)return 0;
        const op=onskadPass[doc.id]&&onskadPass[doc.id][ds];
        if(!op)return 0;
        return(!op.posId||op.posId===pos.id)?-1:0; // -1 = sort first
      };
      const prefSort=(a,b,ds=null)=>{
        const opDiff=opBoost(a,ds)-opBoost(b,ds);if(opDiff!==0)return opDiff;
        if(isULPos){const rDiff=ulRoleRank(a)-ulRoleRank(b);if(rDiff!==0)return rDiff;}
        const aP=(a.prefPositions||[]).includes(pos.id),bP=(b.prefPositions||[]).includes(pos.id);
        if(aP&&!bP)return -1;if(bP&&!aP)return 1;
        if(aP&&bP)return posCnt[pos.id][a.id]-posCnt[pos.id][b.id]||pc[a.id]-pc[b.id];
        return pc[a.id]-pc[b.id];
      };
      const assign=(slotId,ds,docId)=>{setSlot(slotId,ds,docId);pc[docId]++;posCnt[pos.id][docId]++;};
      pos.slots.forEach(slot=>{
        allWeeks.forEach(({mon,wn,yr})=>{
          if(!posDays.some(d=>posDayActiveThisWeek(pos,d,wn)))return;
          if(weekConsistent){
            const unfilledDays=weekDays(mon,5).filter(d=>posDays.includes(d.getDay())&&posDayActiveThisWeek(pos,d.getDay(),wn)&&!getSlot(slot.slotId,isoDate(d))&&!isHoliday(isoDate(d)));
            if(!unfilledDays.length)return;
            // Try to find one doctor who can cover all unfilled active days this week
            // For UL positions: try ST/Rand first, fall back to Spec only if no ST qualifies
            const fullWeekFilter=doc=>unfilledDays.every(d=>{const ds=isoDate(d);return docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds);});
            const fullWeekCands=doctors.filter(fullWeekFilter).sort(prefSort);
            if(fullWeekCands.length){
              unfilledDays.forEach(d=>{assign(slot.slotId,isoDate(d),fullWeekCands[0].id);});
            } else {
              // Fallback: maximize continuity — greedily assign the doctor covering most remaining days
              // For UL positions: role rank takes precedence over days covered
              let remaining=[...unfilledDays];
              while(remaining.length){
                const pool=doctors
                  .map(doc=>({doc,days:remaining.filter(d=>{const ds=isoDate(d);return docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds);})}))
                  .filter(x=>x.days.length>0)
                  .sort((a,b)=>(isULPos?(ulRoleRank(a.doc)-ulRoleRank(b.doc)):0)||b.days.length-a.days.length||prefSort(a.doc,b.doc));
                if(!pool.length)break;
                const{doc,days}=pool[0];
                days.forEach(d=>assign(slot.slotId,isoDate(d),doc.id));
                remaining=remaining.filter(d=>!days.includes(d));
              }
            }
          } else {
            weekDays(mon,5).forEach(d=>{
              if(!posDays.includes(d.getDay()))return;
              const ds=isoDate(d);if(getSlot(slot.slotId,ds))return;
              if(isHoliday(ds))return;
              const cands=doctors.filter(doc=>docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds)).sort((a,b)=>prefSort(a,b,ds));
              if(cands.length)assign(slot.slotId,ds,cands[0].id);
            });
          }
        });
      });
    });
  }
  {
    const chkRond=document.getElementById('autoChkRond').checked;
    const chkDvMott=document.getElementById('autoChkDvMott').checked;
    [positions.find(p=>p.id==='pos_rond'),positions.find(p=>p.id==='pos_dagvard')].filter(Boolean).forEach(dvPos=>{
      if(!posCnt[dvPos.id]){posCnt[dvPos.id]={};doctors.forEach(d=>{posCnt[dvPos.id][d.id]=0;});}
      const dvDays=dvPos.days&&dvPos.days.length?dvPos.days:[1,2,3,4,5];
      dvPos.slots.forEach(slot=>{
        const isNoBlock=!!slot.noBlock;
        if(isNoBlock&&!chkRond)return;
        if(!isNoBlock&&!chkDvMott)return;
        allWeeks.forEach(({mon,wn,yr})=>{
          if(!posActiveThisWeek(dvPos,wn))return;
          weekDays(mon,5).forEach(d=>{
            if(!dvDays.includes(d.getDay()))return;
            const ds=isoDate(d);
            if(isHoliday(ds))return;
            if(getSlot(slot.slotId,ds))return;
            const dbjDocId=getSlot('s_dbj',ds);
            const cands=doctors.filter(doc=>{
              if(!docCanFillSlot(doc,slot,ds))return false;
              if(docHasAnyLedighet(doc.id,ds))return false;
              if(docRestrictedOnDate(doc.id,ds))return false;
              if(isNoBlock)return true;
              return !docIsAssignedOnDate(doc.id,ds);
            }).sort((a,b)=>{
              // Rond: DBJ-läkaren prioriteras
              if(isNoBlock){
                const aIsDbj=a.id===dbjDocId,bIsDbj=b.id===dbjDocId;
                if(aIsDbj&&!bIsDbj)return -1;
                if(bIsDbj&&!aIsDbj)return 1;
              }
              return posCnt[dvPos.id][a.id]-posCnt[dvPos.id][b.id]||pc[a.id]-pc[b.id];
            });
            if(cands.length){
              setSlot(slot.slotId,ds,cands[0].id);
              if(!isNoBlock)pc[cands[0].id]++;
              posCnt[dvPos.id][cands[0].id]++;
            }
          });
        });
      });
    });
  }
  if(document.getElementById('autoChkHandl').checked){
    // Collect all weekdays in the period grouped by year-month
    const monthDays={};
    allWeeks.forEach(({mon})=>{
      for(let i=0;i<5;i++){
        const d=addDays(mon,i);
        const mk=`${d.getFullYear()}-${d.getMonth()}`;
        if(!monthDays[mk])monthDays[mk]=[];
        monthDays[mk].push(isoDate(d));
      }
    });
    let handlCount=0;
    handledningPairs.forEach(({stId,supervisorId})=>{
      Object.entries(monthDays).forEach(([mk,days])=>{
        // Skip if already scheduled this month
        const alreadyScheduled=days.some(ds=>Object.values(specialSlots[ds]||{}).some(v=>v.type==='handledning'&&v.docId===stId));
        if(alreadyScheduled)return;
        // Find first available day — try FM then EM
        // Returns '' (full-day), 'fm', 'em', or null (free) for a doctor's position assignment
        function assignedHalf(docId,ds){
          if(!schedule[ds])return null;
          for(const[sid,did]of Object.entries(schedule[ds])){if(did===docId)return getSlotHalf(sid,ds)||'';}
          return null;
        }
        for(const ds of days){
          if(docHasAnyLedighet(stId,ds)||docHasUtbildning(stId,ds)||docIsOffDay(stId,ds))continue;
          if(supervisorId&&(docHasAnyLedighet(supervisorId,ds)||docHasUtbildning(supervisorId,ds)))continue;
          if(docHasHandledningOn(stId,ds)||docHasHandledningOn(supervisorId,ds))continue;
          const stH=assignedHalf(stId,ds),supH=supervisorId?assignedHalf(supervisorId,ds):null;
          // Full-day assignment blocks both halves
          if(stH===''||supH==='')continue;
          // Pick first half where both are free
          const half=(!stH&&!supH)?'fm':(stH!=='fm'&&supH!=='fm')?'fm':(stH!=='em'&&supH!=='em')?'em':null;
          if(!half)continue;
          const key=`handledning_${stId}_${ds}`;
          if(!specialSlots[ds]||!specialSlots[ds][key]){
            setSpecial(ds,key,{type:'handledning',docId:stId,supervisorId:supervisorId||'',halfDay:half,note:''});
            scheduleHandledningMottagning(stId,supervisorId,ds,half);
            handlCount++;
            break;
          }
        }
      });
    });
    if(handlCount>0)showToast(`${handlCount} handledningssession${handlCount>1?'er':''} schemalagda`);
  }
  // Final pass: fill still-empty mandatory positions
  // Priority 1: unplaced eligible doctors; Priority 2: pull from mottagning
  {
    const mottPos=positions.find(p=>p.id==='pos_mott');
    const mandatoryNonMott=[...mandatoryPositions]
      .filter(id=>id!=='pos_mott')
      .map(id=>positions.find(p=>p.id===id))
      .filter(Boolean);
    allWeeks.forEach(({mon})=>{
      for(let i=0;i<5;i++){
        const d=addDays(mon,i),ds=isoDate(d);
        mandatoryNonMott.forEach(pos=>{
          const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
          if(!posDays.includes(d.getDay()))return;
          pos.slots.forEach(slot=>{
            if(slot.noBlock)return;
            if(getSlot(slot.slotId,ds))return;
            // Respect minFill ceiling — don't place more than required
            const minN=getMinFill(pos.id,ds);
            const filledSoFar=pos.slots.filter(s=>!s.noBlock&&getSlot(s.slotId,ds)).length;
            if(filledSoFar>=minN)return;
            // 1. Try unplaced eligible doctors first
            const unplaced=doctors.filter(doc=>
              !docIsAssignedOnDate(doc.id,ds)&&
              docAllowedOnPos(doc,pos)&&
              docMatchRole(doc,slot.roleReq)&&
              !docRestrictedOnDate(doc.id,ds)&&
              docHandledningHalfOn(doc.id,ds)===null
            ).sort((a,b)=>pos.id==='pos_dj'?djRoleRank(a)-djRoleRank(b):0);
            if(unplaced.length){setSlot(slot.slotId,ds,unplaced[0].id);return;}
            // 2. Fallback: pull from mottagning
            if(!mottPos)return;
            for(const ms of mottPos.slots){
              const mId=getSlot(ms.slotId,ds);if(!mId)continue;
              const doc=docById(mId);if(!doc)continue;
              if(!docAllowedOnPos(doc,pos))continue;
              if(!docMatchRole(doc,slot.roleReq))continue;
              if(docRestrictedOnDate(doc.id,ds))continue;
              if(docHandledningHalfOn(doc.id,ds)!==null)continue;
              setSlot(slot.slotId,ds,mId);
              setSlot(ms.slotId,ds,'');
              break;
            }
          });
        });
      }
    });
  }

  logChange(`Autofördelning kördes (${allWeeks.length} vecka${allWeeks.length!==1?'r':''})`);
  closeModal('autoModal');render();
  showToast(`Pass fördelade${allWeeks.length>1?' ('+allWeeks.length+' veckor)':''}`);
}

// ─── Ändringslogg ──────────────────────────────────────────────────────────
function openChangelogModal(){
  const el=document.getElementById('changelogContent');
  if(!changeLog.length){
    el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px 0">Inga ändringar registrerade i denna session.</div>';
  } else {
    el.innerHTML=changeLog.map(e=>{
      const d=new Date(e.ts);
      const time=d.toLocaleTimeString('sv',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const date=d.toLocaleDateString('sv',{month:'short',day:'numeric'});
      return`<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:10px;color:var(--text3);white-space:nowrap;padding-top:1px">${date} ${time}</span>
        <span style="font-size:12px;color:var(--text1)">${e.desc}</span>
      </div>`;
    }).join('');
  }
  openModal('changelogModal');
}

// ─── Placeringsstatistik → Excel ────────────────────────────────────────────
function openStatisticsModal(){
  const el=document.getElementById('statFrom'),et=document.getElementById('statTo');
  // Default: use schedule period if set, else current month
  if(schedulePeriod.from&&schedulePeriod.to){el.value=schedulePeriod.from;et.value=schedulePeriod.to;}
  else if(!el.value){
    const now=new Date();
    el.value=isoDate(new Date(now.getFullYear(),now.getMonth(),1));
    et.value=isoDate(new Date(now.getFullYear(),now.getMonth()+1,0));
  }
  updateStatPeriodInfo();
  openModal('statisticsModal');
}
function updateStatPeriodInfo(){
  const f=document.getElementById('statFrom').value,t=document.getElementById('statTo').value;
  const el=document.getElementById('statPeriodInfo');
  if(!f||!t){el.textContent='';return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){el.textContent='⚠ Slutdatum är före startdatum';el.style.color='var(--red)';return;}
  const wf=weekNum(fd),wt=weekNum(td);
  const nw=Math.round((td-fd)/(7*86400000))+1;
  el.style.color='var(--text2)';
  el.textContent=`v.${wf}–v.${wt} · ${nw} veckor`;
}
function exportStatisticsExcel(){
  const f=document.getElementById('statFrom').value,t=document.getElementById('statTo').value;
  if(!f||!t){showToast('Ange från- och till-datum');return;}
  const fd=new Date(f),td=new Date(t);
  if(td<fd){showToast('Slutdatum måste vara efter startdatum');return;}
  // Build weeks list from chosen period
  const weeks=[];let cur=getMonday(fd);while(cur<=td){weeks.push({mon:new Date(cur),wn:weekNum(cur),yr:weekYear(cur)});cur=addDays(cur,7);}
  if(!weeks.length)weeks.push({mon:getMonday(currentDate),wn:weekNum(getMonday(currentDate)),yr:weekYear(getMonday(currentDate))});
  const periodStr=`v${weekNum(fd)}-v${weekNum(td)}-${fd.getFullYear()}`;
  // Collect stats per doctor
  const roleOrder=['ÖL','BÖL','Spec','Konsult','ST','AT','Rand'];
  const sortedDocs=[...doctors].sort((a,b)=>{
    const ai=roleOrder.indexOf(a.roles[0]||''),bi=roleOrder.indexOf(b.roles[0]||'');
    if(ai!==bi)return(ai===-1?99:ai)-(bi===-1?99:bi);
    return a.name.localeCompare(b.name,'sv');
  });
  const stats=sortedDocs.map(doc=>{
    // Allt räknas från schedule (dag-för-dag), inte jourveckor/bjSchedule-summationer.
    // Dagjour/Dagbakjour ingår naturligt i per-positions-kolumnerna.
    // BJNV är en enkel per-dags-tilldelning och räknas separat.
    const s={name:doc.name,role:doc.roles[0]||'',posCounts:{},nj:0,hj:0,nbj:0,hbj:0,handl:0,ledighet:0,total:0};
    positions.forEach(pos=>{s.posCounts[pos.id]=0;});
    weeks.forEach(({mon,wn,yr})=>{
      weekDays(mon,7).forEach(d=>{   // alla 7 dagar inkl. helg
        const ds=isoDate(d),dow=d.getDay(),we=dow===0||dow===6;
        // Positionstillsättningar direkt från schedule
        positions.forEach(pos=>{pos.slots.forEach(slot=>{
          if(getSlot(slot.slotId,ds)===doc.id){s.posCounts[pos.id]++;s.total++;}
        });});
        if(!we&&docHasHandledningOn(doc.id,ds))s.handl++;
        if(!we&&(docHasAnyLedighet(doc.id,ds)||deltidOnDay(doc.id,ds)==='hel'))s.ledighet++;
        // NJ: nattjour — använd effektiv läkare (override eller JV-vecka)
        if([5,1,3].includes(dow)){if(getEffectiveJVDoc(ds,'JV1','night')===doc.id)s.nj++;}
        if([0,2,4].includes(dow)){if(getEffectiveJVDoc(ds,'JV2','night')===doc.id)s.nj++;}
        if(dow===6){if(getEffectiveJVDoc(ds,'NLO','night')===doc.id)s.nj++;}
        // HJ: helgjour dag — JV1 Sön, JV2 Lör
        if(dow===0){if(getEffectiveJVDoc(ds,'JV1','day')===doc.id)s.hj++;}
        if(dow===6){if(getEffectiveJVDoc(ds,'JV2','day')===doc.id)s.hj++;}
        // NBJ: nattbakjour — BJNV (Mån–Tor), BJFS (Fre+Sön natt), BJLÖ (Lör natt)
        if([1,2,3,4].includes(dow)&&getBJ(ds,'BJNV')===doc.id)s.nbj++;
        if([5,0].includes(dow)&&getBJ(ds,'BJFS')===doc.id)s.nbj++;
        if(dow===6&&getBJ(ds,'BJLO')===doc.id)s.nbj++;
        // HBJ: helgbakjour dag — BJFS (Sön dag), BJLÖ (Lör dag)
        if(dow===0&&getBJ(ds,'BJFS')===doc.id)s.hbj++;
        if(dow===6&&getBJ(ds,'BJLO')===doc.id)s.hbj++;
      });
    });
    return s;
  });
  // Build sheet data
  const posHeaders=positions.map(p=>p.name);
  const headers=['Läkare','Befattning',...posHeaders,'NJ','HJ','NBJ','HBJ','Handledning','Ledig/Deltid','Totalt pass'];
  const rows=[headers];
  stats.forEach(s=>{rows.push([s.name,s.role,...positions.map(p=>s.posCounts[p.id]||0),s.nj,s.hj,s.nbj,s.hbj,s.handl,s.ledighet,s.total]);});
  // Totals row
  const totRow=['TOTALT',''];
  const extraCols=6; // nj, hj, nbj, hbj, handl, ledighet
  positions.forEach((p,i)=>{totRow.push({f:`SUM(${XLSX.utils.encode_col(2+i)}2:${XLSX.utils.encode_col(2+i)}${1+stats.length})`});});
  for(let i=0;i<extraCols;i++){const col=2+positions.length+i;totRow.push({f:`SUM(${XLSX.utils.encode_col(col)}2:${XLSX.utils.encode_col(col)}${1+stats.length})`});}
  const totCol=2+positions.length+extraCols;
  totRow.push({f:`SUM(${XLSX.utils.encode_col(totCol)}2:${XLSX.utils.encode_col(totCol)}${1+stats.length})`});
  rows.push(totRow);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  const wCols=[{wch:26},{wch:10},...positions.map(()=>({wch:13})),{wch:7},{wch:7},{wch:7},{wch:7},{wch:8},{wch:12},{wch:13},{wch:12}];
  ws['!cols']=wCols;
  // Freeze header row
  ws['!freeze']={xSplit:0,ySplit:1,topLeftCell:'A2',activeCell:'A2',sqref:'A2'};
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Statistik');
  XLSX.writeFile(wb,`statistik-barnkliniken-${periodStr}.xlsx`);
  closeModal('statisticsModal');
  showToast('Statistik exporterad till Excel');
}

// ─── Personschema modal ──────────────────────────────────────────────────────
function openPersonScheduleModal(preDocId){
  const sel=document.getElementById('personScheduleDocSelect');
  sel.innerHTML='<option value="">— Välj läkare —</option>';
  [...doctors].sort((a,b)=>a.name.localeCompare(b.name,'sv')).forEach(doc=>{
    const opt=document.createElement('option');
    opt.value=doc.id;opt.textContent=doc.name+(doc.roles[0]?` (${doc.roles[0]})`:'');
    sel.appendChild(opt);
  });
  // In doctor mode, lock to the active doctor
  if(IS_DOCTOR_MODE&&ACTIVE_DOCTOR_ID){
    sel.value=ACTIVE_DOCTOR_ID;
    sel.disabled=true;
  } else {
    sel.disabled=false;
    if(preDocId)sel.value=preDocId;
  }
  renderPersonSchedule();
  openModal('personScheduleModal');
}
function renderPersonSchedule(){
  const docId=document.getElementById('personScheduleDocSelect').value;
  const content=document.getElementById('personScheduleContent');
  if(!docId){content.innerHTML='<p style="color:var(--text2);padding:16px">Välj en läkare ovan.</p>';return;}
  const doc=docById(docId);if(!doc)return;
  const weeks=periodWeeks()||[{mon:getMonday(currentDate),wn:weekNum(getMonday(currentDate)),yr:weekYear(getMonday(currentDate))}];
  const dayLabels=['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  let html=`<table style="width:100%;border-collapse:collapse;font-size:11px">
<thead><tr>
  <th style="padding:5px 8px;text-align:left;background:var(--bg2);border:1px solid var(--border);font-size:10px;color:var(--text2)">Vecka</th>`;
  dayLabels.forEach((l,i)=>{const we=i>=5;html+=`<th style="padding:5px;text-align:center;background:${we?'var(--bg2)':'var(--surface)'};border:1px solid var(--border);font-size:10px;color:${we?'var(--text3)':'var(--text1)'}${we?';min-width:48px':';min-width:80px'}">${l}</th>`;});
  html+=`</tr></thead><tbody>`;
  weeks.forEach(({mon,wn,yr})=>{
    // JV för denna och föregående vecka (för att hantera spillveckor)
    const prevMon=addDays(mon,-7),prevWn=weekNum(prevMon),prevYr=weekYear(prevMon);
    const jvCur=getJV(wn,yr),jvPrev=getJV(prevWn,prevYr);
    html+=`<tr><td style="padding:5px 8px;border:1px solid var(--border);font-weight:700;font-size:11px;color:var(--text2);white-space:nowrap;background:var(--bg2)">v.${wn}</td>`;
    for(let di=0;di<7;di++){
      const d=addDays(mon,di),ds=isoDate(d),dow=d.getDay(),we=di>=5;
      let lines=[],bg='transparent';

      // ── Primärjour: NJ = nattpass, HJ = dagpass ──
      // JV1: NJ fre(anchor), NJ mån(spill), NJ ons(spill); HJ sön(anchor)
      const isJV1Night=(dow===5&&jvCur.JV1===docId)||(dow===1&&jvPrev.JV1===docId)||(dow===3&&jvPrev.JV1===docId);
      const isJV1Day  =(dow===0&&jvCur.JV1===docId);
      // JV2: NJ sön(anchor), NJ tis(spill), NJ tor(spill); HJ lör(anchor)
      const isJV2Night=(dow===0&&jvCur.JV2===docId)||(dow===2&&jvPrev.JV2===docId)||(dow===4&&jvPrev.JV2===docId);
      const isJV2Day  =(dow===6&&jvCur.JV2===docId);
      // NLÖ: NJ lör(anchor)
      const isNLO=dow===6&&jvCur.NLO===docId;

      if(isJV1Night){lines.push(`<span style="color:var(--jv1);font-weight:700">NJ</span>`);bg='var(--jv1-light)';}
      if(isJV1Day)  {lines.push(`<span style="color:var(--jv1);font-weight:700">HJ</span>`);bg='var(--jv1-light)';}
      if(isJV2Night){lines.push(`<span style="color:var(--jv2);font-weight:700">NJ</span>`);bg='var(--jv2-light)';}
      if(isJV2Day)  {lines.push(`<span style="color:var(--jv2);font-weight:700">HJ</span>`);bg='var(--jv2-light)';}
      if(isNLO)     {lines.push(`<span style="color:var(--nlo);font-weight:700">NJ</span>`);bg='var(--nlo-light)';}

      // ── Bakjour: NBJ = nattbakjour, HBJ = helgbakjour ──
      // BJFS: NBJ fredagnatt + HBJ söndagdag — ankardatum=fredag
      const bjfsFriDs=dow===5?ds:(dow===0?isoDate(addDays(d,-2)):null);
      if(dow===5&&getBJ(ds,'BJFS')===docId){lines.push(`<span style="color:var(--bjfs);font-weight:700">NBJ</span>`);if(bg==='transparent')bg='var(--bjfs-light)';}
      if(dow===0&&bjfsFriDs&&getBJ(bjfsFriDs,'BJFS')===docId){lines.push(`<span style="color:var(--bjfs);font-weight:700">HBJ</span>`);if(bg==='transparent')bg='var(--bjfs-light)';}
      // BJLÖ: HBJ lördagdag+natt — ankardatum=lördag
      if(dow===6&&getBJ(ds,'BJLO')===docId){lines.push(`<span style="color:var(--bjlo);font-weight:700">HBJ</span>`);if(bg==='transparent')bg='var(--bjlo-light)';}
      // BJNV: NBJ vardag natt
      if(!we&&getBJ(ds,'BJNV')===docId){lines.push(`<span style="color:var(--bjnv);font-weight:700">NBJ</span>`);if(bg==='transparent')bg='var(--bjnv-light)';}
      // HJ: primärjour dag på röd vardag
      if(!we&&getBJ(ds,'HJ')===docId){lines.push(`<span style="color:var(--hd);font-weight:700">HJ</span>`);if(bg==='transparent')bg='var(--hd-light)';}
      // HBJ: bakjour dag+natt på röd vardag
      if(!we&&getBJ(ds,'HBJ')===docId){lines.push(`<span style="color:var(--hd);font-weight:700">HBJ</span>`);if(bg==='transparent')bg='var(--hd-light)';}
      // Övrigt — visas bara om läkaren är explicit listad på aktiviteten
      ovrigtForDate(ds).forEach(n=>{
        const ids=n.docIds&&n.docIds.length?n.docIds:n.docId?[n.docId]:[];
        if(!ids.includes(docId))return;
        lines.push(`<span style="color:var(--text2);font-size:9px">${n.text}</span>`);
        if(bg==='transparent')bg='var(--bg2)';
      });

      // ── Dagpass (vardagar) ──
      if(!we){
        if(docHasForaldraledig(docId,ds)){
          lines.push(`<span style="color:var(--fl);font-weight:700">FL</span>`);
          if(bg==='transparent')bg='var(--fl-light)';
        } else if(docHasSjukskrivning(docId,ds)){
          const _se=(sjukskrivning[ds]||[]).find(x=>x.docId===docId);
          const _st=_se?.type||'sjuk';
          lines.push(`<span style="color:${_st==='vab'?'var(--vab)':'var(--sjuk)'};font-weight:700">${_st==='vab'?'VAB':'Sjuk'}</span>`);
          if(bg==='transparent')bg=_st==='vab'?'var(--vab-light)':'var(--sjuk-light)';
        } else if(docHasAnyLedighet(docId,ds)){lines.push(`<span style="color:#92400e">Ledig</span>`);if(bg==='transparent')bg='#fef3c7';}
        else if(deltidOnDay(docId,ds)==='hel'){lines.push(`<span style="color:var(--deltid)">Deltid</span>`);if(bg==='transparent')bg='var(--deltid-light)';}
        else if(docIsJourledigt(docId,ds)){lines.push(`<span style="color:var(--jourledigt)">Jourledig</span>`);}
        else{
          // Show all assigned positions (noBlock slots like Rond can coexist with other positions)
          const allAssigned=positions.flatMap(pos=>pos.slots.filter(s=>getSlot(s.slotId,ds)===docId).map(slot=>({pos,slot})));
          allAssigned.forEach(({pos:aPos,slot})=>{
            const isNoBlock=!!slot.noBlock;
            const h=getSlotHalf(slot.slotId,ds),dt=deltidOnDay(docId,ds);
            const effHalf=isNoBlock?null:h||(dt==='fm'?'em':dt==='em'?'fm':null);
            const halfStr=effHalf?` <span style="font-size:9px;opacity:.8">${effHalf.toUpperCase()}</span>`:'';
            const slotLoc2=(slotLocations[ds]&&slotLocations[ds][slot.slotId])||null;
            const posLoc2=(aPos.locationDays||{})[dow]||'Karlskrona';
            const effLoc=slotLoc2||posLoc2;
            const locStr=effLoc==='Karlshamn'?` <span style="color:#1d4ed8;font-weight:700;font-size:9px">KH</span>`:'';
            const label=slot.slotName||aPos.name;
            const noteStr=isNoBlock?'':getSlotNote(slot.slotId,ds);
            const noteSpan=noteStr?` <span style="font-size:8px;color:#92400e;font-style:italic">${noteStr}</span>`:'';
            lines.push(`<span${isNoBlock?' style="opacity:.7;font-size:9px"':''}>${label}${halfStr}${locStr}${noteSpan}</span>`);
            if(bg==='transparent'&&!isNoBlock){const[pbg]=posColor(aPos.colorIdx||0);bg=pbg;}
          });
          if(docHasHandledningOn(docId,ds)){const h=docHandledningHalfOn(docId,ds);lines.push(`<span>Handl.${h?' '+h.toUpperCase():''}</span>`);}
          const dt2=deltidOnDay(docId,ds);
          if((dt2==='fm'||dt2==='em')&&lines.every(l=>l.includes('NJ')||l.includes('HJ'))){
            lines.push(`<span style="color:var(--deltid);font-size:9px">Deltid ${dt2}</span>`);
            if(bg==='transparent')bg='var(--deltid-light)';
          }
        }
      }

      const weBg=we?(bg!=='transparent'?bg:'var(--bg2)'):(bg||'transparent');
      const empty=we?'':'—';
      html+=`<td style="padding:4px 5px;border:1px solid var(--border);text-align:center;background:${weBg};vertical-align:middle;font-size:10px">`;
      html+=lines.length?lines.join('<br>'):empty;
      html+=`</td>`;
    }
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  content.innerHTML=html;
}

// ═══════════════════════════════════════════════
// JOURÄKNESALDO
// ═══════════════════════════════════════════════
function openJoursaldoModal(){
  const fromDs=schedulePeriod.from||null,toDs=schedulePeriod.to||null;
  const cnt={};
  const _svA=(a,b)=>a.name.localeCompare(b.name,'sv');
  doctors.forEach(d=>{cnt[d.id]={JV1:0,JV2:0,NLO:0,BJFS:0,BJLO:0,BJNV:0,HJ:0,HBJ:0,NJ:0,Helg:0};});
  Object.entries(jourveckor).forEach(([k,v])=>{
    const parts=k.split('-W');const wn2=parseInt(parts[1]),yr2=parseInt(parts[0]);
    const wMon=isoDate(isoWeekMon(wn2,yr2));
    if(fromDs&&wMon<fromDs)return;if(toDs&&wMon>toDs)return;
    ['JV1','JV2','NLO'].forEach(key=>{if(v[key]&&cnt[v[key]])cnt[v[key]][key]++;});
  });
  Object.entries(bjSchedule).forEach(([ds,dayBJ])=>{
    if(fromDs&&ds<fromDs)return;if(toDs&&ds>toDs)return;
    ['BJFS','BJLO','BJNV','HJ','HBJ'].forEach(t=>{const id=dayBJ[t];if(id&&cnt[id])cnt[id][t]++;});
  });

  // derivedKeys: column keys that are computed totals (shown bolder, used for Tot/Diff)
  function makeSection(title,group,colLabels,colKeys,colColors,totFn,derivedKeys=[]){
    if(!group.length)return'';
    group.forEach(d=>{cnt[d.id]._grpTot=totFn(cnt[d.id]);});
    const grpAvg=group.reduce((s,d)=>s+cnt[d.id]._grpTot,0)/group.length;
    let h=`<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text3);padding:14px 0 4px">${title}</div>`;
    h+=`<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr>
        <th style="text-align:left;padding:4px 8px;border-bottom:2px solid var(--border);white-space:nowrap">Läkare</th>
        ${colLabels.map((c,i)=>{
          const isDerived=derivedKeys.includes(colKeys[i]);
          const sep=isDerived&&colKeys[i]===derivedKeys[0]?'border-left:2px solid var(--border);':'';
          return`<th style="text-align:center;padding:4px 5px;border-bottom:2px solid var(--border);color:${colColors[i]};font-size:10px;${sep}${isDerived?'font-weight:800;':''}" title="${isDerived?'Faktiska pass (inkl. overrides och delade veckor)':''}">${c}</th>`;
        }).join('')}
        <th style="text-align:center;padding:4px 6px;border-bottom:2px solid var(--border);border-left:2px solid var(--border)">Tot</th>
        <th style="text-align:center;padding:4px 6px;border-bottom:2px solid var(--border);color:var(--text2)">Diff</th>
      </tr></thead><tbody>`;
    group.sort(_svA).forEach((d,i)=>{
      const c=cnt[d.id],tot=c._grpTot,diff=tot-grpAvg;
      const dStr=(diff>=0?'+':'')+diff.toFixed(1);
      const dc=Math.abs(diff)>1.5?diff>0?'var(--red)':'var(--accent)':'var(--text2)';
      h+=`<tr style="background:${i%2?'var(--bg2)':'var(--surface)'}">
        <td style="padding:3px 8px;font-weight:600;white-space:nowrap">${d.name}</td>
        ${colKeys.map((k,ki)=>{
          const isDerived=derivedKeys.includes(k);
          const sep=isDerived&&k===derivedKeys[0]?'border-left:2px solid var(--border);':'';
          return`<td style="text-align:center;padding:3px 5px;${sep}${isDerived?'font-weight:700;':''}color:${c[k]?'var(--text1)':'var(--text3)'}">${c[k]||'—'}</td>`;
        }).join('')}
        <td style="text-align:center;padding:3px 6px;font-weight:700;border-left:2px solid var(--border)">${tot}</td>
        <td style="text-align:center;padding:3px 6px;font-weight:600;color:${dc}">${dStr}</td>
      </tr>`;
    });
    h+=`<tr style="border-top:1px solid var(--border)">
      <td style="padding:3px 8px;font-size:10px;color:var(--text3);font-style:italic">Snitt (${group.length} läk.)</td>
      ${colKeys.map(()=>`<td></td>`).join('')}
      <td style="text-align:center;padding:3px 6px;font-size:10px;color:var(--text3);border-left:2px solid var(--border)">${grpAvg.toFixed(1)}</td>
      <td></td>
    </tr>`;
    h+=`</tbody></table>`;
    return h;
  }

  // Count actual NJ / Helg by iterating every date (handles overrides + partial/extra weeks)
  // Derive scan range from period or from stored data
  let scanFrom=fromDs,scanTo=toDs;
  if(!scanFrom||!scanTo){
    const allDs=[
      ...Object.keys(jourveckor).map(k=>{const[yr,w]=k.split('-W');return isoDate(isoWeekMon(parseInt(w),parseInt(yr)));}),
      ...Object.keys(bjSchedule),
      ...Object.keys(nightOverrides),
    ].sort();
    if(allDs.length){
      if(!scanFrom)scanFrom=allDs[0];
      if(!scanTo)scanTo=isoDate(addDays(new Date(allDs[allDs.length-1]+'T12:00:00'),6));
    }
  }
  if(scanFrom&&scanTo){
    let cur=new Date(scanFrom+'T12:00:00');
    const end=new Date(scanTo+'T12:00:00');
    while(cur<=end){
      const ds=isoDate(cur),dow=cur.getDay();
      // JV1 nights: Fre(5), Mån(1), Ons(3)
      if([5,1,3].includes(dow)){const id=getEffectiveJVDoc(ds,'JV1','night');if(id&&cnt[id])cnt[id].NJ++;}
      // JV1 helgdag: Sön(0) dag
      if(dow===0){const id=getEffectiveJVDoc(ds,'JV1','day');if(id&&cnt[id])cnt[id].Helg++;}
      // JV2 nights: Sön(0), Tis(2), Tor(4)
      if([0,2,4].includes(dow)){const id=getEffectiveJVDoc(ds,'JV2','night');if(id&&cnt[id])cnt[id].NJ++;}
      // JV2 helgdag: Lör(6) dag
      if(dow===6){const id=getEffectiveJVDoc(ds,'JV2','day');if(id&&cnt[id])cnt[id].Helg++;}
      // NLÖ night: Lör(6)
      if(dow===6){const id=getEffectiveJVDoc(ds,'NLO','night');if(id&&cnt[id])cnt[id].NJ++;}
      cur=addDays(cur,1);
    }
    // HJ röd dag primärjour ingår i Helg
    doctors.forEach(d=>{if(cnt[d.id])cnt[d.id].Helg+=cnt[d.id].HJ;});
  } else {
    // Inga data alls – grov uppskattning från veckor
    doctors.forEach(d=>{const c=cnt[d.id];c.NJ=c.JV1*3+c.JV2*3+c.NLO;c.Helg=c.JV1+c.JV2+c.HJ;});
  }

  const pjDocs=doctors.filter(d=>(d.jv||[]).length>0);
  const bjDocs=doctors.filter(d=>(d.bj||[]).length>0);

  // Primärjour: NJ = nattjourtillfällen, HJ = helgjourtillfällen (inkl röd dag)
  // Bakjour: BJFS räknas som 2 nätter (fre+sön), BJLÖ=1, BJNV=1, HBJ=1
  const pjHtml=makeSection('Primärjour',pjDocs,
    ['JV1','JV2','NLÖ','NJ','HJ'],
    ['JV1','JV2','NLO','NJ','Helg'],
    ['var(--jv1)','var(--jv2)','var(--nlo)','#6b7280','#6b7280'],
    c=>c.NJ+c.Helg, ['NJ','Helg']);
  const bjHtml=makeSection('Bakjour',bjDocs,
    ['BJFS','BJLÖ','BJNV','HBJ'],['BJFS','BJLO','BJNV','HBJ'],
    ['var(--bjfs)','var(--bjlo)','var(--bjnv)','var(--bjhd)'],
    c=>c.BJFS*2+c.BJLO+c.BJNV+c.HBJ, []);

  const bjNote=bjDocs.length?`<div style="font-size:10px;color:var(--text3);padding:2px 0 10px">* Tot = BJFS×2 + BJLÖ + BJNV + HBJ (BJFS väger 2 då det ger fre- och sönnatt)</div>`:'';
  document.getElementById('joursaldoContent').innerHTML=`<div style="overflow-x:auto">${pjHtml}${bjHtml}${bjNote}</div>`;
  document.getElementById('joursaldoPeriod').textContent=fromDs&&toDs?`${fromDs} – ${toDs}`:'Alla lagrade perioder';
  openModal('joursaldoModal');
}

function exportSchema(){
  const mon=getMonday(currentDate),days=weekDays(mon,5),wn=weekNum(mon),yr=weekYear(mon),W=20;
  let lines=[`SCHEMA BARNKLINIKEN - VECKA ${wn}\n`,'Position'.padEnd(W)+days.map(d=>`${svDay(d)} ${d.getDate()}`.padEnd(W)).join(''),'_'.repeat(W*6)];
  positions.forEach(pos=>{pos.slots.forEach(slot=>{const rStr=slot.roleReq?` [${slot.roleReq}]`:'';lines.push((pos.name+rStr).padEnd(W)+days.map(d=>{const v=getSlot(slot.slotId,isoDate(d)),doc=v?docById(v):null;return(doc?`${doc.name.split(' ')[0]} (${doc.roles[0]})`:'-').padEnd(W);}).join(''));});});
  lines.push('');const jv=getJV(wn,yr);
  ['JV1','JV2','NLO'].forEach(k=>{const doc=jv[k]?docById(jv[k]):null;lines.push(`${k==='NLO'?'NLO':k}: ${doc?doc.name:'--'}`);});
  const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`schema-barnkliniken-v${wn}.txt`;a.click();URL.revokeObjectURL(url);showToast('Exporterat');
}

// ── GitHub-synk ──────────────────────────────────────────────
const GH_LS_KEY='barnkliniken_github';

function openGithubModal(){
  const cfg=_ghCfg();
  document.getElementById('ghPatInput').value=cfg.pat||'';
  document.getElementById('ghRepoInput').value=cfg.repo||'arefalk/schema';
  document.getElementById('ghPathInput').value=cfg.path||'schema.json';
  document.getElementById('ghStatus').style.display='none';
  _updateGhBtn();
  openModal('githubModal');
}

function _ghCfg(){
  try{return JSON.parse(localStorage.getItem(GH_LS_KEY)||'{}');}catch(e){return {};}
}

function _updateGhBtn(){
  const btn=document.getElementById('githubSyncBtn');
  if(!btn)return;
  const cfg=_ghCfg();
  btn.title=cfg.pat?`GitHub-synk aktiv (${cfg.repo} → ${cfg.path})`:'Inställningar för GitHub-synk';
  btn.style.color=cfg.pat?'var(--accent)':'';
}

function saveGithubSettings(){
  const pat=document.getElementById('ghPatInput').value.trim();
  const repo=document.getElementById('ghRepoInput').value.trim()||'arefalk/schema';
  const path=document.getElementById('ghPathInput').value.trim()||'schema.json';
  if(!pat){_ghStatus('Ange en PAT','error');return;}
  localStorage.setItem(GH_LS_KEY,JSON.stringify({pat,repo,path}));
  _updateGhBtn();
  // Testa direkt med en liten push
  _pushToGitHub(JSON.stringify({test:true}),repo,path,pat,true);
}

function clearGithubSettings(){
  localStorage.removeItem(GH_LS_KEY);
  document.getElementById('ghPatInput').value='';
  _updateGhBtn();
  _ghStatus('Inställningar borttagna','info');
}

function _ghStatus(msg,type){
  const el=document.getElementById('ghStatus');
  if(!el)return;
  el.textContent=msg;
  el.style.display='block';
  el.style.background=type==='error'?'#fce8e6':type==='ok'?'#e8f4e4':'#e8f0fa';
  el.style.color=type==='error'?'#c0392b':type==='ok'?'#2d6a2d':'#1a3a6a';
}

async function _pushToGitHub(jsonStr,repo,path,pat,isTest){
  const base='https://api.github.com';
  const headers={'Authorization':'Bearer '+pat,'Content-Type':'application/json'};
  // Hämta befintlig SHA (krävs för att uppdatera)
  let sha=null;
  try{
    const r=await fetch(`${base}/repos/${repo}/contents/${path}`,{headers});
    if(r.ok){const d=await r.json();sha=d.sha;}
    else if(r.status!==404){const d=await r.json();_ghStatus('Fel: '+(d.message||r.status),'error');return;}
  }catch(e){_ghStatus('Nätverksfel: '+e.message,'error');return;}
  // Pusha
  const body={message:'Schema uppdaterat '+new Date().toISOString().slice(0,10),content:btoa(unescape(encodeURIComponent(jsonStr)))};
  if(sha)body.sha=sha;
  if(isTest)body.content=btoa('{}'); // testa med tom fil
  try{
    const r=await fetch(`${base}/repos/${repo}/contents/${path}`,{method:'PUT',headers,body:JSON.stringify(body)});
    const d=await r.json();
    if(r.ok){
      if(isTest){_ghStatus('✓ Anslutning OK — inställningar sparade','ok');}
      else{showToast('Synkat till GitHub');}
    } else {
      _ghStatus('GitHub-fel: '+(d.message||r.status),'error');
    }
  }catch(e){_ghStatus('Nätverksfel: '+e.message,'error');}
}

function pushCurrentDataToGitHub(jsonStr){
  const cfg=_ghCfg();
  if(!cfg.pat)return;
  _pushToGitHub(jsonStr,cfg.repo,cfg.path,cfg.pat,false);
}

function saveData(){
  const data={
    version:2,savedAt:new Date().toISOString(),
    roleTags,positions,doctors,schedule,scheduleHalfDay,scheduleNotes,slotLocations,
    jourveckor,nightOverrides,bjSchedule,
    ledighetRequests,ledighetVeckor,specialSlots,bvcSchedule,
    handledningPairs,mandatoryPositions:[...mandatoryPositions],schedulePeriod,
    utbildningDagar,utbildningVeckor,jourfriOnskad,deltidDagar,deltidVeckor,
    dagvardEntries,auskultationEntries,ovrigtNotes,ovrigtRecurring,sjukskrivning,foraldraledig,
    onskadPass,specialRecurring,onskadJourvecka,
    ledighetOnskemal,ledighetVeckorOnskemal,utbildningOnskemal,jourfriOnskemal,foraldraledigenOnskemal,
    posMinFillOverrides
  };
  const jsonStr=JSON.stringify(data,null,2);
  const blob=new Blob([jsonStr],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='barnkliniken-schema-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();URL.revokeObjectURL(url);
  pushCurrentDataToGitHub(jsonStr);
  showToast('Schema sparat');
}
function loadData(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(data.version!==1&&data.version!==2)throw new Error('Okant format');
      if(data.roleTags)roleTags=data.roleTags;
      // compTags removed in v2
      if(data.positions)positions=data.positions;
      if(data.doctors)doctors=data.doctors;
      if(data.schedule)schedule=data.schedule;
      if(data.scheduleHalfDay)scheduleHalfDay=data.scheduleHalfDay;
      if(data.scheduleNotes)scheduleNotes=data.scheduleNotes;
      if(data.jourveckor)jourveckor=data.jourveckor;
      if(data.bjSchedule)bjSchedule=data.bjSchedule;
      if(data.ledighetRequests)ledighetRequests=data.ledighetRequests;
      if(data.ledighetVeckor)ledighetVeckor=data.ledighetVeckor;
      if(data.specialSlots)specialSlots=data.specialSlots;
      if(data.handledningPairs)handledningPairs=data.handledningPairs;
      if(data.mandatoryPositions)mandatoryPositions=new Set(data.mandatoryPositions);
      if(data.schedulePeriod)schedulePeriod=data.schedulePeriod;
      if(data.utbildningDagar)utbildningDagar=data.utbildningDagar;
      if(data.utbildningVeckor)utbildningVeckor=data.utbildningVeckor;
      if(data.jourfriOnskad)jourfriOnskad=data.jourfriOnskad;
      if(data.deltidDagar)deltidDagar=data.deltidDagar;
      if(data.deltidVeckor)deltidVeckor=data.deltidVeckor;
      if(data.dagvardEntries)dagvardEntries=data.dagvardEntries;
      if(data.auskultationEntries)auskultationEntries=data.auskultationEntries;
      if(data.ovrigtNotes)ovrigtNotes=data.ovrigtNotes;
      if(data.ovrigtRecurring)ovrigtRecurring=data.ovrigtRecurring;
      if(data.sjukskrivning)sjukskrivning=data.sjukskrivning;
      if(data.foraldraledig)foraldraledig=data.foraldraledig;
      if(data.onskadPass)onskadPass=data.onskadPass;
      if(data.specialRecurring)specialRecurring=data.specialRecurring;
      if(data.onskadJourvecka)onskadJourvecka=data.onskadJourvecka;
      if(data.nightOverrides)nightOverrides=data.nightOverrides;
      if(data.slotLocations)slotLocations=data.slotLocations;
      if(data.posMinFillOverrides)posMinFillOverrides=data.posMinFillOverrides;
      if(data.ledighetOnskemal)ledighetOnskemal=data.ledighetOnskemal;
      if(data.ledighetVeckorOnskemal)ledighetVeckorOnskemal=data.ledighetVeckorOnskemal;
      if(data.utbildningOnskemal)utbildningOnskemal=data.utbildningOnskemal;
      if(data.jourfriOnskemal)jourfriOnskemal=data.jourfriOnskemal;
      if(data.foraldraledigenOnskemal)foraldraledigenOnskemal=data.foraldraledigenOnskemal;
      // Migrations for imported data — same as loadFromLocalStorage
      const _fmFri2=['pos_mott','pos_avd_ol','pos_avd_ul','pos_neo_ol','pos_neo_ul','pos_dagvard','pos_rond','pos_dbj'];
      positions.forEach(p=>{if(_fmFri2.includes(p.id)&&!(p.fmOnlyDow&&p.fmOnlyDow.length))p.fmOnlyDow=[5];});
      const djPos2=positions.find(p=>p.id==='pos_dj');
      if(djPos2){
        djPos2.minFill=djPos2.minFill??1;
        if(!djPos2.slots.find(s=>s.slotId==='s_dj'))djPos2.slots.unshift({slotId:'s_dj',slotName:'Dagjour 1',roleReq:'',requiredComps:[]});
        else{const s=djPos2.slots.find(s=>s.slotId==='s_dj');if(!s.slotName)s.slotName='Dagjour 1';}
        if(!djPos2.slots.find(s=>s.slotId==='s_dj_2'))djPos2.slots.push({slotId:'s_dj_2',slotName:'Dagjour 2',roleReq:'',requiredComps:[]});
        else{const s=djPos2.slots.find(s=>s.slotId==='s_dj_2');if(!s.slotName)s.slotName='Dagjour 2';}
      }
      if(!positions.find(p=>p.id==='pos_kj')){
        const djIdx2=positions.findIndex(p=>p.id==='pos_dbj');
        positions.splice(djIdx2+1,0,{id:'pos_kj',name:'Kvällsjour',colorIdx:4,slots:[{slotId:'s_kj',roleReq:'',requiredComps:[]}]});
      }
      if(!positions.find(p=>p.id==='pos_bvc')){
        positions.push({id:'pos_bvc',name:'BVC',colorIdx:7,days:[4],slots:[{slotId:'s_bvc_1',roleReq:'',requiredComps:[]}]});
      }
      if(data.bvcSchedule&&Object.keys(data.bvcSchedule).length){
        Object.entries(data.bvcSchedule).forEach(([ds,docId])=>{if(docId&&!getSlot('s_bvc_1',ds))setSlot('s_bvc_1',ds,docId);});
        bvcSchedule={};
      }
      autoSave();render();showToast('Schema laddat');
    }catch(err){alert('Kunde inte ladda filen.\n'+err.message);}
    event.target.value='';
  };
  reader.readAsText(file);
}

// ── FLYTTA JOURLEDIGT ──
function _jourledigDefaultDs(key){
  const idx=key.indexOf('_');
  const type=key.slice(0,idx),anchorDs=key.slice(idx+1);
  // BJFS: jourledigt 7 days after anchor Friday; BJLO+NLO: 2 days after anchor Saturday
  return isoDate(addDays(new Date(anchorDs+'T12:00:00'),type==='BJFS'?7:2));
}

function openJourledigMoveCtx(event,key){
  event.stopPropagation();
  const existing=document.getElementById('jourledigMoveCtx');
  if(existing){existing._key===key?existing.remove():existing.remove();}
  if(document.getElementById('jourledigMoveCtx'))return;

  const defaultDs=_jourledigDefaultDs(key);
  const currentDs=jourledigOverride[key]||defaultDs;
  const wkMon=getMonday(new Date(defaultDs+'T12:00:00'));
  const dayLabels=['Mån','Tis','Ons','Tor','Fre'];

  const pop=document.createElement('div');
  pop.id='jourledigMoveCtx';
  pop._key=key;
  pop.style.cssText='position:fixed;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 20px #0003;padding:10px 10px 6px;display:flex;flex-direction:column;gap:4px;min-width:160px';

  const hasOverride=!!jourledigOverride[key];
  pop.innerHTML=`<div style="font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px">Flytta jourledigt</div>`+
    dayLabels.map((label,i)=>{
      const ds=isoDate(addDays(wkMon,i));
      const isCurrent=ds===currentDs;
      const isDefault=ds===defaultDs;
      return`<button onclick="setJourledigOverride('${key}','${ds}')" style="text-align:left;padding:5px 9px;border-radius:6px;border:1px solid ${isCurrent?'var(--accent)':'transparent'};cursor:pointer;font-size:12px;font-weight:${isCurrent?'700':'400'};background:${isCurrent?'var(--accent-light,#e0f0ff)':'var(--bg)'};color:${isCurrent?'var(--accent)':'var(--text1)'}">${label}${isDefault?' <span style="font-size:10px;color:var(--text3)">(std)</span>':''}</button>`;
    }).join('')+
    (hasOverride?`<button onclick="clearJourledigOverride('${key}')" style="margin-top:2px;padding:5px 9px;border-radius:6px;border:none;cursor:pointer;font-size:11px;background:none;color:var(--danger);text-align:left">↺ Återställ standard</button>`:'');

  document.body.appendChild(pop);
  const r=event.target.closest('.jv-block').getBoundingClientRect();
  const top=Math.min(r.bottom+4,window.innerHeight-220);
  const left=Math.min(r.left,window.innerWidth-180);
  pop.style.top=top+window.scrollY+'px';
  pop.style.left=left+'px';
  const close=()=>{pop.remove();document.removeEventListener('click',close);};
  setTimeout(()=>document.addEventListener('click',close),0);
}

function setJourledigOverride(key,ds){
  const defaultDs=_jourledigDefaultDs(key);
  if(ds===defaultDs)delete jourledigOverride[key];
  else jourledigOverride[key]=ds;
  document.getElementById('jourledigMoveCtx')?.remove();
  autoSave();render();
}

function clearJourledigOverride(key){
  delete jourledigOverride[key];
  document.getElementById('jourledigMoveCtx')?.remove();
  autoSave();render();
}
