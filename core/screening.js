/* Hirntraining – Screening-Batterie (Reiter „Screening“ im Arbeitsplatz)
 * Kurzer Leistungsüberblick zu Beginn und zur Verlaufskontrolle – ausdrücklich KEIN Diagnostikum.
 * Feste Parameter, kein adaptives Level, je Test ein Durchgang (2–3 min). Ergebnis: Rohwerte je Test und Vergleich
 * mit dem eigenen ersten Screening des Klienten (keine Normwerte), dazu Trainingsempfehlungen nach einer Regeltabelle.
 * Bericht: Seite „Screening-Verlauf“ (#/screening/<klient-id>), druckbar. */
(function () {
  'use strict';
  var HT = window.HT, S = HT.storage, UI = HT.ui;
  var HINWEIS = 'Screening = kurzer Leistungsüberblick für die Therapieplanung. Kein Diagnostikum, keine Normwerte – verglichen wird nur mit dem eigenen ersten Screening. Der Gesichtsfeld-Kurzcheck ersetzt keine augenärztliche Perimetrie.';

  var TESTS = [
    { test: 'reaktion', name: 'Reaktion (einfach)', modulId: 'reaktion', startLevel: 2, dauerSek: 100 },
    { test: 'reaktion_warnton', name: 'Reaktion mit Warnton', modulId: 'reaktion', startLevel: 6, dauerSek: 90 },
    { test: 'geteilt', name: 'Geteilte Aufmerksamkeit (visuell + akustisch)', modulId: 'geteilte-aufmerksamkeit', startLevel: 4, dauerSek: 120 },
    { test: 'suche', name: 'Selektive Suche (Zahlenfeld 1–25)', modulId: 'zahlenfeld', startLevel: 7, dauerSek: 120, parameterOverrides: { raster: 5, wechsel: false, farbig: false, gedreht: false } },
    { test: 'spanne_vor', name: 'Zahlenspanne vorwärts', modulId: 'zahlenspanne', startLevel: 1, dauerSek: 120, parameterOverrides: { spanneTest: true, richtung: 'vorwaerts' } },
    { test: 'spanne_rueck', name: 'Zahlenspanne rückwärts', modulId: 'zahlenspanne', startLevel: 1, dauerSek: 110, parameterOverrides: { spanneTest: true, richtung: 'rueckwaerts' } },
    { test: 'woerter', name: 'Wortgedächtnis (Wiedererkennen)', modulId: 'wortlisten', startLevel: 4, dauerSek: 120 },
    { test: 'reihen', name: 'Logisches Denken (Reihen)', modulId: 'reihen-fortsetzen', startLevel: 4, dauerSek: 120 },
    { test: 'gesichtsfeld', name: 'Gesichtsfeld-Kurzcheck', modulId: 'gesichtsfeld-check', startLevel: 1, dauerSek: 150 }
  ];

  function spanne(run) {
    var m = 0;
    (run.rohdaten || []).forEach(function (r) { if (r.korrekt && r.reiz) m = Math.max(m, String(r.reiz).length); });
    return m;
  }
  function gesichtsfeldPunkte(run) {
    var p = {};
    (run.rohdaten || []).forEach(function (r) { var m = /^(p\d\d) r(\d) w(\d+)/.exec(r.reiz || ''); if (m) p[m[1]] = { ring: Number(m[2]), w: Number(m[3]), gesehen: !!r.korrekt }; });
    return p;
  }
  /* Kennwerte je Test: [{ name, wert, einheit, besserHoeher }] */
  function kennwerte(test, run) {
    if (!run) return [];
    var q = { name: 'Trefferquote', wert: run.quote, einheit: '%', besserHoeher: true };
    var rt = { name: 'Reaktionszeit (Median)', wert: run.rtMedian, einheit: 'ms', besserHoeher: false };
    var lr = { name: 'Treffer links / rechts', wert: (run.trefferLinks || 0) + ' / ' + (run.trefferRechts || 0), einheit: '', text: true };
    if (test === 'reaktion' || test === 'reaktion_warnton') return [rt, q];
    if (test === 'geteilt') return [q, rt];
    if (test === 'suche') return [rt, q, lr];
    if (test === 'spanne_vor' || test === 'spanne_rueck') return [{ name: 'Längste richtige Folge', wert: spanne(run), einheit: 'Ziffern', besserHoeher: true }, q];
    if (test === 'woerter' || test === 'reihen') return [q, rt];
    if (test === 'gesichtsfeld') {
      var pk = gesichtsfeldPunkte(run), n = 0, g = 0, li = [0, 0], re = [0, 0];
      Object.keys(pk).forEach(function (k) { var x = pk[k]; n++; if (x.gesehen) g++; var links = x.w > 90 && x.w < 270, rechts = x.w < 90 || x.w > 270; if (links) { li[1]++; if (x.gesehen) li[0]++; } if (rechts) { re[1]++; if (x.gesehen) re[0]++; } });
      return [{ name: 'Lichtpunkte gesehen', wert: n ? g / n : null, einheit: '%', besserHoeher: true }, { name: 'links / rechts gesehen', wert: li[0] + '/' + li[1] + ' · ' + re[0] + '/' + re[1], einheit: '', text: true }];
    }
    return [q];
  }
  function format(k) {
    if (k.wert === null || k.wert === undefined) return '–';
    if (k.text) return String(k.wert);
    if (k.einheit === '%') return HT.prozent(k.wert);
    if (k.einheit === 'ms') return Math.round(k.wert) + ' ms';
    return k.wert + ' ' + k.einheit;
  }
  function vergleich(akt, erst) {
    if (!erst || akt.text || akt.wert === null || erst.wert === null || akt.wert === undefined || erst.wert === undefined || !erst.wert) return '';
    var d = (akt.wert - erst.wert) / Math.abs(erst.wert), besser = akt.besserHoeher ? d > 0.02 : d < -0.02, schlechter = akt.besserHoeher ? d < -0.02 : d > 0.02;
    var pfeil = besser ? '<span class="sc-besser">▲</span>' : schlechter ? '<span class="sc-schlechter">▼</span>' : '<span class="sc-gleich">▶</span>';
    return pfeil + ' ' + (d > 0 ? '+' : '') + Math.round(d * 100) + ' %';
  }
  /* Regeltabelle für Trainingsempfehlungen */
  function empfehlungen(runs) {
    var e = [], add = function (ids, grund) { e.push({ module: ids, grund: grund }); };
    var r = runs.reaktion, w = runs.reaktion_warnton, g = runs.geteilt, su = runs.suche, sv = runs.spanne_vor, sr = runs.spanne_rueck, wo = runs.woerter, re = runs.reihen, gf = runs.gesichtsfeld;
    if ((r && (r.rtMedian > 600 || r.quote < 0.8)) || (w && w.rtMedian > 550)) add(['reaktion', 'wahlreaktion', 'regel-reaktion'], 'verlangsamte oder unsichere Reaktion');
    if (g && g.quote < 0.75) add(['geteilte-aufmerksamkeit', 'strassenverkehr'], 'geteilte Aufmerksamkeit unter 75 %');
    if (su && (su.rtMedian > 2500 || su.quote < 0.85)) add(['zahlenfeld', 'selektive-aufmerksamkeit', 'visuelle-exploration'], 'langsame oder ungenaue visuelle Suche');
    if (su && Math.abs((su.trefferLinks || 0) - (su.trefferRechts || 0)) > Math.max(3, ((su.trefferLinks || 0) + (su.trefferRechts || 0)) * 0.3)) add(['visuelle-exploration', 'neglect-training'], 'deutlicher Links-Rechts-Unterschied bei der Suche');
    if ((sv && spanne(sv) < 5) || (sr && spanne(sr) < 4)) add(['zahlenspanne', 'arbeitsgedaechtnis'], 'Merkspanne unter 5 (vorwärts) bzw. 4 (rückwärts)');
    if (wo && wo.quote < 0.75) add(['wortlisten', 'bilder-wiedererkennen', 'telefonnotiz'], 'Wiedererkennen unter 75 %');
    if (re && re.quote < 0.7) add(['reihen-fortsetzen', 'regeln-wechseln', 'denksport'], 'logisches Schlussfolgern unter 70 %');
    if (gf) {
      var k = kennwerte('gesichtsfeld', gf), pk = gesichtsfeldPunkte(gf), li = 0, liN = 0, rn = 0, rnN = 0;
      Object.keys(pk).forEach(function (x) { var p = pk[x]; if (p.w > 90 && p.w < 270) { liN++; if (!p.gesehen) li++; } else if (p.w < 90 || p.w > 270) { rnN++; if (!p.gesehen) rn++; } });
      if ((liN && li / liN > 0.25) || (rnN && rn / rnN > 0.25)) add(['gesichtsfeld', 'sakkaden', 'visuelle-exploration'], 'mehr als ein Viertel der Lichtpunkte auf einer Seite nicht gesehen – augenärztliche Abklärung empfehlen');
      else if (k[0] && k[0].wert !== null && k[0].wert < 0.85) add(['gesichtsfeld', 'sakkaden'], 'einzelne Lichtpunkte nicht gesehen');
    }
    return e;
  }

  var SC = HT.screening = {
    TESTS: TESTS,
    HINWEIS: HINWEIS,
    starten: function (p) {
      var inhalt = HT.el('div');
      inhalt.appendChild(HT.el('p', { class: 'dialog-text' }, 'Das Screening besteht aus ' + TESTS.length + ' kurzen Tests (zusammen etwa 15–20 Minuten): ' + TESTS.map(function (t) { return t.name; }).join(', ') + '.'));
      inhalt.appendChild(HT.el('p', { class: 'klein', style: { background: '#fff7e2', border: '1px solid #f1dca2', borderRadius: '10px', padding: '.6rem .8rem' } }, HINWEIS));
      UI.dialog({ titel: 'Screening starten', inhalt: inhalt, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: 'Screening starten', art: 'primaer', wert: true }] }).then(function (ok) {
        if (!ok) return;
        HT.session.starten({
          vonArbeitsplatz: true, patientId: p.id, nonstop: false, screening: { id: HT.uid('scr') },
          eintraege: TESTS.filter(function (t) { return HT.Module.map[t.modulId]; }).map(function (t) { return { modulId: t.modulId, test: t.test, dauerSek: t.dauerSek, dauerMin: t.dauerSek / 60, startLevel: t.startLevel, parameterOverrides: HT.kopie(t.parameterOverrides || {}) }; })
        });
      });
    },
    vorhanden: function (p) { return S.alle('runs', function (r) { return r.patientId === p.id && r.screening; }).length > 0; },
    /* Alle Screenings eines Klienten: [{ id, datum, runs: { test: run } }] (älteste zuerst) */
    durchlaeufe: function (p) {
      var g = {};
      S.alle('runs', function (r) { return r.patientId === p.id && r.screening; }).forEach(function (r) {
        var x = g[r.screening] || (g[r.screening] = { id: r.screening, datum: r.start, runs: {} });
        x.datum = Math.min(x.datum, r.start); if (r.screeningTest) x.runs[r.screeningTest] = r;
      });
      return Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return a.datum - b.datum; });
    },
    kennwerte: kennwerte,
    empfehlungen: empfehlungen
  };

  function feldKarte(run) {
    var pk = gesichtsfeldPunkte(run), s = '<svg viewBox="-160 -160 320 320" class="sc-feld" xmlns="http://www.w3.org/2000/svg"><circle r="150" fill="#f5f8fa" stroke="#d6e0e6"/><circle r="100" fill="none" stroke="#e1e8ed"/><circle r="50" fill="none" stroke="#e1e8ed"/><path d="M-150 0 H150 M0 -150 V150" stroke="#e1e8ed"/><circle r="5" fill="#F2C230"/>';
    Object.keys(pk).forEach(function (k) { var p = pk[k], r = p.ring * 48, a = p.w * Math.PI / 180; s += '<circle cx="' + (Math.cos(a) * r).toFixed(1) + '" cy="' + (-Math.sin(a) * r).toFixed(1) + '" r="11" fill="' + (p.gesehen ? '#2EAD6B' : '#E25C5C') + '" stroke="#fff" stroke-width="2"/>'; });
    return s + '<text x="-150" y="155" font-size="12" fill="#7d8a94">links</text><text x="120" y="155" font-size="12" fill="#7d8a94">rechts</text></svg>';
  }

  /* Bericht „Screening-Verlauf“ */
  HT.route('/screening/:id', function (param, w) {
    var p = S.finde('patients', param.id);
    if (!p) { w.appendChild(UI.leer('Klient nicht gefunden.')); return; }
    var alle = SC.durchlaeufe(p);
    w.appendChild(UI.seite('Screening-Verlauf', HT.patienten.anzeigename(p) + ' · ' + alle.length + ' Screening' + (alle.length === 1 ? '' : 's'), [
      UI.knopf('Drucken / PDF', { art: 'primaer', icon: 'drucker', klick: function () { HT.audit('Bericht drucken (Screening)', p); window.print(); } })
    ]));
    var papier = HT.el('div', { class: 'bericht-papier sc-papier' });
    papier.appendChild(HT.el('div', { class: 'bericht-kopf', html: '<div><h1>Screening-Verlauf</h1><div class="gedimmt">' + HT.esc(HT.patienten.anzeigename(p)) + (p.pseudonym ? ' · ' + HT.esc(p.pseudonym) : '') + ' · erstellt am ' + HT.datum(Date.now()) + '</div></div>' }));
    papier.appendChild(HT.el('p', { class: 'sc-hinweis' }, HINWEIS));
    if (!alle.length) { papier.appendChild(UI.leer('Für diesen Klienten gibt es noch kein Screening. Start im Arbeitsplatz, Reiter „Screening“.', 'ziel')); w.appendChild(papier); return; }
    var erst = alle[0], akt = alle[alle.length - 1];
    papier.appendChild(HT.el('p', null, 'Aktuelles Screening: ' + HT.datumZeit(akt.datum) + (alle.length > 1 ? ' · Vergleich mit dem ersten Screening vom ' + HT.datum(erst.datum) : ' · (erstes Screening – Vergleiche folgen beim nächsten Mal)')));
    var tab = '<table class="tabelle sc-tabelle"><thead><tr><th>Test</th><th>Kennwert</th><th>Aktuell</th>' + (alle.length > 1 ? '<th>Erstes Screening</th><th>Veränderung</th>' : '') + '</tr></thead><tbody>';
    TESTS.forEach(function (t) {
      var ka = kennwerte(t.test, akt.runs[t.test]), ke = alle.length > 1 ? kennwerte(t.test, erst.runs[t.test]) : [];
      if (!ka.length) { tab += '<tr><td>' + HT.esc(t.name) + '</td><td colspan="' + (alle.length > 1 ? 4 : 2) + '" class="gedimmt">nicht durchgeführt</td></tr>'; return; }
      ka.forEach(function (k, i) {
        var e = ke[i];
        tab += '<tr><td>' + (i === 0 ? '<b>' + HT.esc(t.name) + '</b>' : '') + '</td><td>' + HT.esc(k.name) + '</td><td>' + format(k) + '</td>' + (alle.length > 1 ? '<td>' + (e ? format(e) : '–') + '</td><td>' + (e ? vergleich(k, e) : '') + '</td>' : '') + '</tr>';
      });
    });
    papier.appendChild(HT.el('div', { html: tab + '</tbody></table>' }));
    var unten = HT.el('div', { class: 'sc-unten' });
    if (akt.runs.gesichtsfeld) unten.appendChild(HT.el('div', { class: 'sc-feldbox', html: '<h3>Gesichtsfeld-Kurzcheck</h3>' + feldKarte(akt.runs.gesichtsfeld) + '<p class="klein gedimmt">Grün = gesehen, rot = nicht gesehen. Ersetzt keine augenärztliche Perimetrie.</p>' }));
    var emp = empfehlungen(akt.runs), eb = HT.el('div', { class: 'sc-empfehlung' });
    eb.appendChild(HT.el('h3', null, 'Trainingsempfehlungen'));
    if (!emp.length) eb.appendChild(HT.el('p', null, 'Keine Auffälligkeiten nach der Regeltabelle. Training nach Therapieziel.'));
    emp.forEach(function (x) { eb.appendChild(HT.el('p', { html: '<b>' + x.module.map(function (id) { var m = HT.Module.map[id]; return m ? HT.esc(m.name) : id; }).join(', ') + '</b><br><span class="gedimmt">' + HT.esc(x.grund) + '</span>' })); });
    unten.appendChild(eb);
    papier.appendChild(unten);
    if (alle.length > 2) papier.appendChild(HT.el('p', { class: 'klein gedimmt' }, 'Weitere Screenings: ' + alle.slice(1, -1).map(function (x) { return HT.datum(x.datum); }).join(', ')));
    w.appendChild(papier);
  }, { nav: 'patienten' });
})();
