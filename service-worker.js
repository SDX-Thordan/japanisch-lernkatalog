/* Service Worker — Offline-Cache (cache-first) für den Lern-Katalog.
   Cacht App-Shell, Daten und KanjiVG-SVGs, damit die App (auch als PWA) offline läuft.
   Cache-Version bei inhaltlichen Änderungen erhöhen. */
'use strict';
var CACHE = 'katalog-v7';

var ASSETS = [
  './', 'index.html', 'heute.html', 'lernpfad.html', 'listen.html', 'grammatik.html', 'vokabular.html', 'kanji.html',
  'schreiben.html', 'verben.html', 'profil.html', 'ueben.html',
  'assets/style.css', 'assets/app.js', 'assets/srs.js', 'assets/exercises.js', 'assets/kanji-write.js', 'assets/version.js',
  'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
  'assets/data/grammatik_extra.js', 'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js',
  'assets/data/vokabular_tags.js', 'assets/data/saetze.js',
  'manifest.webmanifest', 'assets/icons/material/material-icons-outlined.woff2',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  // App-Shell vorab cachen; KanjiVG-SVGs werden bei Bedarf nachgecacht (runtime).
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // erfolgreiche GETs (z. B. KanjiVG-SVGs) zur Laufzeit cachen
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return caches.match('index.html'); });
    })
  );
});
