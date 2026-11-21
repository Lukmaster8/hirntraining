/* Hirntraining – USB-Bedienpult (Patiententastatur) direkt im Browser über WebHID.
 *
 * Kein Treiber nötig: Das Pult meldet sich am Mac als HID-Gerät. Chrome (ab Version 89, auch Chrome 116
 * unter macOS 10.13 High Sierra) kann solche Geräte über WebHID lesen. Beim ersten Mal muss das Pult einmal
 * über „Bedienpult verbinden“ freigegeben werden (Sicherheitsregel des Browsers), danach verbindet es sich
 * beim Einstecken bzw. beim Programmstart automatisch.
 *
 * Weil jedes Pult seine Tasten etwas anders meldet, werden die Tasten einmal „angelernt“ (Taste drücken →
 * Bit im HID-Bericht merken). Der Joystick wird über zwei kurze Bewegungen kalibriert. Meldet sich das Pult
 * stattdessen als Tastatur, werden die gedrückten Tasten ebenfalls angelernt.
 * Die Zuordnung wird in den Einstellungen gespeichert (Einstellungen → pult). */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage, UI = HT.ui;

  var ROLLEN = [
    { id: 'ok_links', name: 'Große grüne Taste links (OK)', aktion: 'ok', farbe: 'gruen', x: 105, y: 205, r: 44 },
    { id: 'gelb_links', name: 'Gelbe Taste links', aktion: 'ja', farbe: 'gelb', x: 92, y: 108, r: 21 },
    { id: 'rot_links', name: 'Rote Taste links', aktion: 'nein', farbe: 'rot', x: 150, y: 82, r: 21 },
    { id: 'hoch', name: 'Weiße Taste oben', aktion: 'hoch', farbe: 'weiss', x: 300, y: 88, r: 30 },
    { id: 'links', name: 'Weiße Taste links', aktion: 'links', farbe: 'weiss', x: 232, y: 152, r: 30 },
    { id: 'mitte', name: 'Weiße Taste Mitte', aktion: 'ok', farbe: 'weiss', x: 300, y: 165, r: 26 },
    { id: 'rechts', name: 'Weiße Taste rechts', aktion: 'rechts', farbe: 'weiss', x: 368, y: 152, r: 30 },
    { id: 'runter', name: 'Weiße Taste unten', aktion: 'runter', farbe: 'weiss', x: 300, y: 236, r: 30 },
    { id: 'rot_rechts', name: 'Rote Taste rechts', aktion: 'nein', farbe: 'rot', x: 450, y: 82, r: 21 },
    { id: 'gelb_rechts', name: 'Gelbe Taste rechts', aktion: 'ja', farbe: 'gelb', x: 508, y: 108, r: 21 },
    { id: 'ok_rechts', name: 'Große grüne Taste rechts (OK)', aktion: 'ok', farbe: 'gruen', x: 495, y: 205, r: 44 },
    { id: 'fuss_links', name: 'Fußtaste links (falls angeschlossen)', aktion: 'ok', farbe: 'fuss' },
    { id: 'fuss_rechts', name: 'Fußtaste rechts (falls angeschlossen)', aktion: 'ok', farbe: 'fuss' }
  ];
  var AKTIONEN = [['ok', 'Reagieren / OK'], ['ja', 'Ja / Bekannt'], ['nein', 'Nein / Neu'], ['hoch', 'Pfeil oben'], ['runter', 'Pfeil unten'], ['links', 'Pfeil links'], ['rechts', 'Pfeil rechts'], ['pause', 'Pause (Therapeutenmenü)'], ['', 'keine Funktion']];
  var FARBEN = { gruen: ['#2EAD6B', '#1f8a52'], gelb: ['#F2C230', '#c99a12'], rot: ['#E25C5C', '#b93c3c'], weiss: ['#ffffff', '#c9d2d8'], fuss: ['#8a97a1', '#5f6b74'] };

  var P = HT.pult = {
    unterstuetzt: !!(window.navigator && navigator.hid),
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
  P.aktionVon = function (rolleId) {
    var k = konfig();
    if (k.aktionen && k.aktionen[rolleId] !== undefined) return k.aktionen[rolleId];
    var r = ROLLEN.filter(function (x) { return x.id === rolleId; })[0];
    return r ? r.aktion : '';
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
    if (!P.unterstuetzt) { UI.hinweis('Bedienpult', 'Dieser Browser kann keine USB-Geräte lesen. Bitte das Programm in Google Chrome (oder Microsoft Edge) öffnen. Safari unterstützt das nicht.'); return Promise.resolve(null); }
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
  function tasteGedrueckt(rolle) {
    P.gedrueckt[rolle] = true;
    P.zaehler[rolle] = (P.zaehler[rolle] || 0) + 1;
    benachrichtigen('taste', { rolle: rolle, gedrueckt: true });
    if (!P._lernen && !P._testModus) ausfuehren(P.aktionVon(rolle));
  }
  // Meldet sich das Pult als Tastatur, werden die angelernten Tasten hier abgefangen
  document.addEventListener('keydown', function (ev) {
    if (P._lernen && P._lernenTaste) { P._lernenTaste(ev); return; }
    var tasten = konfig().tasten || {};
    for (var rolle in tasten) {
      if (tasten[rolle].key && tasten[rolle].key === ev.code) {
        if (ev.repeat) { ev.preventDefault(); ev.stopImmediatePropagation(); return; }
        ev.preventDefault(); ev.stopImmediatePropagation();
        tasteGedrueckt(rolle);
        setTimeout(function (r) { P.gedrueckt[r] = false; benachrichtigen('taste', { rolle: r, gedrueckt: false }); }, 150, rolle);
        return;
      }
    }
  }, true);

  /* Aktion ausführen: im Training an das Modul, auf Zwischenbildschirmen den Hauptknopf drücken */
  function ausfuehren(aktion) {
    if (!aktion) return;
    var training = document.querySelector('.training');
    if (!training) {
      // außerhalb des Trainings: OK bestätigt einen offenen Dialog
      var dlg = document.querySelector('.dialog-hinter');
      if (dlg && aktion === 'ok') { var k0 = dlg.querySelector('button.primaer'); if (k0) k0.click(); }
      return;
    }
    if (aktion === 'pause') { var pk = training.querySelector('.tk-pause'); if (pk && !training.querySelector('.pause-schleier')) pk.click(); return; }
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
    if (!P.unterstuetzt) return { klasse: 'aus', text: 'Bedienpult: nur in Chrome', titel: 'Das USB-Bedienpult funktioniert in Google Chrome oder Microsoft Edge (nicht in Safari).' };
    if (!P.geraet) return { klasse: 'getrennt', text: 'Bedienpult nicht verbunden', titel: 'Klicken, um das USB-Bedienpult zu verbinden oder zu testen' };
    if (!P.eingerichtet()) return { klasse: 'einrichten', text: 'Bedienpult verbunden – Tasten einrichten', titel: 'Pult ist verbunden, die Tasten müssen noch einmal angelernt werden' };
    return { klasse: 'verbunden', text: 'Bedienpult verbunden', titel: (P.geraet.productName || 'USB-Pult') + ' – klicken für Pulttest' };
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
    var s = '<svg class="pult-svg" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M40 70 Q40 40 75 38 L525 38 Q560 40 560 70 L572 236 Q575 282 528 284 L72 284 Q25 282 28 236 Z" fill="#eef2f4" stroke="#c9d2d8" stroke-width="3"/>' +
      '<path d="M190 50 L410 50 Q430 52 430 72 L430 262 Q430 274 410 274 L190 274 Q170 274 170 262 L170 72 Q170 52 190 50 Z" fill="#dfe5e9"/>';
    ROLLEN.forEach(function (r) {
      if (!r.x) return;
      var f = FARBEN[r.farbe];
      s += '<g class="pult-taste" data-rolle="' + r.id + '"><circle cx="' + r.x + '" cy="' + (r.y + 4) + '" r="' + r.r + '" fill="rgba(0,0,0,.12)"/>' +
        '<circle class="pult-kappe" cx="' + r.x + '" cy="' + r.y + '" r="' + r.r + '" fill="' + f[0] + '" stroke="' + f[1] + '" stroke-width="3"/>' +
        (r.farbe === 'gruen' ? '<text x="' + r.x + '" y="' + (r.y + 8) + '" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">OK</text>' : '') +
        '<text class="pult-zahl" x="' + r.x + '" y="' + (r.y + r.r + 22) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#5f6b74">0</text></g>';
    });
    return s + '</svg>';
  }

  /* ---------- Dialog „Bedienpult“ (Pulttest) ---------- */
  P.dialog = function () {
    var aus = [];
    var w = HT.el('div', { class: 'pult-dialog' });
    var oben = HT.el('div', { class: 'pult-oben' });
    var knVerb = UI.knopf('Bedienpult verbinden', { art: 'primaer', icon: 'pult', klick: function () { P.verbinden(); } });
    var knTrenn = UI.knopf('Trennen', { icon: 'stopp', klick: function () { P.trennen(); } });
    var knLern = UI.knopf('Tasten einrichten', { icon: 'tastatur', klick: function () { lernen(); } });
    var knJoy = UI.knopf('Joystick kalibrieren', { icon: 'ziel', klick: function () { kalibrieren(); } });
    var knDruck = UI.knopf('Protokoll drucken', { icon: 'drucker', klick: protokoll });
    [knVerb, knTrenn, knLern, knJoy, knDruck].forEach(function (k) { oben.appendChild(k); });
    w.appendChild(oben);
    var hinweisBox = HT.el('div', { class: 'pult-hinweis' });
    w.appendChild(hinweisBox);
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
    rechts.appendChild(joyKopf);
    var feld = HT.el('div', { class: 'pult-joyfeld' });
    var punkt = HT.el('div', { class: 'pult-joypunkt' });
    feld.appendChild(punkt);
    rechts.appendChild(feld);
    var roh = HT.el('div', { class: 'pult-roh klein' }, 'Rohdaten: –');
    rechts.appendChild(roh);
    var zuordnung = HT.el('div', { class: 'pult-zuordnung' });
    rechts.appendChild(zuordnung);
    raster.appendChild(rechts);
    w.appendChild(raster);

    function malen() {
      var verbunden = !!P.geraet;
      knVerb.style.display = verbunden ? 'none' : '';
      knTrenn.style.display = verbunden ? '' : 'none';
      knLern.disabled = !verbunden; knJoy.disabled = !verbunden;
      var z = zustand();
      hinweisBox.className = 'pult-hinweis ' + z.klasse;
      hinweisBox.innerHTML = '<span class="pult-punkt"></span><b>' + HT.esc(z.text) + '</b>' + (
        !P.unterstuetzt ? '<span>Bitte index.html in Google Chrome öffnen. Ein Treiber ist nicht nötig.</span>'
          : !verbunden ? '<span>Pult per USB anstecken und „Bedienpult verbinden“ klicken. Im Chrome-Fenster das Pult auswählen und „Verbinden“ drücken. Danach verbindet es sich automatisch. Ein Treiber ist nicht nötig.</span>'
            : !P.eingerichtet() ? '<span>Einmalig „Tasten einrichten“: Das Programm fragt jede Taste nacheinander ab.</span>' : '<span>Alle Tasten sind eingerichtet. Zum Prüfen einfach Tasten drücken.</span>');
      var k = konfig();
      info.innerHTML = verbunden ? '<b>' + HT.esc(P.geraet.productName || 'HID-Gerät') + '</b> · VID ' + hex(P.geraet.vendorId) + ' · PID ' + hex(P.geraet.productId) + (k.joystick ? ' · Joystick kalibriert' : '') : '';
      log.textContent = P.meldungen.length ? P.meldungen.join('\n') : 'Noch keine Meldungen.';
      log.scrollTop = log.scrollHeight;
      // Zuordnungstabelle (Aktion je Taste änderbar)
      HT.leeren(zuordnung);
      zuordnung.appendChild(HT.el('div', { class: 'feld-label' }, 'Belegung der Tasten'));
      var t = k.tasten || {};
      ROLLEN.forEach(function (r) {
        var z2 = HT.el('div', { class: 'pult-zeile' + (t[r.id] ? '' : ' fehlt') });
        z2.appendChild(HT.el('span', { class: 'pult-farbpunkt ' + r.farbe }));
        z2.appendChild(HT.el('span', { class: 'pult-zeilenname' }, r.name + (t[r.id] ? '' : ' – nicht eingerichtet')));
        var sel = HT.el('select');
        AKTIONEN.forEach(function (a) { var o = HT.el('option', { value: a[0] }, a[1]); if (P.aktionVon(r.id) === a[0]) o.selected = true; sel.appendChild(o); });
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
        g.querySelector('.pult-zahl').textContent = P.zaehler[r.id] || 0;
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
      else if (art === 'joystick') joyMalen(d);
      else if (art === 'roh') roh.textContent = 'Rohdaten (Bericht ' + d.reportId + '): ' + [].map.call(d.daten, function (b) { return hex(b, 2); }).join(' ');
      else malen();
    }));
    malen();
    if (P.joystick) joyMalen(P.joystick);

    /* Tasten anlernen */
    function lernen() {
      var rollen = ROLLEN.slice(), index = -1, basis = null, rauschen = {}, phase = 'ruhe', neu = {}, kandidat = null;
      var box = HT.el('div', { class: 'pult-lernen' });
      var titel = HT.el('h3');
      var text = HT.el('p');
      var fort = HT.el('div', { class: 'pult-lernfortschritt' });
      var knopfZeile = HT.el('div', { class: 'pult-lernknoepfe' });
      var weiterK = UI.knopf('Überspringen', { klick: function () { naechste(); } });
      var abbrK = UI.knopf('Abbrechen', { art: 'geist', klick: function () { ende(false); } });
      knopfZeile.appendChild(abbrK); knopfZeile.appendChild(weiterK);
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
        if (phase === 'ruhe' || index < 0) return;
        if (/^(Tab|Escape)$/.test(ev.key)) return;
        ev.preventDefault(); ev.stopImmediatePropagation();
        neu[rollen[index].id] = { key: ev.code, name: ev.key };
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
