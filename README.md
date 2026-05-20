# Barnkliniken — Schemaläggning

Schemaläggningsverktyg för barnkliniken. Öppna `index.html` i en webbläsare.

## Projektstruktur

```
index.html      — Huvud-HTML, modal-markup, refererar alla JS/CSS-filer
style.css       — Alla CSS-variabler, klasser och layout

state.js        — Konstanter, JV-definitioner, all appstate (doctors, schedule, etc.)
helpers.js      — Rena hjälpfunktioner: datum, JV-logik, BJ-logik, tillgänglighet
render.js       — renderWeek(), renderSidebar(), renderStats(), renderWarnings()
context.js      — Alla kontextmenyer (slot, JV, BJ, BVC, special)
modals.js       — Läkare-CRUD, positioner, roller, rotation, auto-fördela, spara/ladda
features.js     — BVC, utbildning/admin, handledning, ledighet
period.js       — Periodval, periodWeeks(), periodForRotation()
```

## Viktiga koncept

### Jourveckor
- **JV1** börjar fredag (ankarvecka = veckan med fredagen)
  - Pass: Fre natt → Sön dag · Mån natt · Ons natt
- **JV2** börjar lördag
  - Pass: Lör dag → Sön natt · Tis natt · Tor natt
- **NLÖ**: Lör natt → Jourledigt måndag (nästa kalendervecka)

### Regler inbyggda i systemet
- Max 4 journätter per läkare per månad
- Min 2 veckors mellanrum mellan jourveckor (JV1/JV2)
- Ingen dagpass jourveckan (fre–fre för JV1, lör–fre för JV2)
- Ledig dagen före och efter primärjournatt (gäller ej bakjour)
- Samma läkare kan inte ha JV1 + JV2 + NLÖ samma vecka

### State-struktur
```js
schedule[dateStr][slotId] = docId        // dagpass
jourveckor[wkey][type] = docId           // JV1/JV2/NLO per vecka
bjSchedule[dateStr][type] = docId        // BJFS/BJLO/BJNV
bvcSchedule[dateStr] = docId             // BVC torsdag
ledighetRequests[docId][dateStr] = true  // önskad ledighet (dag)
ledighetVeckor[docId][wkey] = true       // önskad ledighet (vecka)
specialSlots[dateStr][key] = {type, docId, ...}  // utb/adm/handledning
handledningPairs = [{stId, supervisorId}]
schedulePeriod = {from: "2026-01-01", to: "2026-06-30"}
```

## Utveckla med Claude Code

```bash
npm install -g @anthropic/claude-code
cd barnkliniken
claude
```

Tips: Berätta för Claude Code vilket problem du vill lösa så hittar den rätt fil själv.
