const LS_KEY = 'barnkliniken_v2';

function autoSave() {
  try {
    const data = {
      version: 2,
      savedAt: new Date().toISOString(),
      roleTags, positions, doctors, schedule, scheduleHalfDay, jourveckor, bjSchedule,
      ledighetRequests, ledighetVeckor, specialSlots, bvcSchedule,
      handledningPairs, mandatoryPositions: [...mandatoryPositions], schedulePeriod,
      utbildningDagar, utbildningVeckor, ledighetOnskad, utbildningOnskad
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch(e) { /* localStorage full eller ej tillgänglig */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 2) return false;
    if (data.roleTags) roleTags = data.roleTags;
    if (data.positions) positions = data.positions;
    if (data.doctors) doctors = data.doctors;
    if (data.schedule) schedule = data.schedule;
    if (data.scheduleHalfDay) scheduleHalfDay = data.scheduleHalfDay;
    if (data.jourveckor) jourveckor = data.jourveckor;
    if (data.bjSchedule) bjSchedule = data.bjSchedule;
    if (data.ledighetRequests) ledighetRequests = data.ledighetRequests;
    if (data.ledighetVeckor) ledighetVeckor = data.ledighetVeckor;
    if (data.specialSlots) specialSlots = data.specialSlots;
    if (data.bvcSchedule) bvcSchedule = data.bvcSchedule;
    if (data.handledningPairs) handledningPairs = data.handledningPairs;
    if (data.mandatoryPositions) mandatoryPositions = new Set(data.mandatoryPositions);
    if (data.schedulePeriod) schedulePeriod = data.schedulePeriod;
    if (data.utbildningDagar) utbildningDagar = data.utbildningDagar;
    if (data.utbildningVeckor) utbildningVeckor = data.utbildningVeckor;
    if (data.ledighetOnskad) ledighetOnskad = data.ledighetOnskad;
    if (data.utbildningOnskad) utbildningOnskad = data.utbildningOnskad;
    return true;
  } catch(e) { return false; }
}

function clearLocalStorage() {
  localStorage.removeItem(LS_KEY);
}
