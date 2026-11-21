/* Hirntraining – Patientenverwaltung: Logik, Liste und Patientenakte */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var P = HT.patienten = {
    sichtbar: function (p) {
      var t = HT.auth.aktuell;
      if (!t || t.rolle === 'admin' || !S.einstellungen().nurEigenePatienten) return true;
      return p.therapeutId === t.id || p.weitererTherapeutId === t.id || (p.zusaetzlicheTherapeuten || []).indexOf(t.id) >= 0;
    },
    alle: function (mitArchiv) {
      return S.alle('patients', function (p) { return (mitArchiv || !p.archiviert) && P.sichtbar(p); })
        .sort(function (a, b) { return P.anzeigename(a).localeCompare(P.anzeigename(b)); });
    },
    anzeigename: function (p, pseudonym) {
      if (!p) return '–';
      if (pseudonym) return p.pseudonym;
      var n = [p.vorname, p.nachname].filter(Boolean).join(' ');
      return n || p.pseudonym;
    },
    naechstesPseudonym: function () {
      var max = 0;
      S.alle('patients').forEach(function (p) { var m = /^P-(\d+)$/.exec(p.pseudonym || ''); if (m) max = Math.max(max, Number(m[1])); });
      return 'P-' + HT.pad(max + 1, 3);
    },
    speichern: function (p) {
      if (!p.id) { p.angelegtAm = Date.now(); p.pseudonym = p.pseudonym || P.naechstesPseudonym(); }
      p.einstellungen = HT.zusammen({ schriftgroesse: 100, kontrast: false, ton: true, eingabe: 'maus' }, p.einstellungen || {});
      return S.put('patients', p);
    },
    loeschen: function (p) {
      var ops = [S.delete('patients', p.id)];
      S.alle('runs', function (r) { return r.patientId === p.id; }).forEach(function (r) { ops.push(S.delete('runs', r.id)); });
      S.alle('sessions', function (r) { return r.patientId === p.id; }).forEach(function (r) { ops.push(S.delete('sessions', r.id)); });
      S.alle('plans', function (r) { return r.patientId === p.id; }).forEach(function (r) { ops.push(S.delete('plans', r.id)); });
      S.alle('moduleState', function (r) { return r.patientId === p.id; }).forEach(function (r) { ops.push(S.delete('moduleState', r.id)); });
      return Promise.all(ops);
    },
    entlassen: function (p) { return !!p.archiviert || (p.behandlungsende && p.behandlungsende < HT.isoDatum(Date.now())); },
    therapeutName: function (id) { var t = S.finde('therapists', id); return t ? t.name : '–'; },
    letztesTraining: function (pid) {
      var s = S.alle('sessions', function (x) { return x.patientId === pid; });
      return s.length ? s[s.length - 1].start : 0;
    },
    /* Modulzustand (aktuelles Level, Automatik) */
    zustand: function (pid, mid) {
      var z = S.finde('moduleState', pid + '|' + mid);
      return z || { id: pid + '|' + mid, patientId: pid, modulId: mid, aktuellesLevel: 1, automatik: true, letzteDurchgaenge: [], hochSerie: 0 };
    }
  };

  /* Einzelnen Patienten mit allen Daten exportieren / importieren (Übergabe zwischen Macs) */
  P.exportieren = function (p) {
    var d = { format: 'hirntraining-patient', version: 1, erstellt: Date.now(), patient: HT.kopie(p) };
    ['plans', 'sessions', 'runs', 'moduleState'].forEach(function (st) { d[st] = HT.kopie(S.alle(st, function (x) { return x.patientId === p.id; })); });
    HT.herunterladen('hirntraining-patient-' + (p.pseudonym || 'export') + '-' + HT.isoDatum(Date.now()) + '.json', JSON.stringify(d), 'application/json');
    UI.toast('Patientendatei wurde heruntergeladen.', 'ok');
  };
  P.importieren = function () {
    HT.dateiLesen('.json,application/json').then(function (f) {
      if (!f) return;
      var d; try { d = JSON.parse(f.inhalt); } catch (e) { UI.toast('Datei nicht lesbar.', 'fehler'); return; }
      if (!d || d.format !== 'hirntraining-patient') { UI.toast('Keine Hirntraining-Patientendatei.', 'fehler'); return; }
      var vorhanden = S.finde('patients', d.patient.id);
      UI.bestaetigen((vorhanden ? 'Patient „' + P.anzeigename(d.patient) + '“ existiert bereits und wird mit den Daten aus der Datei aktualisiert. ' : 'Patient „' + P.anzeigename(d.patient) + '“ wird übernommen. ') + (d.runs || []).length + ' Durchgänge, ' + (d.sessions || []).length + ' Sitzungen.', { titel: 'Patient importieren', ja: 'Importieren' }).then(function (ok) {
        if (!ok) return;
        var p = d.patient;
        if (!S.finde('therapists', p.therapeutId) && HT.auth.aktuell) p.therapeutId = HT.auth.aktuell.id;
        var ops = [S.put('patients', p)];
        ['plans', 'sessions', 'runs', 'moduleState'].forEach(function (st) { (d[st] || []).forEach(function (x) { ops.push(S.put(st, x)); }); });
        Promise.all(ops).then(function () { UI.toast('Patient importiert.', 'ok'); location.hash = '#/patient/' + p.id + '/stammdaten'; });
      });
    });
  };

  var FELDER = function () {
    return [
      { typ: 'titel', label: 'Person' },
      { name: 'vorname', label: 'Vorname' },
      { name: 'nachname', label: 'Nachname' },
      { name: 'pseudonym', label: 'Pseudonym', hilfe: 'Ersetzt den Namen in pseudonymisierten Berichten und Exporten.' },
      { name: 'geburtsjahr', label: 'Geburtsjahr', typ: 'zahl', min: 1900, max: new Date().getFullYear() },
      { name: 'geschlecht', label: 'Geschlecht', typ: 'auswahl', optionen: [{ wert: '', label: '–' }, { wert: 'w', label: 'weiblich' }, { wert: 'm', label: 'männlich' }, { wert: 'd', label: 'divers' }] },
      { name: 'haendigkeit', label: 'Händigkeit', typ: 'auswahl', optionen: [{ wert: 'rechts', label: 'Rechtshänder' }, { wert: 'links', label: 'Linkshänder' }, { wert: 'beide', label: 'beidhändig' }] },
      { typ: 'titel', label: 'Klinische Angaben' },
      { name: 'diagnose', label: 'Diagnose', breit: true, platzhalter: 'z. B. Zustand nach Schlaganfall rechts' },
      { name: 'icd10', label: 'ICD-10 (optional)', platzhalter: 'z. B. I63.5' },
      { name: 'therapeutId', label: 'Zuständige/r Therapeut/in', typ: 'auswahl', optionen: HT.auth.therapeuten().map(function (t) { return { wert: t.id, label: t.name }; }) },
      { name: 'betroffeneSeite', label: 'Betroffene Seite (Neglect)', typ: 'auswahl', optionen: [{ wert: 'keine', label: 'keine' }, { wert: 'links', label: 'links' }, { wert: 'rechts', label: 'rechts' }] },
      { name: 'gesichtsfeld', label: 'Gesichtsfeld', typ: 'auswahl', optionen: [{ wert: 'frei', label: 'frei' }, { wert: 'links eingeschränkt', label: 'links eingeschränkt' }, { wert: 'rechts eingeschränkt', label: 'rechts eingeschränkt' }] },
      { name: 'weitererTherapeutId', label: 'Weitere/r Therapeut/in (Vertretung)', typ: 'auswahl', optionen: [{ wert: '', label: '–' }].concat(HT.auth.therapeuten().map(function (t) { return { wert: t.id, label: t.name }; })) },
      { name: 'schuljahre', label: 'Jahre Schule/Ausbildung (optional)', typ: 'zahl', min: 0, max: 30 },
      { typ: 'titel', label: 'Kostenträger & Behandlung' },
      { name: 'krankenkasse', label: 'Krankenkasse / Kostenträger' },
      { name: 'versichertennummer', label: 'Versichertennummer' },
      { name: 'verordnung', label: 'Verordnung / Rezept (optional)', platzhalter: 'z. B. 10 × Hirnleistungstraining' },
      { name: 'arzt', label: 'Verordnende/r Ärztin/Arzt (optional)' },
      { name: 'behandlungsbeginn', label: 'Beginn der Behandlung', typ: 'datum' },
      { name: 'behandlungsende', label: 'Ende der Behandlung (= entlassen)', typ: 'datum', hilfe: 'Nach diesem Datum erscheint der Patient unter „Entlassen“. Daten bleiben erhalten.' },
      { name: 'notizen', label: 'Notizen', typ: 'textarea', breit: true }
    ];
  };

  P.bearbeiten = function (p) {
    var neu = !p;
    p = p || { therapeutId: HT.auth.aktuell && HT.auth.aktuell.id, betroffeneSeite: 'keine', gesichtsfeld: 'frei', haendigkeit: 'rechts', pseudonym: P.naechstesPseudonym(), behandlungsbeginn: HT.isoDatum(Date.now()) };
    return UI.formularDialog(neu ? HT.t('neuer_patient') : 'Stammdaten bearbeiten', FELDER(), p, {
      breit: true,
      pruefen: function (w) { if (!w.vorname && !w.nachname && !w.pseudonym) return 'Bitte Name oder Pseudonym angeben.'; return null; }
    }).then(function (w) {
      if (!w) return null;
      var obj = HT.zusammen(p, w);
      return P.speichern(obj).then(function (x) { UI.toast(HT.t('gespeichert'), 'ok'); return x; });
    });
  };

  /* ===================== Patientenliste ===================== */
  HT.route('/patienten', function (param, w) {
    var filter = { text: '', therapeut: '', archiv: false };
    var neu = UI.knopf(HT.t('neuer_patient'), { art: 'primaer', icon: 'plus', klick: function () {
      P.bearbeiten().then(function (p) { if (p) location.hash = '#/patient/' + p.id + '/stammdaten'; });
    } });
    var imp = UI.knopf('Patient importieren', { icon: 'upload', klick: function () { P.importieren(); } });
    w.appendChild(UI.seite(HT.t('nav_patienten'), 'Alle Patientinnen und Patienten der Praxis', [imp, neu]));

    var leiste = HT.el('div', { class: 'werkzeugleiste' });
    var such = HT.el('div', { class: 'suchfeld', html: HT.icon('suche') });
    var inp = HT.el('input', { type: 'search', placeholder: 'Name, Pseudonym oder Diagnose suchen …' });
    such.appendChild(inp);
    var thSel = HT.el('select', { style: { width: 'auto', minWidth: '220px' } });
    thSel.appendChild(HT.el('option', { value: '' }, 'Alle Therapeuten'));
    HT.auth.therapeuten().forEach(function (t) { thSel.appendChild(HT.el('option', { value: t.id }, t.name)); });
    var seg = HT.el('div', { class: 'segment' });
    var b1 = HT.el('button', { type: 'button', class: 'aktiv' }, 'Aktiv');
    var b2 = HT.el('button', { type: 'button' }, 'Entlassen / Archiv');
    seg.appendChild(b1); seg.appendChild(b2);
    var ds = HT.el('label', { class: 'feld feld-schalter', style: { minHeight: '0', margin: '0 .3rem' } });
    var dsC = HT.el('input', { type: 'checkbox', class: 'schalter' });
    dsC.addEventListener('change', function () { filter.datenschutz = dsC.checked; rendern(); });
    ds.appendChild(dsC); ds.appendChild(HT.el('span', { class: 'feld-label' }, 'Datenschutz (Nachnamen kürzen)'));
    leiste.appendChild(such); leiste.appendChild(thSel); leiste.appendChild(seg); leiste.appendChild(ds);
    w.appendChild(leiste);
    var karte = UI.karte(null, null);
    w.appendChild(karte);

    function rendern() {
      HT.leeren(karte);
      var t = filter.text.toLowerCase();
      var liste = S.alle('patients', function (p) {
        if (P.entlassen(p) !== filter.archiv) return false;
        if (!P.sichtbar(p)) return false;
        if (filter.therapeut && p.therapeutId !== filter.therapeut) return false;
        if (t) {
          var heu = [p.vorname, p.nachname, p.pseudonym, p.diagnose, p.icd10].join(' ').toLowerCase();
          if (heu.indexOf(t) < 0) return false;
        }
        return true;
      });
      karte.appendChild(UI.tabelle([
        { titel: 'Name', sort: function (p) { return P.anzeigename(p).toLowerCase(); }, wert: function (p) {
          var d = HT.el('div', { class: 'zelle-name' });
          var nm = filter.datenschutz ? [p.vorname, p.nachname ? p.nachname.slice(0, 2) + '…' : ''].filter(Boolean).join(' ') || p.pseudonym : P.anzeigename(p);
          d.appendChild(UI.avatar(P.anzeigename(p)));
          d.appendChild(HT.el('div', null, [HT.el('strong', null, nm), HT.el('small', null, p.pseudonym)]));
          return d;
        } },
        { titel: 'Jahrgang', sort: function (p) { return p.geburtsjahr || 0; }, wert: function (p) { return p.geburtsjahr || '–'; } },
        { titel: 'Aufnahme', sort: function (p) { return p.behandlungsbeginn || HT.isoDatum(p.angelegtAm || 0); }, wert: function (p) { return p.behandlungsbeginn ? HT.datum(new Date(p.behandlungsbeginn + 'T12:00:00').getTime()) : (p.angelegtAm ? HT.datum(p.angelegtAm) : '–'); } },
        { titel: 'Diagnose', wert: function (p) { return (p.diagnose || '–') + (p.icd10 ? ' (' + p.icd10 + ')' : ''); } },
        { titel: 'Therapeut', wert: function (p) { return P.therapeutName(p.therapeutId); } },
        { titel: 'Letztes Training', sort: function (p) { return P.letztesTraining(p.id); }, wert: function (p) { var l = P.letztesTraining(p.id); return l ? HT.datum(l) : '–'; } },
        { titel: '', klasse: 'rechts', wert: function (p) {
          var plan = HT.plaene.aktiverPlan(p.id);
          if (!plan || p.archiviert) return '';
          return UI.knopf('Starten', { art: 'klein', icon: 'play', klick: function () { HT.session.starten({ patientId: p.id, planId: plan.id }); } });
        } }
      ], liste, { beiKlick: function (p) { location.hash = '#/patient/' + p.id + '/stammdaten'; }, leer: filter.archiv ? 'Keine archivierten Patienten.' : HT.t('keine_patienten'), leerIcon: 'personen' }));
    }
    inp.addEventListener('input', function () { filter.text = inp.value; rendern(); });
    thSel.addEventListener('change', function () { filter.therapeut = thSel.value; rendern(); });
    b1.addEventListener('click', function () { filter.archiv = false; b1.classList.add('aktiv'); b2.classList.remove('aktiv'); rendern(); });
    b2.addEventListener('click', function () { filter.archiv = true; b2.classList.add('aktiv'); b1.classList.remove('aktiv'); rendern(); });
    rendern();
    setTimeout(function () { inp.focus(); }, 50);
  }, { nav: 'patienten' });

  /* ===================== Patientenakte ===================== */
  var REITER = [
    { id: 'stammdaten', titel: 'Stammdaten', icon: 'person' },
    { id: 'plan', titel: 'Trainingsplan', icon: 'vorlage' },
    { id: 'ziele', titel: 'Therapieziele', icon: 'ziel' },
    { id: 'verlauf', titel: 'Verlauf', icon: 'diagramm' },
    { id: 'berichte', titel: 'Berichte', icon: 'dokument' },
    { id: 'einstellungen', titel: 'Einstellungen', icon: 'zahnrad' }
  ];

  HT.route('/patient/:id/:reiter', function (param, w) {
    var p = S.finde('patients', param.id);
    if (!p) { w.appendChild(UI.leer('Patient nicht gefunden.')); return; }
    w.appendChild(HT.el('div', { class: 'brotkrumen', html: '<a href="#/patienten">Patienten</a> / ' + HT.esc(P.anzeigename(p)) }));

    var kopf = HT.el('div', { class: 'akte-kopf' });
    kopf.appendChild(UI.avatar(P.anzeigename(p), true));
    var info = HT.el('div', { class: 'akte-info' });
    info.appendChild(HT.el('h1', null, P.anzeigename(p)));
    var meta = HT.el('div', { class: 'akte-meta' });
    meta.innerHTML = '<span>' + HT.icon('person') + HT.esc(p.pseudonym) + '</span>' +
      (p.geburtsjahr ? '<span>' + HT.icon('kalender') + 'Jg. ' + p.geburtsjahr + '</span>' : '') +
      (p.diagnose ? '<span>' + HT.icon('info') + HT.esc(p.diagnose) + '</span>' : '') +
      '<span>' + HT.icon('personen') + HT.esc(P.therapeutName(p.therapeutId)) + '</span>' +
      (p.archiviert ? '<span>' + UI.abzeichen('archiviert', 'gelb').outerHTML + '</span>' : '');
    info.appendChild(meta);
    kopf.appendChild(info);
    var akt = HT.el('div', { class: 'akte-aktionen' });
    var plan = HT.plaene.aktiverPlan(p.id);
    var offene = HT.session.offeneSitzung(p.id);
    if (offene) akt.appendChild(UI.knopf('Sitzung fortsetzen', { icon: 'play', klick: function () { HT.session.fortsetzen(offene); } }));
    akt.appendChild(UI.knopf(HT.t('sitzung_starten'), { art: 'primaer', icon: 'play', deaktiviert: !plan || p.archiviert, klick: function () {
      HT.session.starten({ patientId: p.id, planId: plan.id });
    } }));
    akt.appendChild(UI.knopf('Patientenmodus', { icon: 'schloss', deaktiviert: !plan || p.archiviert, titel: 'Menüs sperren und Patient selbst trainieren lassen', klick: function () {
      HT.session.starten({ patientId: p.id, planId: plan.id, patientenmodus: true });
    } }));
    kopf.appendChild(akt);
    w.appendChild(kopf);

    w.appendChild(UI.reiter(REITER, param.reiter, function (r) { location.hash = '#/patient/' + p.id + '/' + r; }));
    var bereich = HT.el('div');
    w.appendChild(bereich);
    var fn = {
      stammdaten: stammdaten, plan: HT.plaene.reiter, ziele: HT.ziele.reiter, verlauf: HT.results.reiter,
      berichte: HT.berichte.reiter, einstellungen: einstellungen
    }[param.reiter] || stammdaten;
    fn(p, bereich);
  }, { nav: 'patienten' });

  function zeile(label, wert) {
    return '<div class="liste-eintrag"><div class="le-text"><span>' + HT.esc(label) + '</span><strong>' + HT.esc(wert || '–') + '</strong></div></div>';
  }

  function stammdaten(p, w) {
    var g = HT.el('div', { class: 'raster raster-21' });
    var links = UI.karte('Stammdaten', null, { icon: 'person', aktionen: [UI.knopf(HT.t('bearbeiten'), { icon: 'stift', art: 'klein', klick: function () { P.bearbeiten(p).then(function (x) { if (x) HT.app.neuZeichnen(); }); } })] });
    var g2 = HT.el('div', { class: 'raster raster-2' });
    g2.appendChild(HT.el('div', { html:
      zeile('Vorname', p.vorname) + zeile('Nachname', p.nachname) + zeile('Pseudonym', p.pseudonym) +
      zeile('Geburtsjahr', p.geburtsjahr) + zeile('Geschlecht', { w: 'weiblich', m: 'männlich', d: 'divers' }[p.geschlecht]) + zeile('Händigkeit', p.haendigkeit) }));
    g2.appendChild(HT.el('div', { html:
      zeile('Diagnose', p.diagnose) + zeile('ICD-10', p.icd10) + zeile('Betroffene Seite', p.betroffeneSeite) +
      zeile('Gesichtsfeld', p.gesichtsfeld) + zeile('Therapeut/in', P.therapeutName(p.therapeutId) + (p.weitererTherapeutId ? ' · ' + P.therapeutName(p.weitererTherapeutId) : '')) +
      zeile('Kostenträger', [p.krankenkasse, p.versichertennummer].filter(Boolean).join(' · ')) + zeile('Behandlung', (p.behandlungsbeginn ? 'seit ' + HT.datum(new Date(p.behandlungsbeginn + 'T12:00:00').getTime()) : (p.angelegtAm ? 'seit ' + HT.datum(p.angelegtAm) : '')) + (p.behandlungsende ? ' bis ' + HT.datum(new Date(p.behandlungsende + 'T12:00:00').getTime()) : '')) }));
    links.appendChild(g2);
    if (p.notizen) links.appendChild(HT.el('div', { style: { marginTop: '1rem' }, html: '<div class="feld-label">Notizen</div><p style="white-space:pre-wrap">' + HT.esc(p.notizen) + '</p>' }));
    g.appendChild(links);

    var rechts = HT.el('div', { class: 'spalte' });
    var runs = S.alle('runs', function (r) { return r.patientId === p.id; });
    var sitz = S.alle('sessions', function (r) { return r.patientId === p.id && r.status !== 'laufend'; });
    var dauer = HT.summe(runs.map(function (r) { return r.dauerSek || 0; }));
    rechts.appendChild(UI.kennzahl(String(sitz.length), 'Sitzungen', 'sitzung'));
    rechts.appendChild(UI.kennzahl(Math.round(dauer / 60) + ' min', 'Trainingszeit gesamt', 'uhr', 'gruen'));
    rechts.appendChild(UI.kennzahl(String(runs.length), 'Durchgänge', 'stapel', 'lila'));
    var aktionen = UI.karte('Aktionen', null, { icon: 'zahnrad' });
    var ak = HT.el('div', { class: 'spalte' });
    ak.appendChild(UI.knopf('Patient exportieren (Datei)', { icon: 'download', art: 'voll', titel: 'Alle Daten dieses Patienten für die Übergabe an einen anderen Mac', klick: function () { P.exportieren(p); } }));
    ak.appendChild(UI.knopf(p.pinHash ? 'Patienten-PIN ändern' : 'Patienten-PIN festlegen', { icon: 'schloss', art: 'voll', titel: 'Persönliche PIN für die Anmeldung im Patientenmodus', klick: function () { HT.vorgaben.pinDialog(p).then(function (x) { if (x) { UI.toast('PIN gespeichert', 'ok'); HT.app.neuZeichnen(); } }); } }));
    ak.appendChild(UI.knopf(p.archiviert ? 'Aus Archiv holen' : 'Entlassen / archivieren', { icon: 'archiv', art: 'voll', klick: function () {
      p.archiviert = !p.archiviert;
      if (p.archiviert && !p.behandlungsende) p.behandlungsende = HT.isoDatum(Date.now());
      if (!p.archiviert && p.behandlungsende && p.behandlungsende < HT.isoDatum(Date.now())) p.behandlungsende = '';
      P.speichern(p).then(function () { UI.toast(p.archiviert ? 'Patient archiviert' : 'Patient reaktiviert', 'ok'); HT.app.neuZeichnen(); });
    } }));
    ak.appendChild(UI.knopf('Patient löschen', { icon: 'muell', art: 'gefahr voll', klick: function () {
      UI.bestaetigen('Patient „' + P.anzeigename(p) + '“ und alle Ergebnisse endgültig löschen? Dies kann nicht rückgängig gemacht werden.', { gefahr: true, ja: 'Endgültig löschen' }).then(function (ok) {
        if (!ok) return;
        P.loeschen(p).then(function () { UI.toast(HT.t('geloescht'), 'ok'); location.hash = '#/patienten'; });
      });
    } }));
    aktionen.appendChild(ak);
    rechts.appendChild(aktionen);
    g.appendChild(rechts);
    w.appendChild(g);
  }

  function einstellungen(p, w) {
    var g = HT.el('div', { class: 'raster raster-12' });
    var e = p.einstellungen || {};
    var f = UI.formular([
      { name: 'eingabe', label: 'Eingabegerät', typ: 'auswahl', breit: true, optionen: [{ wert: 'maus', label: 'Maus' }, { wert: 'tastatur', label: 'Tastatur' }, { wert: 'touch', label: 'Touchscreen (große Bildschirmtasten)' }] },
      { name: 'schriftgroesse', label: 'Schriftgröße im Training', typ: 'bereich', min: 100, max: 160, schritt: 10, breit: true, format: function (v) { return v + ' %'; } },
      { name: 'kontrast', label: 'Hoher Kontrast im Training', typ: 'schalter', breit: true },
      { name: 'ton', label: 'Töne im Training', typ: 'schalter', breit: true },
      { name: 'tastenOverlay', label: 'Große Bildschirmtasten immer anzeigen', typ: 'schalter', breit: true },
      { typ: 'titel', label: 'Rückmeldung & Lernen' },
      { name: 'rueckmeldung', label: 'Rückmeldung nach jeder Antwort', typ: 'auswahl', breit: true, standard: 'voll', optionen: [{ wert: 'voll', label: 'Ton und Symbol (Haken/Kreuz)' }, { wert: 'visuell', label: 'Nur Symbol' }, { wert: 'ton', label: 'Nur Ton' }, { wert: 'keine', label: 'Keine Rückmeldung (z. B. bei Frustrationsneigung)' }] },
      { name: 'ohneFehlerton', label: 'Keinen Ton bei Fehlern (nur bei Erfolg)', typ: 'schalter', breit: true },
      { name: 'fehlerfrei', label: 'Fehlerfreies Lernen: bei Auswahlaufgaben nach einem Fehler erneut versuchen lassen', typ: 'schalter', breit: true }
    ], e);
    var k1 = UI.karte('Patientenspezifische Einstellungen', [f.el, UI.knopf(HT.t('speichern'), { art: 'primaer', icon: 'haken', klick: function () {
      p.einstellungen = HT.zusammen(e, f.werte());
      P.speichern(p).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); });
    } })], { icon: 'zahnrad' });
    k1.lastChild.style.marginTop = '1.2rem';
    g.appendChild(k1);

    // Level je Modul: manuelles Setzen und Automatik
    var k2 = UI.karte('Level und Automatik je Modul', null, { icon: 'trend' });
    k2.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Das Level wird nach jedem Durchgang automatisch angepasst. Hier können Sie es manuell setzen oder die Automatik abschalten.'));
    var genutzt = {};
    S.alle('moduleState', function (z) { return z.patientId === p.id; }).forEach(function (z) { genutzt[z.modulId] = true; });
    var plan = HT.plaene.aktiverPlan(p.id);
    if (plan) plan.eintraege.forEach(function (e) { genutzt[e.modulId] = true; });
    var module = HT.Module.liste.filter(function (m) { return genutzt[m.id]; });
    k2.appendChild(UI.tabelle([
      { titel: 'Modul', wert: function (m) { return m.name; } },
      { titel: 'Level', wert: function (m) {
        var z = P.zustand(p.id, m.id);
        var d = HT.el('div', { class: 'level-zeile' });
        var anz = HT.el('span', { class: 'level-wert' }, String(z.aktuellesLevel));
        var setzen = function (dl) {
          z.aktuellesLevel = HT.klemmen(z.aktuellesLevel + dl, 1, m.levels.length); z.hochSerie = 0;
          anz.textContent = z.aktuellesLevel; S.put('moduleState', z);
        };
        d.appendChild(UI.iconKnopf('minus', 'Level senken', function () { setzen(-1); }, 'rand'));
        d.appendChild(anz);
        d.appendChild(UI.iconKnopf('plus', 'Level erhöhen', function () { setzen(1); }, 'rand'));
        d.appendChild(HT.el('span', { class: 'gedimmt klein', style: { marginLeft: '.5rem' } }, 'von ' + m.levels.length));
        return d;
      } },
      { titel: 'Automatik', wert: function (m) {
        var z = P.zustand(p.id, m.id);
        var c = HT.el('input', { type: 'checkbox', class: 'schalter' });
        c.checked = z.automatik !== false;
        c.addEventListener('change', function () { z.automatik = c.checked; S.put('moduleState', z); });
        return c;
      } }
    ], module, { leer: 'Noch keine Module im Plan oder trainiert.' }));
    g.appendChild(k2);
    w.appendChild(g);
  }
})();
