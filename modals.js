function renderRotationTable(){
  const mon=getMonday(currentDate),curWn=weekNum(mon),curYr=weekYear(mon);
  const rows=[];for(let d=-2;d<=10;d++){const dt=addDays(mon,d*7);rows.push({wn:weekNum(dt),yr:weekYear(dt),dt});}
  const jv1docs=doctors.filter(d=>(d.jv||[]).includes('JV1'));
  const jv2docs=doctors.filter(d=>(d.jv||[]).includes('JV2'));
  const nloDocs=doctors.filter(d=>(d.jv||[]).includes('NLO'));
  const mkSel=(wn,yr,key,docs,color)=>{
    const jv=getJV(wn,yr),cur=jv[key];
    const allDocs=[...docs];
    if(cur&&!allDocs.find(d=>d.id===cur)){const doc=docById(cur);if(doc)allDocs.push(doc);}
    return`<select onchange="setJVFromTable(${wn},${yr},'${key}',this.value)" style="width:100%;font-size:11px;padding:3px 6px;background:${cur?'var(--'+color+'-light)':'var(--bg)'};color:${cur?'var(--'+color+')':'var(--text2)'};border:1px solid ${cur?'var(--'+color+')':'var(--border)'};border-radius:5px"><option value="">— —</option>${allDocs.map(d=>{const conflict=Object.entries(getJV(wn,yr)).find(([k,v])=>k!==key&&v===d.id);return`<option value="${d.id}"${cur===d.id?' selected':''}${conflict?' disabled':''}>` + (conflict?`⚠ `:'') + `${d.name.split(' ')[0]} ${d.name.split(' ').slice(-1)[0]}${conflict?' ('+conflict[0]+')':''}</option>`;}).join('')}</select>`;
  };
  let html=`<thead><tr><th>Vecka</th><th style="color:var(--jv1)">JV1</th><th style="color:var(--jv2)">JV2</th><th style="color:var(--nlo)">NLÖ</th></tr></thead><tbody>`;
  rows.forEach(({wn,yr,dt})=>{
    const isCur=wn===curWn&&yr===curYr;
    html+=`<tr style="${isCur?'background:var(--accent-light)':''}">
      <td><strong style="font-family:'DM Mono',monospace;font-size:12px">v.${wn}</strong><span style="font-size:10px;color:var(--text3);margin-left:5px">${dt.getDate()} ${svMonth(dt)}</span>${isCur?'<span style="font-size:9px;font-weight:700;color:var(--accent);margin-left:5px">↑</span>':''}</td>
      <td>${mkSel(wn,yr,'JV1',jv1docs,'jv1')}</td>
      <td>${mkSel(wn,yr,'JV2',jv2docs,'jv2')}</td>
      <td>${mkSel(wn,yr,'NLO',nloDocs,'nlo')}</td>
    </tr>`;
  });
  document.getElementById('rotTable').innerHTML=html+`</tbody>`;
}
function setJVFromTable(wn,yr,key,docId){setJV(wn,yr,key,docId||null);render();}

