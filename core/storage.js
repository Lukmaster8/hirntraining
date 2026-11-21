/* Hirntraining – Datenspeicher
 * IndexedDB mit automatischem Fallback auf localStorage (z. B. Safari unter file://).
 * Schnittstelle: init, get, put, delete, list, exportAll, importAll
 * Zusätzlich ein synchroner Zwischenspeicher (HT.storage.alle / finde) für die Oberfläche. */
(function () {
  'use strict';
  var HT = window.HT;
  var DB_NAME = 'hirntraining';
  var DB_VERSION = 1;
  var STORES = ['therapists', 'patients', 'plans', 'templates', 'sessions', 'runs', 'moduleState', 'settings'];
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
  var LS = {
    oeffnen: function () {
      try { localStorage.setItem(LS_PREFIX + 'test', '1'); localStorage.removeItem(LS_PREFIX + 'test'); return Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    },
    alle: function (store) {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(LS_PREFIX + store) || '[]')); }
      catch (e) { return Promise.resolve([]); }
    },
    schreiben: function (store) {
      try { localStorage.setItem(LS_PREFIX + store, JSON.stringify(cache[store])); return Promise.resolve(); }
      catch (e) { return Promise.reject(new Error('Speicher voll – bitte Daten exportieren und alte Ergebnisse archivieren.')); }
    },
    put: function (store) { return LS.schreiben(store); },
    del: function (store) { return LS.schreiben(store); },
    ersetzen: function () { return Promise.all(STORES.map(LS.schreiben)); }
  };

  var backend = null;

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
        STORES.forEach(function (s, i) { cache[s] = erg[i] || []; });
        cache.runs.sort(function (a, b) { return a.start - b.start; });
        cache.sessions.sort(function (a, b) { return a.start - b.start; });
      });
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
      return backend.put(store, HT.kopie(obj)).then(function () { return obj; });
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
      STORES.forEach(function (s) { cache[s] = HT.kopie(daten[s] || []); });
      return backend.ersetzen(daten).then(S.neuLaden);
    },

    /* --- synchrone Hilfen (aus dem Zwischenspeicher) --- */
    alle: function (store, filter) { return filter ? cache[store].filter(filter) : cache[store].slice(); },
    finde: function (store, id) {
      var l = cache[store];
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    aenderungen: 0,

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
      pausenhinweisMin: 20, befinden: true, nurEigenePatienten: true, bildschirmBreiteCm: 33, abstandCm: 50, moduleInaktiv: {}, schwellen: {}, uebung: true, sprachausgabe: true
    }
  };
})();
