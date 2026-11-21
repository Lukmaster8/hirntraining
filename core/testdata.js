/* Hirntraining – Testdaten-Generator: 3 Beispielpatienten mit 4 Wochen simulierten Ergebnissen */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage;
  var TAG = 86400000;

  var BEISPIELE = [
    { vorname: 'Erika', nachname: 'Muster', geburtsjahr: 1956, geschlecht: 'w', diagnose: 'Zustand nach Mediainfarkt rechts', icd10: 'I63.5', betroffeneSeite: 'links', gesichtsfeld: 'links eingeschränkt', haendigkeit: 'rechts', vorlage: 'vl-neglect', staerke: 0.55 },
    { vorname: 'Hans', nachname: 'Beispiel', geburtsjahr: 1949, geschlecht: 'm', diagnose: 'Leichte kognitive Störung', icd10: 'F06.7', betroffeneSeite: 'keine', gesichtsfeld: 'frei', haendigkeit: 'rechts', vorlage: 'vl-gedaechtnis', staerke: 0.65 },
    { vorname: 'Lena', nachname: 'Probe', geburtsjahr: 1988, geschlecht: 'w', diagnose: 'Schädel-Hirn-Trauma', icd10: 'S06.2', betroffeneSeite: 'keine', gesichtsfeld: 'frei', haendigkeit: 'links', vorlage: 'vl-aufmerksamkeit', staerke: 0.75 }
  ];

  HT.testdaten = {
    erzeugen: function (therapeutId) {
      var ops = [];
      return HT.vorlagen.standardAnlegen().then(function () {
        BEISPIELE.forEach(function (b, bi) {
          var p = {
            id: HT.uid('pat'), vorname: b.vorname, nachname: b.nachname, geburtsjahr: b.geburtsjahr, geschlecht: b.geschlecht,
            diagnose: b.diagnose, icd10: b.icd10, betroffeneSeite: b.betroffeneSeite, gesichtsfeld: b.gesichtsfeld, haendigkeit: b.haendigkeit,
            therapeutId: therapeutId, notizen: 'Beispielpatient (Testdaten)', angelegtAm: Date.now() - 30 * TAG,
            pseudonym: HT.patienten.naechstesPseudonym(),
            einstellungen: { schriftgroesse: 100, kontrast: false, ton: true, eingabe: 'maus' }, archiviert: false
          };
          var vorlage = S.finde('templates', b.vorlage);
          var eintraege = (vorlage ? vorlage.eintraege : []).filter(function (e) { return HT.Module.map[e.modulId]; });
          if (!eintraege.length) eintraege = HT.Module.liste.slice(bi * 3, bi * 3 + 3).map(function (m) { return { modulId: m.id, dauerMin: 5, startLevel: 'auto', parameterOverrides: {} }; });
          var plan = { id: HT.uid('pla'), patientId: p.id, name: vorlage ? vorlage.name : 'Plan', eintraege: HT.kopie(eintraege), pauseMin: 1, aktiv: true, angelegtAm: p.angelegtAm };
          if (eintraege[0]) p.ziele = [
            { id: HT.uid('zie'), titel: bi === 0 ? 'Sucht den Bildschirm systematisch ab und findet auf der linken Seite mindestens 80 % der Ziele.' : bi === 1 ? 'Merkt sich eine Einkaufsliste mit 5 Artikeln.' : 'Kann sich 10 Minuten ohne Unterbrechung auf eine Aufgabe konzentrieren.', bereich: HT.Module.map[eintraege[0].modulId].kategorie, modulId: eintraege[0].modulId, zielLevel: 8, ausgangsLevel: 1, status: 'aktiv', zielDatum: HT.isoDatum(Date.now() + 28 * TAG), angelegtAm: Date.now() - 28 * TAG, bewertungen: [{ datum: Date.now() - 2 * TAG, gas: -1, kommentar: 'Fortschritt erkennbar, Ziel noch nicht ganz erreicht.', therapeut: '' }] },
            { id: HT.uid('zie'), titel: 'Selbstständige Planung einer Alltagshandlung (z. B. Kaffee kochen).', bereich: 'exekutiv', status: 'aktiv', zielDatum: HT.isoDatum(Date.now() + 42 * TAG), angelegtAm: Date.now() - 20 * TAG, bewertungen: [] }
          ];
          ops.push(S.put('patients', p), S.put('plans', plan));
          var level = {};
          eintraege.forEach(function (e) { level[e.modulId] = 1; });
          // ca. 3 Sitzungen pro Woche über 4 Wochen
          for (var tag = 28; tag >= 1; tag--) {
            var datum = new Date(Date.now() - tag * TAG);
            if ([1, 3, 5].indexOf(datum.getDay()) < 0) continue;
            datum.setHours(9 + bi * 2, 15, 0, 0);
            var t = datum.getTime();
            var ses = { id: HT.uid('ses'), patientId: p.id, therapeutId: therapeutId, planId: plan.id, start: t, ende: t, status: 'abgeschlossen', index: eintraege.length };
            ses.befindenVor = { stimmung: HT.zufall.int(2, 5), wachheit: HT.zufall.int(2, 5), zeit: t };
            ses.befindenNach = { stimmung: HT.zufall.int(3, 5), anstrengung: HT.zufall.int(2, 4), zeit: t };
            if (HT.zufall.chance(0.3)) ses.notiz = HT.zufall.wahl(['Gut mitgearbeitet, gegen Ende etwas ermüdet.', 'Strategie „zeilenweise suchen“ besprochen und umgesetzt.', 'Heute unkonzentriert, schlecht geschlafen.', 'Sehr motiviert, Level-Aufstieg gefeiert.']);
            var fortschritt = (28 - tag) / 28;
            eintraege.forEach(function (e) {
              var m = HT.Module.map[e.modulId];
              for (var d = 0; d < 3; d++) {
                var lv = level[m.id];
                var faehigkeit = b.staerke + fortschritt * 0.25 - (lv - 1) / m.levels.length * 0.35 + (Math.random() - 0.5) * 0.12;
                var q = HT.klemmen(faehigkeit + 0.25, 0.3, 0.98);
                var n = HT.zufall.int(18, 30);
                var tr = Math.round(n * q), rest = n - tr, fe = Math.round(rest * 0.6), au = rest - fe;
                var rt = Math.round(HT.lerp(950, 620, fortschritt) + lv * 12 + (Math.random() - 0.5) * 120);
                var neg = b.betroffeneSeite === 'links' ? 0.65 : 1;
                var tl = Math.round(tr / (1 + 1 / neg) ), trr = tr - tl;
                var neu = lv;
                if (q >= 0.85) neu = Math.min(m.levels.length, lv + 1); else if (q < 0.6) neu = Math.max(1, lv - 1);
                ops.push(S.put('runs', {
                  id: HT.uid('run'), sessionId: ses.id, patientId: p.id, modulId: m.id, level: lv, levelNachher: neu,
                  start: t, dauerSek: 90, treffer: tr, fehler: fe, auslassungen: au, quote: tr / n,
                  rtMittel: rt, rtMedian: rt - 20, rtStreuung: Math.round(rt * 0.22), rtLinks: Math.round(rt * (b.betroffeneSeite === 'links' ? 1.25 : 1)), rtRechts: rt,
                  trefferLinks: tl, trefferRechts: trr, auslassungenLinks: Math.round(au * (b.betroffeneSeite === 'links' ? 0.75 : 0.5)), auslassungenRechts: au - Math.round(au * (b.betroffeneSeite === 'links' ? 0.75 : 0.5)),
                  fehlerLinks: 0, fehlerRechts: 0, extra: {}, rohdaten: [], testdaten: true
                }));
                level[m.id] = neu;
                t += 95000;
              }
            });
            ses.ende = t;
            ops.push(S.put('sessions', ses));
          }
          Object.keys(level).forEach(function (mid) {
            ops.push(S.put('moduleState', { id: p.id + '|' + mid, patientId: p.id, modulId: mid, aktuellesLevel: level[mid], automatik: true, letzteDurchgaenge: [], hochSerie: 0 }));
          });
        });
        return Promise.all(ops);
      });
    }
  };
})();
