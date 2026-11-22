/* Hirntraining – Verwaltung (nur Administrator) und Einstellungen */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  /* ===================== Datensicherung ===================== */
  var SI = HT.sicherung = {
    /* Verschlüsselte Sicherung (.htsich, AES-GCM). Ohne crypto.subtle nur nach ausdrücklicher Bestätigung unverschlüsselt. */
    exportieren: function () {
      var datum = HT.isoDatum(Date.now());
      if (!HT.krypto.verfuegbar) {
        return UI.bestaetigen('Dieser Browser kann die Sicherung nicht verschlüsseln. Bitte möglichst Google Chrome verwenden. Trotzdem unverschlüsselt sichern? Die Datei enthält dann alle Patientendaten im Klartext.', { gefahr: true, ja: 'Unverschlüsselt sichern' }).then(function (ok) {
          if (!ok) return;
          return S.exportAll().then(function (d) {
            HT.herunterladen('hirntraining-sicherung-' + datum + '.json', JSON.stringify(d), 'application/json');
            HT.audit('export (unverschlüsselt)');
            return S.einstellungenSpeichern({ letzterExport: Date.now() });
          }).then(function () { UI.toast('Sicherung wurde heruntergeladen.', 'ok'); });
        });
      }
      return HT.krypto.passwortDialog().then(function (pw) {
        if (!pw) return;
        return S.exportAll().then(function (d) {
          return HT.krypto.verschluesseln(d, pw, { erstellt: d.erstellt, art: 'gesamt' });
        }).then(function (v) {
          HT.herunterladen('hirntraining-sicherung-' + datum + '.htsich', JSON.stringify(v), 'application/octet-stream');
          HT.audit('export');
          return S.einstellungenSpeichern({ letzterExport: Date.now() });
        }).then(function () { UI.toast('Verschlüsselte Sicherung wurde heruntergeladen.', 'ok'); }, function (e) { UI.toast(e.message || 'Sicherung fehlgeschlagen.', 'fehler'); });
      });
    },
    /* Datei lesen: v2 (verschlüsselt) → Passwort abfragen; v1 (Klartext) → mit Warnhinweis */
    dateiOeffnen: function (format) {
      return HT.dateiLesen('.htsich,.json,application/json').then(function (f) {
        if (!f) return null;
        var daten;
        try { daten = JSON.parse(f.inhalt); } catch (e) { UI.toast('Die Datei konnte nicht gelesen werden.', 'fehler'); return null; }
        if (!daten || (daten.format !== 'hirntraining-sicherung' && daten.format !== 'hirntraining-patient')) { UI.toast('Die Datei ist keine Hirntraining-Sicherung.', 'fehler'); return null; }
        if (daten.version >= 2 && daten.daten && daten.kdf) {
          var versuch = function () {
            return HT.krypto.passwortDialog({ titel: 'Sicherung entschlüsseln', text: 'Bitte das Passwort eingeben, mit dem diese Sicherung erstellt wurde.', nurEinmal: true, ok: 'Entschlüsseln' }).then(function (pw) {
              if (!pw) return null;
              return HT.krypto.entschluesseln(daten, pw).catch(function (e) { UI.toast(e.message, 'fehler'); return versuch(); });
            });
          };
          return versuch().then(function (inhalt) { return inhalt && inhalt.format === format ? inhalt : (inhalt ? (UI.toast('Die Datei passt nicht zu dieser Funktion.', 'fehler'), null) : null); });
        }
        if (daten.format !== format) { UI.toast('Die Datei passt nicht zu dieser Funktion.', 'fehler'); return null; }
        return UI.bestaetigen('Achtung: Diese Datei ist eine ältere, unverschlüsselte Sicherung. Sie enthält Patientendaten im Klartext – nach dem Einspielen bitte sicher löschen und künftig verschlüsselt sichern.', { ja: 'Trotzdem einspielen' }).then(function (ok) { return ok ? daten : null; });
      });
    },
    importieren: function () {
      return SI.dateiOeffnen('hirntraining-sicherung').then(function (daten) {
        if (!daten) return;
        var n = (daten.patients || []).length, r = (daten.runs || []).length;
        return UI.bestaetigen('Sicherung vom ' + HT.datumZeit(daten.erstellt) + ' mit ' + n + ' Patienten und ' + r + ' Durchgängen wiederherstellen? Alle aktuellen Daten werden dabei ersetzt.', { gefahr: true, ja: 'Wiederherstellen' }).then(function (ok) {
          if (!ok) return;
          return S.importAll(daten).then(function () {
            HT.audit('import');
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
    { id: 'datenschutz', titel: 'Datenschutz', icon: 'schloss' },
    { id: 'daten', titel: 'Daten & Testdaten', icon: 'test' }
  ];

  HT.route('/verwaltung', function () { location.replace('#/verwaltung/therapeuten'); }, { schutz: 'admin', nav: 'verwaltung' });
  HT.route('/verwaltung/:bereich', function (param, w) {
    w.appendChild(UI.seite(HT.t('nav_verwaltung'), 'Praxisweite Einstellungen – nur für Administratoren'));
    w.appendChild(UI.reiter(BEREICHE, param.bereich, function (b) { location.hash = '#/verwaltung/' + b; }));
    var fn = { therapeuten: therapeuten, praxis: praxis, vorlagen: vorlagen, berichte: berichtsvorlagen, module: schwellen, sicherung: sicherung, datenschutz: datenschutz, daten: daten }[param.bereich] || therapeuten;
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
      HT.el('p', null, 'Exportiert alle Daten (Patienten, Pläne, Ergebnisse, Einstellungen) als verschlüsselte Datei (.htsich). Das Passwort wird nicht gespeichert – bitte sicher notieren. Bewahren Sie die Datei z. B. auf einem USB-Stick in der Praxis auf, nicht in Cloud-Ordnern wie Google Drive.'),
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

  /* ===================== Datenschutz: Sperre, Aufbewahrung, Löschen, Protokoll ===================== */
  function behandlungsende(p) {
    var t = p.angelegtAm || 0;
    S.alle('sessions', function (s) { return s.patientId === p.id; }).forEach(function (s) { t = Math.max(t, s.ende || s.start || 0); });
    return p.behandlungsende ? Math.max(t, new Date(p.behandlungsende).getTime() || 0) : t;
  }
  function datenschutz(w) {
    var e = S.einstellungen();
    var g = HT.el('div', { class: 'raster raster-2' });
    // Status Datentresor (Verschlüsselung der Patientendaten im Browser)
    var tr = S.tresor, ohne = S.alle('therapists').filter(function (t) { return t.aktiv !== false && !t.tresor; });
    var trText = tr.aktiv()
      ? '<p><b style="color:var(--erfolg)">● Aktiv:</b> Klientendaten, Pläne, Sitzungen und Ergebnisse werden mit AES-256 verschlüsselt gespeichert. Der Schlüssel ist mit der PIN jedes Zugangs geschützt und liegt nur während der Anmeldung im Arbeitsspeicher.</p>' +
        (ohne.length ? '<p class="klein">Noch ohne eigenen Schlüssel (einmalige Freigabe bei der nächsten Anmeldung): ' + ohne.map(function (t) { return HT.esc(t.name); }).join(', ') + '</p>' : '')
      : tr.moeglich ? '<p><b style="color:var(--warnung,#c99a12)">● Noch nicht aktiv</b> – wird bei der nächsten Anmeldung mit PIN automatisch eingerichtet.</p>'
        : '<p><b style="color:var(--fehler)">● Nicht verfügbar</b> – dieser Browser kann nicht verschlüsseln. Bitte Google Chrome oder Safari verwenden.</p>';
    g.appendChild(UI.karte('Datentresor (Verschlüsselung)', [HT.el('div', { html: trText + '<p class="klein gedimmt">Empfehlung zusätzlich: FileVault (Systemeinstellungen → Sicherheit) und ein Benutzerpasswort am Mac. PINs mit 6 oder mehr Ziffern sind deutlich sicherer als 4.</p>' })], { icon: 'schloss' }));
    var f = UI.formular([
      { name: 'sperreMin', label: 'Sperren nach Inaktivität', typ: 'auswahl', optionen: [{ wert: 5, label: '5 Minuten' }, { wert: 10, label: '10 Minuten' }, { wert: 15, label: '15 Minuten' }, { wert: 30, label: '30 Minuten' }] },
      { name: 'aufbewahrungJahre', label: 'Aufbewahrungsfrist (Jahre nach Behandlungsende)', typ: 'zahl', min: 1, max: 30 }
    ], e);
    g.appendChild(UI.karte('Sperre und Aufbewahrung', [
      HT.el('p', { class: 'klein gedimmt' }, 'Ohne Maus-, Tastatur- oder Touch-Eingabe wird das Programm gesperrt (nicht während eines laufenden Trainings). Sofort sperren: Strg + Alt + L.'),
      f.el,
      UI.knopf(HT.t('speichern'), { art: 'primaer klein', klick: function () { var v = f.werte(); v.sperreMin = Number(v.sperreMin) || 10; v.aufbewahrungJahre = Number(v.aufbewahrungJahre) || 10; S.einstellungenSpeichern(v).then(function () { UI.toast(HT.t('gespeichert'), 'ok'); HT.app.neuZeichnen(); }); } })
    ], { icon: 'schloss' }));
    // Frist abgelaufen
    var jahre = Number(e.aufbewahrungJahre) || 10, grenze = Date.now() - jahre * 365.25 * 86400000;
    var abgelaufen = S.alle('patients').filter(function (p) { return behandlungsende(p) < grenze; });
    var wahl = {};
    var kl = UI.karte('Frist abgelaufen (' + abgelaufen.length + ')', null, { icon: 'muell' });
    if (!abgelaufen.length) kl.appendChild(UI.leer('Keine Klienten mit abgelaufener Aufbewahrungsfrist (' + jahre + ' Jahre nach Behandlungsende).', 'haken'));
    else {
      abgelaufen.forEach(function (p) {
        var cb = HT.el('input', { type: 'checkbox' });
        cb.addEventListener('change', function () { wahl[p.id] = cb.checked; });
        kl.appendChild(HT.el('label', { class: 'ds-zeile' }, [cb, HT.el('span', null, (p.pseudonym || '–') + ' · Behandlungsende ' + HT.datum(behandlungsende(p)))]));
      });
      kl.appendChild(UI.knopf('Ausgewählte endgültig löschen', { art: 'gefahr klein', icon: 'muell', klick: function () {
        var ids = Object.keys(wahl).filter(function (k) { return wahl[k]; });
        if (!ids.length) { UI.toast('Bitte zuerst Klienten auswählen.', 'fehler'); return; }
        UI.bestaetigen(ids.length + ' Klient(en) mit allen Durchgängen, Sitzungen, Plänen, Zielen und Notizen endgültig löschen? Das lässt sich nicht rückgängig machen.', { gefahr: true, ja: 'Endgültig löschen' }).then(function (ok) {
          if (!ok) return;
          Promise.all(ids.map(function (id) { var p = S.finde('patients', id); return p ? HT.patienten.loeschen(p) : null; })).then(function () { UI.toast('Gelöscht.', 'ok'); HT.app.neuZeichnen(); });
        });
      } }));
    }
    g.appendChild(kl);
    w.appendChild(g);
    // Protokoll
    var pk = UI.karte('Protokoll (ohne Klardaten)', null, { icon: 'dokument' });
    var liste = S.alle('audit').sort(function (a, b) { return b.zeit - a.zeit; }).slice(0, 300);
    if (!liste.length) pk.appendChild(UI.leer('Noch keine Einträge. Protokolliert werden Export, Import, Löschen und Bericht drucken.', 'dokument'));
    else pk.appendChild(UI.tabelle([
      { titel: 'Datum', wert: function (a) { return HT.datumZeit(a.zeit); } },
      { titel: 'Aktion', wert: function (a) { return a.aktion; } },
      { titel: 'Therapeut', wert: function (a) { return a.therapeut || '–'; } },
      { titel: 'Pseudonym', wert: function (a) { return a.pseudonym || '–'; } }
    ], liste));
    pk.style.marginTop = '1.2rem';
    w.appendChild(pk);
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
        UI.dialog({ fokusFeld: true, titel: 'Alle Daten löschen', inhalt: f.el, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: 'Endgültig löschen', art: 'gefahr primaer', aktion: function () {
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
      { name: 'kontrast', label: 'Hoher Kontrast (schwarz / weiß / gelb)', typ: 'schalter', breit: true },
      { name: 'grafik', label: 'Darstellung', typ: 'auswahl', breit: true, optionen: [{ wert: 'auto', label: 'Automatisch (misst die Leistung des Computers)' }, { wert: 'schoen', label: 'Schön (Schatten, Verläufe, Vorschau-Animationen)' }, { wert: 'leicht', label: 'Leicht (für ältere Computer, z. B. MacBook 2012)' }] },
      { name: 'animationenReduzieren', label: 'Animationen reduzieren', typ: 'schalter', breit: true }
    ], e);
    g.appendChild(UI.karte('Darstellung', [HT.el('div', { class: 'feld-label' }, 'Farbschema'), wahl, f1.el], { icon: 'auge' }));
    var f2 = UI.formular([
      { name: 'ton', label: 'Töne an', typ: 'schalter', breit: true },
      { name: 'lautstaerke', label: 'Lautstärke', typ: 'bereich', min: 0, max: 100, schritt: 5, breit: true, format: function (v) { return v + ' %'; } },
      { name: 'sprachausgabe', label: 'Anleitungen und Hinweise vorlesen (Aufnahmen der Vorlesestimme)', typ: 'schalter', breit: true },
      { name: 'sprachausgabeErsatz', label: 'Systemstimme (deutsche Stimme des Mac), wenn für einen Text keine Aufnahme vorhanden ist', typ: 'auswahl', breit: true, optionen: [{ wert: 'ersatz', label: 'Systemstimme nur als Ersatz (empfohlen)' }, { wert: 'nie', label: 'nie' }] },
      { name: 'sperreMin', label: 'Sperren nach Inaktivität (Minuten)', typ: 'auswahl', breit: true, optionen: [{ wert: 5, label: '5 Minuten' }, { wert: 10, label: '10 Minuten' }, { wert: 15, label: '15 Minuten' }, { wert: 30, label: '30 Minuten' }] },
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
