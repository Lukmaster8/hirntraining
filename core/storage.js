/* Hirntraining – Datenspeicher
 * IndexedDB mit automatischem Fallback auf localStorage (z. B. Safari unter file://).
 * Schnittstelle: init, get, put, delete, list, exportAll, importAll
 * Zusätzlich ein synchroner Zwischenspeicher (HT.storage.alle / finde) für die Oberfläche. */
(function () {
  'use strict';
  var HT = window.HT;
  var DB_NAME = 'hirntraining';
  var DB_VERSION = 2; // Version 2: zusätzlicher Store „audit“ (Datenschutz-Protokoll); vorhandene Daten bleiben unverändert
  var STORES = ['therapists', 'patients', 'plans', 'templates', 'sessions', 'runs', 'moduleState', 'settings', 'audit'];
  var LS_PREFIX = 'hirntraining:';
  var idb = null;
  var cache = {};
  STORES.forEach(function (s) { cache[s] = []; });

  function req2p(r) { return new Promise(function (res, rej) { r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }

  /* ---------- IndexedDB-Backend ---------- */
  var IDB = {
    oeffnen: function () {
      return new Promise(function (resolve, reject) {
        var r;
        try { r = window.indexedDB && indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
        if (!r) { reject(new Error('kein IndexedDB')); return; }
        var timer = setTimeout(function () { reject(new Error('IndexedDB antwortet nicht')); }, 4000);
        r.onupgradeneeded = function () {
          var d = r.result;
          STORES.forEach(function (n) { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); });
        };
        r.onsuccess = function () { clearTimeout(timer); idb = r.result; resolve(); };
        r.onerror = function () { clearTimeout(timer); reject(r.error); };
      });
    },
    alle: function (store) { return req2p(idb.transaction(store, 'readonly').objectStore(store).getAll()); },
    put: function (store, obj) { return req2p(idb.transaction(store, 'readwrite').objectStore(store).put(obj)); },
    del: function (store, id) { return req2p(idb.transaction(store, 'readwrite').objectStore(store).delete(id)); },
    ersetzen: function (daten) {
      return new Promise(function (res, rej) {
        var t = idb.transaction(STORES, 'readwrite');
        STORES.forEach(function (s) {
          var os = t.objectStore(s);
          os.clear();
          (daten[s] || []).forEach(function (o) { os.put(o); });
        });
        t.oncomplete = function () { res(); };
        t.onerror = t.onabort = function () { rej(t.error); };
      });
    }
  };

  /* ---------- localStorage-Backend ---------- */
  var lsRoh = {}; // gespeicherte Form je Store (bei aktivem Tresor verschlüsselt)
  var LS = {
    oeffnen: function () {
      try { localStorage.setItem(LS_PREFIX + 'test', '1'); localStorage.removeItem(LS_PREFIX + 'test'); return Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    },
    alle: function (store) {
      try { lsRoh[store] = JSON.parse(localStorage.getItem(LS_PREFIX + store) || '[]'); }
      catch (e) { lsRoh[store] = []; }
      return Promise.resolve(lsRoh[store].slice());
    },
    schreiben: function (store) {
      try { localStorage.setItem(LS_PREFIX + store, JSON.stringify(lsRoh[store] || [])); return Promise.resolve(); }
      catch (e) { return Promise.reject(new Error('Speicher voll – bitte Daten exportieren und alte Ergebnisse archivieren.')); }
    },
    put: function (store, obj) {
      var l = lsRoh[store] = (lsRoh[store] || []).filter(function (o) { return o.id !== obj.id; });
      l.push(obj); return LS.schreiben(store);
    },
    del: function (store, id) { lsRoh[store] = (lsRoh[store] || []).filter(function (o) { return o.id !== id; }); return LS.schreiben(store); },
    ersetzen: function (daten) { STORES.forEach(function (s) { lsRoh[s] = (daten[s] || []).slice(); }); return Promise.all(STORES.map(LS.schreiben)); }
  };

  var backend = null;
  var gesperrt = {}; // verschlüsselte Datensätze je Store, solange der Tresor zu ist
  function sortieren() {
    cache.runs.sort(function (a, b) { return a.start - b.start; });
    cache.sessions.sort(function (a, b) { return a.start - b.start; });
  }

  /* ---------- Datentresor: Patientendaten verschlüsselt speichern (AES-256-GCM) ----------
   * Ein zufälliger Datenschlüssel verschlüsselt jeden Datensatz der Stores in VERSCHL einzeln (id bleibt lesbar).
   * Der Datenschlüssel ist für jeden Therapeuten mit einem aus seiner PIN abgeleiteten Schlüssel (PBKDF2-SHA256,
   * 150 000 Runden) verpackt (therapist.tresor). Nach der Anmeldung liegt er nur im Arbeitsspeicher; beim Abmelden
   * oder Neuladen ist er weg. Ohne crypto.subtle (sehr alte Browser) bleibt der Tresor aus (Hinweis in Verwaltung). */
  var VERSCHL = { patients: 1, plans: 1, sessions: 1, runs: 1, moduleState: 1 };
  var subtle = (window.crypto && window.crypto.subtle) || null;
  function zufall(n) { var a = new Uint8Array(n); window.crypto.getRandomValues(a); return a; }
  function b64(u8) { var s = '', k = 0x8000; for (var i = 0; i < u8.length; i += k) s += String.fromCharCode.apply(null, u8.subarray(i, i + k)); return btoa(s); }
  function unb64(t) { var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function utf8(t) { return new TextEncoder().encode(t); }
  function vonUtf8(b) { return new TextDecoder().decode(b); }
  var T = {
    schluessel: null, roh: null,
    moeglich: !!(subtle && window.TextEncoder && window.TextDecoder && window.crypto.getRandomValues),
    meta: function () { return S.finde('settings', 'tresor'); },
    aktiv: function () { var m = T.meta(); return !!(m && m.aktiv); },
    pinSchluessel: function (pin, salz, iter) {
      return subtle.importKey('raw', utf8(String(pin)), { name: 'PBKDF2' }, false, ['deriveKey']).then(function (k) {
        return subtle.deriveKey({ name: 'PBKDF2', salt: salz, iterations: iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
    },
    verpacken: function (pin) {
      var salz = zufall(16), iv = zufall(12), iter = 150000;
      return T.pinSchluessel(pin, salz, iter).then(function (k) { return subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, T.roh); })
        .then(function (c) { return { v: 1, salz: b64(salz), iv: b64(iv), iter: iter, daten: b64(new Uint8Array(c)) }; });
    },
    auspacken: function (w, pin) {
      return T.pinSchluessel(pin, unb64(w.salz), w.iter).then(function (k) { return subtle.decrypt({ name: 'AES-GCM', iv: unb64(w.iv) }, k, unb64(w.daten)); })
        .then(function (r) { return new Uint8Array(r); });
    },
    laden: function (roh) {
      return subtle.importKey('raw', roh, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']).then(function (k) { T.roh = roh; T.schluessel = k; });
    },
    verschluesseln: function (obj) {
      var iv = zufall(12);
      return subtle.encrypt({ name: 'AES-GCM', iv: iv }, T.schluessel, utf8(JSON.stringify(obj)))
        .then(function (c) { return { id: obj.id, enc: { v: 1, iv: b64(iv), daten: b64(new Uint8Array(c)) } }; });
    },
    entschluesseln: function (rec) {
      return subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.enc.iv) }, T.schluessel, unb64(rec.enc.daten)).then(function (r) { return JSON.parse(vonUtf8(r)); });
    },
    alleEntschluesseln: function () {
      var klarAlt = {}; // Datensätze, die noch im Klartext gespeichert sind (Altdaten vor dem Tresor)
      Object.keys(VERSCHL).forEach(function (s) { klarAlt[s] = cache[s].slice(); });
      return Promise.all(Object.keys(VERSCHL).map(function (s) {
        var l = gesperrt[s] || [];
        return Promise.all(l.map(T.entschluesseln)).then(function (klar) {
          var ids = {}; cache[s].forEach(function (o) { ids[o.id] = 1; });
          klar.forEach(function (o) { if (!ids[o.id]) cache[s].push(o); });
          gesperrt[s] = [];
        });
      })).then(function () {
        // noch unverschlüsselte Altdaten jetzt verschlüsseln
        var jobs = [];
        Object.keys(VERSCHL).forEach(function (s) { klarAlt[s].forEach(function (o) { jobs.push(T.verschluesseln(o).then(function (e) { return backend.put(s, e); })); }); });
        return Promise.all(jobs);
      });
    }
  };
  function speicherForm(store, obj) {
    if (!VERSCHL[store] || !T.aktiv()) return Promise.resolve(HT.kopie(obj));
    if (!T.schluessel) return Promise.reject(new Error('Der Datentresor ist gesperrt – bitte als Therapeut anmelden.'));
    return T.verschluesseln(obj);
  }

  var S = HT.storage = {
    backend: '',
    STORES: STORES,

    init: function () {
      return IDB.oeffnen().then(function () { backend = IDB; S.backend = 'IndexedDB'; })
        .catch(function (e) {
          console.warn('IndexedDB nicht verfügbar, verwende localStorage:', e && e.message);
          return LS.oeffnen().then(function () { backend = LS; S.backend = 'localStorage'; });
        })
        .then(S.neuLaden);
    },

    neuLaden: function () {
      return Promise.all(STORES.map(function (s) { return backend.alle(s); })).then(function (erg) {
        STORES.forEach(function (s, i) {
          var l = erg[i] || [];
          gesperrt[s] = l.filter(function (o) { return o && o.enc; });
          cache[s] = l.filter(function (o) { return o && !o.enc; });
        });
        // Mit geöffnetem Tresor (z. B. nach einem Import) gleich wieder entschlüsseln
        return T.schluessel ? T.alleEntschluesseln() : null;
      }).then(sortieren);
    },

    /* --- asynchrone Schnittstelle --- */
    get: function (store, id) { return Promise.resolve(S.finde(store, id)); },
    list: function (store, filter) { return Promise.resolve(S.alle(store, filter)); },
    put: function (store, obj) {
      if (!obj.id) obj.id = HT.uid(store.slice(0, 3));
      var liste = cache[store], i = -1;
      for (var k = 0; k < liste.length; k++) if (liste[k].id === obj.id) { i = k; break; }
      if (i >= 0) liste[i] = obj; else liste.push(obj);
      S.aenderungen++;
      return speicherForm(store, obj).then(function (f) { return backend.put(store, f); }).then(function () { return obj; });
    },
    delete: function (store, id) {
      cache[store] = cache[store].filter(function (o) { return o.id !== id; });
      S.aenderungen++;
      return backend.del(store, id);
    },
    exportAll: function () {
      var d = { format: 'hirntraining-sicherung', version: 1, erstellt: Date.now(), backend: S.backend };
      STORES.forEach(function (s) { d[s] = HT.kopie(cache[s]); });
      return Promise.resolve(d);
    },
    importAll: function (daten) {
      if (!daten || daten.format !== 'hirntraining-sicherung') return Promise.reject(new Error('Die Datei ist keine gültige Hirntraining-Sicherung.'));
      // Bestehender Tresor bleibt erhalten (sonst wären die Daten nicht mehr lesbar): Therapeuten mit Schlüssel und Tresor-Eintrag behalten
      var neu = {}, meta = T.meta();
      STORES.forEach(function (s) { neu[s] = HT.kopie(daten[s] || []).filter(function (o) { return o && !o.enc; }); });
      if (meta && T.schluessel) {
        neu.settings = neu.settings.filter(function (o) { return o.id !== 'tresor'; }).concat([HT.kopie(meta)]);
        var alt = {}; cache.therapists.forEach(function (t) { if (t.tresor) alt[t.id] = t.tresor; });
        neu.therapists.forEach(function (t) { if (alt[t.id]) t.tresor = alt[t.id]; else delete t.tresor; });
      } else neu.settings = neu.settings.filter(function (o) { return o.id !== 'tresor'; });
      var jobs = [];
      STORES.forEach(function (s) { neu[s].forEach(function (o, i) { jobs.push(speicherForm(s, o).then(function (f) { neu[s][i] = f; })); }); });
      return Promise.all(jobs).then(function () { return backend.ersetzen(neu); }).then(S.neuLaden);
    },

    /* --- synchrone Hilfen (aus dem Zwischenspeicher) --- */
    alle: function (store, filter) { return filter ? cache[store].filter(filter) : cache[store].slice(); },
    finde: function (store, id) {
      var l = cache[store];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    aenderungen: 0,

    /* --- Datentresor --- */
    tresor: T,
    tresorGesperrt: function () { return T.aktiv() && !T.schluessel; },
    // Erstes Einrichten (Ersteinrichtung oder erste Anmeldung nach dem Update): neuer Schlüssel, alle Daten verschlüsseln
    tresorEinrichten: function (therapeut, pin) {
      if (!T.moeglich || T.aktiv()) return Promise.resolve(false);
      return T.laden(zufall(32)).then(function () { return T.verpacken(pin); }).then(function (w) {
        therapeut.tresor = w;
        return backend.put('therapists', HT.kopie(therapeut));
      }).then(function () { return S.put('settings', { id: 'tresor', aktiv: true, seit: Date.now(), verfahren: 'AES-256-GCM, PBKDF2-SHA256 150000' }); })
        .then(function () { return T.alleEntschluesseln(); }).then(function () { return true; });
    },
    // Tresor mit der PIN eines Therapeuten öffnen: 'ok' | 'aus' (kein Tresor) | 'fehlt' (Therapeut hat noch keinen Schlüssel) | 'fehler'
    tresorOeffnen: function (therapeut, pin) {
      if (!T.aktiv()) return Promise.resolve('aus');
      if (T.schluessel) return (therapeut.tresor ? Promise.resolve() : S.tresorFreigeben(therapeut, pin)).then(function () { return 'ok'; });
      if (!therapeut.tresor) return Promise.resolve('fehlt');
      return T.auspacken(therapeut.tresor, pin).then(T.laden).then(T.alleEntschluesseln).then(sortieren)
        .then(function () { return 'ok'; }).catch(function () { console.warn('Tresor: PIN passt nicht'); return 'fehler'; });
    },
    // Schlüssel für einen (weiteren) Therapeuten mit dessen PIN verpacken – nur bei offenem Tresor
    tresorFreigeben: function (therapeut, pin) {
      if (!T.aktiv() || !T.schluessel) return Promise.resolve(therapeut);
      return T.verpacken(pin).then(function (w) { therapeut.tresor = w; return S.put('therapists', therapeut); });
    },
    // Abmelden: Schlüssel vergessen, Patientendaten aus dem Arbeitsspeicher entfernen
    tresorSchliessen: function () {
      if (!T.aktiv()) return Promise.resolve();
      T.schluessel = null; T.roh = null;
      return S.neuLaden();
    },

    /* Einstellungen (ein Datensatz mit id "app") */
    einstellungen: function () {
      var e = S.finde('settings', 'app');
      return HT.zusammen(S.STANDARD_EINSTELLUNGEN, e || {});
    },
    einstellungenSpeichern: function (aenderung) {
      var e = HT.zusammen(S.einstellungen(), aenderung, { id: 'app' });
      return S.put('settings', e);
    },
    STANDARD_EINSTELLUNGEN: {
      praxisname: 'Ergotherapie-Praxis', logoDataUrl: '', farbschema: 'tuerkis', standarddauer: 5,
      backupErinnerung: 7, letzterExport: 0, schriftgroesse: 100, kontrast: false, ton: true, lautstaerke: 70,
      pausenhinweisMin: 20, befinden: true, sperreMin: 10, aufbewahrungJahre: 10, sprachausgabeErsatz: 'ersatz', nurEigenePatienten: true, bildschirmBreiteCm: 33, abstandCm: 50, moduleInaktiv: {}, schwellen: {}, uebung: true, sprachausgabe: true
    }
  };
})();
