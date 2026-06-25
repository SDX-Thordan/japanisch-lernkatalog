/* OTA-Updater (nur Android/Capacitor) — lädt neue Web-Bundles vom GitHub-Release nach.
   Manueller Modus (@capgo/capacitor-updater): beim Start wird im Hintergrund geprüft, ob eine
   neuere Bundle-Version vorliegt; angewendet (download → set → reload) wird NUR auf Knopfdruck.
   Im Web/PWA komplett No-Op. Kein Bundler nötig — Plugins via window.Capacitor.Plugins.*.
   Quelle der Wahrheit sind zwei konstant benannte Release-Assets:
     …/releases/latest/download/ota-manifest.json   → { "version": "X.Y.Z" }
     …/releases/latest/download/www-bundle.zip       → das gepackte www/ */
(function () {
  'use strict';
  var OWNER = 'SDX-Thordan', REPO = 'japanisch-lernkatalog';
  var BASE = 'https://github.com/' + OWNER + '/' + REPO + '/releases/latest/download/';
  var MANIFEST = BASE + 'ota-manifest.json', BUNDLE = BASE + 'www-bundle.zip';
  var LS_KEY = 'katalog_ota_version';

  // Semver-Vergleich nur über die Zahlen-Teile (Vorab-Suffixe wie „-dev.7" werden ignoriert).
  function parse(v) { return String(v || '0').split('-')[0].split('.').map(function (n) { return parseInt(n, 10) || 0; }); }
  function cmp(a, b) { a = parse(a); b = parse(b); for (var i = 0; i < 3; i++) { var d = (a[i] || 0) - (b[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; }
  function isNewer(remote, local) { return cmp(remote, local) > 0; }

  function native() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function plugin() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater; }
  function http() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp; }

  var state = { available: false, version: null, busy: false, error: null };
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  // Laufende Bundle-Version: zuletzt gesetzte (localStorage) oder die eingebaute APP_VERSION.
  function currentVersion() {
    try { return localStorage.getItem(LS_KEY) || window.APP_VERSION || '0.0.0'; }
    catch (e) { return window.APP_VERSION || '0.0.0'; }
  }

  // Manifest CORS-frei nativ holen (CapacitorHttp); Fallback auf fetch (z. B. Tests/Web).
  function fetchManifest() {
    var H = http();
    if (H && H.get) return H.get({ url: MANIFEST }).then(function (r) { var d = r && r.data; return typeof d === 'string' ? JSON.parse(d) : d; });
    return fetch(MANIFEST, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  // Hintergrund-Check: setzt nur state.available — lädt NICHTS.
  function check() {
    if (!native()) return Promise.resolve(false);
    return fetchManifest().then(function (m) {
      var v = m && m.version;
      var avail = !!(v && isNewer(v, currentVersion()));
      state.available = avail; state.version = avail ? v : null; state.error = null; emit();
      return avail;
    }).catch(function (e) { state.error = String(e && e.message || e); emit(); return false; });
  }

  // Anwenden NUR auf Knopfdruck: download → set → reload (auf das neue Bundle).
  function applyUpdate() {
    var U = plugin();
    if (!native() || !U || !state.version || state.busy) return Promise.resolve(false);
    state.busy = true; state.error = null; emit();
    return U.download({ url: BUNDLE, version: state.version }).then(function (bundle) {
      return U.set(bundle).then(function () {
        try { localStorage.setItem(LS_KEY, state.version); } catch (e) {}
        return U.reload();
      });
    }).catch(function (e) { state.busy = false; state.error = String(e && e.message || e); emit(); throw e; });
  }

  function init() {
    if (!native()) return; // Web/PWA: nichts tun
    var U = plugin();
    if (U && U.notifyAppReady) { try { U.notifyAppReady(); } catch (e) {} } // bestätigt das laufende Bundle (kein Rollback)
    check();
  }

  // Öffentliche API (von app.js / profil.html genutzt; isNewer/__cmp für Tests).
  window.OTA = {
    check: check,
    applyUpdate: applyUpdate,
    onChange: function (fn) { listeners.push(fn); try { fn(state); } catch (e) {} },
    state: function () { return state; },
    isNative: native,
    isNewer: isNewer,
    __cmp: cmp
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
