/* Hirntraining – Rollen (Administrator, Therapeut, Patientenmodus) und PIN-Anmeldung */
(function () {
  'use strict';
  var HT = window.HT;
  var S = HT.storage;

  var A = HT.auth = {
    aktuell: null,          // angemeldeter Therapeut
    patientenmodus: false,  // true = Menüs gesperrt

    /* SHA-256 über SubtleCrypto (falls verfügbar), sonst eigene Implementierung – identisches Ergebnis */
    hash: function (pin, salz) {
      var text = 'hirntraining|' + salz + '|' + pin;
      var subtle = window.crypto && window.crypto.subtle;
      if (subtle && window.TextEncoder) {
        try {
          return subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
          }).catch(function () { return HT.sha256(text); });
        } catch (e) { /* unsicherer Kontext */ }
      }
      return Promise.resolve(HT.sha256(text));
    },

    therapeuten: function (auchInaktive) {
      return S.alle('therapists', function (t) { return auchInaktive || t.aktiv !== false; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
    },

    /* Neuer PIN-Hash: PBKDF2-SHA256 mit 16 Byte Zufallssalz (150 000 Runden, ohne crypto.subtle 20 000) */
    neuerHash: function (pin) {
      var kr = HT.krypto, salz = kr.zufallHex(16), iter = kr.verfuegbar ? kr.ITER : kr.ITER_JS;
      return kr.pbkdf2(pin, salz, iter).then(function (h) { return { pinHash: h, salz: salz, kdf: { alg: 'pbkdf2', iter: iter } }; });
    },
    /* PIN gegen einen gespeicherten Datensatz prüfen; alte SHA-256-Werte (ohne kdf) bleiben gültig */
    hashPruefen: function (pin, pinHash, salz, kdf) {
      if (!pinHash) return Promise.resolve(false);
      if (kdf && kdf.alg === 'pbkdf2') return HT.krypto.pbkdf2(pin, salz, kdf.iter).then(function (h) { return h === pinHash; });
      return A.hash(pin, salz).then(function (h) { return h === pinHash; });
    },

    anlegen: function (daten) {
      return A.neuerHash(daten.pin).then(function (n) {
        return S.put('therapists', {
          id: daten.id || HT.uid('the'), name: daten.name, kuerzel: daten.kuerzel || A.kuerzel(daten.name),
          rolle: daten.rolle || 'therapeut', pinHash: n.pinHash, salz: n.salz, kdf: n.kdf, aktiv: true, angelegtAm: Date.now()
        });
      }).then(function (t) { return S.tresorFreigeben(t, daten.pin); }); // Datentresor-Schlüssel für den neuen Zugang
    },

    pinSetzen: function (t, pin) {
      return A.neuerHash(pin).then(function (n) { t.pinHash = n.pinHash; t.salz = n.salz; t.kdf = n.kdf; return S.put('therapists', t); })
        .then(function (x) { return S.tresor.schluessel ? S.tresorFreigeben(x, pin) : x; }); // neue PIN → Tresorschlüssel neu verpacken
    },

    /* Nach erfolgreicher PIN-Prüfung den Datentresor öffnen (bzw. beim ersten Mal einrichten). Promise<boolean> */
    tresorNachPin: function (t, pin) {
      if (!S.tresor.aktiv()) {
        if (!S.tresor.moeglich) return Promise.resolve(true);
        return S.tresorEinrichten(t, pin).then(function (neu) { if (neu) HT.ui.toast('Die Patientendaten werden ab jetzt verschlüsselt gespeichert.', 'ok'); return true; });
      }
      return S.tresorOeffnen(t, pin).then(function (r) {
        if (r === 'ok' || r === 'aus') return true;
        if (r === 'fehlt') return A.tresorFreigabe(t, pin);
        HT.ui.toast('Die Patientendaten konnten nicht entschlüsselt werden.', 'fehler');
        return false;
      });
    },
    /* Zugang ohne Tresorschlüssel (angelegt vor dem Tresor): einmalige Freigabe durch einen Zugang, der ihn schon hat */
    tresorFreigabe: function (t, pin) {
      return new Promise(function (resolve) {
        var fertig = false;
        var feld = HT.ui.pinFeld(function (pin2, fehler) {
          A.pinVonIrgendwem(pin2).then(function (t2) {
            if (!t2 || !t2.tresor) { fehler(A.sperrText() || 'Diese PIN kann den Datentresor nicht öffnen.'); return null; }
            return S.tresorOeffnen(t2, pin2).then(function (r) {
              if (r !== 'ok') { fehler('Diese PIN kann den Datentresor nicht öffnen.'); return; }
              return S.tresorFreigeben(t, pin).then(function () { fertig = true; resolve(true); if (HT.ui._offen) HT.ui._offen(true); });
            });
          });
        }, { text: 'PIN eines Kollegen bzw. Administrators, der schon Zugriff hat', manuell: true });
        HT.ui.dialog({ fokusFeld: true, titel: 'Einmalige Freigabe', inhalt: HT.el('div', null, [HT.el('p', { class: 'dialog-text' }, 'Die Patientendaten sind verschlüsselt. Ihr Zugang braucht einmal die Freigabe durch jemanden, der schon Zugriff hat. Danach öffnet Ihre eigene PIN die Daten.'), feld]), klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] })
          .then(function () { if (!fertig) resolve(false); });
      });
    },
    /* Gesperrten Tresor mit irgendeiner Therapeuten-PIN öffnen (z. B. Patientenstart nach Neustart). Promise<boolean> */
    entsperrDialog: function () {
      return new Promise(function (resolve) {
        var fertig = false;
        var feld = HT.ui.pinFeld(function (pin, fehler) {
          A.pinVonIrgendwem(pin).then(function (t) {
            if (!t) { fehler(A.sperrText()); return; }
            A.tresorNachPin(t, pin).then(function (ok) { if (ok) { fertig = true; resolve(true); if (HT.ui._offen) HT.ui._offen(true); } else fehler('Die Daten konnten nicht geöffnet werden.'); });
          });
        }, { text: 'Therapeuten-PIN eingeben', manuell: true });
        HT.ui.dialog({ fokusFeld: true, titel: 'Patientendaten entsperren', inhalt: HT.el('div', null, [HT.el('p', { class: 'dialog-text' }, 'Die Patientendaten sind verschlüsselt. Bitte einmal eine Therapeuten-PIN eingeben.'), feld]), klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] })
          .then(function () { if (!fertig) resolve(false); });
      });
    },

    /* Wartezeit nach 5 Fehlversuchen: 30 s, dann 60 s, 120 s … (bleibt auch nach Neuladen bestehen) */
    gesperrt: function () { return Date.now() < sperrZustand().bis; },
    sperrText: function () {
      var z = sperrZustand();
      if (Date.now() >= z.bis) return undefined;
      return 'Zu viele Fehlversuche. Bitte ' + Math.ceil((z.bis - Date.now()) / 1000) + ' Sekunden warten.';
    },
    versuchMerken: function (ok) {
      var z = sperrZustand();
      if (ok) { z.fehl = 0; z.stufe = 0; z.bis = 0; }
      else { z.fehl++; if (z.fehl >= 5) { z.stufe++; z.fehl = 0; z.bis = Date.now() + 30000 * Math.pow(2, z.stufe - 1); } }
      try { localStorage.setItem('ht-pin-sperre', JSON.stringify(z)); } catch (e) { /* egal */ }
    },

    /* Therapeuten-PIN prüfen (mit Sperre); alter SHA-256-Hash wird nach erfolgreicher Anmeldung auf PBKDF2 umgestellt */
    pruefen: function (t, pin, ohneZaehlen) {
      if (!ohneZaehlen && A.gesperrt()) return Promise.resolve(false);
      return A.hashPruefen(pin, t.pinHash, t.salz, t.kdf).then(function (ok) {
        if (!ohneZaehlen) A.versuchMerken(ok);
        if (ok && !(t.kdf && t.kdf.alg === 'pbkdf2')) A.pinSetzen(t, pin);
        return ok;
      });
    },

    /* Patienten-PIN (Patientenmodus) setzen und prüfen – gleiche Verfahren */
    patientPinSetzen: function (p, pin) {
      if (!pin) { delete p.pinHash; delete p.pinSalz; delete p.pinKdf; return S.put('patients', p); }
      return A.neuerHash(pin).then(function (n) { p.pinHash = n.pinHash; p.pinSalz = n.salz; p.pinKdf = n.kdf; return S.put('patients', p); });
    },
    patientPinPruefen: function (p, pin) {
      if (A.gesperrt()) return Promise.resolve(false);
      return A.hashPruefen(pin, p.pinHash, p.pinSalz, p.pinKdf).then(function (ok) {
        A.versuchMerken(ok);
        if (ok && !(p.pinKdf && p.pinKdf.alg === 'pbkdf2')) A.patientPinSetzen(p, pin);
        return ok;
      });
    },

    /* Prüft eine PIN gegen alle aktiven Therapeuten (für das Verlassen des Patientenmodus) – zählt als ein Versuch */
    pinVonIrgendwem: function (pin) {
      if (A.gesperrt()) return Promise.resolve(null);
      var liste = A.therapeuten();
      return Promise.all(liste.map(function (t) { return A.pruefen(t, pin, true); })).then(function (erg) {
        for (var i = 0; i < erg.length; i++) if (erg[i]) { A.versuchMerken(true); if (!(liste[i].kdf && liste[i].kdf.alg === 'pbkdf2')) A.pinSetzen(liste[i], pin); return liste[i]; }
        A.versuchMerken(false);
        return null;
      });
    },

    anmelden: function (t) {
      A.aktuell = t; A.patientenmodus = false;
      try { sessionStorage.setItem('ht-angemeldet', t.id); } catch (e) { /* egal */ }
      setTimeout(function () { if (HT.vorladen) HT.vorladen(); }, 600);
    },
    abmelden: function () {
      A.aktuell = null;
      try { sessionStorage.removeItem('ht-angemeldet'); } catch (e) { /* egal */ }
      S.tresorSchliessen().then(function () { location.hash = '#/start'; if (HT.app && HT.app.routen) HT.app.routen(); });
    },
    wiederherstellen: function () {
      try {
        var id = sessionStorage.getItem('ht-angemeldet');
        var t = id && S.finde('therapists', id);
        // Bei verschlüsselten Daten nach dem Neuladen neu anmelden (der Schlüssel liegt nur im Arbeitsspeicher)
        if (t && t.aktiv !== false && !S.tresorGesperrt()) A.aktuell = t;
      } catch (e) { /* egal */ }
    },
    istAdmin: function () { return !!(A.aktuell && A.aktuell.rolle === 'admin'); },
    kuerzel: function (name) { return String(name || '').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').slice(0, 3).toUpperCase(); },

    /* PIN-Dialog: Promise mit Therapeut oder null */
    pinDialog: function (titel, text) {
      return new Promise(function (resolve) {
        var erledigt = false;
        var feld = HT.ui.pinFeld(function (pin, fehler) {
          A.pinVonIrgendwem(pin).then(function (t) {
            if (t) { erledigt = true; resolve(t); if (HT.ui._offen) HT.ui._offen(true); }
            else fehler(A.sperrText());
          });
        }, { text: text || 'Therapeuten-PIN eingeben', manuell: true });
        HT.ui.dialog({ fokusFeld: true, titel: titel || 'Therapeuten-PIN', inhalt: feld, klasse: 'pin-dialog', knoepfe: [{ text: HT.t('abbrechen'), wert: null }] })
          .then(function () { if (!erledigt) resolve(null); });
      });
    }
  };

  function sperrZustand() {
    try { var z = JSON.parse(localStorage.getItem('ht-pin-sperre') || 'null'); if (z && typeof z.fehl === 'number') return z; } catch (e) { /* egal */ }
    return { fehl: 0, stufe: 0, bis: 0 };
  }

  /* ===================== Seiten ===================== */

  function startHintergrund(wurzel) {
    var deko = HT.el('div', { class: 'start-deko' });
    [[340, 8, 12], [220, 78, 70], [160, 85, 8], [120, 15, 80]].forEach(function (k, i) {
      deko.appendChild(HT.el('span', { style: { width: k[0] + 'px', height: k[0] + 'px', left: k[1] + '%', top: k[2] + '%', animationDelay: (i * -3) + 's' } }));
    });
    wurzel.appendChild(deko);
  }

  HT.logoHtml = function () {
    var e = S.einstellungen();
    if (e.logoDataUrl) return '<img src="' + e.logoDataUrl + '" alt="Logo">';
    return '<svg viewBox="0 0 64 64" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M26 12a9 9 0 0 0-9 9 9 9 0 0 0-6 15.5A9 9 0 0 0 17 47a9 9 0 0 0 9 6V12z"/>' +
      '<path d="M38 12a9 9 0 0 1 9 9 9 9 0 0 1 6 15.5A9 9 0 0 1 47 47a9 9 0 0 1-9 6V12z"/>' +
      '<path d="M26 12a6 6 0 0 1 12 0M26 53a6 6 0 0 0 12 0M26 26h-5M38 26h5M26 39h-6M38 39h6"/>' +
      '<circle cx="32" cy="32" r="3.2" fill="#fff"/></svg>';
  };

  /* Startbildschirm */
  HT.route('/start', function (p, wurzel) {
    if (S.alle('therapists').length === 0) { location.hash = '#/einrichtung'; return; }
    var e = S.einstellungen();
    var start = HT.el('div', { class: 'start' });
    startHintergrund(start);
    start.appendChild(HT.el('div', { class: 'start-marke', html:
      '<div class="start-logo">' + HT.logoHtml() + '</div><h1>' + HT.esc(e.praxisname) + '</h1><p>' + HT.t('untertitel') + '</p>' }));
    var kacheln = HT.el('div', { class: 'start-kacheln' });
    var k1 = HT.el('button', { class: 'start-kachel', type: 'button', html:
      '<div class="kachel-icon">' + HT.icon('person') + '</div><h2>' + HT.t('therapeut') + '</h2><p>' + HT.t('therapeut_text') + '</p>' });
    k1.addEventListener('click', function () { location.hash = '#/anmelden'; });
    var k2 = HT.el('button', { class: 'start-kachel patient', type: 'button', html:
      '<div class="kachel-icon">' + HT.icon('play') + '</div><h2>' + HT.t('patient_starten') + '</h2><p>' + HT.t('patient_text') + '</p>' });
    k2.addEventListener('click', function () { location.hash = '#/patientenstart'; });
    kacheln.appendChild(k1); kacheln.appendChild(k2);
    start.appendChild(kacheln);
    var fuss = HT.el('div', { class: 'start-fuss' });
    var vb = HT.ui.knopf(HT.t('vollbild'), { icon: 'vollbild', art: 'geist klein', klick: HT.app.vollbild });
    fuss.appendChild(vb);
    fuss.appendChild(HT.el('span', null, 'Lokal & offline · Daten bleiben auf diesem Mac'));
    start.appendChild(fuss);
    wurzel.appendChild(start);
  }, { schutz: null, shell: false });

  /* Anmeldung Therapeut */
  HT.route('/anmelden', function (p, wurzel) {
    var liste = A.therapeuten();
    var start = HT.el('div', { class: 'start' });
    startHintergrund(start);
    var box = HT.el('div', { class: 'anmelde-box' });
    box.appendChild(HT.ui.iconKnopf('links', HT.t('zurueck'), function () { location.hash = '#/start'; }, 'zurueck-knopf rand'));
    box.appendChild(HT.el('h1', null, 'Anmelden'));
    box.appendChild(HT.el('p', { class: 'untertitel' }, 'Wählen Sie Ihren Namen und geben Sie Ihre PIN ein.'));
    var wahl = HT.el('div', { class: 'therapeuten-wahl' });
    var gewaehlt = null;
    try { var letzte = localStorage.getItem('ht-letzter-therapeut'); gewaehlt = liste.filter(function (t) { return t.id === letzte; })[0] || null; } catch (e) { /* egal */ }
    if (!gewaehlt && liste.length === 1) gewaehlt = liste[0];
    liste.forEach(function (t) {
      var b = HT.el('button', { type: 'button', class: gewaehlt === t ? 'aktiv' : '' });
      b.appendChild(HT.ui.avatar(t.name));
      b.appendChild(HT.el('strong', null, t.name));
      b.appendChild(HT.el('small', null, t.rolle === 'admin' ? 'Administrator' : 'Therapeut'));
      b.addEventListener('click', function () {
        gewaehlt = t;
        HT.$$('button', wahl).forEach(function (x) { x.classList.remove('aktiv'); });
        b.classList.add('aktiv');
        feld.zuruecksetzen();
      });
      wahl.appendChild(b);
    });
    box.appendChild(wahl);
    var feld = HT.ui.pinFeld(function (pin, fehler) {
      if (!gewaehlt) { fehler('Bitte zuerst einen Namen wählen.'); return; }
      A.pruefen(gewaehlt, pin).then(function (ok) {
        if (!ok) { fehler(A.sperrText()); return false; }
        return A.tresorNachPin(gewaehlt, pin).then(function (offen) { if (!offen) fehler('Die Patientendaten konnten nicht geöffnet werden.'); return offen; });
      }).then(function (ok) {
        if (!ok) return;
        A.anmelden(gewaehlt);
        try { localStorage.setItem('ht-letzter-therapeut', gewaehlt.id); } catch (e) { /* egal */ }
        location.hash = '#/arbeitsplatz';
        HT.app.backupPruefen();
      });
    }, { manuell: true, text: '' });
    box.appendChild(feld);
    start.appendChild(box);
    wurzel.appendChild(start);
  }, { schutz: null, shell: false });

  /* Ersteinrichtung: Praxis + Administrator */
  HT.route('/einrichtung', function (p, wurzel) {
    if (S.alle('therapists').length > 0) { location.hash = '#/start'; return; }
    var start = HT.el('div', { class: 'start' });
    startHintergrund(start);
    var box = HT.el('div', { class: 'anmelde-box' });
    box.appendChild(HT.el('div', { class: 'start-marke', style: { marginBottom: '1.2rem' }, html: '<div class="start-logo">' + HT.logoHtml() + '</div><h1>Willkommen!</h1><p>Richten Sie Hirntraining in zwei Schritten ein.</p>' }));
    var form = HT.ui.formular([
      { typ: 'titel', label: 'Praxis' },
      { name: 'praxisname', label: 'Name der Praxis', pflicht: true, breit: true, platzhalter: 'z. B. Ergotherapie am Markt' },
      { typ: 'titel', label: 'Administrator' },
      { name: 'name', label: 'Ihr Name', pflicht: true, platzhalter: 'Vor- und Nachname' },
      { name: 'kuerzel', label: 'Kürzel', platzhalter: 'z. B. AM' },
      { name: 'pin', label: 'PIN (4–8 Ziffern)', typ: 'pin', pflicht: true },
      { name: 'pin2', label: 'PIN wiederholen', typ: 'pin', pflicht: true },
      { name: 'testdaten', label: 'Beispielpatienten mit simulierten Ergebnissen anlegen', typ: 'schalter', breit: true, standard: false }
    ]);
    box.appendChild(form.el);
    var knopf = HT.ui.knopf('Einrichtung abschließen', { art: 'primaer gross voll', icon: 'haken', klick: function () {
      if (!form.pruefen()) return;
      var w = form.werte();
      if (!/^[0-9]{4,8}$/.test(w.pin)) { HT.ui.toast('Die PIN muss aus 4 bis 8 Ziffern bestehen.', 'fehler'); return; }
      if (w.pin !== w.pin2) { HT.ui.toast('Die PINs stimmen nicht überein.', 'fehler'); return; }
      knopf.disabled = true;
      S.einstellungenSpeichern({ praxisname: w.praxisname }).then(function () {
        return A.anlegen({ name: w.name, kuerzel: w.kuerzel, pin: w.pin, rolle: 'admin' });
      }).then(function (t) {
        return S.tresorEinrichten(t, w.pin).then(function () { return t; }); // Patientendaten von Anfang an verschlüsselt
      }).then(function (t) {
        HT.vorlagen.standardAnlegen();
        A.anmelden(t);
        return w.testdaten && HT.testdaten ? HT.testdaten.erzeugen(t.id) : null;
      }).then(function () {
        HT.ui.toast('Einrichtung abgeschlossen. Willkommen!', 'ok');
        location.hash = '#/arbeitsplatz';
      });
    } });
    knopf.style.marginTop = '1.4rem';
    box.appendChild(knopf);
    start.appendChild(box);
    wurzel.appendChild(start);
  }, { schutz: null, shell: false });
})();
