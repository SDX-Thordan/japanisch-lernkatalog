/* OTA-Updater (nur Android/Capacitor) — lädt neue Web-Bundles vom GitHub-Release nach.
   REAKTIVIERT mit selbstheilender Bundle-Logik (Lehre aus dem 0.3.6-Vorfall):
   - resetWhenUpdate:false (capacitor.config.json): OTA-Bundles überleben ein APK-Update —
     capgo verwirft sie nicht mehr pauschal („Update hält nicht").
   - Dafür prüft selfHeal() bei JEDEM Start: ist die EINGEBAUTE APK-Version
     (CapacitorUpdater.current().native) NEUER als das laufende Bundle (window.APP_VERSION),
     wird per reset() aufs eingebaute Bundle zurückgesetzt. So klebt nie ein veraltetes
     OTA-Bundle an einem neueren APK — und ein neueres OTA-Bundle wird nie verworfen.
     Loop-Schutz: höchstens 1 Reset pro Sitzung (sessionStorage-Flag).
   - KEIN Auto-Banner: geprüft & angewendet wird ausschließlich über die Profil-Seite.
   - notifyAppReady() sofort + mehrfach (gegen capgo-Auto-Rollback nach appReadyTimeout).
   - Laufende Version = window.APP_VERSION des AKTIVEN Bundles (nie localStorage) — nach
     einem Rollback/Reset wird ein Update dadurch automatisch wieder angeboten.
   Im Web/PWA komplett No-Op. Quelle sind zwei konstant benannte Release-Assets:
     …/releases/latest/download/ota-manifest.json → { "version": "X.Y.Z" }
     …/releases/latest/download/www-bundle.zip    → das gepackte www/ */
(function () {
  'use strict';
  var OWNER = 'SDX-Thordan', REPO = 'japanisch-lernkatalog';
  var BASE = 'https://github.com/' + OWNER + '/' + REPO + '/releases/latest/download/';
  var MANIFEST = BASE + 'ota-manifest.json', BUNDLE = BASE + 'www-bundle.zip';
  var HEAL_FLAG = 'ota_selfheal'; // sessionStorage: max. 1 Selbstheilungs-Reset pro Sitzung

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

  // Laufende Bundle-Version = window.APP_VERSION aus der version.js des AKTUELL laufenden Bundles.
  function currentVersion() { return window.APP_VERSION || '0.0.0'; }

  // Aktives Bundle bestätigen, sonst rollt capgo nach appReadyTimeout zurück. Idempotent.
  function confirmReady() { var U = plugin(); if (U && U.notifyAppReady) { try { U.notifyAppReady(); } catch (e) {} } }

  // Versionslage für die Profil-Diagnose: laufendes Bundle + eingebaute APK-Version.
  function versions() {
    var cur = currentVersion();
    var U = plugin();
    if (!native() || !U || !U.current) return Promise.resolve({ current: cur, native: null, bundleId: null });
    return U.current().then(function (info) {
      return { current: cur, native: (info && info.native) || null, bundleId: (info && info.bundle && info.bundle.id) || null };
    }).catch(function () { return { current: cur, native: null, bundleId: null }; });
  }

  // SELBSTHEILUNG: eingebautes Bundle (APK) neuer als das laufende → reset() aufs eingebaute.
  // Ersetzt capgos pauschales resetWhenUpdate durch einen echten Versionsvergleich.
  function selfHeal() {
    var U = plugin();
    if (!native() || !U || !U.current || !U.reset) return Promise.resolve(false);
    var ss = null; try { ss = window.sessionStorage; } catch (e) {}
    if (ss && ss.getItem(HEAL_FLAG)) return Promise.resolve(false); // Loop-Schutz
    return U.current().then(function (info) {
      var builtin = info && info.native;
      if (!builtin || !isNewer(builtin, currentVersion())) return false;
      if (ss) { try { ss.setItem(HEAL_FLAG, '1'); } catch (e) {} }
      // reset() wechselt aufs eingebaute Bundle und lädt neu (danach läuft dieser Code erneut,
      // dann mit builtin === APP_VERSION → kein weiterer Reset; Flag fängt Restfälle ab).
      return U.reset().then(function () { return true; });
    }).catch(function () { return false; });
  }

  // Manifest CORS-frei nativ holen (CapacitorHttp); Fallback auf fetch (z. B. Tests/Web).
  function fetchManifest() {
    var H = http();
    if (H && H.get) return H.get({ url: MANIFEST }).then(function (r) { var d = r && r.data; return typeof d === 'string' ? JSON.parse(d) : d; });
    return fetch(MANIFEST, { cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  // Prüfen (nur auf Nutzerwunsch über die Profil-Seite): setzt state.available — lädt NICHTS.
  function check() {
    if (!native()) return Promise.resolve(false);
    return fetchManifest().then(function (m) {
      var v = m && m.version;
      var avail = !!(v && isNewer(v, currentVersion()));
      state.available = avail; state.version = avail ? v : null; state.error = null; emit();
      return avail;
    }).catch(function (e) { state.error = String(e && e.message || e); emit(); return false; });
  }

  // Anwenden NUR auf Knopfdruck: download → set. set() ist TERMINAL — es setzt das neue Bundle
  // und startet die App sofort selbst neu; bestätigt wird das frische Bundle beim nächsten
  // Start durch confirmReady() ganz oben in jedem <head>. set() erwartet die BundleId ({id}).
  function applyUpdate() {
    var U = plugin();
    if (!native() || !U || !state.version || state.busy) return Promise.resolve(false);
    state.busy = true; state.error = null; emit();
    return U.download({ url: BUNDLE, version: state.version }).then(function (bundle) {
      return U.set({ id: bundle.id });
    }).catch(function (e) { state.busy = false; state.error = String(e && e.message || e); emit(); throw e; });
  }

  function init() {
    if (!native()) return; // Web/PWA: nichts tun
    confirmReady(); // erneut bestätigen (falls die Plugins beim Sofort-Aufruf noch nicht bereit waren)
    selfHeal();     // veraltetes OTA-Bundle? → zurück aufs eingebaute (lädt ggf. neu)
  }

  // Öffentliche API (Profil-Seite; isNewer/__cmp/__selfHeal für Tests).
  window.OTA = {
    check: check,
    applyUpdate: applyUpdate,
    versions: versions,
    onChange: function (fn) { listeners.push(fn); try { fn(state); } catch (e) {} },
    state: function () { return state; },
    isNative: native,
    isNewer: isNewer,
    __cmp: cmp,
    __selfHeal: selfHeal
  };

  // SOFORT bestätigen (so früh wie möglich gegen Auto-Rollback) — und mehrfach nachfassen, falls
  // das Plugin beim allerersten Aufruf noch nicht registriert war (Timing-Rennen). Idempotent.
  if (native()) {
    confirmReady();
    [200, 800, 2000].forEach(function (ms) { setTimeout(confirmReady, ms); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
