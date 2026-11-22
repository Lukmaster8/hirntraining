/* Hirntraining – Trainingspläne, Vorlagen und Plan-Editor */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  /* ---------- Vorlagen für typische Störungsbilder ---------- */
  var STANDARD = [
    { id: 'vl-aufmerksamkeit', name: 'Aufmerksamkeit', beschreibung: 'Alertness, selektive, geteilte und Daueraufmerksamkeit',
      module: ['reaktion', 'selektive-aufmerksamkeit', 'daueraufmerksamkeit', 'geteilte-aufmerksamkeit'] },
    { id: 'vl-gedaechtnis', name: 'Gedächtnis', beschreibung: 'Arbeitsgedächtnis, Wiedererkennen und Alltagsgedächtnis',
      module: ['arbeitsgedaechtnis', 'bilder-wiedererkennen', 'wortlisten', 'alltagsgedaechtnis'] },
    { id: 'vl-neglect', name: 'Neglect & Exploration', beschreibung: 'Systematisches Absuchen mit Seitenbetonung',
      module: ['visuelle-exploration', 'neglect-training', 'sakkaden', 'gesichtsfeld'] },
    { id: 'vl-exekutiv', name: 'Exekutivfunktionen', beschreibung: 'Planen, Problemlösen und Konzeptwechsel',
      module: ['reihen-fortsetzen', 'regeln-wechseln', 'turm', 'handlungsplanung'] },
    { id: 'vl-raeumlich', name: 'Räumliches Denken', beschreibung: 'Richtungen, mentale Rotation, Muster nachbauen',
      module: ['richtungen', 'rotation-2d', 'rotation-3d', 'muster-nachbauen'] },
    { id: 'vl-alltag', name: 'Rechnen & Sprache', beschreibung: 'Geld, Uhrzeit, Wortfindung und Textverständnis',
      module: ['rechnen-alltag', 'uhrzeit', 'wortfindung', 'textverstaendnis'] },
    { id: 'vl-visuomotorik', name: 'Visuomotorik', beschreibung: 'Zielgenauigkeit und Auge-Hand-Koordination',
      module: ['zielklicken', 'spur-nachfahren', 'labyrinth', 'verfolgen'] },
    { id: 'vl-beruflich', name: 'Beruflich', beschreibung: 'Berufsnahe Aufgaben: Büro, Lager und Telefonnotizen',
      module: ['buero', 'lager-bestellungen', 'telefonnotiz'] },
    { id: 'vl-fruehphase', name: 'Frühphase / Aktivierung', beschreibung: 'Niedrigschwellige Aktivierung mit Erfolgserlebnissen',
      module: ['denksport', 'reaktion', 'memory'], startLevel: 1 },
    { id: 'vl-einstieg', name: 'Einstieg gemischt', beschreibung: 'Kurzer Rundgang durch alle Bereiche',
      module: ['reaktion', 'memory', 'visuelle-exploration', 'reihen-fortsetzen', 'zielklicken'] }
  ];

  var V = HT.vorlagen = {
    standardAnlegen: function () {
      var d = S.einstellungen().standarddauer || 5;
      return Promise.all(STANDARD.map(function (v) {
        if (S.finde('templates', v.id)) return null;
        return S.put('templates', {
          id: v.id, name: v.name, beschreibung: v.beschreibung, standard: true, pauseMin: 1,
          eintraege: v.module.map(function (m) { return { modulId: m, dauerMin: d, startLevel: v.startLevel || 'auto', parameterOverrides: {} }; })
        });
      }));
    },
    alle: function () { return S.alle('templates').sort(function (a, b) { return (b.standard ? 1 : 0) - (a.standard ? 1 : 0) || a.name.localeCompare(b.name); }); }
  };

  var PL = HT.plaene = {
    vonPatient: function (pid) { return S.alle('plans', function (p) { return p.patientId === pid; }).sort(function (a, b) { return (b.aktiv ? 1 : 0) - (a.aktiv ? 1 : 0) || a.name.localeCompare(b.name); }); },
    aktiverPlan: function (pid) {
      var l = PL.vonPatient(pid).filter(function (p) { return p.aktiv && p.eintraege.length; });
      return l[0] || null;
    },
    neu: function (pid, vorlage) {
      var plan = {
        id: HT.uid('pla'), patientId: pid, name: vorlage ? vorlage.name : 'Neuer Plan', pauseMin: vorlage ? vorlage.pauseMin : 1,
        eintraege: vorlage ? HT.kopie(vorlage.eintraege).filter(function (e) { return HT.Module.map[e.modulId]; }) : [],
        aktiv: !PL.aktiverPlan(pid), angelegtAm: Date.now()
      };
      return S.put('plans', plan);
    },
    aktivieren: function (plan) {
      var ops = PL.vonPatient(plan.patientId).map(function (p) { p.aktiv = p.id === plan.id; return S.put('plans', p); });
      return Promise.all(ops);
    },
    gesamtdauer: function (plan) { return HT.summe(plan.eintraege.map(function (e) { return Number(e.dauerMin) || 0; })) + Math.max(0, plan.eintraege.length - 1) * (Number(plan.pauseMin) || 0); }
  };

  function vorlageWaehlen() {
    var wahl = null;
    var liste = HT.el('div', { class: 'raster raster-2' });
    var leer = { id: '', name: 'Leerer Plan', beschreibung: 'Module selbst zusammenstellen', eintraege: [] };
    [leer].concat(V.alle()).forEach(function (v) {
      var k = HT.el('button', { type: 'button', class: 'karte', style: { textAlign: 'left', cursor: 'pointer' } });
      k.innerHTML = '<strong>' + HT.esc(v.name) + '</strong><div class="gedimmt klein">' + HT.esc(v.beschreibung || '') + '</div>' +
        (v.eintraege.length ? '<div class="klein" style="margin-top:.4rem">' + v.eintraege.length + ' Module · ' + PL.gesamtdauer(v) + ' min</div>' : '');
      k.addEventListener('click', function () { wahl = v; HT.$$('.karte', liste).forEach(function (x) { x.style.borderColor = ''; x.style.boxShadow = ''; }); k.style.borderColor = 'var(--akzent)'; k.style.boxShadow = '0 0 0 3px rgba(27,168,181,.2)'; });
      liste.appendChild(k);
    });
    return UI.dialog({ titel: 'Plan aus Vorlage erstellen', inhalt: liste, breit: true, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: 'Erstellen', art: 'primaer', aktion: function () { if (!wahl) { UI.toast('Bitte eine Vorlage wählen.'); return false; } return Promise.resolve(wahl); } }] });
  }

  /* Reiter „Trainingsplan“ in der Patientenakte */
  PL.reiter = function (p, w) {
    var plaene = PL.vonPatient(p.id);
    var k = UI.karte('Trainingspläne', null, { icon: 'vorlage', aktionen: [UI.knopf('Neuer Plan', { art: 'primaer klein', icon: 'plus', klick: function () {
      vorlageWaehlen().then(function (v) {
        if (!v) return;
        PL.neu(p.id, v.id ? v : null).then(function (plan) { location.hash = '#/plan/' + plan.id; });
      });
    } })] });
    if (!plaene.length) k.appendChild(UI.leer('Noch kein Trainingsplan. Erstellen Sie einen Plan aus einer Vorlage.', 'vorlage'));
    plaene.forEach(function (plan) {
      var e = HT.el('div', { class: 'liste-eintrag' });
      var txt = HT.el('div', { class: 'le-text' });
      txt.appendChild(HT.el('strong', { html: HT.esc(plan.name) + (plan.aktiv ? ' ' + UI.abzeichen('aktiv', 'gruen').outerHTML : '') }));
      txt.appendChild(HT.el('span', null, plan.eintraege.length + ' Module · ca. ' + PL.gesamtdauer(plan) + ' min · ' +
        plan.eintraege.map(function (x) { var m = HT.Module.map[x.modulId]; return m ? m.name : x.modulId; }).join(', ')));
      e.appendChild(txt);
      var g = HT.el('div', { class: 'knopf-gruppe' });
      if (!plan.aktiv) g.appendChild(UI.knopf('Aktivieren', { art: 'klein', klick: function () { PL.aktivieren(plan).then(HT.app.neuZeichnen); } }));
      g.appendChild(UI.knopf('Einstufen', { art: 'klein', icon: 'ziel', titel: 'Einstufungstest: ermittelt für jedes Modul ein passendes Startlevel', deaktiviert: !plan.eintraege.length, klick: function () {
        UI.bestaetigen('Der Einstufungstest steigt in jedem Modul schnell im Level auf, bis die Leistung unter 80 % fällt, und übernimmt das letzte sicher gelöste Level als Startlevel. Dauer ca. 2–4 Minuten pro Modul. Jetzt starten?', { titel: 'Einstufungstest', ja: 'Einstufung starten' }).then(function (ok) { if (ok) HT.session.einstufen(p.id, plan.id); });
      } }));
      g.appendChild(UI.knopf('Starten', { art: 'klein primaer', icon: 'play', deaktiviert: !plan.eintraege.length, klick: function () { HT.session.starten({ patientId: p.id, planId: plan.id }); } }));
      g.appendChild(UI.iconKnopf('stift', 'Bearbeiten', function () { location.hash = '#/plan/' + plan.id; }));
      g.appendChild(UI.iconKnopf('muell', 'Löschen', function () {
        UI.bestaetigen('Plan „' + plan.name + '“ löschen?', { gefahr: true, ja: HT.t('loeschen') }).then(function (ok) { if (ok) S.delete('plans', plan.id).then(HT.app.neuZeichnen); });
      }, 'gefahr'));
      e.appendChild(g);
      k.appendChild(e);
    });
    w.appendChild(k);

    var wpWrap = HT.el('div', { style: { marginTop: '1.2rem' } });
    w.appendChild(wpWrap);
    HT.vorgaben.karte(p, wpWrap);

    // Letzte Sitzungen
    var sitz = S.alle('sessions', function (s) { return s.patientId === p.id; }).slice(-12).reverse();
    var k2 = UI.karte('Letzte Sitzungen', null, { icon: 'sitzung' });
    k2.style.marginTop = '1.2rem';
    k2.appendChild(UI.tabelle([
      { titel: 'Datum', wert: function (s) { return HT.datumZeit(s.start); } },
      { titel: 'Plan', wert: function (s) { var pl = S.finde('plans', s.planId); return pl ? pl.name : '–'; } },
      { titel: 'Art', wert: function (s) { return s.art === 'einstufung' ? UI.abzeichen('Einstufung', 'akzent') : 'Training'; } },
      { titel: 'Dauer', wert: function (s) { return s.ende ? Math.round((s.ende - s.start) / 60000) + ' min' : '–'; } },
      { titel: 'Befinden vor / nach', wert: function (s) { return HT.befindenAnzeige(s); } },
      { titel: 'Status', wert: function (s) { return UI.abzeichen({ laufend: 'unterbrochen', abgeschlossen: 'abgeschlossen', abgebrochen: 'abgebrochen' }[s.status] || s.status, s.status === 'abgeschlossen' ? 'gruen' : (s.status === 'laufend' ? 'gelb' : '')); } },
      { titel: 'Notiz', wert: function (s) { return HT.el('span', { class: 'klein gedimmt', title: s.notiz || '' }, s.notiz ? (s.notiz.length > 40 ? s.notiz.slice(0, 40) + ' …' : s.notiz) : '–'); } },
      { titel: '', klasse: 'rechts', wert: function (s) {
        var g = HT.el('div', { class: 'knopf-gruppe' });
        if (s.status === 'laufend') g.appendChild(UI.knopf('Fortsetzen', { art: 'klein', icon: 'play', klick: function () { HT.session.fortsetzen(s); } }));
        g.appendChild(UI.iconKnopf('stift', 'Notiz bearbeiten', function () {
          UI.formularDialog('Sitzungsnotiz vom ' + HT.datumZeit(s.start), [{ name: 'notiz', label: 'Notiz (Beobachtungen, Strategien, Besonderheiten)', typ: 'textarea', breit: true, zeilen: 6 }], { notiz: s.notiz || '' }).then(function (w) {
            if (!w) return; s.notiz = w.notiz; S.put('sessions', s).then(HT.app.neuZeichnen);
          });
        }));
        return g;
      } }
    ], sitz, { leer: 'Noch keine Sitzungen.' }));
    w.appendChild(k2);
  };

  /* ===================== Plan-Editor ===================== */
  function editor(plan, w, istVorlage) {
    var store = istVorlage ? 'templates' : 'plans';
    var patient = !istVorlage && S.finde('patients', plan.patientId);
    var zurueck = istVorlage ? '#/verwaltung/vorlagen' : '#/patient/' + plan.patientId + '/plan';
    w.appendChild(HT.el('div', { class: 'brotkrumen', html: istVorlage ? '<a href="#/verwaltung/vorlagen">Vorlagen</a> / Bearbeiten' :
      '<a href="#/patienten">Patienten</a> / <a href="#/patient/' + plan.patientId + '/plan">' + HT.esc(HT.patienten.anzeigename(patient)) + '</a> / Trainingsplan' }));
    var speichernKnopf = UI.knopf(HT.t('speichern'), { art: 'primaer', icon: 'haken', klick: function () {
      plan.name = nameInp.value.trim() || 'Plan';
      plan.pauseMin = Number(pauseInp.value) || 0;
      if (istVorlage) plan.beschreibung = beschrInp.value;
      S.put(store, plan).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); location.hash = zurueck; });
    } });
    var aktionen = [UI.knopf(HT.t('abbrechen'), { klick: function () { location.hash = zurueck; } })];
    if (!istVorlage) {
      aktionen.push(UI.knopf('Vorlage laden', { icon: 'download', klick: function () {
        vorlageWaehlen().then(function (v) { if (v) { plan.eintraege = HT.kopie(v.eintraege).filter(function (e) { return HT.Module.map[e.modulId]; }); if (v.id) plan.pauseMin = v.pauseMin; zeichnen(); } });
      } }));
      aktionen.push(UI.knopf('Als Vorlage speichern', { icon: 'kopieren', klick: function () {
        UI.formularDialog('Als Vorlage speichern', [{ name: 'name', label: 'Name der Vorlage', pflicht: true, breit: true }, { name: 'beschreibung', label: 'Beschreibung', breit: true }], { name: nameInp.value }).then(function (x) {
          if (!x) return;
          S.put('templates', { id: HT.uid('vor'), name: x.name, beschreibung: x.beschreibung, eintraege: HT.kopie(plan.eintraege), pauseMin: Number(pauseInp.value) || 0 }).then(function () { UI.toast('Vorlage gespeichert', 'ok'); });
        });
      } }));
    }
    aktionen.push(speichernKnopf);
    w.appendChild(UI.seite(istVorlage ? 'Vorlage bearbeiten' : 'Trainingsplan bearbeiten', istVorlage ? null : 'für ' + HT.patienten.anzeigename(patient), aktionen));

    var g = HT.el('div', { class: 'raster raster-21' });
    var links = UI.karte(null, null);
    var kopfForm = HT.el('div', { class: 'formular', style: { marginBottom: '1.2rem' } });
    var nameInp = HT.el('input', { type: 'text', value: plan.name });
    var pauseInp = HT.el('input', { type: 'number', min: 0, max: 10, step: 0.5, value: plan.pauseMin || 0 });
    kopfForm.appendChild(HT.el('label', { class: 'feld' }, [HT.el('span', { class: 'feld-label' }, 'Name'), nameInp]));
    kopfForm.appendChild(HT.el('label', { class: 'feld' }, [HT.el('span', { class: 'feld-label' }, 'Pause zwischen Modulen (min)'), pauseInp]));
    var beschrInp = HT.el('input', { type: 'text', value: plan.beschreibung || '' });
    if (istVorlage) kopfForm.appendChild(HT.el('label', { class: 'feld breit' }, [HT.el('span', { class: 'feld-label' }, 'Beschreibung'), beschrInp]));
    var ns = HT.el('input', { type: 'checkbox', class: 'schalter' });
    ns.checked = !!plan.nonstop;
    ns.addEventListener('change', function () { plan.nonstop = ns.checked; });
    kopfForm.appendChild(HT.el('label', { class: 'feld feld-schalter breit' }, [ns, HT.el('span', { class: 'feld-label' }, 'Durcharbeiten ohne Zwischenbildschirme (Non-Stop) – für Patienten, die selbstständig trainieren'), ]));
    links.appendChild(kopfForm);
    var summe = HT.el('div', { class: 'gedimmt klein', style: { marginBottom: '.6rem' } });
    links.appendChild(summe);
    var ul = HT.el('ul', { class: 'plan-liste' });
    links.appendChild(ul);
    g.appendChild(links);

    // Modulauswahl
    var rechts = UI.karte('Module hinzufügen', null, { icon: 'plus' });
    var such = HT.el('div', { class: 'suchfeld', style: { maxWidth: 'none', marginBottom: '.4rem' }, html: HT.icon('suche') });
    var sInp = HT.el('input', { type: 'search', placeholder: 'Modul suchen …' });
    such.appendChild(sInp);
    rechts.appendChild(such);
    var picker = HT.el('div', { class: 'picker-scroll' });
    rechts.appendChild(picker);
    g.appendChild(rechts);
    w.appendChild(g);

    function pickerZeichnen() {
      HT.leeren(picker);
      var t = sInp.value.toLowerCase();
      HT.KATEGORIEN.forEach(function (kat) {
        var mods = HT.Module.aktive().filter(function (m) { return m.kategorie === kat.id && (!t || (m.name + ' ' + m.ziel).toLowerCase().indexOf(t) >= 0); });
        if (!mods.length) return;
        picker.appendChild(HT.el('div', { class: 'picker-gruppe' }, kat.name));
        mods.forEach(function (m) {
          var e = HT.el('div', { class: 'modul-picker-eintrag', tabindex: 0, title: m.ziel, html: '<i class="kat-dot" style="background:' + kat.farbe + '"></i><span>' + HT.esc(m.name) + '</span>' + HT.icon('plus') });
          var add = function () {
            plan.eintraege.push({ modulId: m.id, dauerMin: S.einstellungen().standarddauer || 5, startLevel: 'auto', parameterOverrides: {} });
            zeichnen();
            UI.toast(m.name + ' hinzugefügt', 'ok');
          };
          e.addEventListener('click', add);
          e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') add(); });
          picker.appendChild(e);
        });
      });
    }
    sInp.addEventListener('input', pickerZeichnen);

    function verschieben(von, nach) {
      if (nach < 0 || nach >= plan.eintraege.length) return;
      var x = plan.eintraege.splice(von, 1)[0];
      plan.eintraege.splice(nach, 0, x);
      zeichnen();
    }

    function zeichnen() {
      HT.leeren(ul);
      summe.textContent = plan.eintraege.length + ' Module · Gesamtdauer ca. ' + PL.gesamtdauer({ eintraege: plan.eintraege, pauseMin: Number(pauseInp.value) || 0 }) + ' Minuten';
      if (!plan.eintraege.length) ul.appendChild(UI.leer('Noch keine Module. Wählen Sie rechts Module aus.', 'raster'));
      plan.eintraege.forEach(function (e, i) {
        var m = HT.Module.map[e.modulId];
        if (!m) return;
        var kat = HT.kategorie(m.kategorie);
        var li = HT.el('li', { class: 'plan-eintrag', 'data-index': i });
        li.appendChild(HT.el('span', { class: 'griff', title: 'Ziehen zum Sortieren', html: HT.icon('griff') }));
        li.appendChild(HT.el('span', { class: 'plan-nr', style: { background: kat.farbe, color: '#fff' } }, String(i + 1)));
        li.appendChild(HT.el('div', { class: 'plan-modul', html: '<strong>' + HT.esc(m.name) + '</strong><small>' + HT.esc(kat.name) + '</small>' }));
        var felder = HT.el('div', { class: 'plan-felder' });
        var dauer = HT.el('input', { type: 'number', min: 1, max: 60, value: e.dauerMin });
        dauer.addEventListener('change', function () { e.dauerMin = HT.klemmen(Number(dauer.value) || 1, 1, 60); zeichnen(); });
        felder.appendChild(HT.el('label', null, ['Minuten', dauer]));
        var lv = HT.el('select');
        lv.appendChild(HT.el('option', { value: 'auto' }, 'Auto'));
        for (var l = 1; l <= m.levels.length; l++) lv.appendChild(HT.el('option', { value: l }, 'Level ' + l));
        lv.value = String(e.startLevel || 'auto');
        lv.addEventListener('change', function () { e.startLevel = lv.value === 'auto' ? 'auto' : Number(lv.value); });
        felder.appendChild(HT.el('label', null, ['Startlevel', lv]));
        var an = HT.el('select', { title: 'Ausführliche Anleitung vor dem Modul' });
        [['auto', 'Auto'], ['immer', 'Immer'], ['nie', 'Nie']].forEach(function (o) { an.appendChild(HT.el('option', { value: o[0] }, o[1])); });
        an.value = e.anleitung || 'auto';
        an.addEventListener('change', function () { e.anleitung = an.value; });
        felder.appendChild(HT.el('label', { title: 'Auto = ausführliche Anleitung nur in den ersten beiden Sitzungen' }, ['Anleitung', an]));
        li.appendChild(felder);
        var g2 = HT.el('div', { class: 'knopf-gruppe', style: { marginLeft: '.6rem' } });
        var hoch = UI.iconKnopf('hoch', 'Nach oben', function () { verschieben(i, i - 1); }); if (i === 0) hoch.disabled = true;
        var runter = UI.iconKnopf('runter', 'Nach unten', function () { verschieben(i, i + 1); }); if (i === plan.eintraege.length - 1) runter.disabled = true;
        g2.appendChild(hoch); g2.appendChild(runter);
        g2.appendChild(UI.iconKnopf('zahnrad', 'Parameter', function () { parameterDialog(m, e); }));
        g2.appendChild(UI.iconKnopf('muell', 'Entfernen', function () { plan.eintraege.splice(i, 1); zeichnen(); }, 'gefahr'));
        li.appendChild(g2);
        // Tastatur: Alt+Pfeil verschiebt
        li.tabIndex = 0;
        li.addEventListener('keydown', function (ev) {
          if (ev.target !== li) return;
          if (ev.key === 'ArrowUp') { ev.preventDefault(); verschieben(i, i - 1); var x = ul.children[i - 1]; if (x) x.focus(); }
          if (ev.key === 'ArrowDown') { ev.preventDefault(); verschieben(i, i + 1); var y = ul.children[i + 1]; if (y) y.focus(); }
        });
        ul.appendChild(li);
      });
      UI.sortierbar(ul, verschieben);
    }
    pauseInp.addEventListener('change', zeichnen);
    pickerZeichnen();
    zeichnen();
  }

  function parameterDialog(m, e) {
    var schema = m.parameterSchema;
    var felder = Object.keys(schema).map(function (k) {
      var s = schema[k];
      var f = { name: k, label: s.label || k, standard: s.standard, hilfe: s.hilfe, breit: true };
      if (s.typ === 'auswahl') { f.typ = 'auswahl'; f.optionen = s.optionen; }
      else if (s.typ === 'schalter') f.typ = 'schalter';
      else { f.typ = 'zahl'; f.min = s.min; f.max = s.max; f.schritt = s.schritt; }
      return f;
    });
    UI.formularDialog('Parameter: ' + m.name, felder, e.parameterOverrides || {}).then(function (w) {
      if (!w) return;
      var o = {};
      Object.keys(w).forEach(function (k) { if (w[k] !== null && w[k] !== '' && String(w[k]) !== String(schema[k].standard)) o[k] = w[k]; });
      e.parameterOverrides = o;
      UI.toast('Parameter übernommen', 'ok');
    });
  }

  HT.route('/plan/:id', function (param, w) {
    var plan = S.finde('plans', param.id);
    if (!plan) { w.appendChild(UI.leer('Plan nicht gefunden.')); return; }
    editor(HT.kopie(plan), w, false);
  }, { nav: 'patienten' });

  HT.route('/vorlage/:id', function (param, w) {
    var v = S.finde('templates', param.id);
    if (!v) { w.appendChild(UI.leer('Vorlage nicht gefunden.')); return; }
    editor(HT.kopie(v), w, true);
  }, { nav: 'verwaltung' });

  PL.editor = editor;
})();
