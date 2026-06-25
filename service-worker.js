/* Service Worker — Offline-Cache für den Lern-Katalog.
   Strategie:
   - Navigationen (HTML) + Branding (manifest, App-Icons): NETWORK-FIRST mit Cache-Fallback,
     damit App-Version & Logo online stets aktuell sind (kein „eingefrorenes" altes Icon mehr),
     offline aber weiterhin laufen.
   - Übrige statische Assets (JS/CSS/Daten/Font/KanjiVG-SVG): CACHE-FIRST (schnell, offline).
   Cache-Version bei inhaltlichen Änderungen erhöhen. */
'use strict';
var CACHE = 'katalog-v8';

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

// Branding (Manifest + App-Icons): muss online frisch sein, damit das Logo nicht aus einem
// alten Cache „klebt". Apple-Touch-Icon eingeschlossen.
function isBranding(url) {
  return url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/apple-touch-icon.png') ||
    /\/assets\/icons\/icon-(192|512|maskable-512)\.png$/.test(url.pathname);
}

function putInCache(req, res) {
  if (res && res.status === 200 && res.type === 'basic') {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var networkFirst = sameOrigin && (req.mode === 'navigate' || isBranding(url));

  if (networkFirst) {
    // Netz zuerst (frisch), bei Fehler aus dem Cache (offline); Navigation fällt auf index.html zurück.
    e.respondWith(
      fetch(req).then(function (res) { return putInCache(req, res); }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); });
      })
    );
    return;
  }

  // Sonst: Cache zuerst (statische Assets), bei Bedarf nachladen & cachen.
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { return putInCache(req, res); })
        .catch(function () { return caches.match('index.html'); });
    })
  );
});
