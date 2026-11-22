/* Hirntraining – Start, Hash-Router, App-Gerüst und Übersicht */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var APP = HT.app = {
    aktuelleRoute: null,

    darstellungAnwenden: function () {
      var e = S.einstellungen();
      var root = document.documentElement;
      root.setAttribute('data-schema', e.farbschema || 'tuerkis');
      if (e.kontrast) root.setAttribute('data-kontrast', 'an'); else root.removeAttribute('data-kontrast');
      root.style.setProperty('--skala', (e.schriftgroesse || 100) / 100);
      HT.audio.an = e.ton !== false;
      HT.audio.lautstaerke = (e.lautstaerke === undefined ? 70 : e.lautstaerke) / 100;
      HT.audio.sprache = e.sprachausgabe !== false;
      HT.audio.ersatzStimme = e.sprachausgabeErsatz !== 'nie' && e.sprachausgabeErsatz !== 'aus'; // Standard: Systemstimme als Ersatz
      // Animationen reduzieren (Einstellung oder Systemeinstellung „Bewegung reduzieren“)
      var ruhig = !!e.animationenReduzieren || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      root.classList.toggle('ruhig', ruhig);
      // Darstellung: Automatisch (gemessen) | Schön | Leicht
      var g = e.grafik || 'auto';
      if (g === 'leicht') root.classList.add('leicht');
      else if (g === 'schoen') root.classList.remove('leicht');
      else root.classList.toggle('leicht', HT.leistung.gemessenLeicht === true);
    },

    /* Vollbild über die Fullscreen-API (Safari: webkit-Präfix) */
    vollbild: function (nurAn) {
      var d = document, el = d.documentElement;
      var ist = d.fullscreenElement || d.webkitFullscreenElement;
      if (ist && nurAn === true) return;
      try {
        var r = null;
        if (!ist) r = (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
        else if (nurAn !== true) r = (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
        if (r && r.catch) r.catch(function () { /* ohne Nutzeraktion nicht erlaubt */ });
      } catch (e) { /* nicht erlaubt ohne Nutzeraktion */ }
    },

    neuZeichnen: function () { APP.routen(); },

    backupFaellig: function () {
      var e = S.einstellungen();
      if (!S.alle('patients').length) return null;
      if (!e.letzterExport) return HT.t('backup_nie');
      var tage = (Date.now() - e.letzterExport) / 86400000;
      return tage > (e.backupErinnerung || 7) ? HT.t('backup_faellig', { tage: e.backupErinnerung || 7 }) : null;
    },
    backupPruefen: function () {
      var m = APP.backupFaellig();
      if (m) setTimeout(function () { UI.toast(m + ' Bitte unter Verwaltung → Datensicherung sichern.', 'info'); }, 800);
    },

    routen: function () {
      if (HT.session.laeuft) return;
      var hash = (location.hash || '#/start').replace(/^#/, '') || '/start';
      var route = null, param = {};
      for (var i = 0; i < HT.routen.length; i++) {
        var m = HT.routen[i].re.exec(hash);
        if (m) { route = HT.routen[i]; HT.routen[i].namen.forEach(function (n, j) { param[n] = decodeURIComponent(m[j + 1]); }); break; }
      }
      if (!route) { location.replace('#/start'); return; }
      if (S.alle('therapists').length === 0 && hash !== '/einrichtung') { location.replace('#/einrichtung'); return; }
      if (route.schutz && !HT.auth.aktuell) { location.replace('#/start'); return; }
      if (route.schutz === 'admin' && !HT.auth.istAdmin()) { UI.toast('Nur für Administratoren.', 'fehler'); location.replace('#/uebersicht'); return; }
      APP.aktuelleRoute = route;
      APP.verlauf = APP.verlauf || [];
      if (APP.verlauf[APP.verlauf.length - 1] !== hash) APP.verlauf.push(hash);
      if (APP.verlauf.length > 50) APP.verlauf.shift();
      var app = HT.$('#app');
      HT.leeren(app);
      document.querySelectorAll('.dialog-hinter').forEach(function (d) { d.remove(); });
      if (!route.shell) { app.classList.remove('seite-ein'); void app.offsetWidth; app.classList.add('seite-ein'); route.render(param, app); return; }
      var shell = HT.el('div', { class: 'shell' });
      // Handy: obere Leiste mit Menüknopf, die Seitenleiste fährt von links herein
      var mobil = HT.el('div', { class: 'mobil-leiste' });
      var menue = HT.el('button', { type: 'button', class: 'mobil-menue', 'aria-label': 'Menü', html: '<span></span><span></span><span></span>' });
      menue.addEventListener('click', function () { shell.classList.toggle('nav-offen'); });
      mobil.appendChild(menue);
      mobil.appendChild(HT.el('div', { class: 'mobil-titel', html: '<span class="marke-logo">' + HT.logoHtml() + '</span><b>' + HT.esc(HT.t('app')) + '</b>' }));
      var schleierNav = HT.el('div', { class: 'nav-schleier' });
      schleierNav.addEventListener('click', function () { shell.classList.remove('nav-offen'); });
      shell.appendChild(mobil);
      shell.appendChild(schleierNav);
      shell.appendChild(seitenleiste(route.nav));
      var haupt = HT.el('main', { class: 'hauptbereich' });
      var inhalt = HT.el('div', { class: 'inhalt' });
      haupt.appendChild(inhalt);
      shell.appendChild(haupt);
      app.appendChild(shell);
      inhalt.appendChild(zurueckLeiste());
      inhalt.classList.add('seite-ein');
      try { route.render(param, inhalt); } catch (e) { console.error(e); inhalt.appendChild(UI.leer('Beim Anzeigen ist ein Fehler aufgetreten: ' + e.message, 'warnung')); }
    }
  };

  /* Zurück-Knopf oben auf jeder Seite: vorherige Seite, sonst Startfenster */
  function zurueckLeiste() {
    var leiste = HT.el('div', { class: 'zurueck-leiste' });
    var b = HT.el('button', { type: 'button', class: 'zurueck-knopf', html: HT.icon('zurueck') + '<span>Zurück</span>' });
    b.addEventListener('click', APP.zurueck);
    leiste.appendChild(b);
    if (HT.pult && HT.pult.statusChip) leiste.appendChild(HT.pult.statusChip());
    return leiste;
  }
  APP.zurueck = function () {
    var v = APP.verlauf || [];
    if (v.length > 1) { v.pop(); var ziel = v.pop(); location.hash = '#' + ziel; }
    else location.hash = '#/arbeitsplatz';
  };

  function seitenleiste(aktiv) {
    var e = S.einstellungen();
    var nav = HT.el('aside', { class: 'seitenleiste' });
    nav.appendChild(HT.el('div', { class: 'marke', html: '<div class="marke-logo">' + HT.logoHtml() + '</div><div class="marke-text"><strong>' + HT.t('app') + '</strong><span>' + HT.esc(e.praxisname) + '</span></div>' }));
    var links = HT.el('nav', { class: 'nav' });
    var eintrag = function (id, icon, text, href) {
      links.appendChild(HT.el('a', { href: href || '#/' + id, class: aktiv === id ? 'aktiv' : '', html: HT.icon(icon) + '<span>' + HT.esc(text) + '</span>' }));
    };
    eintrag('arbeitsplatz', 'raster', 'Startfenster');
    eintrag('uebersicht', 'home', HT.t('nav_uebersicht'));
    eintrag('patienten', 'personen', HT.t('nav_patienten'));
    eintrag('module', 'raster', HT.t('nav_module'));
    eintrag('auswertung', 'diagramm', HT.t('nav_auswertung'));
    links.appendChild(HT.el('div', { class: 'nav-gruppe' }, 'System'));
    eintrag('einstellungen', 'zahnrad', HT.t('nav_einstellungen'));
    if (HT.auth.istAdmin()) eintrag('verwaltung', 'schild', HT.t('nav_verwaltung'), '#/verwaltung/therapeuten');
    eintrag('patientenstart', 'play', 'Patientenstart');
    eintrag('hilfe', 'info', 'Hilfe');
    nav.appendChild(links);
    var fuss = HT.el('div', { class: 'nav-fuss' });
    var t = HT.auth.aktuell;
    var chip = HT.el('div', { class: 'benutzer-chip' });
    chip.appendChild(UI.avatar(t.name));
    chip.appendChild(HT.el('div', null, [HT.el('strong', null, t.name), HT.el('span', null, t.rolle === 'admin' ? 'Administrator' : 'Therapeut')]));
    fuss.appendChild(chip);
    var kn = HT.el('div', { class: 'nav-fuss-knoepfe' });
    kn.appendChild(UI.knopf('', { icon: 'vollbild', art: 'klein', titel: HT.t('vollbild'), klick: function () { APP.vollbild(); } }));
    kn.appendChild(UI.knopf(HT.t('abmelden'), { icon: 'abmelden', art: 'klein', klick: HT.auth.abmelden }));
    fuss.appendChild(kn);
    nav.appendChild(fuss);
    return nav;
  }

  /* ===================== Übersicht ===================== */
  HT.route('/uebersicht', function (param, w) {
    var t = HT.auth.aktuell;
    var std = new Date().getHours();
    var gruss = std < 11 ? 'Guten Morgen' : std < 18 ? 'Guten Tag' : 'Guten Abend';
    var ban = HT.el('div', { class: 'willkommen' });
    ban.appendChild(HT.el('div', { style: { position: 'relative', zIndex: 1 }, html: '<h1>' + gruss + ', ' + HT.esc(t.name.split(' ')[0]) + '!</h1><p>' + new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</p>' }));
    ban.appendChild(UI.knopf(HT.t('neuer_patient'), { icon: 'plus', klick: function () { HT.patienten.bearbeiten().then(function (p) { if (p) location.hash = '#/patient/' + p.id + '/plan'; }); } }));
    w.appendChild(ban);

    var hinweis = APP.backupFaellig();
    if (hinweis) {
      var b = HT.el('div', { class: 'banner', html: HT.icon('warnung') + '<span>' + HT.esc(hinweis) + '</span>' });
      b.appendChild(UI.knopf('Jetzt sichern', { art: 'klein', icon: 'download', klick: function () { HT.sicherung.exportieren().then(APP.neuZeichnen); } }));
      w.appendChild(b);
    }

    var mitNachricht = HT.patienten.alle().filter(function (p) { return HT.vorgaben.ungelesen(p) > 0; });
    if (mitNachricht.length) {
      var nb = HT.el('div', { class: 'banner info', html: HT.icon('dokument') + '<span>Neue Nachrichten von Patienten: ' + mitNachricht.map(function (p) { return HT.esc(HT.patienten.anzeigename(p)) + ' (' + HT.vorgaben.ungelesen(p) + ')'; }).join(', ') + '</span>' });
      nb.appendChild(UI.knopf('Ansehen', { art: 'klein', klick: function () { location.hash = '#/patient/' + mitNachricht[0].id + '/plan'; } }));
      w.appendChild(nb);
    }
    var heute = new Date(); heute.setHours(0, 0, 0, 0);
    var sHeute = S.alle('sessions', function (s) { return s.start >= heute.getTime(); });
    var woche = S.alle('runs', function (r) { return r.start >= Date.now() - 7 * 86400000; });
    var kz = HT.el('div', { class: 'raster raster-4', style: { marginBottom: '1.2rem' } });
    kz.appendChild(UI.kennzahl(String(HT.patienten.alle().length), 'Aktive Patienten', 'personen'));
    kz.appendChild(UI.kennzahl(String(sHeute.length), 'Sitzungen heute', 'sitzung', 'gruen'));
    kz.appendChild(UI.kennzahl(Math.round(HT.summe(woche.map(function (r) { return r.dauerSek || 0; })) / 60) + ' min', 'Training (7 Tage)', 'uhr', 'lila'));
    var e = S.einstellungen();
    kz.appendChild(UI.kennzahl(e.letzterExport ? HT.datum(e.letzterExport) : 'nie', 'Letzte Sicherung', 'sicherung', hinweis ? 'gelb' : ''));
    w.appendChild(kz);

    var g = HT.el('div', { class: 'raster raster-21' });
    // Heutige Sitzungen
    var k1 = UI.karte('Heutige Sitzungen', null, { icon: 'kalender' });
    if (!sHeute.length) k1.appendChild(UI.leer('Heute wurden noch keine Sitzungen durchgeführt.', 'kalender'));
    sHeute.slice().reverse().forEach(function (s) {
      var p = S.finde('patients', s.patientId); if (!p) return;
      var runs = S.alle('runs', function (r) { return r.sessionId === s.id; });
      var zs = HT.results.zusammenfassung(runs);
      var el = HT.el('div', { class: 'liste-eintrag klickbar' });
      el.appendChild(UI.avatar(HT.patienten.anzeigename(p)));
      el.appendChild(HT.el('div', { class: 'le-text', html: '<strong>' + HT.esc(HT.patienten.anzeigename(p)) + '</strong><span>' + HT.datumZeit(s.start).slice(-5) + ' Uhr · ' + runs.length + ' Durchgänge · Quote ' + HT.prozent(zs.quote) + '</span>' }));
      el.appendChild(UI.abzeichen({ laufend: 'unterbrochen', abgeschlossen: 'abgeschlossen', abgebrochen: 'abgebrochen' }[s.status], s.status === 'abgeschlossen' ? 'gruen' : 'gelb'));
      el.addEventListener('click', function () { location.hash = '#/patient/' + p.id + '/verlauf'; });
      k1.appendChild(el);
    });
    g.appendChild(k1);
    // Zuletzt trainiert
    var k2 = UI.karte('Zuletzt trainiert', null, { icon: 'personen', aktionen: [UI.knopf('Alle', { art: 'klein geist', klick: function () { location.hash = '#/patienten'; } })] });
    var zuletzt = HT.patienten.alle().map(function (p) { return { p: p, t: HT.patienten.letztesTraining(p.id) }; })
      .sort(function (a, b) { return b.t - a.t; }).slice(0, 6);
    if (!zuletzt.length) k2.appendChild(UI.leer(HT.t('keine_patienten'), 'personen'));
    zuletzt.forEach(function (x) {
      var el = HT.el('div', { class: 'liste-eintrag klickbar' });
      el.appendChild(UI.avatar(HT.patienten.anzeigename(x.p)));
      el.appendChild(HT.el('div', { class: 'le-text', html: '<strong>' + HT.esc(HT.patienten.anzeigename(x.p)) + '</strong><span>' + (x.t ? 'zuletzt ' + HT.datum(x.t) : 'noch kein Training') + '</span>' }));
      var plan = HT.plaene.aktiverPlan(x.p.id);
      if (plan) el.appendChild(UI.iconKnopf('play', 'Sitzung starten', function (ev) { ev.stopPropagation(); HT.session.starten({ patientId: x.p.id, planId: plan.id }); }, 'rand'));
      el.addEventListener('click', function () { location.hash = '#/patient/' + x.p.id + '/stammdaten'; });
      k2.appendChild(el);
    });
    g.appendChild(k2);
    w.appendChild(g);

    // Trainingsaktivität der letzten 14 Tage
    var k3 = UI.karte('Trainingsminuten der letzten 14 Tage', null, { icon: 'diagramm' });
    k3.style.marginTop = '1.2rem';
    var d = HT.el('div'); k3.appendChild(d);
    w.appendChild(k3);
    var tage = [], werte = [];
    for (var i = 13; i >= 0; i--) {
      var t0 = heute.getTime() - i * 86400000;
      tage.push(HT.datum(t0).slice(0, 6));
      werte.push(Math.round(HT.summe(S.alle('runs', function (r) { return r.start >= t0 && r.start < t0 + 86400000; }).map(function (r) { return r.dauerSek || 0; })) / 60));
    }
    requestAnimationFrame(function () { HT.charts.balken(d, { kategorien: tage, serien: [{ name: 'Minuten', farbe: getComputedStyle(document.documentElement).getPropertyValue('--akzent').trim() || '#1BA8B5', werte: werte }], hoehe: 200, yFormat: function (v) { return Math.round(v) + ''; } }); });
  }, { nav: 'uebersicht' });

  /* ===================== Start ===================== */
  function fehlerAnzeigen(text) {
    HT.$('#app').innerHTML = '<div class="start"><div class="anmelde-box"><h1>Hirntraining konnte nicht starten</h1><p class="untertitel">' + HT.esc(text) + '</p></div></div>';
  }

  APP.starten = function () {
    S.init().then(function () {
      APP.darstellungAnwenden();
      HT.leistung.messen(function () { APP.darstellungAnwenden(); });
      HT.auth.wiederherstellen();
      if (HT.pult) HT.pult.init();
      return HT.Module.laden();
    }).then(function () {
      if (S.alle('therapists').length && !S.alle('templates').length) HT.vorlagen.standardAnlegen();
      window.addEventListener('hashchange', APP.routen);
      var lade = HT.$('#laden'); if (lade) lade.remove();
      APP.routen();
      // Module, Vorschauen und Ansagen im Hintergrund vorladen, damit beim Öffnen nichts nachlädt
      setTimeout(function () { if (HT.vorladen) HT.vorladen(); }, 900);
      // Neu zeichnen bei Größenänderung (Diagramme)
      var b = window.innerWidth;
      window.addEventListener('resize', HT.entprellen(function () { if (Math.abs(window.innerWidth - b) > 80 && !HT.session.laeuft && !document.querySelector('.dialog-hinter')) { b = window.innerWidth; APP.routen(); } }, 400));
    }).catch(function (e) {
      console.error(e);
      fehlerAnzeigen('Der Datenspeicher des Browsers ist nicht verfügbar (' + (e && e.message) + '). Bitte einen aktuellen Browser verwenden und private Fenster vermeiden.');
    });
  };

  // Hinweis beim Schließen während einer laufenden Sitzung
  window.addEventListener('beforeunload', function (ev) {
    if (HT.session.laeuft) { ev.preventDefault(); ev.returnValue = ''; }
  });

  document.addEventListener('DOMContentLoaded', APP.starten);

  // Online-Version (https, z. B. GitHub Pages): Offline-Speicher aktivieren, damit das Programm
  // auf iPhone/iPad/Mac auch ohne Internet startet. Bei index.html direkt vom Mac (file://) nicht nötig.
  // Manifest nur in der Online-Version einbinden (unter file:// meldet der Browser sonst einen Fehler in der Konsole)
  if (location.protocol === 'https:') { var mf = document.createElement('link'); mf.rel = 'manifest'; mf.href = 'manifest.webmanifest'; document.head.appendChild(mf); }
  if (location.protocol === 'https:' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('Offline-Speicher nicht verfügbar', e); }); });
  }
})();

