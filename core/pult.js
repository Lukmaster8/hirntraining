/* Hirntraining – USB-Bedienpult: HASOMED-RehaCom-Patientenpult (USB-A), direkt im Browser.
 *
 * Kein Treiber nötig: Das Pult meldet sich am Mac als HID-Gerät. Chrome (ab Version 89, auch Chrome 116
 * unter macOS 10.13 High Sierra) kann solche Geräte über WebHID lesen. Beim ersten Mal muss das Pult einmal
 * über „Bedienpult verbinden“ freigegeben werden (Sicherheitsregel des Browsers), danach verbindet es sich
 * beim Einstecken bzw. beim Programmstart automatisch.
 *
 * Tastatur-Modus (immer verfügbar, auch in Safari): Die meisten Pulte melden sich am Mac als normale USB-Tastatur.
 * WebHID darf Tastaturen in Chrome nicht lesen – deshalb werden die Tasten über die normalen Tastatur-Ereignisse
 * angelernt (ev.code) und an die zentrale Eingabe gegeben. WebHID wird nur noch für Joystick bzw. HID-Pulte genutzt.
 *
 * Belegungsprofile: „Klassisch“ (Gelb = Anleitung vorlesen, Rot = Pause) und „Ja/Nein“ (Gelb = Ja, Rot = Nein).
 * Module mit eingaben: ['ja','nein'] schalten während des Moduls automatisch auf Ja/Nein um.
 *
 * Weil jedes Pult seine Tasten etwas anders meldet, werden die Tasten einmal „angelernt“ (Taste drücken →
 * Bit im HID-Bericht merken). Der Joystick wird über zwei kurze Bewegungen kalibriert. Meldet sich das Pult
 * stattdessen als Tastatur, werden die gedrückten Tasten ebenfalls angelernt.
 * Die Zuordnung wird in den Einstellungen gespeichert (Einstellungen → pult). */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  // Tastenbild des HASOMED-RehaCom-Patientenpults: links und rechts je große grüne OK-Taste, gelbe „+“- und rote „−“-Taste,
  // in der Mitte vier weiße Pfeiltasten (Raute), oben eine Reihe kleiner Tasten „OK 9 8 7 6 5 4 3 2 1 0 OK“.
  var ROLLEN = [
    { id: 'ok_links', name: 'Große grüne OK-Taste links', aktion: 'ok', farbe: 'gruen', x: 100, y: 222, r: 40 },
    { id: 'gelb_links', name: 'Gelbe Taste „+“ links', aktion: 'ja', farbe: 'gelb', x: 132, y: 132, r: 20 },
    { id: 'rot_links', name: 'Rote Taste „−“ links', aktion: 'nein', farbe: 'rot', x: 80, y: 158, r: 20 },
    { id: 'hoch', name: 'Weiße Pfeiltaste oben', aktion: 'hoch', farbe: 'weiss', x: 300, y: 108, r: 30 },
    { id: 'links', name: 'Weiße Pfeiltaste links', aktion: 'links', farbe: 'weiss', x: 232, y: 172, r: 30 },
    { id: 'rechts', name: 'Weiße Pfeiltaste rechts', aktion: 'rechts', farbe: 'weiss', x: 368, y: 172, r: 30 },
    { id: 'runter', name: 'Weiße Pfeiltaste unten', aktion: 'runter', farbe: 'weiss', x: 300, y: 236, r: 30 },
    { id: 'gelb_rechts', name: 'Gelbe Taste „+“ rechts', aktion: 'ja', farbe: 'gelb', x: 468, y: 132, r: 20 },
    { id: 'rot_rechts', name: 'Rote Taste „−“ rechts', aktion: 'nein', farbe: 'rot', x: 520, y: 158, r: 20 },
    { id: 'ok_rechts', name: 'Große grüne OK-Taste rechts', aktion: 'ok', farbe: 'gruen', x: 500, y: 222, r: 40 },
    { id: 'ok_klein_links', name: 'Kleine OK-Taste oben links', aktion: 'ok', farbe: 'gruen', x: 62, y: 46, r: 13, klein: 'OK' }
  ];
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0].forEach(function (z, i) {
    ROLLEN.push({ id: 'ziffer_' + z, name: 'Zifferntaste ' + z, aktion: 'ziffer:' + z, farbe: 'grau', x: 104 + i * 43.6, y: 46, r: 13, klein: String(z) });
  });
  ROLLEN.push({ id: 'ok_klein_rechts', name: 'Kleine OK-Taste oben rechts', aktion: 'ok', farbe: 'gruen', x: 538, y: 46, r: 13, klein: 'OK' });
  ROLLEN.push({ id: 'fuss_links', name: 'Fußtaste links (falls angeschlossen)', aktion: 'ok', farbe: 'fuss' });
  ROLLEN.push({ id: 'fuss_rechts', name: 'Fußtaste rechts (falls angeschlossen)', aktion: 'ok', farbe: 'fuss' });
  var AKTIONEN = [['auto', 'Automatisch (nach Profil)'], ['ok', 'Reagieren / OK'], ['ja', 'Ja / Bekannt'], ['nein', 'Nein / Neu'], ['hoch', 'Pfeil oben'], ['runter', 'Pfeil unten'], ['links', 'Pfeil links'], ['rechts', 'Pfeil rechts'], ['anleitung', 'Anleitung noch einmal vorlesen (+)'], ['pause', 'Pause / Therapeutenmenü (−)'], ['', 'keine Funktion']];
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(function (z) { AKTIONEN.splice(AKTIONEN.length - 1, 0, ['ziffer:' + z, 'Ziffer ' + z]); });
  var PROFILE = [['klassisch', 'Klassisch: Gelb = Anleitung vorlesen, Rot = Pause'], ['janein', 'Ja/Nein: Gelb = Ja / Bekannt, Rot = Nein / Neu']];
  var FARBEN = { gruen: ['#2EAD6B', '#1f8a52'], gelb: ['#F2C230', '#c99a12'], rot: ['#E25C5C', '#b93c3c'], weiss: ['#ffffff', '#c9d2d8'], grau: ['#56636c', '#3b464e'], fuss: ['#8a97a1', '#5f6b74'] };

  var P = HT.pult = {
    unterstuetzt: !!(window.navigator && navigator.hid), // nur WebHID (Joystick, HID-Pulte)
    tastaturModus: true,                                  // Tasten über die normale Tastatur: überall verfügbar
    letzteTaste: null,                                    // { code, key } – Live-Anzeige zur Fehlersuche
    geraet: null,
    letzte: {},            // reportId → Uint8Array (letzter Bericht)
    gedrueckt: {},         // rollenId → bool
    zaehler: {},           // rollenId → Anzahl
    joystick: null,        // { x: 0..1, y: 0..1 }
    meldungen: [],
    _hoerer: [],
    _lernen: null
  };

  function konfig() { return HT.kopie(S.einstellungen().pult || {}); }
  function konfigSpeichern(k) { return S.einstellungenSpeichern({ pult: k }); }
  function hex(n, l) { var s = Number(n || 0).toString(16).toUpperCase(); while (s.length < (l || 4)) s = '0' + s; return s; }
  function melden(text) {
    var z = new Date();
    P.meldungen.push(('0' + z.getHours()).slice(-2) + ':' + ('0' + z.getMinutes()).slice(-2) + ':' + ('0' + z.getSeconds()).slice(-2) + '  ' + text);
    if (P.meldungen.length > 200) P.meldungen.shift();
    benachrichtigen('meldung');
  }
  function benachrichtigen(art, daten) { P._hoerer.slice().forEach(function (f) { try { f(art, daten); } catch (e) { console.error(e); } }); }
  P.an = function (f) { P._hoerer.push(f); return function () { P._hoerer = P._hoerer.filter(function (x) { return x !== f; }); }; };

  P.eingerichtet = function () { var k = konfig(); return !!(k.tasten && Object.keys(k.tasten).length); };
  P.profil = function () { return konfig().profil || 'klassisch'; };
  // Ja/Nein gilt im Profil „Ja/Nein“ immer, sonst nur während eines Moduls, das eingaben: ['ja','nein'] erklärt
  P.janeinAktiv = function () {
    if (P.profil() === 'janein') return true;
    var m = HT.session && HT.session.modulLaeuft && HT.session.modulLaeuft();
    return !!(m && m.eingaben && m.eingaben.indexOf('ja') >= 0);
  };
  P.aktionVon = function (rolleId) {
    var k = konfig();
    if (k.aktionen && k.aktionen[rolleId] !== undefined && k.aktionen[rolleId] !== 'auto') return k.aktionen[rolleId];
    var r = ROLLEN.filter(function (x) { return x.id === rolleId; })[0];
    if (!r) return '';
    if (r.farbe === 'gelb' && !r.klein) return P.janeinAktiv() ? 'ja' : 'anleitung';
    if (r.farbe === 'rot' && !r.klein) return P.janeinAktiv() ? 'nein' : 'pause';
    return r.aktion;
  };
  // Tastatur-Pult bereit: OK und die vier Pfeile sind als Tasten angelernt
  P.tastaturBereit = function () {
    var t = konfig().tasten || {};
    var hat = function (id) { return !!(t[id] && t[id].key); };
    return (hat('ok_links') || hat('ok_rechts')) && hat('hoch') && hat('runter') && hat('links') && hat('rechts');
  };

  /* ---------- Verbindung ---------- */
  function passt(d) {
    var k = konfig();
    return !!(k.vendorId && d.vendorId === k.vendorId && d.productId === k.productId);
  }
  function oeffnen(d) {
    if (P.geraet === d && d.opened) return Promise.resolve(d);
    return (d.opened ? Promise.resolve() : d.open()).then(function () {
      if (P.geraet && P.geraet !== d) { try { P.geraet.removeEventListener('inputreport', bericht); } catch (e) { /* egal */ } }
      P.geraet = d;
      d.removeEventListener('inputreport', bericht);
      d.addEventListener('inputreport', bericht);
      P.letzte = {}; P.gedrueckt = {};
      melden('USB-Pult gefunden: ' + (d.productName || 'HID-Gerät') + ' (VID ' + hex(d.vendorId) + ', PID ' + hex(d.productId) + ')');
      melden(P.eingerichtet() ? 'Tastenzuordnung geladen – Pult ist bereit.' : 'Noch keine Tastenzuordnung: bitte „Tasten einrichten“ wählen.');
      statusAktualisieren();
      return d;
    }).catch(function (e) {
      melden('Pult konnte nicht geöffnet werden: ' + (e && e.message ? e.message : e));
      statusAktualisieren();
      throw e;
    });
  }
  P.verbinden = function () {
    if (!P.unterstuetzt) { UI.hinweis('Joystick', 'Der Joystick funktioniert nur in Google Chrome. Die Tasten des Pults funktionieren überall: einfach unter „Tasten einrichten“ anlernen.'); return Promise.resolve(null); }
    return navigator.hid.requestDevice({ filters: [] }).then(function (liste) {
      if (!liste || !liste.length) return null;
      var d = liste[0];
      var k = konfig();
      if (k.vendorId !== d.vendorId || k.productId !== d.productId) { k = { vendorId: d.vendorId, productId: d.productId, name: d.productName || '' }; }
      return konfigSpeichern(k).then(function () { return oeffnen(d); });
    }).catch(function (e) { if (e && e.name !== 'NotFoundError') melden('Verbinden fehlgeschlagen: ' + (e.message || e)); return null; });
  };
  P.trennen = function () {
    var d = P.geraet;
    P.geraet = null;
    if (d) { try { d.removeEventListener('inputreport', bericht); d.close(); } catch (e) { /* egal */ } }
    melden('Verbindung getrennt.');
    statusAktualisieren();
  };
  P.vergessen = function () {
    var d = P.geraet;
    P.trennen();
    if (d && d.forget) { try { d.forget(); } catch (e) { /* egal */ } }
    return konfigSpeichern({}).then(function () { melden('Pult und Tastenzuordnung entfernt.'); statusAktualisieren(); });
  };
  P.init = function () {
    if (!P.unterstuetzt) return;
    navigator.hid.addEventListener('connect', function (ev) { if (passt(ev.device)) oeffnen(ev.device).catch(function () { /* gemeldet */ }); });
    navigator.hid.addEventListener('disconnect', function (ev) {
      if (ev.device === P.geraet) { P.geraet = null; melden('USB-Pult wurde abgezogen.'); statusAktualisieren(); if (HT.session && HT.session.laeuft && UI.toast) UI.toast('Bedienpult getrennt', 'fehler'); }
    });
    navigator.hid.getDevices().then(function (liste) {
      var d = liste.filter(passt)[0];
      if (d) oeffnen(d).catch(function () { /* gemeldet */ });
    }).catch(function () { /* egal */ });
  };

  /* ---------- Berichte auswerten ---------- */
  function bitGesetzt(daten, t) { return t.i < daten.length && ((daten[t.i] & t.m) !== 0) !== !!t.inv; }
  function achsenWert(daten, a) {
    if (a.i >= daten.length) return null;
    var v = a.bits === 16 ? (daten[a.i] | ((daten[a.i + 1] || 0) << 8)) : daten[a.i];
    var n = (v - a.min) / Math.max(1, a.max - a.min);
    return Math.max(0, Math.min(1, n));
  }
  var joyRichtung = null, joyTimer = null;
  function bericht(ev) {
    var daten = new Uint8Array(ev.data.buffer.slice(ev.data.byteOffset, ev.data.byteOffset + ev.data.byteLength));
    var rid = ev.reportId || 0;
    if (P._lernen) P._lernen(rid, daten);
    P.letzte[rid] = daten;
    benachrichtigen('roh', { reportId: rid, daten: daten });
    var k = konfig();
    var tasten = k.tasten || {};
    Object.keys(tasten).forEach(function (rolle) {
      var t = tasten[rolle];
      if (t.key || (t.r || 0) !== rid) return;
      var jetzt = bitGesetzt(daten, t);
      if (jetzt && !P.gedrueckt[rolle]) tasteGedrueckt(rolle);
      if (!jetzt && P.gedrueckt[rolle]) { P.gedrueckt[rolle] = false; benachrichtigen('taste', { rolle: rolle, gedrueckt: false }); }
    });
    if (k.joystick && k.joystick.x && (k.joystick.x.r || 0) === rid) {
      var x = achsenWert(daten, k.joystick.x), y = k.joystick.y ? achsenWert(daten, k.joystick.y) : 0.5;
      if (x !== null) {
        if (k.joystick.invX) x = 1 - x;
        if (k.joystick.invY) y = 1 - y;
        P.joystick = { x: x, y: y };
        benachrichtigen('joystick', P.joystick);
        var r = x < 0.22 ? 'links' : x > 0.78 ? 'rechts' : y < 0.22 ? 'hoch' : y > 0.78 ? 'runter' : null;
        if (r !== joyRichtung) {
          joyRichtung = r; clearInterval(joyTimer);
          if (r && !P._lernen) { ausfuehren(r); joyTimer = setInterval(function () { ausfuehren(joyRichtung); }, 380); }
        }
      }
    }
  }
  var RICHTUNG = { hoch: 1, runter: 1, links: 1, rechts: 1 }, wdh = {};
  var STANDARD = { ArrowUp: 'hoch', ArrowDown: 'runter', ArrowLeft: 'links', ArrowRight: 'rechts', Space: 'ok', Enter: 'ok', NumpadEnter: 'ok' };
  function tasteGedrueckt(rolle, vonTastatur) {
    P.gedrueckt[rolle] = true;
    P.zaehler[rolle] = (P.zaehler[rolle] || 0) + 1;
    benachrichtigen('taste', { rolle: rolle, gedrueckt: true });
    if (P._lernen || P._testModus) return;
    var aktion = P.aktionVon(rolle);
    ausfuehren(aktion);
    // Gedrückt halten: eigene Wiederholung (400 ms, dann alle 150 ms) nur für Module mit wiederholung: true
    var m = HT.session && HT.session.modulLaeuft && HT.session.modulLaeuft();
    if (vonTastatur && RICHTUNG[aktion] && m && m.wiederholung) {
      clearTimeout(wdh[rolle]);
      wdh[rolle] = setTimeout(function los() { if (!P.gedrueckt[rolle]) return; ausfuehren(aktion); wdh[rolle] = setTimeout(los, 150); }, 400);
    }
  }
  function tasteLos(rolle) {
    clearTimeout(wdh[rolle]);
    if (!P.gedrueckt[rolle]) return;
    P.gedrueckt[rolle] = false;
    benachrichtigen('taste', { rolle: rolle, gedrueckt: false });
  }
  function rolleZurTaste(code) {
    var tasten = konfig().tasten || {};
    for (var rolle in tasten) if (tasten[rolle].key && tasten[rolle].key === code) return rolle;
    return null;
  }
  // Tastatur-Modus: angelernte Pulttasten werden hier abgefangen und als Aktion weitergegeben
  document.addEventListener('keydown', function (ev) {
    P.letzteTaste = { code: ev.code, key: ev.key };
    benachrichtigen('tastatur', P.letzteTaste);
    if (P._lernen !== null && P._lernenTaste) { P._lernenTaste(ev); return; }
    var t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    var rolle = rolleZurTaste(ev.code);
    if (!rolle) {
      // Standardbelegung RehaCom-Pult ohne Anlernen: „+“ = gelbe Taste, „−“ = rote Taste (Pfeile, Enter, Ziffern laufen normal)
      var std = (ev.key === '+' || ev.code === 'NumpadAdd') ? 'gelb_links' : (ev.key === '-' || ev.code === 'NumpadSubtract') ? 'rot_links' : null;
      if (!std || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      erkannt('Tasten + / −');
      if (P._testModus) { tasteGedrueckt(std); setTimeout(function () { tasteLos(std); }, 150); return; }
      ev.preventDefault(); ev.stopImmediatePropagation();
      if (!ev.repeat) ausfuehren(P.aktionVon(std));
      return;
    }
    erkannt('angelernte Taste');
    // Sendet das Pult ohnehin die passende Standardtaste (z. B. Pfeil oben für „hoch“), läuft sie normal weiter –
    // so funktionieren auch gehaltene Tasten (Gas im Straßenverkehr); nur die Testanzeige zählt mit.
    if (STANDARD[ev.code] && STANDARD[ev.code] === P.aktionVon(rolle) && !P._testModus) {
      if (!ev.repeat && !P.gedrueckt[rolle]) { P.gedrueckt[rolle] = true; P.zaehler[rolle] = (P.zaehler[rolle] || 0) + 1; benachrichtigen('taste', { rolle: rolle, gedrueckt: true }); }
      return;
    }
    ev.preventDefault(); ev.stopImmediatePropagation();
    if (ev.repeat) return; // Systemwiederholung ignorieren (eigene Wiederholung siehe oben)
    tasteGedrueckt(rolle, true);
  }, true);
  document.addEventListener('keyup', function (ev) {
    var rolle = rolleZurTaste(ev.code);
    if (rolle) tasteLos(rolle);
  }, true);
  window.addEventListener('blur', function () { Object.keys(P.gedrueckt).forEach(tasteLos); });

  /* Erkennung: Das RehaCom-Pult meldet sich am Mac und am iPad (USB-Adapter) als Tastatur. Browser dürfen Tastaturen
   * nicht nach Namen auflisten – das Pult gilt daher als erkannt, sobald eine seiner Tasten ankommt. */
  P.erkannt = false;
  function erkannt(wie) {
    if (P.erkannt) return;
    P.erkannt = true;
    melden('RehaCom-Pult erkannt (' + wie + ').');
    if (UI.toast && !P._testModus) UI.toast('RehaCom-Pult erkannt', 'erfolg');
    statusAktualisieren();
  }

  /* Aktion ausführen: im Training an das Modul, auf Zwischenbildschirmen den Hauptknopf drücken */
  function ausfuehren(aktion) {
    if (!aktion) return;
    if (aktion.indexOf('ziffer:') === 0) {
      // Zifferntasten gehen nur an laufende Module (z. B. Zahlenspanne, Kopfrechnen)
      if (document.querySelector('.training') && HT.eingabe.aktiv && !document.querySelector('.pause-schleier, .dialog-hinter')) HT.eingabe.ausloesen('ziffer', { wert: Number(aktion.slice(7)), quelle: 'pult' });
      return;
    }
    var training = document.querySelector('.training');
    if (!training) {
      // außerhalb des Trainings: OK bestätigt einen offenen Dialog
      var dlg = document.querySelector('.dialog-hinter');
      if (dlg) { if (aktion === 'ok') { var k0 = dlg.querySelector('button.primaer'); if (k0) k0.click(); } return; }
      // Arbeitsplatz: Pfeile wählen Gruppe/Modul, OK startet das Training
      if (HT.apNavi) HT.apNavi(aktion);
      return;
    }
    if (aktion === 'pause') {
      if (HT.session && HT.session.pauseOeffnen) HT.session.pauseOeffnen();
      else { var pk = training.querySelector('.tk-pause'); if (pk && !training.querySelector('.pause-schleier')) pk.click(); }
      return;
    }
    if (aktion === 'anleitung') { if (HT.session && HT.session.anleitungWiederholen) HT.session.anleitungWiederholen(); return; }
    var schleier = training.querySelector('.pause-schleier') || document.querySelector('.dialog-hinter');
    if (schleier) { if (aktion === 'ok') { var k1 = schleier.querySelector('button.primaer'); if (k1) k1.click(); } return; }
    var schirm = training.querySelector('.t-schirm');
    if (schirm && !HT.eingabe.aktiv) {
      if (aktion === 'ok') { var k2 = schirm.querySelector('button.primaer:not([disabled])'); if (k2) k2.click(); }
      else if (aktion === 'links' || aktion === 'rechts') {
        // Befindensskala: mit den Pfeilen ein Gesicht wählen
        var reihe = schirm.querySelector('.befinden-reihe');
        if (reihe) {
          var kn = [].slice.call(reihe.querySelectorAll('.befinden-knopf'));
          var i = kn.map(function (b) { return b.classList.contains('aktiv'); }).indexOf(true);
          i = Math.max(0, Math.min(kn.length - 1, i < 0 ? 2 : i + (aktion === 'rechts' ? 1 : -1)));
          kn[i].click();
        }
      }
      return;
    }
    HT.eingabe.ausloesen(aktion, { quelle: 'pult' });
  }
  P.ausfuehren = ausfuehren;

  /* ---------- Statusanzeige (grün = verbunden) ---------- */
  function zustand() {
    var tast = P.tastaturBereit();
    if (P.geraet) {
      if (!P.eingerichtet()) return { klasse: 'einrichten', text: 'Pult verbunden – Tasten einrichten', titel: 'HID-Pult ist verbunden, die Tasten müssen noch einmal angelernt werden' };
      return { klasse: 'verbunden', text: tast ? 'Pult bereit (Tastatur + Joystick)' : 'Pult verbunden (Joystick)', titel: (P.geraet.productName || 'USB-Pult') + ' – klicken für Pulttest' };
    }
    if (P.erkannt && !tast) return { klasse: 'verbunden', text: 'RehaCom-Pult erkannt', titel: 'Standardbelegung aktiv (Pfeile, OK, Ziffern, + und −) – klicken für Pulttest' };
    if (tast) return { klasse: 'verbunden', text: P.erkannt ? 'RehaCom-Pult bereit' : 'Pult bereit (Tastatur)', titel: 'Die Pulttasten sind angelernt – klicken für Pulttest' };
    return { klasse: 'getrennt', text: 'Pult: Tasten einrichten', titel: 'Klicken, um die Tasten des Pults anzulernen (funktioniert in jedem Browser)' };
  }
  function chipMalen(c) {
    var z = zustand();
    c.className = 'pult-chip ' + z.klasse;
    c.title = z.titel;
    c.innerHTML = '<span class="pult-punkt"></span>' + HT.icon('pult') + '<span>' + HT.esc(z.text) + '</span>';
  }
  P.statusChip = function () {
    var c = HT.el('button', { type: 'button' });
    chipMalen(c);
    c.addEventListener('click', function () { P.dialog(); });
    return c;
  };
  function statusAktualisieren() {
    [].forEach.call(document.querySelectorAll('.pult-chip'), chipMalen);
    benachrichtigen('status');
  }
  P.statusAktualisieren = statusAktualisieren;

  /* ---------- Pultgrafik ---------- */
  function pultSvg() {
    // Gehäuse in der Form des RehaCom-Pults (flach von oben), graue Bedienfläche, Tasten nach ROLLEN
    var s = '<svg class="pult-svg" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M30 60 Q30 22 70 20 L530 20 Q570 22 570 60 L580 240 Q582 286 534 288 L66 288 Q18 286 20 240 Z" fill="#f4f6f7" stroke="#c9d2d8" stroke-width="3"/>' +
      '<path d="M44 92 Q150 70 300 72 Q450 70 556 92 L560 262 Q560 276 544 276 L56 276 Q40 276 40 262 Z" fill="#dfe4e8"/>' +
      '<text x="48" y="284" font-size="11" font-weight="700" fill="#2EAD6B">RehaCom-Pult</text>';
    ROLLEN.forEach(function (r) {
      if (!r.x) return;
      var f = FARBEN[r.farbe];
      s += '<g class="pult-taste" data-rolle="' + r.id + '"><circle cx="' + r.x + '" cy="' + (r.y + (r.klein ? 2 : 4)) + '" r="' + r.r + '" fill="rgba(0,0,0,.12)"/>' +
        '<circle class="pult-kappe" cx="' + r.x + '" cy="' + r.y + '" r="' + r.r + '" fill="' + f[0] + '" stroke="' + f[1] + '" stroke-width="' + (r.klein ? 2 : 3) + '"/>';
      if (r.klein) s += '<text x="' + r.x + '" y="' + (r.y + 4) + '" text-anchor="middle" font-size="' + (r.klein.length > 1 ? 9 : 12) + '" font-weight="800" fill="#fff">' + r.klein + '</text>';
      else {
        if (r.farbe === 'gruen') s += '<text x="' + r.x + '" y="' + (r.y + 8) + '" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">OK</text>';
        if (r.farbe === 'gelb' || r.farbe === 'rot') s += '<text x="' + r.x + '" y="' + (r.y + 7) + '" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">' + (r.farbe === 'gelb' ? '+' : '−') + '</text>';
        if (r.farbe === 'weiss') { var pf = { hoch: 'M0 -10 L9 5 L-9 5 Z', runter: 'M0 10 L9 -5 L-9 -5 Z', links: 'M-10 0 L5 -9 L5 9 Z', rechts: 'M10 0 L-5 -9 L-5 9 Z' }[r.id]; s += '<path d="' + pf + '" transform="translate(' + r.x + ' ' + r.y + ')" fill="#b8c2c9"/>'; }
      }
      s += '<text class="pult-zahl" x="' + r.x + '" y="' + (r.y + r.r + (r.klein ? 14 : 22)) + '" text-anchor="middle" font-size="' + (r.klein ? 10 : 15) + '" font-weight="700" fill="#5f6b74">0</text></g>';
    });
    return s + '</svg>';
  }

  /* ---------- Dialog „Bedienpult“ (Pulttest) ---------- */
  P.dialog = function () {
    var aus = [];
    var w = HT.el('div', { class: 'pult-dialog' });
    var hinweisBox = HT.el('div', { class: 'pult-hinweis' });
    w.appendChild(hinweisBox);
    var oben = HT.el('div', { class: 'pult-oben' });
    var knLern = UI.knopf('Tasten einrichten', { art: 'primaer gross', icon: 'tastatur', klick: function () { lernen(); } });
    var knJoy = UI.knopf('Als USB-HID verbinden (Chrome)', { art: 'gross', icon: 'pult', klick: function () { P.verbinden(); } });
    knJoy.title = 'Nur nötig, wenn das RehaCom-Pult sich nicht als Tastatur meldet';
    if (!P.unterstuetzt) { knJoy.disabled = true; knJoy.title = 'Nur in Chrome – die Tasten funktionieren überall über „Tasten einrichten“'; }
    var knTrenn = UI.knopf('HID trennen', { art: 'geist', icon: 'stopp', klick: function () { P.trennen(); } });
    var knDruck = UI.knopf('Protokoll drucken', { art: 'geist', icon: 'drucker', klick: protokoll });
    [knLern, knJoy, knTrenn, knDruck].forEach(function (k) { oben.appendChild(k); });
    w.appendChild(oben);
    var live = HT.el('div', { class: 'pult-live klein' }, 'Zuletzt gedrückte Taste: –');
    w.appendChild(live);
    var raster = HT.el('div', { class: 'pult-raster' });
    var links = HT.el('div', { class: 'pult-links' });
    links.appendChild(HT.el('div', { class: 'feld-label' }, 'Meldungen'));
    var log = HT.el('pre', { class: 'pult-log' });
    links.appendChild(log);
    var info = HT.el('div', { class: 'pult-info' });
    links.appendChild(info);
    var grafik = HT.el('div', { class: 'pult-grafik', html: pultSvg() });
    links.appendChild(HT.el('div', { class: 'feld-label', style: { marginTop: '.8rem' } }, 'Tastentest – jede gedrückte Taste leuchtet auf und zählt mit'));
    links.appendChild(grafik);
    var fussInfo = HT.el('div', { class: 'pult-fuss klein gedimmt' });
    links.appendChild(fussInfo);
    raster.appendChild(links);
    var rechts = HT.el('div', { class: 'pult-rechts' });
    var joyKopf = HT.el('div', { class: 'pult-joykopf' }, [HT.el('span', null, 'Joystick'), HT.el('span', { class: 'pult-joywert' }, '(X: –; Y: –)')]);
    if (konfig().joystick) rechts.appendChild(joyKopf);
    var feld = HT.el('div', { class: 'pult-joyfeld' });
    var punkt = HT.el('div', { class: 'pult-joypunkt' });
    feld.appendChild(punkt);
    if (konfig().joystick) rechts.appendChild(feld);
    var roh = HT.el('div', { class: 'pult-roh klein' }, 'Rohdaten: –');
    rechts.appendChild(roh);
    var zuordnung = HT.el('div', { class: 'pult-zuordnung' });
    rechts.appendChild(zuordnung);
    raster.appendChild(rechts);
    w.appendChild(raster);

    function malen() {
      var verbunden = !!P.geraet;
      knTrenn.style.display = verbunden ? '' : 'none';
      var z = zustand();
      hinweisBox.className = 'pult-hinweis ' + z.klasse;
      hinweisBox.innerHTML = '<span class="pult-punkt"></span><b>' + HT.esc(z.text) + '</b>' + (
        P.tastaturBereit() ? '<span>Die Tasten sind eingerichtet. Zum Prüfen einfach Tasten drücken – sie leuchten unten auf.</span>'
          : '<span>Pult per USB anstecken und einmal „Tasten einrichten“ wählen: Das Programm fragt jede Taste nacheinander ab. Ein Treiber ist nicht nötig, es funktioniert in Safari und Chrome.</span>');
      var k = konfig();
      info.innerHTML = verbunden ? '<b>' + HT.esc(P.geraet.productName || 'HID-Gerät') + '</b> · VID ' + hex(P.geraet.vendorId) + ' · PID ' + hex(P.geraet.productId) + (k.joystick ? ' · Joystick kalibriert' : '') : '';
      log.textContent = P.meldungen.length ? P.meldungen.join('\n') : 'Noch keine Meldungen.';
      log.scrollTop = log.scrollHeight;
      // Zuordnungstabelle (Aktion je Taste änderbar)
      HT.leeren(zuordnung);
      zuordnung.appendChild(HT.el('div', { class: 'feld-label' }, 'Belegungsprofil'));
      var profSel = HT.el('select', { class: 'pult-profil' });
      PROFILE.forEach(function (pr) { var o = HT.el('option', { value: pr[0] }, pr[1]); if (P.profil() === pr[0]) o.selected = true; profSel.appendChild(o); });
      profSel.addEventListener('change', function () { var kk = konfig(); kk.profil = profSel.value; konfigSpeichern(kk).then(malen); });
      zuordnung.appendChild(profSel);
      zuordnung.appendChild(HT.el('div', { class: 'klein gedimmt', style: { margin: '.3rem 0 .6rem' } }, 'Module mit Ja/Nein-Antworten schalten Gelb und Rot automatisch auf Ja/Nein um.'));
      zuordnung.appendChild(HT.el('div', { class: 'feld-label' }, 'Belegung der Tasten'));
      var t = k.tasten || {};
      ROLLEN.forEach(function (r) {
        var z2 = HT.el('div', { class: 'pult-zeile' + (t[r.id] ? '' : ' fehlt') });
        z2.appendChild(HT.el('span', { class: 'pult-farbpunkt ' + r.farbe }));
        z2.appendChild(HT.el('span', { class: 'pult-zeilenname' }, r.name + (t[r.id] ? '' : ' – nicht eingerichtet')));
        var sel = HT.el('select');
        var gesetzt = (k.aktionen && k.aktionen[r.id] !== undefined) ? k.aktionen[r.id] : 'auto';
        AKTIONEN.forEach(function (a) { var o = HT.el('option', { value: a[0] }, a[1] + (a[0] === 'auto' ? ' – jetzt: ' + ((AKTIONEN.filter(function (x) { return x[0] === P.aktionVon(r.id); })[0] || ['', 'keine'])[1]) : '')); if (gesetzt === a[0]) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', function () { var kk = konfig(); kk.aktionen = kk.aktionen || {}; kk.aktionen[r.id] = sel.value; konfigSpeichern(kk); });
        z2.appendChild(sel);
        zuordnung.appendChild(z2);
      });
      fussInfo.textContent = ['fuss_links', 'fuss_rechts'].map(function (id) { return (id === 'fuss_links' ? 'Fußtaste links: ' : 'Fußtaste rechts: ') + (P.zaehler[id] || 0) + '×'; }).join(' · ');
      zaehlerMalen();
    }
    function zaehlerMalen() {
      ROLLEN.forEach(function (r) {
        var g = grafik.querySelector('[data-rolle="' + r.id + '"]');
        if (!g) return;
        var zl = g.querySelector('.pult-zahl'); if (zl) zl.textContent = P.zaehler[r.id] || 0;
        g.classList.toggle('an', !!P.gedrueckt[r.id]);
        g.classList.toggle('fehlt', !(konfig().tasten || {})[r.id]);
      });
    }
    function joyMalen(j) {
      punkt.style.left = (j.x * 100) + '%'; punkt.style.top = (j.y * 100) + '%';
      joyKopf.lastChild.textContent = '(X: ' + j.x.toFixed(2) + '; Y: ' + j.y.toFixed(2) + ')';
    }
    P._testModus = true;
    aus.push(P.an(function (art, d) {
      if (art === 'taste') { zaehlerMalen(); if (d.rolle.indexOf('fuss') === 0) malen(); }
      else if (art === 'tastatur') live.textContent = 'Zuletzt gedrückte Taste: ' + d.code + (d.key && d.key.length === 1 ? ' („' + d.key + '“)' : d.key ? ' (' + d.key + ')' : '');
      else if (art === 'joystick') joyMalen(d);
      else if (art === 'roh') roh.textContent = 'Rohdaten (Bericht ' + d.reportId + '): ' + [].map.call(d.daten, function (b) { return hex(b, 2); }).join(' ');
      else malen();
    }));
    malen();
    if (P.joystick) joyMalen(P.joystick);

    /* Tasten anlernen */
    function lernen() {
      // Nur die 10 Haupttasten abfragen; Ziffern und kleine OK-Tasten senden Standardtasten und gehen ohne Anlernen
      var rollen = ROLLEN.filter(function (r) { return !r.klein && r.farbe !== 'fuss'; }), index = -1, basis = null, rauschen = {}, phase = 'ruhe', neu = {}, kandidat = null;
      var box = HT.el('div', { class: 'pult-lernen' });
      var titel = HT.el('h3');
      var text = HT.el('p');
      var fort = HT.el('div', { class: 'pult-lernfortschritt' });
      var knopfZeile = HT.el('div', { class: 'pult-lernknoepfe' });
      var weiterK = UI.knopf('Überspringen', { klick: function () { naechste(); } });
      var abbrK = UI.knopf('Abbrechen', { art: 'geist', klick: function () { ende(false); } });
      var restK = UI.knopf('Rest überspringen & speichern', { art: 'geist', klick: function () { ende(true); } });
      knopfZeile.appendChild(abbrK); knopfZeile.appendChild(restK); knopfZeile.appendChild(weiterK);
      [titel, text, fort, knopfZeile].forEach(function (e) { box.appendChild(e); });
      w.appendChild(box);
      function kopieren() { var b = {}; Object.keys(P.letzte).forEach(function (r) { b[r] = new Uint8Array(P.letzte[r]); }); return b; }
      function markieren(id) {
        [].forEach.call(grafik.querySelectorAll('.pult-taste'), function (g) { g.classList.toggle('gesucht', g.getAttribute('data-rolle') === id); });
      }
      function naechste() {
        index++;
        kandidat = null;
        if (index >= rollen.length) { ende(true); return; }
        var r = rollen[index];
        titel.textContent = 'Bitte drücken: ' + r.name;
        text.textContent = 'Taste kurz drücken und wieder loslassen. Fehlt die Taste an Ihrem Pult, auf „Überspringen“ klicken.';
        fort.textContent = 'Taste ' + (index + 1) + ' von ' + rollen.length;
        markieren(r.id);
        basis = kopieren();
      }
      P._lernen = function (rid, daten) {
        if (phase === 'ruhe') {
          // In der Ruhephase verändern sich nur rauschende Werte (z. B. Joystick) – diese Bytes ignorieren
          var alt = P.letzte[rid];
          if (alt) for (var i = 0; i < daten.length; i++) if (alt[i] !== daten[i]) rauschen[rid + ':' + i] = true;
          return;
        }
        if (!basis) return;
        var b = basis[rid];
        if (!b) { basis[rid] = new Uint8Array(daten); return; }
        if (!kandidat) {
          for (var j = 0; j < daten.length; j++) {
            if (rauschen[rid + ':' + j] || b[j] === daten[j]) continue;
            var diff = b[j] ^ daten[j];
            var m = diff & -diff; // niedrigstes geändertes Bit
            kandidat = { r: rid, i: j, m: m, inv: (b[j] & m) !== 0 };
            break;
          }
        } else if (kandidat.r === rid && ((daten[kandidat.i] & kandidat.m) !== 0) === kandidat.inv) {
          // losgelassen → übernehmen
          neu[rollen[index].id] = kandidat;
          P.zaehler[rollen[index].id] = (P.zaehler[rollen[index].id] || 0) + 1;
          setTimeout(naechste, 120);
          kandidat = null; basis = null;
        }
      };
      P._lernenTaste = function (ev) {
        if (phase === 'ruhe' || index < 0 || ev.repeat) return;
        if (/^(Tab|Escape)$/.test(ev.key)) return;
        ev.preventDefault(); ev.stopImmediatePropagation();
        var id = rollen[index].id, alt = konfig().tasten || {}, belegt = null;
        Object.keys(neu).forEach(function (r) { if (r !== id && neu[r].key === ev.code) belegt = r; });
        if (!belegt) Object.keys(alt).forEach(function (r) { if (r !== id && !neu[r] && alt[r].key === ev.code) belegt = r; });
        // Gleicher Code wie eine Taste mit derselben Funktion (z. B. Gelb links/rechts): einfach übernehmen
        if (belegt && P.aktionVon(belegt) === P.aktionVon(id)) belegt = null;
        if (belegt) {
          var rn = (ROLLEN.filter(function (x) { return x.id === belegt; })[0] || { name: belegt }).name;
          text.textContent = 'Diese Taste (' + ev.code + ') ist schon für „' + rn + '“ belegt. Bitte die gesuchte Taste drücken oder „Überspringen“.';
          return;
        }
        neu[id] = { key: ev.code, name: ev.key, location: ev.location };
        naechste();
      };
      function ende(ok) {
        P._lernen = null; P._lernenTaste = null;
        markieren(null);
        box.remove();
        if (!ok) return;
        var k = konfig();
        k.tasten = HT.zusammen(k.tasten || {}, neu);
        konfigSpeichern(k).then(function () { melden(Object.keys(neu).length + ' Tasten eingerichtet.'); statusAktualisieren(); malen(); });
      }
      P._lernen = P._lernen || function () {};
      titel.textContent = 'Bitte keine Taste drücken …';
      text.textContent = 'Das Programm misst kurz die Ruhewerte des Pults.';
      fort.textContent = '';
      setTimeout(function () { phase = 'tasten'; naechste(); }, 1500);
    }

    /* Joystick kalibrieren: erst links/rechts, dann oben/unten bewegen */
    function kalibrieren() {
      var box = HT.el('div', { class: 'pult-lernen' });
      var titel = HT.el('h3'), text = HT.el('p'), fort = HT.el('div', { class: 'pult-lernfortschritt' });
      [titel, text, fort].forEach(function (e) { box.appendChild(e); });
      w.appendChild(box);
      var proben = [];
      P._lernen = function (rid, daten) { proben.push({ r: rid, d: new Uint8Array(daten) }); };
      function auswerten(ausschluss) {
        var spann = {};
        proben.forEach(function (p) {
          for (var i = 0; i < p.d.length; i++) {
            [8, 16].forEach(function (bits) {
              if (bits === 16 && i + 1 >= p.d.length) return;
              var v = bits === 16 ? (p.d[i] | (p.d[i + 1] << 8)) : p.d[i];
              var key = p.r + ':' + i + ':' + bits;
              var s = spann[key] || (spann[key] = { r: p.r, i: i, bits: bits, min: v, max: v });
              if (v < s.min) s.min = v; if (v > s.max) s.max = v;
            });
          }
        });
        var best = null;
        Object.keys(spann).forEach(function (k) {
          var s = spann[k];
          if (ausschluss && s.r === ausschluss.r && Math.abs(s.i - ausschluss.i) < (ausschluss.bits === 16 ? 2 : 1)) return;
          var rel = (s.max - s.min) / (s.bits === 16 ? 65535 : 255);
          var score = rel * (s.bits === 16 ? 1.05 : 1);
          if (!best || score > best.score) best = HT.zusammen(s, { score: score });
        });
        return best && best.max - best.min > 4 ? best : null;
      }
      var schritte = [
        { t: 'Joystick langsam ganz nach LINKS und ganz nach RECHTS bewegen …', dauer: 4000 },
        { t: 'Jetzt langsam ganz nach OBEN und ganz nach UNTEN bewegen …', dauer: 4000 }
      ];
      var ergebnis = {};
      function schritt(n) {
        if (n >= schritte.length) {
          P._lernen = null; box.remove();
          if (!ergebnis.x) { melden('Joystick nicht erkannt – keine sich ändernden Werte gefunden.'); return; }
          var k = konfig();
          k.joystick = { x: ergebnis.x, y: ergebnis.y || null, invX: false, invY: false };
          konfigSpeichern(k).then(function () { melden('JoyKalib: X Byte ' + ergebnis.x.i + ' (' + ergebnis.x.min + '–' + ergebnis.x.max + ')' + (ergebnis.y ? ', Y Byte ' + ergebnis.y.i + ' (' + ergebnis.y.min + '–' + ergebnis.y.max + ')' : '')); malen(); });
          return;
        }
        proben = [];
        titel.textContent = 'Joystick kalibrieren (' + (n + 1) + '/2)';
        text.textContent = schritte[n].t;
        var start = Date.now();
        var tick = setInterval(function () { fort.textContent = Math.max(0, Math.ceil((schritte[n].dauer - (Date.now() - start)) / 1000)) + ' s'; }, 200);
        setTimeout(function () {
          clearInterval(tick);
          var a = auswerten(n === 1 ? ergebnis.x : null);
          if (a) ergebnis[n === 0 ? 'x' : 'y'] = { r: a.r, i: a.i, bits: a.bits, min: a.min, max: a.max };
          schritt(n + 1);
        }, schritte[n].dauer);
      }
      schritt(0);
    }

    function protokoll() {
      var k = konfig();
      var html = '<html><head><meta charset="utf-8"><title>Pulttest</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#1E2A33}td,th{border:1px solid #ccd;padding:4px 8px;text-align:left}table{border-collapse:collapse;margin:10px 0}pre{background:#f3f6f8;padding:10px;font-size:12px}</style></head><body>' +
        '<h2>Protokoll Pulttest</h2><p>' + new Date().toLocaleString('de-DE') + ' · ' + HT.esc(S.einstellungen().praxisname || '') + '</p>' +
        '<p>Gerät: ' + (P.geraet ? HT.esc(P.geraet.productName || 'HID') + ' · VID ' + hex(P.geraet.vendorId) + ' · PID ' + hex(P.geraet.productId) : 'nicht verbunden') + '</p>' +
        '<table><tr><th>Taste</th><th>Funktion</th><th>eingerichtet</th><th>gedrückt</th></tr>' +
        ROLLEN.map(function (r) { var t = (k.tasten || {})[r.id]; return '<tr><td>' + HT.esc(r.name) + '</td><td>' + HT.esc((AKTIONEN.filter(function (a) { return a[0] === P.aktionVon(r.id); })[0] || ['', ''])[1]) + '</td><td>' + (t ? (t.key ? 'Taste ' + HT.esc(t.name || t.key) : 'Byte ' + t.i + ', Bit ' + Math.round(Math.log(t.m) / Math.LN2)) : '–') + '</td><td>' + (P.zaehler[r.id] || 0) + '</td></tr>'; }).join('') +
        '</table><p>Joystick: ' + (k.joystick ? 'X Byte ' + k.joystick.x.i + ' (' + k.joystick.x.min + '–' + k.joystick.x.max + ')' + (k.joystick.y ? ', Y Byte ' + k.joystick.y.i + ' (' + k.joystick.y.min + '–' + k.joystick.y.max + ')' : '') : 'nicht kalibriert') + '</p>' +
        '<h3>Meldungen</h3><pre>' + HT.esc(P.meldungen.join('\n')) + '</pre></body></html>';
      var f = window.open('', '_blank');
      if (!f) { UI.toast('Bitte Pop-ups für dieses Programm erlauben.', 'fehler'); return; }
      f.document.write(html); f.document.close();
      setTimeout(function () { f.print(); }, 300);
    }

    UI.dialog({ titel: 'Bedienpult (USB)', inhalt: w, breit: true, klasse: 'pult-dialog-rahmen', knoepfe: [{ text: HT.t('schliessen'), art: 'primaer', wert: null }] }).then(function () {
      P._testModus = false; P._lernen = null; P._lernenTaste = null;
      aus.forEach(function (f) { f(); });
    });
  };

  P.ROLLEN = ROLLEN;
})();
