/* Hirntraining – Berichte (Druckansicht A4, PDF über den Browserdruck) und CSV-Export */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;
  var TAG = 86400000;

  var B = HT.berichte = {};

  /* ---------- Berichtsvorlagen (Textbausteine mit Platzhaltern) ---------- */
  B.PLATZHALTER = ['name', 'vorname', 'nachname', 'pseudonym', 'geburtsjahr', 'diagnose', 'icd10', 'betroffeneSeite', 'zeitraum', 'sitzungen', 'trainingszeit', 'module', 'quote', 'therapeut', 'praxis', 'datum', 'krankenkasse', 'verordnung', 'arzt'];
  B.STANDARD_VORLAGE = {
    id: 'standard', name: 'Standard-Arztbrief',
    text1: 'Sehr geehrte Damen und Herren,\n\nwir berichten über das computergestützte Hirnleistungstraining von {{name}} (Jg. {{geburtsjahr}}), Diagnose: {{diagnose}}, im Zeitraum {{zeitraum}}.',
    text2: 'Es fanden {{sitzungen}} Trainingssitzungen mit insgesamt {{trainingszeit}} effektiver Trainingszeit statt. Trainiert wurden: {{module}}. Die durchschnittliche Trefferquote lag bei {{quote}}.',
    text3: 'Wir empfehlen die Fortführung des Trainings. Für Rückfragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen\n{{therapeut}}\n{{praxis}}'
  };
  B.vorlagen = function () { var v = S.einstellungen().berichtsvorlagen; return v && v.length ? v : [B.STANDARD_VORLAGE]; };
  B.ersetzen = function (text, p, ctx) {
    var werte = {
      name: HT.patienten.anzeigename(p, ctx.pseudo), vorname: ctx.pseudo ? '' : (p.vorname || ''), nachname: ctx.pseudo ? '' : (p.nachname || ''), pseudonym: p.pseudonym || '',
      geburtsjahr: ctx.pseudo ? '–' : (p.geburtsjahr || '–'), diagnose: p.diagnose || '–', icd10: p.icd10 || '', betroffeneSeite: p.betroffeneSeite || '–',
      zeitraum: ctx.zeitraum, sitzungen: String(ctx.sitzungen), trainingszeit: ctx.trainingszeit, module: ctx.module || '–', quote: ctx.quote,
      therapeut: HT.auth.aktuell ? HT.auth.aktuell.name : '', praxis: S.einstellungen().praxisname, datum: HT.datum(Date.now()),
      krankenkasse: p.krankenkasse || '–', verordnung: p.verordnung || '–', arzt: p.arzt || '–'
    };
    return String(text || '').replace(/\{\{(\w+)\}\}/g, function (m, k) { return werte.hasOwnProperty(k) ? werte[k] : m; });
  };

  /* CSV-Export: Durchgänge (eine Zeile je Durchgang) */
  B.csvDurchgaenge = function (p, pseudo) {
    var name = HT.patienten.anzeigename(p, pseudo);
    var zeilen = [['Patient', 'Pseudonym', 'Datum', 'Uhrzeit', 'Modul', 'Kategorie', 'Level', 'Level danach', 'Dauer (s)', 'Treffer', 'Fehler', 'Auslassungen', 'Trefferquote', 'RT Mittel (ms)', 'RT Median (ms)', 'RT Streuung (ms)', 'Treffer links', 'Treffer rechts', 'Auslassungen links', 'Auslassungen rechts', 'RT links (ms)', 'RT rechts (ms)']];
    S.alle('runs', function (r) { return r.patientId === p.id; }).forEach(function (r) {
      var m = HT.Module.map[r.modulId];
      var d = new Date(r.start);
      zeilen.push([name, p.pseudonym, HT.datum(r.start), HT.pad(d.getHours()) + ':' + HT.pad(d.getMinutes()), m ? m.name : r.modulId, m ? HT.kategorie(m.kategorie).name : '',
        r.level, r.levelNachher, r.dauerSek, r.treffer, r.fehler, r.auslassungen, r.quote === null ? '' : Math.round(r.quote * 1000) / 10,
        rund(r.rtMittel), rund(r.rtMedian), rund(r.rtStreuung), r.trefferLinks, r.trefferRechts, r.auslassungenLinks, r.auslassungenRechts, rund(r.rtLinks), rund(r.rtRechts)]);
    });
    return HT.csv(zeilen);
  };
  /* CSV-Export: Rohdaten (eine Zeile je Reiz/Reaktion) */
  B.csvRohdaten = function (p, pseudo) {
    var name = HT.patienten.anzeigename(p, pseudo);
    var zeilen = [['Patient', 'Datum', 'Modul', 'Level', 'Zeit im Durchgang (ms)', 'Reiz', 'Reaktion', 'Korrekt', 'Auslassung', 'RT (ms)', 'Seite', 'Typ']];
    S.alle('runs', function (r) { return r.patientId === p.id; }).forEach(function (r) {
      var m = HT.Module.map[r.modulId];
      (r.rohdaten || []).forEach(function (e) {
        zeilen.push([name, HT.datumZeit(r.start), m ? m.name : r.modulId, r.level, e.zeit, e.reiz === undefined ? '' : String(e.reiz), e.reaktion === undefined ? '' : String(e.reaktion), e.korrekt ? 'ja' : 'nein', e.auslassung ? 'ja' : 'nein', e.rtMs, e.seite, e.typ]);
      });
    });
    return HT.csv(zeilen);
  };
  function rund(v) { return v === null || v === undefined ? '' : Math.round(v); }
  function dateiname(p, pseudo, art) { return 'hirntraining-' + art + '-' + (pseudo ? p.pseudonym : HT.patienten.anzeigename(p)).replace(/[^A-Za-z0-9ÄÖÜäöüß\-]+/g, '_') + '-' + HT.isoDatum(Date.now()) + '.csv'; }

  /* Reiter „Berichte“ in der Patientenakte */
  B.reiter = function (p, w) {
    var g = HT.el('div', { class: 'raster raster-2' });
    g.appendChild(UI.karte('Bericht erstellen', [
      HT.el('p', { class: 'gedimmt' }, 'Druckansicht mit Praxislogo, Patientendaten, Trainingsplan, Verlaufsdiagrammen und Kommentar. Speichern als PDF über „Drucken → Als PDF sichern“.'),
      UI.knopf('Bericht öffnen', { art: 'primaer', icon: 'dokument', klick: function () { location.hash = '#/bericht/' + p.id; } })
    ], { icon: 'dokument' }));
    g.appendChild(UI.karte('Leistungsbericht für Kostenträger', [
      HT.el('p', { class: 'gedimmt' }, 'Kurzer Leistungsnachweis: trainierte Module, Beginn und Ende, Anzahl der Sitzungen, effektive Trainingszeit und erreichtes Level – mit Kostenträgerdaten aus den Stammdaten.'),
      UI.knopf('Leistungsbericht öffnen', { icon: 'drucker', klick: function () { location.hash = '#/leistungsbericht/' + p.id; } })
    ], { icon: 'schild' }));
    var pseudo = HT.el('input', { type: 'checkbox', class: 'schalter' });
    pseudo.checked = !!S.einstellungen().pseudonymStandard;
    g.appendChild(UI.karte('CSV-Export (Excel)', [
      HT.el('p', { class: 'gedimmt' }, 'Semikolon-getrennt, UTF-8 mit BOM – öffnet sich direkt in Excel oder Numbers.'),
      HT.el('label', { class: 'feld feld-schalter', style: { marginBottom: '.8rem' } }, [pseudo, HT.el('span', { class: 'feld-label' }, 'Pseudonymisiert exportieren')]),
      HT.el('div', { class: 'knopf-gruppe' }, [
        UI.knopf('Durchgänge', { icon: 'download', klick: function () { HT.herunterladen(dateiname(p, pseudo.checked, 'durchgaenge'), B.csvDurchgaenge(p, pseudo.checked), 'text/csv;charset=utf-8'); } }),
        UI.knopf('Rohdaten', { icon: 'download', klick: function () { HT.herunterladen(dateiname(p, pseudo.checked, 'rohdaten'), B.csvRohdaten(p, pseudo.checked), 'text/csv;charset=utf-8'); } })
      ])
    ], { icon: 'download' }));
    w.appendChild(g);
  };

  /* ===================== Berichtsseite ===================== */
  HT.route('/bericht/:id', function (param, w) {
    var p = S.finde('patients', param.id);
    if (!p) { w.appendChild(UI.leer('Patient nicht gefunden.')); return; }
    var e = S.einstellungen();
    var opt = {
      von: HT.isoDatum(Date.now() - 30 * TAG), bis: HT.isoDatum(Date.now()),
      pseudo: !!e.pseudonymStandard, kommentar: '', diagramme: true, rohtabelle: true, zusammenfassung: true, ziele: true, icf: true, vorlage: ''
    };
    w.appendChild(HT.el('div', { class: 'brotkrumen', html: '<a href="#/patienten">Patienten</a> / <a href="#/patient/' + p.id + '/berichte">' + HT.esc(HT.patienten.anzeigename(p)) + '</a> / Bericht' }));
    w.appendChild(UI.seite('Bericht', null, [
      UI.knopf('Zurück', { icon: 'links', klick: function () { location.hash = '#/patient/' + p.id + '/berichte'; } }),
      UI.knopf('Drucken / PDF', { art: 'primaer', icon: 'drucker', klick: function () { window.print(); } })
    ]));
    var layout = HT.el('div', { class: 'bericht-layout' });
    var optionen = UI.karte('Optionen', null, { klasse: 'bericht-optionen', icon: 'filter' });
    var f = UI.formular([
      { name: 'von', label: 'Zeitraum von', typ: 'datum' },
      { name: 'bis', label: 'bis', typ: 'datum' },
      { name: 'pseudo', label: 'Pseudonymisieren (Name durch Pseudonym ersetzen)', typ: 'schalter', breit: true },
      { name: 'vorlage', label: 'Arztbrief-Textbausteine', typ: 'auswahl', breit: true, optionen: [{ wert: '', label: '– keine (reiner Verlaufsbericht) –' }].concat(B.vorlagen().map(function (v) { return { wert: v.id, label: v.name }; })) },
      { name: 'zusammenfassung', label: 'Automatische Verlaufszusammenfassung', typ: 'schalter', breit: true },
      { name: 'ziele', label: 'Therapieziele (GAS)', typ: 'schalter', breit: true },
      { name: 'icf', label: 'ICF-Bezug der Module', typ: 'schalter', breit: true },
      { name: 'diagramme', label: 'Verlaufsdiagramme', typ: 'schalter', breit: true },
      { name: 'rohtabelle', label: 'Tabelle der Sitzungen', typ: 'schalter', breit: true },
      { name: 'kommentar', label: 'Kommentar der Therapeutin / des Therapeuten', typ: 'textarea', breit: true, zeilen: 6 }
    ], opt);
    f.el.addEventListener('input', HT.entprellen(function () { opt = HT.zusammen(opt, f.werte()); zeichnen(); }, 300));
    f.el.addEventListener('change', function () { opt = HT.zusammen(opt, f.werte()); zeichnen(); });
    optionen.appendChild(f.el);
    layout.appendChild(optionen);
    var papierWrap = HT.el('div');
    layout.appendChild(papierWrap);
    w.appendChild(layout);

    function zeichnen() {
      HT.leeren(papierWrap);
      var von = new Date(opt.von + 'T00:00:00').getTime(), bis = new Date(opt.bis + 'T00:00:00').getTime() + TAG - 1;
      var runs = HT.results.durchgaenge(p.id, von, bis);
      var sitz = S.alle('sessions', function (s) { return s.patientId === p.id && s.start >= von && s.start <= bis && s.status !== 'laufend'; });
      var papier = HT.el('div', { class: 'bericht-papier' });
      var th = S.finde('therapists', p.therapeutId);
      var vl = opt.vorlage ? B.vorlagen().filter(function (x) { return x.id === opt.vorlage; })[0] : null;
      var modNamen = []; runs.forEach(function (r) { var mm = HT.Module.map[r.modulId]; if (mm && modNamen.indexOf(mm.name) < 0) modNamen.push(mm.name); });
      var tmin = Math.round(HT.summe(runs.map(function (r) { return r.dauerSek || 0; })) / 60);
      var vctx = { pseudo: opt.pseudo, zeitraum: HT.datum(von) + ' – ' + HT.datum(bis), sitzungen: sitz.length, trainingszeit: (tmin >= 60 ? Math.floor(tmin / 60) + ' h ' + (tmin % 60) + ' min' : tmin + ' min'), module: modNamen.join(', '), quote: HT.prozent(HT.results.zusammenfassung(runs).quote) };
      var txt = function (t) { return t ? '<div class="bericht-text">' + HT.esc(B.ersetzen(t, p, vctx)).replace(/\n/g, '<br>') + '</div>' : ''; };
      papier.innerHTML =
        '<div class="bericht-kopf"><div><h1>' + (vl ? 'Arztbrief – Hirnleistungstraining' : 'Verlaufsbericht Hirnleistungstraining') + '</h1><div style="color:#51606b;margin-top:1.5mm">Zeitraum ' + HT.datum(von) + ' – ' + HT.datum(bis) + '</div></div>' +
        '<div class="bk-praxis">' + (e.logoDataUrl ? '<img src="' + e.logoDataUrl + '" alt=""><br>' : '') + '<strong>' + HT.esc(e.praxisname) + '</strong>' + HT.esc(e.praxisAdresse || '').replace(/\n/g, '<br>') + '</div></div>' +
        '<h2>Patient</h2><div class="bericht-daten">' +
        dz('Name', HT.patienten.anzeigename(p, opt.pseudo)) + dz('Pseudonym', p.pseudonym) +
        dz('Geburtsjahr', opt.pseudo ? '–' : (p.geburtsjahr || '–')) + dz('Geschlecht', { w: 'weiblich', m: 'männlich', d: 'divers' }[p.geschlecht] || '–') +
        dz('Diagnose', (p.diagnose || '–') + (p.icd10 ? ' (' + p.icd10 + ')' : '')) + dz('Betroffene Seite', p.betroffeneSeite || '–') +
        dz('Gesichtsfeld', p.gesichtsfeld || '–') + dz('Therapeut/in', th ? th.name : '–') + (p.krankenkasse ? dz('Kostenträger', p.krankenkasse + (p.versichertennummer && !opt.pseudo ? ' · ' + p.versichertennummer : '')) : '') + '</div>' +
        (vl ? txt(vl.text1) : '') +
        '<h2>Überblick</h2><div class="bericht-daten">' +
        dz('Sitzungen', String(sitz.length)) + dz('Durchgänge', String(runs.length)) +
        dz('Trainingszeit', Math.round(HT.summe(runs.map(function (r) { return r.dauerSek || 0; })) / 60) + ' Minuten') +
        dz('Ø Trefferquote', HT.prozent(HT.results.zusammenfassung(runs).quote)) + '</div>' +
        (opt.zusammenfassung ? '<h2>Zusammenfassung des Verlaufs</h2><div class="zusammenfassung">' + HT.results.textZusammenfassung(p, von, bis, opt.pseudo).map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>' : '') +
        (vl ? txt(vl.text2) : '');
      var ziele = HT.ziele.vonPatient(p).filter(function (z) { return z.status !== 'verworfen'; });
      if (opt.ziele && ziele.length) {
        papier.innerHTML += '<h2>Therapieziele</h2><table class="bericht-tabelle"><thead><tr><th>Ziel</th><th>Bereich</th><th>Status</th><th>Fortschritt</th><th>Letzte GAS-Bewertung</th></tr></thead><tbody>' +
          ziele.map(function (z) {
            var fs = HT.ziele.fortschritt(p, z), b = (z.bewertungen || []).slice(-1)[0];
            return '<tr><td>' + HT.esc(z.titel) + (z.icf ? '<br><small>ICF ' + HT.esc(z.icf) + '</small>' : '') + '</td><td>' + HT.esc(HT.kategorie(z.bereich).name) + '</td><td>' + HT.esc((HT.ziele.STATUS[z.status] || ['–'])[0]) + '</td><td>' + (fs ? HT.esc(fs.text) + ' (' + Math.round(fs.wert * 100) + ' %)' : '–') + '</td><td>' + (b ? HT.datum(b.datum) + ': ' + HT.esc(HT.ziele.gasText(b.gas)) + (b.kommentar ? '<br><small>' + HT.esc(b.kommentar) + '</small>' : '') : '–') + '</td></tr>';
          }).join('') + '</tbody></table>' + (HT.ziele.tWert(ziele) !== null ? '<p style="font-size:9.5pt;color:#51606b">GAS-T-Wert über alle bewerteten Ziele: <b>' + HT.ziele.tWert(ziele) + '</b> (50 = erwartete Zielerreichung, &gt; 50 besser, &lt; 50 schlechter als erwartet).</p>' : '');
      }
      var plan = HT.plaene.aktiverPlan(p.id);
      if (plan) {
        papier.innerHTML += '<h2>Aktueller Trainingsplan: ' + HT.esc(plan.name) + '</h2><table class="bericht-tabelle"><thead><tr><th>#</th><th>Modul</th><th>Bereich</th><th class="r">Dauer</th><th class="r">Startlevel</th></tr></thead><tbody>' +
          plan.eintraege.map(function (x, i) { var m = HT.Module.map[x.modulId]; return m ? '<tr><td>' + (i + 1) + '</td><td>' + HT.esc(m.name) + '</td><td>' + HT.esc(HT.kategorie(m.kategorie).name) + '</td><td class="r">' + x.dauerMin + ' min</td><td class="r">' + (x.startLevel === 'auto' ? 'automatisch' : x.startLevel) + '</td></tr>' : ''; }).join('') + '</tbody></table>';
      }
      // Ergebnisse je Modul
      var proModul = {};
      runs.forEach(function (r) { (proModul[r.modulId] = proModul[r.modulId] || []).push(r); });
      var ids = Object.keys(proModul);
      papier.appendChild(HT.el('h2', null, 'Ergebnisse je Modul'));
      if (!ids.length) papier.appendChild(HT.el('p', null, 'Im gewählten Zeitraum wurden keine Durchgänge durchgeführt.'));
      var tab = HT.el('table', { class: 'bericht-tabelle' });
      tab.innerHTML = '<thead><tr><th>Modul</th><th class="r">Durchg.</th><th class="r">Startlevel</th><th class="r">Akt. Level</th><th class="r">Quote</th><th class="r">Ø RT</th><th class="r">Treffer L / R</th></tr></thead>';
      var tb = HT.el('tbody');
      ids.forEach(function (id) {
        var m = HT.Module.map[id], zs = HT.results.zusammenfassung(proModul[id]);
        var inf = opt.icf && HT.modulInfo(id);
        tb.appendChild(HT.el('tr', { html: '<td>' + HT.esc(m ? m.name : id) + (inf ? '<br><small style="color:#8a97a1">ICF ' + inf.icf.join(', ') + '</small>' : '') + '</td><td class="r">' + zs.anzahl + '</td><td class="r">' + zs.levelStart + '</td><td class="r">' + zs.levelEnde + (m ? ' / ' + m.levels.length : '') + '</td><td class="r">' + HT.prozent(zs.quote) + '</td><td class="r">' + HT.ms(zs.rt) + '</td><td class="r">' + zs.trefferLinks + ' / ' + zs.trefferRechts + '</td>' }));
      });
      tab.appendChild(tb);
      if (ids.length) papier.appendChild(tab);
      papierWrap.appendChild(papier);

      if (opt.diagramme) ids.forEach(function (id) {
        var m = HT.Module.map[id]; if (!m) return;
        var tage = HT.results.proTag(proModul[id]);
        var block = HT.el('div', { class: 'bericht-modul' });
        block.appendChild(HT.el('h3', null, m.name));
        var dg = HT.el('div', { class: 'bericht-diagramme' });
        block.appendChild(dg);
        papier.appendChild(block);
        // Diagramme offscreen zeichnen und als Bild einsetzen (druckt zuverlässig)
        [['Level', function (h) { HT.charts.linie(h, { punkte: tage.map(function (t) { return { x: t.x, y: t.level }; }), yMin: 1, yMax: m.levels.length, treppe: true, hoehe: 170, yFormat: function (v) { return 'L' + Math.round(v); } }); }],
         ['Trefferquote', function (h) { HT.charts.linie(h, { punkte: tage.map(function (t) { return { x: t.x, y: t.quote === null ? null : t.quote * 100 }; }), yMin: 0, yMax: 100, hoehe: 170, farbe: '#2EAD6B', yFormat: function (v) { return Math.round(v) + '%'; } }); }]
        ].forEach(function (d) {
          var halter = HT.el('div', { style: { position: 'absolute', left: '-9999px', width: '330px' } });
          document.body.appendChild(halter);
          d[1](halter);
          var src = HT.charts.alsBild(halter);
          halter.remove();
          dg.appendChild(HT.el('div', null, [HT.el('div', { class: 'klein', style: { color: '#51606b', marginBottom: '1mm' } }, d[0]), HT.el('img', { src: src, alt: d[0] })]));
        });
      });

      if (opt.rohtabelle && sitz.length) {
        papier.appendChild(HT.el('h2', null, 'Sitzungen'));
        var t2 = HT.el('table', { class: 'bericht-tabelle' });
        t2.innerHTML = '<thead><tr><th>Datum</th><th class="r">Dauer</th><th>Module</th><th class="r">Ø Quote</th><th>Befinden vor → nach</th><th>Notiz</th></tr></thead><tbody>' +
          sitz.map(function (s) {
            var rs = runs.filter(function (r) { return r.sessionId === s.id; });
            var namen = []; rs.forEach(function (r) { var m = HT.Module.map[r.modulId]; if (m && namen.indexOf(m.name) < 0) namen.push(m.name); });
            return '<tr><td>' + HT.datumZeit(s.start) + '</td><td class="r">' + (s.ende ? Math.round((s.ende - s.start) / 60000) + ' min' : '–') + '</td><td>' + HT.esc(namen.join(', ')) + '</td><td class="r">' + HT.prozent(HT.results.zusammenfassung(rs).quote) + '</td><td>' + befTxt(s) + '</td><td><small>' + HT.esc(s.notiz || '') + '</small></td></tr>';
          }).join('') + '</tbody>';
        papier.appendChild(t2);
      }
      if (opt.kommentar || !vl) { papier.appendChild(HT.el('h2', null, 'Kommentar')); papier.appendChild(HT.el('div', { class: 'bericht-kommentar' }, opt.kommentar || ' ')); }
      if (vl && vl.text3) papier.appendChild(HT.el('div', { html: txt(vl.text3) }));
      papier.appendChild(HT.el('div', { class: 'bericht-fuss', html: '<div>Erstellt am ' + HT.datum(Date.now()) + '<br>' + HT.esc(HT.auth.aktuell ? HT.auth.aktuell.name : '') + '</div><div class="unterschrift">Unterschrift</div>' }));
    }
    function befTxt(s) {
      var v = s.befindenVor || {}, n = s.befindenNach || {};
      if (!v.stimmung && !n.stimmung) return '–';
      return 'Stimmung ' + (v.stimmung || '–') + ' → ' + (n.stimmung || '–') + (n.anstrengung ? ', Anstrengung ' + n.anstrengung : '') + '<small> (1–5)</small>';
    }
    function dz(l, v) { return '<div><span>' + HT.esc(l) + '</span><strong>' + HT.esc(v) + '</strong></div>'; }
    zeichnen();
  }, { nav: 'patienten' });
})();

