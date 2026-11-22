/* Hirntraining – Offline-Speicher (Service Worker). Automatisch erzeugt von tools/offline_liste.py – nicht von Hand ändern.
 * Wirkt nur in der Online-Version (https, z. B. GitHub Pages): Nach dem ersten Öffnen läuft das Programm
 * auch ohne Internet. Die Patientendaten liegen davon unabhängig im Speicher des jeweiligen Geräts. */
var VERSION = 'ht-__VERSION__';
var DATEIEN = __DATEIEN__;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(DATEIEN); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (alle) {
    return Promise.all(alle.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var gleich = new URL(e.request.url).origin === self.location.origin;
  // Zuerst aus dem Netz (immer die neueste Version), ohne Internet aus dem Offline-Speicher
  e.respondWith(fetch(e.request).then(function (antwort) {
    if (antwort && antwort.ok && gleich) { var kopie = antwort.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, kopie); }); }
    return antwort;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (treffer) { return treffer || caches.match('./index.html'); });
  }));
});