/* Hilfe: kompakte Bedienungsanleitung im Programm */
(function () {
  'use strict';
  var HT = window.HT, UI = HT.ui;
  var THEMEN = [
    ['Arbeitsablauf', 'personen', '1. Patient anlegen (Patienten → Neuer Patient). 2. Trainingsplan aus einer Vorlage erstellen und anpassen (Reiter Trainingsplan). 3. Optional: Einstufungstest für passende Startlevel. 4. Therapieziele festlegen. 5. Sitzung starten – oder Wochenplan für das selbstständige Training im Patientenmodus anlegen. 6. Ergebnisse im Reiter Verlauf analysieren und Berichte erstellen.'],
    ['Während des Trainings', 'pause', 'Esc oder der Pauseknopf öffnen das Therapeutenmenü: Level ändern, Neustart mit oder ohne Anleitung, Parameter anpassen, Zwischenergebnisse ansehen, Modul überspringen, Sitzung unterbrechen oder beenden. Die Taste „+“ liest die Anleitung erneut vor, „−“ pausiert. Teilergebnisse werden immer gespeichert.'],
    ['Pult einrichten (Tastatur)', 'pult', '1. Pult per USB anstecken – es meldet sich als Tastatur, ein Treiber ist nicht nötig. 2. Oben auf den Pult-Knopf (oder System → Bedienpult) klicken und „Tasten einrichten“ wählen. 3. Jede Taste drücken, wenn sie im Bild blau markiert ist; fehlende Tasten überspringen. Schon belegte Tasten werden abgelehnt. 4. Belegungsprofil wählen (Klassisch: Gelb = Anleitung vorlesen, Rot = Pause; Ja/Nein: Gelb = Ja, Rot = Nein) und alle Tasten kurz testen. Der Joystick funktioniert nur in Chrome, die Tasten überall.'],
    ['Patientenmodus', 'schloss', 'Im Patientenmodus sind alle Menüs gesperrt. Patienten wählen auf dem Startbildschirm ihren Namen (optional mit persönlicher PIN) und sehen ihre Übungen für heute. Verlassen nur mit Therapeuten-PIN: Strg + Alt + P oder die Ecke oben rechts 1,5 Sekunden gedrückt halten.'],
    ['Wochenplan', 'kalender', 'Im Reiter Trainingsplan legen Sie für jeden Tag Vorgaben fest (Plan oder Einzelmodul, Startlevel, Anleitung, Wiederholung, persönliche Hinweise vor/nach dem Training). Erledigte Vorgaben werden grün. Mit dem erweiterten Patientenmodus darf an freien Tagen der aktive Plan trainiert werden. Nachrichten der Patienten erscheinen in der Übersicht.'],
    ['Adaptive Schwierigkeit', 'trend', 'Nach jedem Durchgang (1–3 min) wird die Trefferquote bewertet: zweimal hintereinander über der Aufstufungsschwelle → Level +1, unter der Abstufungsschwelle → Level −1, deutlich langsamer als zuletzt → nicht aufstufen. Schwellen je Modul unter Verwaltung; Level und Automatik je Patient im Reiter Einstellungen.'],
    ['Anleitung und Übung', 'info', 'Die ausführliche Anleitung mit animiertem Beispiel erscheint automatisch in den ersten beiden Sitzungen eines Moduls (im Plan auf „Immer“ oder „Nie“ umstellbar). Danach folgen drei Probeaufgaben ohne Wertung. Mit „Non-Stop“ arbeitet ein Patient ohne Zwischenbildschirme durch.'],
    ['Auswertung', 'diagramm', 'Der Reiter Verlauf zeigt eine Textzusammenfassung, Level-, Quoten- und Reaktionszeitverläufe, Links-Rechts-Verteilung, Zeitraumvergleich, die Sitzungsanalyse (je Sitzung und Durchgang, mit Parameter-Einsicht), einen druckbaren Levelverlauf für Patienten und die Selbsteinschätzung.'],
    ['Berichte', 'dokument', 'Verlaufsbericht bzw. Arztbrief mit Textbausteinen (Verwaltung → Berichtsvorlagen, Platzhalter wie {{name}}), Leistungsbericht für Kostenträger und CSV-Export der Durchgänge und Rohdaten. PDF über „Drucken → Als PDF sichern“.'],
    ['Datenschutz und Sicherung', 'sicherung', 'Alle Daten bleiben auf diesem Mac im Browser. Regelmäßig unter Verwaltung → Datensicherung sichern. Einzelne Patienten lassen sich als Datei exportieren und auf einem anderen Mac importieren. Optional sehen Therapeuten nur eigene Patienten; die Patientenliste kann Nachnamen kürzen.']
  ];
  HT.route('/hilfe', function (param, w) {
    w.appendChild(UI.seite('Hilfe', 'Kurzanleitung – ausführlich in der Datei README.md im Programmordner'));
    var g = HT.el('div', { class: 'raster raster-2' });
    THEMEN.forEach(function (t) { g.appendChild(UI.karte(t[0], HT.el('p', { style: { margin: 0, lineHeight: 1.6 } }, t[2]), { icon: t[1] })); });
    w.appendChild(g);
    var tasten = UI.karte('Tastatur im Training', HT.el('div', { html: '<table class="tabelle"><tr><td><kbd>Leertaste</kbd> <kbd>Enter</kbd></td><td>Reagieren / bestätigen</td></tr><tr><td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td><td>Richtungen, Auswahl bewegen</td></tr><tr><td><kbd>J</kbd> / <kbd>N</kbd></td><td>Ja / Nein (z. B. bekannt/neu, gleich/gespiegelt)</td></tr><tr><td><kbd>1</kbd> … <kbd>9</kbd></td><td>Antwort direkt wählen</td></tr><tr><td><kbd>Esc</kbd> / <kbd>−</kbd></td><td>Pause bzw. Therapeutenmenü</td></tr><tr><td><kbd>+</kbd></td><td>Anleitung erneut vorlesen</td></tr><tr><td><kbd>Strg</kbd> + <kbd>Alt</kbd> + <kbd>P</kbd></td><td>Patientenmodus verlassen (PIN)</td></tr></table>' }), { icon: 'tastatur' });
    tasten.style.marginTop = '1.2rem';
    w.appendChild(tasten);
  }, { nav: 'hilfe' });
})();