/* Leistungsbericht (Leistungsnachweis für Kostenträger) */
(function () {
  'use strict';
  var HT = window.HT, S = HT.storage, UI = HT.ui;
  HT.route('/leistungsbericht/:id', function (param, w) {
    var p = S.finde('patients', param.id);
    if (!p) { w.appendChild(UI.leer('Patient nicht gefunden.')); return; }
    var e = S.einstellungen();
    var opt = { kasse: true, nummer: true, verordnung: true, geburtsjahr: true, pseudo: false };
    w.appendChild(HT.el('div', { class: 'brotkrumen', html: '<a href="#/patienten">Patienten</a> / <a href="#/patient/' + p.id + '/berichte">' + HT.esc(HT.patienten.anzeigename(p)) + '</a> / Leistungsbericht' }));
    w.appendChild(UI.seite('Leistungsbericht', 'Leistungsnachweis für Kostenträger', [UI.knopf('Zurück', { icon: 'links', klick: function () { location.hash = '#/patient/' + p.id + '/berichte'; } }), UI.knopf('Drucken / PDF', { art: 'primaer', icon: 'drucker', klick: function () { window.print(); } })]));
    var layout = HT.el('div', { class: 'bericht-layout' });
    var f = UI.formular([
      { typ: 'titel', label: 'Im Ausdruck anzeigen' },
      { name: 'kasse', label: 'Krankenkasse / Kostenträger', typ: 'schalter', breit: true },
      { name: 'nummer', label: 'Versichertennummer', typ: 'schalter', breit: true },
      { name: 'verordnung', label: 'Verordnung und Ärztin/Arzt', typ: 'schalter', breit: true },
      { name: 'geburtsjahr', label: 'Geburtsjahr', typ: 'schalter', breit: true },
      { name: 'pseudo', label: 'Pseudonymisieren', typ: 'schalter', breit: true }
    ], opt);
    f.el.addEventListener('change', function () { opt = f.werte(); zeichnen(); });
    layout.appendChild(UI.karte('Optionen', f.el, { klasse: 'bericht-optionen', icon: 'filter' }));
    var wrap = HT.el('div'); layout.appendChild(wrap);
    w.appendChild(layout);
    function zeichnen() {
      HT.leeren(wrap);
      var runs = S.alle('runs', function (r) { return r.patientId === p.id && !r.einstufung; });
      var proModul = {};
      runs.forEach(function (r) { (proModul[r.modulId] = proModul[r.modulId] || []).push(r); });
      var zeilen = Object.keys(proModul).map(function (id) {
        var rs = proModul[id], m = HT.Module.map[id], ses = {};
        rs.forEach(function (r) { ses[r.sessionId] = true; });
        var zs = HT.results.zusammenfassung(rs);
        return '<tr><td>' + HT.esc(m ? m.name : id) + '</td><td>' + HT.datum(rs[0].start) + '</td><td>' + HT.datum(rs[rs.length - 1].start) + '</td><td class="r">' + Object.keys(ses).length + '</td><td class="r">' + Math.floor(zs.dauer / 3600) + ' h ' + Math.round((zs.dauer % 3600) / 60) + ' min</td><td class="r">' + zs.levelEnde + ' / ' + (m ? m.levels.length : '–') + '</td></tr>';
      }).join('');
      var gesamt = HT.summe(runs.map(function (r) { return r.dauerSek || 0; }));
      var alleSes = {}; runs.forEach(function (r) { alleSes[r.sessionId] = true; });
      var d = function (l, v) { return '<div><span>' + HT.esc(l) + '</span><strong>' + HT.esc(v || '–') + '</strong></div>'; };
      var papier = HT.el('div', { class: 'bericht-papier' });
      papier.innerHTML = '<div class="bericht-kopf"><div><h1>Leistungsbericht</h1><div style="color:#51606b;margin-top:1.5mm">Computergestütztes Hirnleistungstraining</div></div><div class="bk-praxis">' + (e.logoDataUrl ? '<img src="' + e.logoDataUrl + '" alt=""><br>' : '') + '<strong>' + HT.esc(e.praxisname) + '</strong>' + HT.esc(e.praxisAdresse || '').replace(/\n/g, '<br>') + '</div></div>' +
        '<h2>Patient</h2><div class="bericht-daten">' + d('Name', HT.patienten.anzeigename(p, opt.pseudo)) + d('Pseudonym', p.pseudonym) +
        (opt.geburtsjahr && !opt.pseudo ? d('Geburtsjahr', String(p.geburtsjahr || '–')) : '') + (opt.kasse ? d('Kostenträger', p.krankenkasse) : '') + (opt.nummer && !opt.pseudo ? d('Versichertennummer', p.versichertennummer) : '') +
        (opt.verordnung ? d('Verordnung', p.verordnung) + d('Verordnende/r Ärztin/Arzt', p.arzt) : '') + d('Diagnose', (p.diagnose || '–') + (p.icd10 ? ' (' + p.icd10 + ')' : '')) +
        d('Behandlungszeitraum', (p.behandlungsbeginn ? HT.datum(new Date(p.behandlungsbeginn + 'T12:00:00').getTime()) : (runs[0] ? HT.datum(runs[0].start) : '–')) + ' – ' + (p.behandlungsende ? HT.datum(new Date(p.behandlungsende + 'T12:00:00').getTime()) : 'laufend')) + '</div>' +
        '<h2>Erbrachte Leistungen</h2><table class="bericht-tabelle"><thead><tr><th>Modul</th><th>Beginn</th><th>Ende</th><th class="r">Sitzungen</th><th class="r">Effektive Trainingszeit</th><th class="r">Erreichtes Level</th></tr></thead><tbody>' + (zeilen || '<tr><td colspan="6">Noch keine Trainingsdaten.</td></tr>') + '</tbody></table>' +
        '<p style="margin-top:4mm">Gesamt: <b>' + Object.keys(alleSes).length + ' Sitzungen</b>, effektive Trainingszeit <b>' + Math.floor(gesamt / 3600) + ' h ' + Math.round((gesamt % 3600) / 60) + ' min</b>.</p>' +
        '<div class="bericht-fuss"><div>' + HT.esc(e.praxisname) + ', ' + HT.datum(Date.now()) + '<br>' + HT.esc(HT.auth.aktuell ? HT.auth.aktuell.name : '') + '</div><div class="unterschrift">Unterschrift / Stempel</div></div>';
      wrap.appendChild(papier);
    }
    zeichnen();
  }, { nav: 'patienten' });
})();
