/* OTA — DEAKTIVIERT. Updates kommen nur noch als APK-Release (kein Nachladen von Web-Bundles).
   Grund: capgo verwarf OTA-Bundles beim nächsten nativen Update (resetWhenUpdate) und die App
   sprang auf den eingebauten Stand zurück — Updates „hielten" nicht. Statt weiterer Sonderfälle
   ist OTA abgeschaltet; der APK-Stand ist damit immer der definierte Zustand.
   WICHTIG: notifyAppReady() bleibt! Bestandsinstallationen können noch ein altes OTA-Bundle
   aktiv haben — ohne Bestätigung würde capgo nach appReadyTimeout erneut zurückrollen.
   window.OTA bleibt als Stub erhalten (app.js-Guards, Tests); check() meldet nie ein Update. */
(function () {
  'use strict';

  function native() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  function plugin() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater; }

  // Aktives Bundle bestätigen, sonst rollt capgo nach appReadyTimeout zurück. Idempotent.
  function confirmReady() { var U = plugin(); if (U && U.notifyAppReady) { try { U.notifyAppReady(); } catch (e) {} } }

  var state = { available: false, version: null, busy: false, error: null };

  // Stub-API: kein Check, kein Download — es gibt keine OTA-Updates mehr.
  window.OTA = {
    check: function () { return Promise.resolve(false); },
    applyUpdate: function () { return Promise.resolve(false); },
    onChange: function (fn) { try { fn(state); } catch (e) {} },
    state: function () { return state; },
    isNative: native
  };

  // SOFORT bestätigen (gegen Auto-Rollback von Bestands-OTA-Bundles) — und mehrfach nachfassen,
  // falls das Plugin beim allerersten Aufruf noch nicht registriert war. Alle Aufrufe idempotent.
  if (native()) {
    confirmReady();
    [200, 800, 2000].forEach(function (ms) { setTimeout(confirmReady, ms); });
    document.addEventListener('DOMContentLoaded', confirmReady);
  }
})();
