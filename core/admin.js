/* Hirntraining – Verwaltung (nur Administrator) und Einstellungen */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  /* ===================== Datensicherung ===================== */
  var SI = HT.sicherung = {
    exportieren: function () {
      return S.exportAll().then(function (d) {
        HT.herunterladen('hirntraining-sicherung-' + HT.isoDatum(Date.now()) + '.json', JSON.stringify(d), 'application/json');
        return S.einstellungenSpeichern({ letzterExport: Date.now() });
      }).then(function () { UI.toast('Sicherung wurde heruntergeladen.', 'ok'); });
    },
    importieren: function () {
      return HT.dateiLesen('.json,application/json').then(function (f) {
        if (!f) return;
        var daten;
        try { daten = JSON.parse(f.inhalt); } catch (e) { UI.toast('Die Datei konnte nicht gelesen werden.', 'fehler'); return; }
        if (!daten || daten.format !== 'hirntraining-sicherung') { UI.toast('Die Datei ist keine Hirntraining-Sicherung.', 'fehler'); return; }
        var n = (daten.patients || []).length, r = (daten.runs || []).length;
        return UI.bestaetigen('Sicherung vom ' + HT.datumZeit(daten.erstellt) + ' mit ' + n + ' Patienten und ' + r + ' Durchgängen wiederherstellen? Alle aktuellen Daten werden dabei ersetzt.', { gefahr: true, ja: 'Wiederherstellen' }).then(function (ok) {
          if (!ok) return;
          return S.importAll(daten).then(function () {
            UI.toast('Daten wurden wiederhergestellt.', 'ok');
            HT.auth.abmelden();
          });
        });
      });
    }
  };

  /* ===================== Verwaltung ===================== */
  var BEREICHE = [
    { id: 'therapeuten', titel: 'Therapeuten', icon: 'personen' },
    { id: 'praxis', titel: 'Praxisdaten & Logo', icon: 'home' },
    { id: 'vorlagen', titel: 'Planvorlagen', icon: 'vorlage' },
    { id: 'berichte', titel: 'Berichtsvorlagen', icon: 'dokument' },
    { id: 'module', titel: 'Modul-Schwellen', icon: 'trend' },
    { id: 'sicherung', titel: 'Datensicherung', icon: 'sicherung' },
    { id: 'daten', titel: 'Daten & Testdaten', icon: 'test' }
  ];

  HT.route('/verwaltung', function () { location.replace('#/verwaltung/therapeuten'); }, { schutz: 'admin', nav: 'verwaltung' });
  HT.route('/verwaltung/:bereich', function (param, w) {
    w.appendChild(UI.seite(HT.t('nav_verwaltung'), 'Praxisweite Einstellungen – nur für Administratoren'));
    w.appendChild(UI.reiter(BEREICHE, param.bereich, function (b) { location.hash = '#/verwaltung/' + b; }));
    var fn = { therapeuten: therapeuten, praxis: praxis, vorlagen: vorlagen, berichte: berichtsvorlagen, module: schwellen, sicherung: sicherung, daten: daten }[param.bereich] || therapeuten;
    fn(w);
  }, { schutz: 'admin', nav: 'verwaltung' });

  function therapeuten(w) {
    var k = UI.karte('Therapeutinnen und Therapeuten', null, { icon: 'personen', aktionen: [UI.knopf('Neu', { art: 'primaer klein', icon: 'plus', klick: function () { bearbeiten(null); } })] });
    k.appendChild(UI.tabelle([
      { titel: 'Name', wert: function (t) { var d = HT.el('div', { class: 'zelle-name' }); d.appendChild(UI.avatar(t.name)); d.appendChild(HT.el('div', null, [HT.el('strong', null, t.name), HT.el('small', null, t.kuerzel || '')])); return d; } },
      { titel: 'Rolle', wert: function (t) { return UI.abzeichen(t.rolle === 'admin' ? 'Administrator' : 'Therapeut', t.rolle === 'admin' ? 'akzent' : ''); } },
      { titel: 'Status', wert: function (t) { return UI.abzeichen(t.aktiv === false ? 'deaktiviert' : 'aktiv', t.aktiv === false ? 'gelb' : 'gruen'); } },
      { titel: 'Patienten', klasse: 'rechts', wert: function (t) { return S.alle('patients', function (p) { return p.therapeutId === t.id && !p.archiviert; }).length; } },
      { titel: '', klasse: 'rechts', wert: function (t) {
        var g = HT.el('div', { class: 'knopf-gruppe' });
        g.appendChild(UI.iconKnopf('stift', 'Bearbeiten', function () { bearbeiten(t); }));
        g.appendChild(UI.iconKnopf('schloss', 'PIN zurücksetzen', function () { pinNeu(t); }));
        return g;
      } }
    ], HT.auth.therapeuten(true)));
    w.appendChild(k);
  }

  function bearbeiten(t) {
    var neu = !t;
    var felder = [
      { name: 'name', label: 'Name', pflicht: true, breit: true },
      { name: 'kuerzel', label: 'Kürzel' },
      { name: 'rolle', label: 'Rolle', typ: 'auswahl', optionen: [{ wert: 'therapeut', label: 'Therapeut' }, { wert: 'admin', label: 'Administrator' }] }
    ];
    if (neu) felder.push({ name: 'pin', label: 'PIN (4–8 Ziffern)', typ: 'pin', pflicht: true }, { name: 'pin2', label: 'PIN wiederholen', typ: 'pin', pflicht: true });
    else felder.push({ name: 'aktiv', label: 'Aktiv (kann sich anmelden)', typ: 'schalter', breit: true });
    UI.formularDialog(neu ? 'Neuer Therapeut' : 'Therapeut bearbeiten', felder, t || { rolle: 'therapeut', aktiv: true }, {
      pruefen: function (v) {
        if (neu && !/^[0-9]{4,8}$/.test(v.pin)) return 'Die PIN muss aus 4 bis 8 Ziffern bestehen.';
        if (neu && v.pin !== v.pin2) return 'Die PINs stimmen nicht überein.';
        var admins = HT.auth.therapeuten(true).filter(function (x) { return x.rolle === 'admin' && x.aktiv !== false && (!t || x.id !== t.id); });
        if (!neu && (v.rolle !== 'admin' || !v.aktiv) && t.rolle === 'admin' && !admins.length) return 'Es muss mindestens ein aktiver Administrator bestehen bleiben.';
        return null;
      }
    }).then(function (v) {
      if (!v) return;
      var p = neu ? HT.auth.anlegen(v) : S.put('therapists', HT.zusammen(t, { name: v.name, kuerzel: v.kuerzel, rolle: v.rolle, aktiv: v.aktiv }));
      p.then(function () { UI.toast(HT.t('gespeichert'), 'ok'); HT.app.neuZeichnen(); });
    });
  }

  function pinNeu(t) {
    UI.formularDialog('Neue PIN für ' + t.name, [{ name: 'pin', label: 'Neue PIN', typ: 'pin', pflicht: true }, { name: 'pin2', label: 'Wiederholen', typ: 'pin', pflicht: true }], {}, {
      pruefen: function (v) { if (!/^[0-9]{4,8}$/.test(v.pin)) return 'Die PIN muss aus 4 bis 8 Ziffern bestehen.'; if (v.pin !== v.pin2) return 'Die PINs stimmen nicht überein.'; return null; }
    }).then(function (v) { if (v) HT.auth.pinSetzen(t, v.pin).then(function () { UI.toast('PIN geändert', 'ok'); }); });
  }

  function praxis(w) {
    var e = S.einstellungen();
    var g = HT.el('div', { class: 'raster raster-2' });
    var f = UI.formular([
      { name: 'praxisname', label: 'Name der Praxis', pflicht: true, breit: true },
      { name: 'praxisAdresse', label: 'Adresse / Kontakt (für Berichte)', typ: 'textarea', breit: true, zeilen: 3 },
      { name: 'pseudonymStandard', label: 'Berichte und Exporte standardmäßig pseudonymisieren', typ: 'schalter', breit: true },
      { name: 'nurEigenePatienten', label: 'Datenschutz: Therapeuten sehen nur eigene Patienten (Administratoren sehen alle)', typ: 'schalter', breit: true }
    ], e);
    g.appendChild(UI.karte('Praxisdaten', [f.el, UI.knopf(HT.t('speichern'), { art: 'primaer', icon: 'haken', klick: function () {
      if (!f.pruefen()) return;
      S.einstellungenSpeichern(f.werte()).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); HT.app.neuZeichnen(); });
    } })], { icon: 'home' }));
    var vorschau = HT.el('div', { class: 'start-logo', style: { margin: '0 0 1rem' }, html: HT.logoHtml() });
    g.appendChild(UI.karte('Logo', [vorschau, HT.el('p', { class: 'gedimmt klein' }, 'PNG, JPG oder SVG, idealerweise quadratisch. Das Logo erscheint in der Navigation und auf Berichten.'),
      HT.el('div', { class: 'knopf-gruppe' }, [
        UI.knopf('Logo wählen', { icon: 'upload', klick: function () {
          HT.dateiLesen('image/*', true).then(function (d) {
            if (!d) return;
            if (d.inhalt.length > 1500000) { UI.toast('Das Bild ist zu groß (max. ca. 1 MB).', 'fehler'); return; }
            S.einstellungenSpeichern({ logoDataUrl: d.inhalt }).then(function () { UI.toast('Logo gespeichert', 'ok'); HT.app.neuZeichnen(); });
          });
        } }),
        UI.knopf('Entfernen', { art: 'gefahr', icon: 'muell', klick: function () { S.einstellungenSpeichern({ logoDataUrl: '' }).then(HT.app.neuZeichnen); } })
      ])], { icon: 'stern' }));
    w.appendChild(g);
    g.firstChild.lastChild.style.marginTop = '1rem';
  }

  function vorlagen(w) {
    var k = UI.karte('Vorlagen für Trainingspläne', null, { icon: 'vorlage', aktionen: [
      UI.knopf('Standardvorlagen ergänzen', { art: 'klein', klick: function () { HT.vorlagen.standardAnlegen().then(HT.app.neuZeichnen); } }),
      UI.knopf('Neue Vorlage', { art: 'primaer klein', icon: 'plus', klick: function () {
        S.put('templates', { id: HT.uid('vor'), name: 'Neue Vorlage', beschreibung: '', eintraege: [], pauseMin: 1 }).then(function (v) { location.hash = '#/vorlage/' + v.id; });
      } })] });
    k.appendChild(UI.tabelle([
      { titel: 'Name', wert: function (v) { return HT.el('div', null, [HT.el('strong', null, v.name), HT.el('div', { class: 'klein gedimmt' }, v.beschreibung || '')]); } },
      { titel: 'Module', wert: function (v) { return v.eintraege.map(function (e) { var m = HT.Module.map[e.modulId]; return m ? m.name : null; }).filter(Boolean).join(', '); } },
      { titel: 'Dauer', klasse: 'rechts', wert: function (v) { return HT.plaene.gesamtdauer(v) + ' min'; } },
      { titel: '', klasse: 'rechts', wert: function (v) {
        var g = HT.el('div', { class: 'knopf-gruppe' });
        g.appendChild(UI.iconKnopf('stift', 'Bearbeiten', function () { location.hash = '#/vorlage/' + v.id; }));
        g.appendChild(UI.iconKnopf('muell', 'Löschen', function () { UI.bestaetigen('Vorlage „' + v.name + '“ löschen?', { gefahr: true, ja: HT.t('loeschen') }).then(function (ok) { if (ok) S.delete('templates', v.id).then(HT.app.neuZeichnen); }); }, 'gefahr'));
        return g;
      } }
    ], HT.vorlagen.alle(), { beiKlick: function (v) { location.hash = '#/vorlage/' + v.id; } }));
    w.appendChild(k);
  }

  function berichtsvorlagen(w) {
    var liste = HT.kopie(HT.berichte.vorlagen());
    var k = UI.karte('Arztbrief- und Berichtsvorlagen (Textbausteine)', null, { icon: 'dokument', aktionen: [UI.knopf('Neue Vorlage', { art: 'primaer klein', icon: 'plus', klick: function () { bearbeiten({ id: HT.uid('bv'), name: 'Neue Vorlage', text1: '', text2: '', text3: '' }, true); } })] });
    k.appendChild(HT.el('p', { class: 'gedimmt klein', html: 'Jede Vorlage besteht aus drei Textbausteinen: <b>Text 1</b> nach den Patientendaten, <b>Text 2</b> nach der Verlaufszusammenfassung, <b>Text 3</b> am Ende (z. B. Empfehlung und Grußformel). Platzhalter werden beim Erstellen automatisch ersetzt: ' + HT.berichte.PLATZHALTER.map(function (x) { return '<code>{{' + x + '}}</code>'; }).join(' ') }));
    k.appendChild(UI.tabelle([
      { titel: 'Name', wert: function (v) { return v.name; } },
      { titel: 'Text 1 (Anfang)', wert: function (v) { return (v.text1 || '').slice(0, 80) + ((v.text1 || '').length > 80 ? ' …' : ''); } },
      { titel: '', klasse: 'rechts', wert: function (v) {
        var g = HT.el('div', { class: 'knopf-gruppe' });
        g.appendChild(UI.iconKnopf('stift', 'Bearbeiten', function () { bearbeiten(v, false); }));
        g.appendChild(UI.iconKnopf('muell', 'Löschen', function () { liste = liste.filter(function (x) { return x.id !== v.id; }); S.einstellungenSpeichern({ berichtsvorlagen: liste }).then(HT.app.neuZeichnen); }, 'gefahr'));
        return g;
      } }
    ], liste, { beiKlick: function (v) { bearbeiten(v, false); } }));
    w.appendChild(k);
    function bearbeiten(v, neu) {
      UI.formularDialog(neu ? 'Neue Berichtsvorlage' : 'Berichtsvorlage bearbeiten', [
        { name: 'name', label: 'Kurzname der Vorlage', pflicht: true, breit: true },
        { name: 'text1', label: 'Text 1 – nach den Patientendaten', typ: 'textarea', breit: true, zeilen: 5 },
        { name: 'text2', label: 'Text 2 – nach der Verlaufszusammenfassung', typ: 'textarea', breit: true, zeilen: 5 },
        { name: 'text3', label: 'Text 3 – Abschluss', typ: 'textarea', breit: true, zeilen: 5 }
      ], v, { breit: true }).then(function (x) {
        if (!x) return;
        var obj = HT.zusammen(v, x);
        if (neu) liste.push(obj); else liste = liste.map(function (y) { return y.id === v.id ? obj : y; });
        S.einstellungenSpeichern({ berichtsvorlagen: liste }).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); HT.app.neuZeichnen(); });
      });
    }
  }

  function schwellen(w) {
    var e = S.einstellungen();
    var sw = HT.kopie(e.schwellen || {});
    var k = UI.karte('Schwellen der adaptiven Levelsteuerung', null, { icon: 'trend', aktionen: [UI.knopf(HT.t('speichern'), { art: 'primaer klein', icon: 'haken', klick: function () {
      S.einstellungenSpeichern({ schwellen: sw }).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); });
    } })] });
    k.appendChild(HT.el('p', { class: 'gedimmt klein' }, 'Aufstufen, wenn die Trefferquote in zwei Durchgängen hintereinander mindestens den Wert „Aufstufen ab“ erreicht. Abstufen, wenn sie unter „Abstufen unter“ liegt. Leere Felder = Standard des Moduls.'));
    k.appendChild(UI.tabelle([
      { titel: 'Modul', wert: function (m) { return m.name; } },
      { titel: 'Bereich', wert: function (m) { return HT.kategorie(m.kategorie).name; } },
      { titel: 'Aufstufen ab (%)', wert: function (m) { return feld(m, 'aufstufenAb'); } },
      { titel: 'Abstufen unter (%)', wert: function (m) { return feld(m, 'abstufenUnter'); } }
    ], HT.Module.liste));
    w.appendChild(k);
    function feld(m, key) {
      var i = HT.el('input', { type: 'number', min: 0, max: 100, step: 5, placeholder: Math.round(m.bewertung[key] * 100), style: { width: '110px', minHeight: '40px' } });
      if (sw[m.id] && sw[m.id][key] !== undefined) i.value = Math.round(sw[m.id][key] * 100);
      i.addEventListener('change', function () {
        sw[m.id] = sw[m.id] || {};
        if (i.value === '') delete sw[m.id][key]; else sw[m.id][key] = HT.klemmen(Number(i.value), 0, 100) / 100;
      });
      return i;
    }
  }

  function sicherung(w) {
    var e = S.einstellungen();
    var g = HT.el('div', { class: 'raster raster-2' });
    g.appendChild(UI.karte('Sicherung erstellen', [
      HT.el('p', null, 'Exportiert alle Daten (Patienten, Pläne, Ergebnisse, Einstellungen) als JSON-Datei. Bewahren Sie die Datei z. B. auf einem USB-Stick oder im Praxis-Netzlaufwerk auf.'),
      HT.el('p', { class: 'gedimmt klein' }, 'Letzte Sicherung: ' + (e.letzterExport ? HT.datumZeit(e.letzterExport) : 'noch nie') + ' · Speicher: ' + S.backend),
      UI.knopf('Jetzt sichern', { art: 'primaer', icon: 'download', klick: function () { SI.exportieren().then(HT.app.neuZeichnen); } })
    ], { icon: 'download' }));
    g.appendChild(UI.karte('Wiederherstellen', [
      HT.el('p', null, 'Spielt eine Sicherungsdatei ein, z. B. auf einem neuen Mac. Achtung: Die aktuellen Daten werden vollständig ersetzt.'),
      UI.knopf('Sicherung einspielen …', { icon: 'upload', klick: SI.importieren })
    ], { icon: 'upload' }));
    var f = UI.formular([{ name: 'backupErinnerung', label: 'Erinnerung an Sicherung nach (Tagen)', typ: 'zahl', min: 1, max: 60 }], e);
    g.appendChild(UI.karte('Erinnerung', [f.el, UI.knopf(HT.t('speichern'), { art: 'klein', klick: function () { S.einstellungenSpeichern(f.werte()).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); }); } })], { icon: 'kalender' }));
    w.appendChild(g);
  }

  function daten(w) {
    var g = HT.el('div', { class: 'raster raster-2' });
    g.appendChild(UI.karte('Testdaten-Generator', [
      HT.el('p', null, 'Legt 3 Beispielpatienten mit Trainingsplänen und 4 Wochen simulierten Ergebnissen an – ideal zum Ausprobieren der Auswertung und Berichte.'),
      UI.knopf('Beispieldaten erzeugen', { icon: 'test', klick: function () {
        HT.testdaten.erzeugen(HT.auth.aktuell.id).then(function () { UI.toast('Beispieldaten wurden angelegt.', 'ok'); });
      } })
    ], { icon: 'test' }));
    g.appendChild(UI.karte('Pseudonyme', [
      HT.el('p', null, 'Vergibt allen Patienten fortlaufende Pseudonyme (P-001, P-002 …) neu. Bestehende Pseudonyme werden überschrieben.'),
      UI.knopf('Pseudonyme neu vergeben', { klick: function () {
        UI.bestaetigen('Alle Pseudonyme neu vergeben?').then(function (ok) {
          if (!ok) return;
          var liste = S.alle('patients').sort(function (a, b) { return (a.angelegtAm || 0) - (b.angelegtAm || 0); });
          Promise.all(liste.map(function (p, i) { p.pseudonym = 'P-' + HT.pad(i + 1, 3); return S.put('patients', p); })).then(function () { UI.toast('Pseudonyme vergeben', 'ok'); });
        });
      } })
    ], { icon: 'person' }));
    g.appendChild(UI.karte('Alle Daten löschen', [
      HT.el('p', null, 'Löscht sämtliche Daten dieses Browsers (Patienten, Ergebnisse, Therapeuten, Einstellungen). Erstellen Sie vorher eine Sicherung!'),
      UI.knopf('Alle Daten löschen …', { art: 'gefahr', icon: 'muell', klick: function () {
        var f = UI.formular([{ name: 'wort', label: 'Zur Bestätigung LÖSCHEN eingeben', breit: true }]);
        UI.dialog({ titel: 'Alle Daten löschen', inhalt: f.el, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: 'Endgültig löschen', art: 'gefahr primaer', aktion: function () {
          if (f.werte().wort !== 'LÖSCHEN') { UI.toast('Bitte LÖSCHEN eingeben.', 'fehler'); return false; }
          return S.importAll({ format: 'hirntraining-sicherung' }).then(function () { HT.auth.aktuell = null; location.hash = '#/einrichtung'; location.reload(); });
        } }] });
      } })
    ], { icon: 'warnung' }));
    w.appendChild(g);
  }

  /* ===================== Einstellungen (alle Therapeuten) ===================== */
  HT.route('/einstellungen', function (param, w) {
    var e = S.einstellungen();
    w.appendChild(UI.seite(HT.t('nav_einstellungen'), 'Darstellung, Ton und Trainingsablauf'));
    var g = HT.el('div', { class: 'raster raster-2' });
    var schemata = [['tuerkis', 'Türkis', '#1BA8B5'], ['ozean', 'Ozean', '#2F6FDE'], ['salbei', 'Salbei', '#2E9C77'], ['lavendel', 'Lavendel', '#7A62D6'], ['koralle', 'Koralle', '#E0675A'], ['abend', 'Abend (dunkel)', '#1c262d']];
    var wahl = HT.el('div', { class: 'raster raster-3', style: { marginBottom: '1rem' } });
    schemata.forEach(function (s) {
      var b = HT.el('button', { type: 'button', class: 'karte', style: { cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '.8rem', borderWidth: '2px', borderColor: e.farbschema === s[0] ? 'var(--akzent)' : '' } });
      b.innerHTML = '<span style="width:28px;height:28px;border-radius:9px;background:' + s[2] + ';margin-right:.6rem;flex:none"></span><strong class="klein">' + s[1] + '</strong>';
      b.addEventListener('click', function () { S.einstellungenSpeichern({ farbschema: s[0] }).then(function () { HT.app.darstellungAnwenden(); HT.app.neuZeichnen(); }); });
      wahl.appendChild(b);
    });
    var f1 = UI.formular([
      { name: 'schriftgroesse', label: 'Schriftgröße', typ: 'bereich', min: 100, max: 160, schritt: 10, breit: true, format: function (v) { return v + ' %'; } },
      { name: 'kontrast', label: 'Hoher Kontrast (schwarz / weiß / gelb)', typ: 'schalter', breit: true }
    ], e);
    g.appendChild(UI.karte('Darstellung', [HT.el('div', { class: 'feld-label' }, 'Farbschema'), wahl, f1.el], { icon: 'auge' }));
    var f2 = UI.formular([
      { name: 'ton', label: 'Töne an', typ: 'schalter', breit: true },
      { name: 'lautstaerke', label: 'Lautstärke', typ: 'bereich', min: 0, max: 100, schritt: 5, breit: true, format: function (v) { return v + ' %'; } },
      { name: 'sprachausgabe', label: 'Anleitungen und Hinweise vorlesen (Aufnahmen der Vorlesestimme)', typ: 'schalter', breit: true },
      { name: 'sprachausgabeErsatz', label: 'Systemstimme verwenden, wenn für einen Text keine Aufnahme vorhanden ist', typ: 'schalter', breit: true },
      { typ: 'titel', label: 'Training' },
      { name: 'standarddauer', label: 'Standarddauer je Modul (min)', typ: 'zahl', min: 1, max: 60 },
      { name: 'pausenhinweisMin', label: 'Pausenhinweis alle … Minuten (0 = aus)', typ: 'zahl', min: 0, max: 120 },
      { name: 'uebung', label: 'Übungsdurchgang mit 3 Probeaufgaben vor jedem Modul', typ: 'schalter', breit: true },
      { name: 'befinden', label: 'Befinden vor und nach der Sitzung abfragen (Smiley-Skala)', typ: 'schalter', breit: true, standard: true },
      { typ: 'titel', label: 'Bildschirm (für Gesichtsfeld- und Sakkadentraining)' },
      { name: 'bildschirmBreiteCm', label: 'Sichtbare Bildschirmbreite (cm)', typ: 'zahl', min: 20, max: 200, hilfe: 'z. B. 33 cm bei 15-Zoll-MacBook, 52 cm bei 24-Zoll-iMac' },
      { name: 'abstandCm', label: 'Abstand Auge – Bildschirm (cm)', typ: 'zahl', min: 20, max: 200, hilfe: 'Empfohlen: etwa die 1,2-fache Bildschirmbreite' }
    ], e);
    var tonTest = UI.knopf('Ton testen', { art: 'klein', icon: 'ton', klick: function () { HT.audio.an = true; HT.audio.lautstaerke = f2.werte().lautstaerke / 100; HT.audio.richtig(); } });
    g.appendChild(UI.karte('Ton & Training', [f2.el, tonTest], { icon: 'ton' }));
    w.appendChild(g);
    var speichern = UI.knopf(HT.t('speichern'), { art: 'primaer gross', icon: 'haken', klick: function () {
      S.einstellungenSpeichern(HT.zusammen(f1.werte(), f2.werte())).then(function () { HT.app.darstellungAnwenden(); UI.toast(HT.t('gespeichert'), 'ok'); HT.app.neuZeichnen(); });
    } });
    speichern.style.marginTop = '1.2rem';
    w.appendChild(speichern);
  }, { nav: 'einstellungen' });
})();