function renderBJRotationTable(){
  const mon=getMonday(currentDate),curWn=weekNum(mon),curYr=weekYear(mon);
  const rows=[];for(let d=-2;d<=10;d++){const dt=addDays(mon,d*7);rows.push({wn:weekNum(dt),yr:weekYear(dt),dt});}
  const bjfsDocs=doctors.filter(d=>(d.bj||[]).includes('BJFS'));
  const bjloDocs=doctors.filter(d=>(d.bj||[]).includes('BJLO'));
  function mkBJSel(wn,yr,type,docs,color){
    const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);
    const wkMon=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
    const anchorDs=isoDate(addDays(wkMon,type==='BJFS'?4:5));
    const cur=getBJ(anchorDs,type);
    const allDocs=[...docs];
    if(cur&&!allDocs.find(d=>d.id===cur)){const doc=docById(cur);if(doc)allDocs.push(doc);}
    const otherType=type==='BJFS'?'BJLO':'BJFS';
    const otherDs=isoDate(addDays(wkMon,type==='BJFS'?5:4));
    const otherDoc=getBJ(otherDs,otherType);
    return`<select onchange="setBJFromTable('${type}',${wn},${yr},this.value)" style="width:100%;font-size:11px;padding:3px 6px;background:${cur?'var(--'+color+'-light)':'var(--bg)'};color:${cur?'var(--'+color+')':'var(--text2)'};border:1px solid ${cur?'var(--'+color+')':'var(--border)'};border-radius:5px"><option value="">— —</option>${allDocs.map(d=>{const conflict=d.id===otherDoc;return`<option value="${d.id}"${cur===d.id?' selected':''}${conflict?' disabled':''}>${conflict?'⚠ ':''}${d.name.split(' ')[0]} ${d.name.split(' ').slice(-1)[0]}${conflict?' ('+otherType+')':''}</option>`;}).join('')}</select>`;
  }
  let html=`<thead><tr><th>Vecka</th><th style="color:var(--bjfs)">BJFS</th><th style="color:var(--bjlo)">BJLÖ</th></tr></thead><tbody>`;
  rows.forEach(({wn,yr,dt})=>{
    const isCur=wn===curWn&&yr===curYr;
    html+=`<tr style="${isCur?'background:var(--accent-light)':''}">
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
  setBJ(anchorDs,type,docId||null);renderBJRotationTable();render();
}
function autoBJRotate(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  const MIN_GAP=2;
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  const last={};const cnt={};
  doctors.forEach(d=>{last[d.id]={BJFS:-99,BJLO:-99};cnt[d.id]={BJFS:0,BJLO:0};});
  for(let wn=Math.max(1,fromWn-20);wn<fromWn;wn++){
    const mon=getMon(wn);
    const fds=isoDate(addDays(mon,4)),sds=isoDate(addDays(mon,5));
    const bf=getBJ(fds,'BJFS'),bl=getBJ(sds,'BJLO');
    if(bf&&last[bf])last[bf].BJFS=wn;
    if(bl&&last[bl])last[bl].BJLO=wn;
  }
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    const friDs=isoDate(addDays(mon,4)),satDs=isoDate(addDays(mon,5));
    if(!getBJ(friDs,'BJFS')){
      const bjloDoc=getBJ(satDs,'BJLO');
      const elig=doctors.filter(d=>(d.bj||[]).includes('BJFS')&&d.id!==bjloDoc);
      const pool=elig.filter(d=>(wn-last[d.id].BJFS)>=MIN_GAP);
      const final=pool.length?pool:elig;
      final.sort((a,b)=>cnt[a.id].BJFS-cnt[b.id].BJFS||last[a.id].BJFS-last[b.id].BJFS);
      if(final.length){setBJ(friDs,'BJFS',final[0].id);last[final[0].id].BJFS=wn;cnt[final[0].id].BJFS++;}
    }
    if(!getBJ(satDs,'BJLO')){
      const bjfsDoc=getBJ(friDs,'BJFS');
      const elig=doctors.filter(d=>(d.bj||[]).includes('BJLO')&&d.id!==bjfsDoc);
      const pool=elig.filter(d=>(wn-last[d.id].BJLO)>=MIN_GAP);
      const final=pool.length?pool:elig;
      final.sort((a,b)=>cnt[a.id].BJLO-cnt[b.id].BJLO||last[a.id].BJLO-last[b.id].BJLO);
      if(final.length){setBJ(satDs,'BJLO',final[0].id);last[final[0].id].BJLO=wn;cnt[final[0].id].BJLO++;}
    }
  }
  renderBJRotationTable();render();showToast(`BJ-rotation satt v.${fromWn}–${toWn}`);
}
function clearBJRotation(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  function getMon(wn){const jan4=new Date(Date.UTC(yr,0,4));const jan4Mon=getMonday(jan4);return addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);}
  for(let wn=fromWn;wn<=toWn;wn++){
    const mon=getMon(wn);
    setBJ(isoDate(addDays(mon,4)),'BJFS',null);
    setBJ(isoDate(addDays(mon,5)),'BJLO',null);
  }
  renderBJRotationTable();render();showToast('BJ-rotation rensad');
}
function autoRotate(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const curMon=getMonday(currentDate),yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  const MIN_GAP=2;
  const MAX_NIGHTS=4;

  // Helper: how many JV nights does a jourvecka assignment add in a given month?
  // JV1 = 3 nights (fre+mån+ons), JV2 = 3 nights (sön+tis+tor), NLO = 1 night
  function nightsForJV(key){ return key==='NLO'?1:3; }

  // Helper: get the anchor date (first shift day) for a JV assignment at wn/yr
  // JV1 anchor = Friday of that calendar week, JV2 anchor = Saturday
  function anchorDate(wn,yr,key){
    const jan4=new Date(Date.UTC(yr,0,4));
    const jan4Mon=getMonday(jan4);
    const mon=addDays(jan4Mon,(wn-weekNum(jan4Mon))*7);
    if(key==='JV1') return addDays(mon,4); // Friday
    if(key==='JV2') return addDays(mon,5); // Saturday
    return addDays(mon,5); // NLO = Saturday
  }

  // Count nights already committed in a month (year, month 0-indexed)
  // including assignments already set in jourveckor
  function nightsInMonth(docId,year,month){
    return countNightShiftsInMonth(docId,year,month);
  }

  // Would assigning docId to key at wn exceed 4 nights in any affected month?
  function wouldExceedCap(docId,wn,yr,key){
    if(key==='NLO') return false; // NLO = 1 night, rarely the tipping point — still check
    const anchor=anchorDate(wn,yr,key);
    // JV1: fre + mån + ons. Fre is in anchor week, mån+ons are +3,+5 days
    // JV2: lör + sön + tis + tor. Lör anchor, sön+tis+tor overflow
    // Collect all night dates to find which months are affected
    const nightOffsets=key==='JV1'?[0,3,5]:key==='JV2'?[1,3,5]:[0]; // relative to anchor
    // Actually use the real JV_DEFS structure — map dow to actual dates
    const anchorMon=getMonday(anchor);
    const dowToOffset={1:0,2:1,3:2,4:3,5:4,6:5,0:6};
    const overflowDays={JV1:[0,1,3],JV2:[0,2,4]};
    const nightDows=key==='JV1'?[5,1,3]:key==='JV2'?[0,2,4]:[6];
    const months=new Set();
    for(const dow of nightDows){
      const isOverflow=(overflowDays[key]||[]).includes(dow);
      const nd=isOverflow?addDays(anchorMon,7+dowToOffset[dow]):addDays(anchorMon,dowToOffset[dow]);
      months.add(nd.getFullYear()*100+nd.getMonth());
    }
    // For each affected month, check current count + nights this assignment adds in that month
    for(const ym of months){
      const y=Math.floor(ym/100),m=ym%100;
      const existing=nightsInMonth(docId,y,m);
      // Count how many of the night dates fall in this month
      let adding=0;
      for(const dow of nightDows){
        const isOverflow=(overflowDays[key]||[]).includes(dow);
        const nd=isOverflow?addDays(anchorMon,7+dowToOffset[dow]):addDays(anchorMon,dowToOffset[dow]);
        if(nd.getFullYear()===y&&nd.getMonth()===m) adding++;
      }
      if(existing+adding>MAX_NIGHTS) return true;
    }
    return false;
  }

  // Track last assigned week and total nights assigned so far (within rotation run)
  const lastAssigned={};
  const nightCount={}; // docId -> total nights assigned in this run
  doctors.forEach(d=>{lastAssigned[d.id]={JV1:-99,JV2:-99,any:-99};nightCount[d.id]=0;});
  // Seed from weeks before fromWn
  for(let wn=Math.max(1,fromWn-10);wn<fromWn;wn++){
    const jv=getJV(wn,yr);
    ['JV1','JV2','NLO'].forEach(key=>{
      if(jv[key]){
        if(key!=='NLO'){lastAssigned[jv[key]][key]=wn;lastAssigned[jv[key]].any=Math.max(lastAssigned[jv[key]].any,wn);}
      }
    });
  }

  for(let wn=fromWn;wn<=toWn;wn++){
    ['JV1','JV2','NLO'].forEach(key=>{
      if(getJV(wn,yr)[key]) return;
      const pool=doctors.filter(d=>(d.jv||[]).includes(key));
      if(!pool.length) return;

      // Sort candidates: primary = fewest total nights, secondary = gap, tertiary = preference
      function score(d){
        const gapOk=key==='NLO'||((wn-lastAssigned[d.id].any)>=MIN_GAP);
        const capOk=!wouldExceedCap(d.id,wn,yr,key);
        const nights=nightCount[d.id];
        const pref=(d.prefJV===key)?0:1;
        const lastThis=lastAssigned[d.id][key];
        return{gapOk,capOk,nights,pref,lastThis};
      }

      // Filter: cap first (hard), then gap (soft — relax if needed)
      let candidates=pool.filter(d=>score(d).capOk);
      if(!candidates.length) candidates=[...pool]; // all over cap — pick least bad

      const withGap=candidates.filter(d=>key==='NLO'||(wn-lastAssigned[d.id].any)>=MIN_GAP);
      const finalPool=withGap.length?withGap:candidates;

      finalPool.sort((a,b)=>{
        const sa=score(a),sb=score(b);
        if(sa.nights!==sb.nights) return sa.nights-sb.nights; // fewest nights first
        if(sa.lastThis!==sb.lastThis) return sa.lastThis-sb.lastThis; // longest ago first
        return sa.pref-sb.pref; // preference
      });

      for(const candidate of finalPool){
        if(setJV(wn,yr,key,candidate.id)!==false){
          if(key!=='NLO'){
            lastAssigned[candidate.id][key]=wn;
            lastAssigned[candidate.id].any=Math.max(lastAssigned[candidate.id].any,wn);
          }
          nightCount[candidate.id]+=nightsForJV(key);
          break;
        }
      }
    });
  }
  renderRotationTable();render();showToast(`Rotation satt v.${fromWn}–${toWn}`);
}
function clearRotation(){
  const {fromWn:pFrom,toWn:pTo,yr:pYr}=periodForRotation();
  const curMon=getMonday(currentDate),yr=pYr;
  const fromWn=parseInt(document.getElementById('rotFrom').value)||pFrom;
  const toWn=parseInt(document.getElementById('rotTo').value)||pTo;
  for(let wn=fromWn;wn<=toWn;wn++){const k=wkey(wn,yr);if(jourveckor[k])jourveckor[k]={JV1:null,JV2:null,NLO:null};}
  renderRotationTable();render();showToast('Rotation rensad');
}

function buildGrid(elId,tags,sel){document.getElementById(elId).innerHTML=tags.map(t=>`<input type="checkbox" class="tc" id="${elId}_${t}"${sel.includes(t)?' checked':''}><label class="tl" for="${elId}_${t}">${t}</label>`).join('');}
function buildAllowedGrid(elId,sel){
  const seen=new Set();
  const posHtml=positions.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).map(p=>`<input type="checkbox" class="tc" id="${elId}_${p.id}"${sel.includes(p.id)?' checked':''}><label class="tl" for="${elId}_${p.id}">${p.name}${p.slots[0]&&p.slots[0].roleReq?' ('+p.slots[0].roleReq+')':''}</label>`).join('');
  const bvcHtml=`<input type="checkbox" class="tc" id="${elId}_pos_bvc"${sel.includes('pos_bvc')?' checked':''}><label class="tl" for="${elId}_pos_bvc">BVC</label>`;
  document.getElementById(elId).innerHTML=posHtml+bvcHtml;
}
function buildPrefGrid(elId,sel){
  const seen=new Set();
  const posHtml=positions.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;}).map(p=>`<input type="checkbox" class="tc" id="${elId}_${p.id}"${sel.includes(p.id)?' checked':''}><label class="tl" for="${elId}_${p.id}">${p.name}${p.slots[0]&&p.slots[0].roleReq?' ('+p.slots[0].roleReq+')':''}</label>`).join('');
  const bvcHtml=`<input type="checkbox" class="tc" id="${elId}_pos_bvc"${sel.includes('pos_bvc')?' checked':''}><label class="tl" for="${elId}_pos_bvc">BVC</label>`;
  document.getElementById(elId).innerHTML=posHtml+bvcHtml;
}
function getChecked(elId,tags){return tags.filter(t=>document.getElementById(`${elId}_${t}`)?.checked);}
function getPrefChecked(elId){return [...positions.map(p=>p.id),'pos_bvc'].filter(id=>document.getElementById(`${elId}_${id}`)?.checked);}

function openAddDoctorModal(){
  const inp=document.getElementById('newDoctorInput');document.getElementById('addDocName').value=inp.value.trim();inp.value='';
  buildGrid('addRoleGrid',roleTags,[]);buildAllowedGrid('addAllowedGrid',[]);buildPrefGrid('addPrefGrid',[]);
  ['addJV1','addJV2','addNLO'].forEach(id=>document.getElementById(id).checked=false);
  openModal('addDoctorModal');setTimeout(()=>document.getElementById('addDocName').focus(),80);
}
function confirmAddDoctor(){
  const name=document.getElementById('addDocName').value.trim();if(!name)return;
  const jv=[];if(document.getElementById('addJV1').checked)jv.push('JV1');if(document.getElementById('addJV2').checked)jv.push('JV2');if(document.getElementById('addNLO').checked)jv.push('NLO');
  const bj=[];if(document.getElementById('addBJFS').checked)bj.push('BJFS');if(document.getElementById('addBJLO').checked)bj.push('BJLO');if(document.getElementById('addBJNV').checked)bj.push('BJNV');
  const allowed=getPrefChecked('addAllowedGrid');const pref=getPrefChecked('addPrefGrid');const prefJV=[...document.querySelectorAll('input[name="addPrefJV"]')].find(r=>r.checked)?.value||'';doctors.push({id:'doc_'+Date.now(),name,roles:getChecked('addRoleGrid',roleTags),allowedPositions:allowed,prefPositions:pref,prefJV,jv,bj,color:AVATAR_COLORS[doctors.length%AVATAR_COLORS.length]});
  closeModal('addDoctorModal');render();showToast(`${name} tillagd`);
}
function openEditDoctorModal(docId){
  const doc=docById(docId);if(!doc)return;
  document.getElementById('editDocId').value=docId;document.getElementById('editDocName').value=doc.name;
  buildGrid('editRoleGrid',roleTags,doc.roles);buildAllowedGrid('editAllowedGrid',doc.allowedPositions||[]);buildPrefGrid('editPrefGrid',doc.prefPositions||[]);const pjv=doc.prefJV||'';document.querySelectorAll('input[name="editPrefJV"]').forEach(r=>r.checked=(r.value===pjv));
  document.getElementById('editJV1').checked=(doc.jv||[]).includes('JV1');
  document.getElementById('editJV2').checked=(doc.jv||[]).includes('JV2');
  document.getElementById('editNLO').checked=(doc.jv||[]).includes('NLO');
  document.getElementById('editBJFS').checked=(doc.bj||[]).includes('BJFS');
  document.getElementById('editBJLO').checked=(doc.bj||[]).includes('BJLO');
  document.getElementById('editBJNV').checked=(doc.bj||[]).includes('BJNV');
  openModal('editDoctorModal');
}
function confirmEditDoctor(){
  const id=document.getElementById('editDocId').value,doc=docById(id);if(!doc)return;
  doc.name=document.getElementById('editDocName').value.trim()||doc.name;
  const allowed=getPrefChecked('editAllowedGrid');const pref=getPrefChecked('editPrefGrid');doc.roles=getChecked('editRoleGrid',roleTags);doc.allowedPositions=allowed;doc.prefPositions=pref;doc.prefJV=[...document.querySelectorAll('input[name="editPrefJV"]')].find(r=>r.checked)?.value||'';
  const jv=[];if(document.getElementById('editJV1').checked)jv.push('JV1');if(document.getElementById('editJV2').checked)jv.push('JV2');if(document.getElementById('editNLO').checked)jv.push('NLO');doc.jv=jv;
  const bj=[];if(document.getElementById('editBJFS').checked)bj.push('BJFS');if(document.getElementById('editBJLO').checked)bj.push('BJLO');if(document.getElementById('editBJNV').checked)bj.push('BJNV');doc.bj=bj;
  closeModal('editDoctorModal');render();showToast('Läkare uppdaterad');
}
function promptDeleteFromEdit(){const id=document.getElementById('editDocId').value;closeModal('editDoctorModal');promptDelete(id);}
function promptDelete(docId){const doc=docById(docId);if(!doc)return;deleteTargetId=docId;document.getElementById('deleteModalText').textContent=`Ta bort ${doc.name}? All schemadata raderas.`;openModal('deleteModal');}
function confirmDelete(){if(!deleteTargetId)return;const doc=docById(deleteTargetId);doctors=doctors.filter(d=>d.id!==deleteTargetId);Object.keys(schedule).forEach(ds=>{if(schedule[ds])Object.keys(schedule[ds]).forEach(k=>{if(schedule[ds][k]===deleteTargetId)schedule[ds][k]='';});});Object.keys(jourveckor).forEach(k=>{const jv=jourveckor[k];if(jv.JV1===deleteTargetId)jv.JV1=null;if(jv.JV2===deleteTargetId)jv.JV2=null;if(jv.NLO===deleteTargetId)jv.NLO=null;});Object.keys(bjSchedule).forEach(ds=>{if(bjSchedule[ds])Object.keys(bjSchedule[ds]).forEach(k=>{if(bjSchedule[ds][k]===deleteTargetId)bjSchedule[ds][k]=null;});});closeModal('deleteModal');render();showToast(`${doc.name} borttagen`);deleteTargetId=null;}

function openPositionsModal(){renderPositionsList();openModal('positionsModal');}
function renderPositionsList(){
  const el=document.getElementById('posListEl');el.innerHTML='';
  const dayNames=['Mån','Tis','Ons','Tor','Fre'];
  positions.forEach(pos=>{
    const[,fg]=posColor(pos.colorIdx);const s0=pos.slots[0];
    const rStr=s0&&s0.roleReq?` <span class="sbadge ${s0.roleReq==='ÖL'?'ol':'ul'}">${s0.roleReq}</span>`:'';
    const isMand=mandatoryPositions.has(pos.id);
    const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
    const isAllDays=posDays.length===5;
    const dayBtns=[1,2,3,4,5].map(day=>{
      const on=posDays.includes(day);
      return `<button onclick="togglePositionDay('${pos.id}',${day},${!on})" style="padding:1px 5px;font-size:9px;border-radius:3px;border:1px solid ${on?fg:'var(--border)'};background:${on?fg+'22':'transparent'};color:${on?fg:'var(--text3)'};cursor:pointer">${dayNames[day-1]}</button>`;
    }).join('');
    const div=document.createElement('div');div.className='pos-edit-item';
    div.innerHTML=`
      <div style="width:9px;height:9px;border-radius:2px;background:${fg};flex-shrink:0;margin-top:3px"></div>
      <div style="flex:1"><div style="font-weight:700;font-size:13px;color:${fg}">${pos.name}${rStr}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:1px">${pos.slots.length} slot${pos.slots.length>1?'s':''}</div>
        <div style="display:flex;gap:3px;margin-top:5px">${dayBtns}</div>
      </div>
      <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:${isMand?'var(--warn)':'var(--text3)'};cursor:pointer;white-space:nowrap" title="Genererar varning om positionen inte är tillsatt på aktiva dagar">
        <input type="checkbox" ${isMand?'checked':''} onchange="toggleMandatory('${pos.id}',this.checked)">
        Obligatorisk
      </label>
      <button class="btn sm danger" onclick="removePosition('${pos.id}')">Ta bort</button>`;
    el.appendChild(div);
  });
}
function toggleMandatory(posId,on){
  if(on)mandatoryPositions.add(posId);else mandatoryPositions.delete(posId);
  renderPositionsList();render();
}
function togglePositionDay(posId,day,on){
  const pos=positions.find(p=>p.id===posId);if(!pos)return;
  if(!pos.days||!pos.days.length)pos.days=[1,2,3,4,5];
  if(on&&!pos.days.includes(day))pos.days.push(day);
  else if(!on)pos.days=pos.days.filter(d=>d!==day);
  pos.days.sort((a,b)=>a-b);
  renderPositionsList();render();
}
function addPosition(){
  const name=document.getElementById('newPosName').value.trim();if(!name)return;
  const slotsN=parseInt(document.getElementById('newPosSlots').value)||1;
  const roleReq=document.getElementById('newPosRole').value;
  const days=[...document.querySelectorAll('#newPosDays input:checked')].map(cb=>parseInt(cb.value));
  const section=document.getElementById('newPosSection').value||undefined;
  const reqs=[];
  const posId='pos_'+Date.now(),colorIdx=positions.length%POS_COLORS.length;
  positions.push({id:posId,name,colorIdx,days,section,slots:Array.from({length:slotsN},(_,i)=>({slotId:`s_${posId}_${i}`,roleReq,requiredComps:reqs}))});
  document.getElementById('newPosName').value='';document.getElementById('newPosSlots').value='1';document.getElementById('newPosRole').value='';document.getElementById('newPosSection').value='';
  document.querySelectorAll('#newPosDays input').forEach(cb=>cb.checked=true);
  renderPositionsList();render();showToast(`"${name}" tillagd`);
}
function removePosition(posId){
  const pos=positions.find(p=>p.id===posId);if(pos)pos.slots.forEach(s=>{Object.keys(schedule).forEach(ds=>{if(schedule[ds])delete schedule[ds][s.slotId];});});
  positions=positions.filter(p=>p.id!==posId);renderPositionsList();render();
}

function openRolesModal(){renderRoleTagsList();openModal('rolesModal');}
function renderRoleTagsList(){const el=document.getElementById('roleTagsList');el.innerHTML='';roleTags.forEach(r=>{const d=document.createElement('div');d.className='rit';d.innerHTML=`<span>${r}</span><button class="btn sm danger" onclick="removeRoleTag('${r}')">×</button>`;el.appendChild(d);});}
function addRoleTag(){const v=document.getElementById('newRoleInput').value.trim();if(v&&!roleTags.includes(v)){roleTags.push(v);document.getElementById('newRoleInput').value='';renderRoleTagsList();}}
function removeRoleTag(r){roleTags=roleTags.filter(x=>x!==r);renderRoleTagsList();}

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
  const pc={};doctors.forEach(d=>{pc[d.id]=0;});

  if(document.getElementById('autoChkDag').checked){
    const dagPositions=positions.filter(p=>p.id!=='pos_dj'&&p.id!=='pos_dbj');
    // Fill single-slot positions first (Avdelning, Neonatal) so they get week-consistent pick
    // then fill multi-slot positions (Mottagning) with whoever remains
    const sorted=[...dagPositions.filter(p=>p.slots.length===1),...dagPositions.filter(p=>p.slots.length>1)];
    sorted.forEach(pos=>{
      const weekConsistent=pos.slots.length===1;
      const posDays=pos.days&&pos.days.length?pos.days:[1,2,3,4,5];
      pos.slots.forEach(slot=>{
        allWeeks.forEach(({mon,wn,yr})=>{
          const prefSort=(a,b)=>{const aP=(a.prefPositions||[]).includes(pos.id),bP=(b.prefPositions||[]).includes(pos.id);return(aP&&!bP)?-1:(bP&&!aP)?1:pc[a.id]-pc[b.id];};
          if(weekConsistent){
            const unfilledDays=weekDays(mon,5).filter(d=>posDays.includes(d.getDay())&&!getSlot(slot.slotId,isoDate(d)));
            if(!unfilledDays.length)return;
            // Try to find one doctor who can cover all unfilled active days this week
            const fullWeekCands=doctors
              .filter(doc=>!docHasJVThisWeek(doc.id,wn,yr)&&
                unfilledDays.every(d=>{const ds=isoDate(d);return docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds);}))
              .sort(prefSort);
            if(fullWeekCands.length){
              unfilledDays.forEach(d=>{setSlot(slot.slotId,isoDate(d),fullWeekCands[0].id);pc[fullWeekCands[0].id]++;});
            } else {
              // Fallback: fill day by day if no one is free all active days
              unfilledDays.forEach(d=>{
                const ds=isoDate(d);
                const cands=doctors.filter(doc=>docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds)&&!docHasJVThisWeek(doc.id,wn,yr)).sort(prefSort);
                if(cands.length){setSlot(slot.slotId,ds,cands[0].id);pc[cands[0].id]++;}
              });
            }
          } else {
            weekDays(mon,5).forEach(d=>{
              if(!posDays.includes(d.getDay()))return;
              const ds=isoDate(d);if(getSlot(slot.slotId,ds))return;
              const cands=doctors.filter(doc=>docCanFillSlot(doc,slot,ds)&&!docIsAssignedOnDate(doc.id,ds)&&!docHasJVThisWeek(doc.id,wn,yr)).sort(prefSort);
              if(cands.length){setSlot(slot.slotId,ds,cands[0].id);pc[cands[0].id]++;}
            });
          }
        });
      });
    });
  }
  if(document.getElementById('autoChkDJ').checked){
    ['pos_dj','pos_dbj'].forEach(posId=>{
      const pos=positions.find(p=>p.id===posId);if(!pos)return;
      const slot=pos.slots[0];
      allWeeks.forEach(({mon,wn,yr})=>{
        const q=[...doctors.filter(d=>!docHasJVThisWeek(d.id,wn,yr))].sort(()=>Math.random()-.5);let idx=0;
        weekDays(mon,5).forEach(d=>{const ds=isoDate(d);if(getSlot(slot.slotId,ds))return;for(let i=0;i<q.length;i++){const doc=q[(idx+i)%q.length];if(!docIsAssignedOnDate(doc.id,ds)){setSlot(slot.slotId,ds,doc.id);idx=(idx+i+1)%q.length;break;}}});
      });
    });
  }
  closeModal('autoModal');render();
  showToast(`Pass fördelade${allWeeks.length>1?' ('+allWeeks.length+' veckor)':''}`);
}

function exportSchema(){
  const mon=getMonday(currentDate),days=weekDays(mon,5),wn=weekNum(mon),yr=weekYear(mon),W=20;
  let lines=[`SCHEMA BARNKLINIKEN - VECKA ${wn}\n`,'Position'.padEnd(W)+days.map(d=>`${svDay(d)} ${d.getDate()}`.padEnd(W)).join(''),'_'.repeat(W*6)];
  positions.forEach(pos=>{pos.slots.forEach(slot=>{const rStr=slot.roleReq?` [${slot.roleReq}]`:'';lines.push((pos.name+rStr).padEnd(W)+days.map(d=>{const v=getSlot(slot.slotId,isoDate(d)),doc=v?docById(v):null;return(doc?`${doc.name.split(' ')[0]} (${doc.roles[0]})`:'-').padEnd(W);}).join(''));});});
  lines.push('');const jv=getJV(wn,yr);
  ['JV1','JV2','NLO'].forEach(k=>{const doc=jv[k]?docById(jv[k]):null;lines.push(`${k==='NLO'?'NLO':k}: ${doc?doc.name:'--'}`);});
  const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`schema-barnkliniken-v${wn}.txt`;a.click();URL.revokeObjectURL(url);showToast('Exporterat');
}

function saveData(){
  const data={version:2,savedAt:new Date().toISOString(),roleTags,positions,doctors,schedule,scheduleHalfDay,jourveckor,bjSchedule,ledighetRequests,ledighetVeckor,specialSlots,bvcSchedule,handledningPairs,mandatoryPositions:[...mandatoryPositions],schedulePeriod,utbildningDagar,utbildningVeckor};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='barnkliniken-schema-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();URL.revokeObjectURL(url);showToast('Schema sparat');
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
      if(data.jourveckor)jourveckor=data.jourveckor;
      if(data.bjSchedule)bjSchedule=data.bjSchedule;
      if(data.ledighetRequests)ledighetRequests=data.ledighetRequests;
      if(data.ledighetVeckor)ledighetVeckor=data.ledighetVeckor;
      if(data.specialSlots)specialSlots=data.specialSlots;
      if(data.bvcSchedule)bvcSchedule=data.bvcSchedule;
      if(data.handledningPairs)handledningPairs=data.handledningPairs;
      if(data.mandatoryPositions)mandatoryPositions=new Set(data.mandatoryPositions);
      if(data.schedulePeriod)schedulePeriod=data.schedulePeriod;
      if(data.utbildningDagar)utbildningDagar=data.utbildningDagar;
      if(data.utbildningVeckor)utbildningVeckor=data.utbildningVeckor;
      render();showToast('Schema laddat');
    }catch(err){alert('Kunde inte ladda filen.\n'+err.message);}
    event.target.value='';
  };
  reader.readAsText(file);
}
