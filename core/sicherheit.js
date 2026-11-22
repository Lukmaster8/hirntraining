/* Hirntraining – Datenschutz-Bausteine
 * 1. HT.krypto: PBKDF2-SHA256 (crypto.subtle, Ersatz in reinem JavaScript), AES-GCM für verschlüsselte Sicherungen
 * 2. HT.audit: Protokoll ohne Klardaten (Datum, Aktion, Therapeuten-Kürzel, Patienten-Pseudonym)
 * 3. HT.sperre: automatische Sperre nach Inaktivität und Strg+Alt+L
 * Alles läuft lokal; es werden keine Daten verschickt. */
(function () {
  'use strict';
  var HT = window.HT;

  /* ===================== Kryptografie ===================== */
  var subtle = (window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle)) || null;

  function zufallBytes(n) {
    var a = new Uint8Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return a;
  }
  function zuHex(a) { var s = ''; for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2); return s; }
  function vonHex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function utf8(text) {
    if (window.TextEncoder) return new TextEncoder().encode(text);
    var s = unescape(encodeURIComponent(text)), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  function vonUtf8(a) {
    if (window.TextDecoder) return new TextDecoder().decode(a);
    var s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return decodeURIComponent(escape(s));
  }
  function zuBase64(a) {
    var s = '', schritt = 0x8000;
    for (var i = 0; i < a.length; i += schritt) s += String.fromCharCode.apply(null, a.subarray(i, i + schritt));
    return btoa(s);
  }
  function vonBase64(t) { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }

  /* --- SHA-256, HMAC und PBKDF2 in reinem JavaScript (Ersatz, falls crypto.subtle fehlt) --- */
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(daten) {
    var l = daten.length, bitLen = l * 8, gesamt = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(gesamt), i;
    m.set(daten); m[l] = 0x80;
    m[gesamt - 4] = (bitLen >>> 24) & 255; m[gesamt - 3] = (bitLen >>> 16) & 255; m[gesamt - 2] = (bitLen >>> 8) & 255; m[gesamt - 1] = bitLen & 255;
    m[gesamt - 5] = Math.floor(bitLen / 4294967296) & 255;
    var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
    for (var off = 0; off < gesamt; off += 64) {
      for (i = 0; i < 16; i++) w[i] = (m[off + i * 4] << 24) | (m[off + i * 4 + 1] << 16) | (m[off + i * 4 + 2] << 8) | m[off + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var s0 = ((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^ ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^ (w[i - 15] >>> 3);
        var s1 = ((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^ ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { out[i * 4] = h[i] >>> 24; out[i * 4 + 1] = (h[i] >>> 16) & 255; out[i * 4 + 2] = (h[i] >>> 8) & 255; out[i * 4 + 3] = h[i] & 255; }
    return out;
  }
  function hmac(schluessel, daten) {
    if (schluessel.length > 64) schluessel = sha256(schluessel);
    var k = new Uint8Array(64); k.set(schluessel);
    var innen = new Uint8Array(64 + daten.length), aussen = new Uint8Array(96), i;
    for (i = 0; i < 64; i++) { innen[i] = k[i] ^ 0x36; aussen[i] = k[i] ^ 0x5c; }
    innen.set(daten, 64);
    aussen.set(sha256(innen), 64);
    return sha256(aussen);
  }
  function pbkdf2Js(pass, salz, iter) {
    var block = new Uint8Array(salz.length + 4); block.set(salz); block[salz.length + 3] = 1;
    var u = hmac(pass, block), t = new Uint8Array(u);
    for (var n = 1; n < iter; n++) { u = hmac(pass, u); for (var j = 0; j < 32; j++) t[j] ^= u[j]; }
    return t;
  }

  var KR = HT.krypto = {
    verfuegbar: !!subtle,
    ITER: 150000,        // mit crypto.subtle
    ITER_JS: 20000,      // Ersatz in reinem JavaScript (langsamer)
    zufallHex: function (n) { return zuHex(zufallBytes(n)); },
    sha256Hex: function (text) { return zuHex(sha256(utf8(text))); },
    /* PBKDF2-SHA256 → Hex (32 Byte). iter wird mitgespeichert, damit ältere Werte prüfbar bleiben. */
    pbkdf2: function (passwort, salzHex, iter) {
      var pass = utf8(String(passwort)), salz = vonHex(salzHex);
      if (subtle) {
        try {
          return subtle.importKey('raw', pass, { name: 'PBKDF2' }, false, ['deriveBits']).then(function (k) {
            return subtle.deriveBits({ name: 'PBKDF2', salt: salz, iterations: iter, hash: 'SHA-256' }, k, 256);
          }).then(function (bits) { return zuHex(new Uint8Array(bits)); }).catch(function () { return zuHex(pbkdf2Js(pass, salz, iter)); });
        } catch (e) { /* weiter mit Ersatz */ }
      }
      return new Promise(function (res) { setTimeout(function () { res(zuHex(pbkdf2Js(pass, salz, iter))); }, 10); });
    },
    /* Verschlüsselte Sicherung (AES-GCM, Schlüssel aus Passwort per PBKDF2) */
    verschluesseln: function (objekt, passwort, extra) {
      if (!subtle) return Promise.reject(new Error('Verschlüsselung ist in diesem Browser nicht verfügbar. Bitte Google Chrome verwenden.'));
      var salz = zufallBytes(16), iv = zufallBytes(12);
      return subtle.importKey('raw', utf8(passwort), { name: 'PBKDF2' }, false, ['deriveKey']).then(function (k) {
        return subtle.deriveKey({ name: 'PBKDF2', salt: salz, iterations: KR.ITER, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      }).then(function (schluessel) {
        return subtle.encrypt({ name: 'AES-GCM', iv: iv }, schluessel, utf8(JSON.stringify(objekt)));
      }).then(function (geheim) {
        return HT.zusammen({ format: 'hirntraining-sicherung', version: 2, kdf: { alg: 'PBKDF2', iter: KR.ITER, salt: zuHex(salz) }, iv: zuHex(iv), daten: zuBase64(new Uint8Array(geheim)) }, extra || {});
      });
    },
    entschluesseln: function (datei, passwort) {
      if (!subtle) return Promise.reject(new Error('Entschlüsseln ist in diesem Browser nicht verfügbar. Bitte Google Chrome verwenden.'));
      return subtle.importKey('raw', utf8(passwort), { name: 'PBKDF2' }, false, ['deriveKey']).then(function (k) {
        return subtle.deriveKey({ name: 'PBKDF2', salt: vonHex(datei.kdf.salt), iterations: datei.kdf.iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      }).then(function (schluessel) {
        return subtle.decrypt({ name: 'AES-GCM', iv: vonHex(datei.iv) }, schluessel, vonBase64(datei.daten));
      }).then(function (klar) { return JSON.parse(vonUtf8(new Uint8Array(klar))); }, function () { throw new Error('Das Passwort ist falsch oder die Datei ist beschädigt.'); });
    },
    /* Passwortstärke 0–4 für die Anzeige */
    staerke: function (pw) {
      pw = pw || ''; var p = 0;
      if (pw.length >= 8) p++; if (pw.length >= 12) p++;
      if (/[a-zäöüß]/.test(pw) && /[A-ZÄÖÜ]/.test(pw)) p++;
      if (/[0-9]/.test(pw) && /[^A-Za-z0-9äöüÄÖÜß]/.test(pw)) p++;
      return Math.min(4, p);
    }
  };

  /* ===================== Sicherungs-Passwort-Dialog ===================== */
  KR.passwortDialog = function (opt) {
    opt = opt || {};
    var UI = HT.ui;
    var box = HT.el('div');
    box.appendChild(HT.el('p', { class: 'dialog-text' }, opt.text || 'Die Sicherung wird mit einem Passwort verschlüsselt. Ohne dieses Passwort lässt sie sich nicht wieder einspielen – bitte sicher notieren.'));
    var f1 = HT.el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Sicherungspasswort (mind. 8 Zeichen)', class: 'eingabe voll' });
    var f2 = opt.nurEinmal ? null : HT.el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Passwort wiederholen', class: 'eingabe voll' });
    var balken = HT.el('div', { class: 'pw-staerke' }, [HT.el('span')]);
    var meldung = HT.el('div', { class: 'klein', style: { color: 'var(--fehler, #E25C5C)', minHeight: '1.2em', marginTop: '.3rem' } });
    box.appendChild(f1); if (f2) { f2.style.marginTop = '.5rem'; box.appendChild(f2); box.appendChild(balken); }
    box.appendChild(meldung);
    if (!opt.nurEinmal) box.appendChild(HT.el('p', { class: 'klein gedimmt', style: { marginTop: '.6rem' } }, 'Sicherungen nicht in Cloud-Ordnern (z. B. Google Drive, iCloud, Dropbox) speichern, sondern z. B. auf einem USB-Stick, der in der Praxis verschlossen aufbewahrt wird.'));
    var stufen = ['sehr schwach', 'schwach', 'mittel', 'gut', 'sehr gut'], farben = ['#E25C5C', '#E8833A', '#F2C230', '#7bc96f', '#2EAD6B'];
    f1.addEventListener('input', function () { var s = KR.staerke(f1.value); balken.firstChild.style.width = ((s + 1) * 20) + '%'; balken.firstChild.style.background = farben[s]; balken.title = 'Stärke: ' + stufen[s]; });
    return UI.dialog({ fokusFeld: true, titel: opt.titel || 'Sicherung verschlüsseln', inhalt: box, knoepfe: [{ text: HT.t('abbrechen'), wert: null }, { text: opt.ok || 'Weiter', art: 'primaer', aktion: function () {
      if (f1.value.length < 8) { meldung.textContent = 'Das Passwort braucht mindestens 8 Zeichen.'; return false; }
      if (f2 && f1.value !== f2.value) { meldung.textContent = 'Die Passwörter stimmen nicht überein.'; return false; }
      return Promise.resolve(f1.value);
    } }] });
  };

  /* ===================== Protokoll (ohne Klardaten) ===================== */
  HT.audit = function (aktion, patient) {
    if (!HT.storage || !HT.storage.put) return Promise.resolve();
    var t = HT.auth && HT.auth.aktuell;
    return HT.storage.put('audit', { id: HT.uid('aud'), zeit: Date.now(), aktion: aktion, therapeut: t ? (t.kuerzel || '') : '', pseudonym: patient ? (patient.pseudonym || '') : '' }).catch(function () { /* egal */ });
  };

  /* ===================== Automatische Sperre ===================== */
  var letzteAktivitaet = Date.now(), gesperrt = false;
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, function () { if (!gesperrt) letzteAktivitaet = Date.now(); }, true);
  });
  var SP = HT.sperre = {
    aktiv: function () { return gesperrt; },
    sperren: function () {
      if (gesperrt || !HT.auth || !HT.auth.aktuell) return;
      if (HT.session && HT.session.laeuft) return; // nie während eines Trainings
      gesperrt = true;
      var e = HT.storage.einstellungen(), UI = HT.ui;
      var app = document.getElementById('app'); if (app) app.style.visibility = 'hidden';
      [].forEach.call(document.querySelectorAll('.dialog-hinter, .vorschau-pop'), function (d) { d.style.visibility = 'hidden'; });
      var schirm = HT.el('div', { class: 'sperr-schirm' });
      var box = HT.el('div', { class: 'anmelde-box' });
      box.appendChild(HT.el('div', { class: 'start-marke', html: '<div class="start-logo">' + HT.logoHtml() + '</div><h1>' + HT.esc(e.praxisname || '') + '</h1><p>Gesperrt – bitte mit Ihrer PIN entsperren.</p>' }));
      var liste = HT.auth.therapeuten(), gewaehlt = HT.auth.aktuell;
      var wahl = HT.el('div', { class: 'therapeuten-wahl' });
      liste.forEach(function (t) {
        var b = HT.el('button', { type: 'button', class: gewaehlt && gewaehlt.id === t.id ? 'aktiv' : '' });
        b.appendChild(UI.avatar(t.name)); b.appendChild(HT.el('strong', null, t.name));
        b.addEventListener('click', function () { gewaehlt = t; [].forEach.call(wahl.querySelectorAll('button'), function (x) { x.classList.remove('aktiv'); }); b.classList.add('aktiv'); feld.zuruecksetzen(); });
        wahl.appendChild(b);
      });
      box.appendChild(wahl);
      var feld = UI.pinFeld(function (pin, fehler) {
        if (!gewaehlt) { fehler('Bitte zuerst einen Namen wählen.'); return; }
        HT.auth.pruefen(gewaehlt, pin).then(function (ok) {
          if (!ok) { fehler(HT.auth.sperrText()); return; }
          HT.auth.anmelden(gewaehlt);
          gesperrt = false; letzteAktivitaet = Date.now();
          schirm.remove();
          if (app) app.style.visibility = '';
          [].forEach.call(document.querySelectorAll('.dialog-hinter, .vorschau-pop'), function (d) { d.style.visibility = ''; });
          if (HT.app && HT.app.neuZeichnen) HT.app.neuZeichnen();
        });
      }, { manuell: true, text: '' });
      box.appendChild(feld);
      schirm.appendChild(box);
      document.body.appendChild(schirm);
    }
  };
  setInterval(function () {
    if (gesperrt || !HT.auth || !HT.auth.aktuell || !HT.storage || !HT.storage.einstellungen) return;
    if (HT.session && HT.session.laeuft) { letzteAktivitaet = Date.now(); return; }
    var min = Number(HT.storage.einstellungen().sperreMin);
    if (!min) return; // 0 = aus
    if (Date.now() - letzteAktivitaet > min * 60000) SP.sperren();
  }, 15000);
  document.addEventListener('keydown', function (ev) {
    if (ev.ctrlKey && ev.altKey && (ev.code === 'KeyL' || ev.key === 'l' || ev.key === 'L')) { ev.preventDefault(); SP.sperren(); }
  }, true);
})();
