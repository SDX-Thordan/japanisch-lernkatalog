// Gehärtete Tests für assets/ota.js (reaktiviert, selbstheilend): kompletter capgo-Lebenszyklus
// über einen Mock — Selbstheilung, Loop-Schutz, Rollback-Wiederanbieten, Busy-Guard, Fehlerpfade.
// Wichtig: window.Capacitor wird VOR der Skript-Auswertung gesetzt (wie auf dem echten Gerät).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadScripts, repoPath } from './helpers/load.js';

const BODY = '<!DOCTYPE html><html><body></body></html>';

// Voll instrumentierter capgo-Mock: native APK-Version, aktives Bundle, Manifest-Antwort.
function capMock({ nativeVersion = '1.0.0', bundleId = 'builtin', manifestVersion = null, failManifest = false } = {}) {
  const calls = [];
  const cap = {
    isNativePlatform: () => true,
    Plugins: {
      CapacitorHttp: {
        get: () => {
          calls.push('manifest');
          if (failManifest) return Promise.reject(new Error('offline'));
          return Promise.resolve({ data: JSON.stringify({ version: manifestVersion }) });
        },
      },
      CapacitorUpdater: {
        notifyAppReady: () => { calls.push('ready'); return Promise.resolve(); },
        current: () => { calls.push('current'); return Promise.resolve({ bundle: { id: bundleId, version: '' }, native: nativeVersion }); },
        reset: () => { calls.push('reset'); return Promise.resolve(); },
        download: (o) => { calls.push('download:' + o.version); return Promise.resolve({ id: 'b-new', version: o.version }); },
        set: (o) => { calls.push('set:' + o.id); return Promise.resolve(); },
      },
    },
  };
  return { cap, calls };
}

// ota.js in ein frisches Fenster laden; Capacitor/APP_VERSION VOR der Auswertung setzen,
// dann DOMContentLoaded ausliefern (init → confirmReady + selfHeal) und Promises abwarten.
async function loadOta({ appVersion, capacitor, healFlag } = {}) {
  const win = loadScripts([], { html: BODY, url: 'https://example.test/' });
  if (appVersion != null) win.APP_VERSION = appVersion;
  if (capacitor) win.Capacitor = capacitor;
  if (healFlag) win.sessionStorage.setItem('ota_selfheal', '1');
  const script = win.document.createElement('script');
  script.textContent = readFileSync(repoPath('assets/ota.js'), 'utf8');
  win.document.head.appendChild(script);
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 0)); // current()/reset()-Promises abarbeiten
  await new Promise((r) => setTimeout(r, 0));
  return win;
}

describe('OTA — Versionslogik', () => {
  it('vergleicht Semver numerisch (auch 1.10 > 1.2) und ignoriert -dev-Suffixe', async () => {
    const win = await loadOta();
    expect(win.OTA.isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(win.OTA.isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(win.OTA.isNewer('1.2.0', '1.10.0')).toBe(false); // 10 > 2
    expect(win.OTA.isNewer('1.10.0', '1.2.0')).toBe(true);
    expect(win.OTA.isNewer('1.0.0', '1.0.0-dev.7')).toBe(false); // selbe Zahlen-Version
  });
});

describe('OTA — Web (kein Capacitor)', () => {
  it('ist ein No-Op: check() false, versions() ohne native, kein Crash', async () => {
    const win = await loadOta({ appVersion: '1.0.0' });
    expect(win.OTA.isNative()).toBe(false);
    await expect(win.OTA.check()).resolves.toBe(false);
    await expect(win.OTA.applyUpdate()).resolves.toBe(false);
    const v = await win.OTA.versions();
    expect(v).toMatchObject({ current: '1.0.0', native: null });
  });
});

describe('OTA — Selbstheilung (eingebautes APK-Bundle vs. aktives Bundle)', () => {
  it('veraltetes OTA-Bundle aktiv (APK neuer) → reset() aufs eingebaute Bundle', async () => {
    // Szenario 0.3.6-Vorfall umgekehrt: APK 0.4.0 installiert, altes OTA-Bundle 0.3.6 klebt.
    const { cap, calls } = capMock({ nativeVersion: '0.4.0' });
    await loadOta({ appVersion: '0.3.6', capacitor: cap });
    expect(calls).toContain('reset');
    expect(calls).toContain('ready'); // Bestätigung passiert VOR der Heilung
    expect(calls.indexOf('ready')).toBeLessThan(calls.indexOf('reset'));
  });

  it('aktives Bundle gleich alt oder neuer als APK → KEIN reset', async () => {
    const same = capMock({ nativeVersion: '1.0.0' });
    await loadOta({ appVersion: '1.0.0', capacitor: same.cap });
    expect(same.calls).not.toContain('reset');

    // OTA-Bundle NEUER als APK (der Normalfall nach einem Update) → bleibt aktiv.
    const newer = capMock({ nativeVersion: '1.0.0' });
    await loadOta({ appVersion: '1.1.0', capacitor: newer.cap });
    expect(newer.calls).not.toContain('reset');
  });

  it('Loop-Schutz: pro Sitzung höchstens ein Heilungs-Reset', async () => {
    const { cap, calls } = capMock({ nativeVersion: '9.9.9' });
    const win = await loadOta({ appVersion: '0.0.1', capacitor: cap, healFlag: true }); // Flag schon gesetzt
    expect(calls).not.toContain('reset');
    // direkter Aufruf respektiert das Flag ebenfalls
    await expect(win.OTA.__selfHeal()).resolves.toBe(false);
  });

  it('setzt das Sitzungs-Flag beim Heilen', async () => {
    const { cap } = capMock({ nativeVersion: '2.0.0' });
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    expect(win.sessionStorage.getItem('ota_selfheal')).toBe('1');
  });

  it('current() fehlt oder wirft → kein Crash, kein reset', async () => {
    const { cap, calls } = capMock({ nativeVersion: '9.9.9' });
    cap.Plugins.CapacitorUpdater.current = () => Promise.reject(new Error('kaputt'));
    const win = await loadOta({ appVersion: '0.0.1', capacitor: cap });
    expect(calls).not.toContain('reset');
    await expect(win.OTA.__selfHeal()).resolves.toBe(false);
  });
});

describe('OTA — Prüfen & Anwenden (nur über Profil, kein Banner)', () => {
  it('check() meldet ein neueres Bundle; gleiches/älteres nicht', async () => {
    const a = capMock({ nativeVersion: '1.0.0', manifestVersion: '2.0.0' });
    const winA = await loadOta({ appVersion: '1.0.0', capacitor: a.cap });
    expect(await winA.OTA.check()).toBe(true);
    expect(winA.OTA.state()).toMatchObject({ available: true, version: '2.0.0' });

    const b = capMock({ nativeVersion: '2.0.0', manifestVersion: '2.0.0' });
    const winB = await loadOta({ appVersion: '2.0.0', capacitor: b.cap });
    expect(await winB.OTA.check()).toBe(false);
    expect(winB.OTA.state().available).toBe(false);
  });

  it('Manifest-Fehler (offline) → false + state.error, kein Crash', async () => {
    const { cap } = capMock({ nativeVersion: '1.0.0', failManifest: true });
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    expect(await win.OTA.check()).toBe(false);
    expect(win.OTA.state().error).toBeTruthy();
  });

  it('applyUpdate() lädt und ruft set({id}) — terminal, kein separates reload', async () => {
    const { cap, calls } = capMock({ nativeVersion: '1.0.0', manifestVersion: '2.0.0' });
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    await win.OTA.check();
    await win.OTA.applyUpdate();
    const rel = calls.filter((c) => c.startsWith('download') || c.startsWith('set'));
    expect(rel).toEqual(['download:2.0.0', 'set:b-new']);
  });

  it('Busy-Guard: zweiter applyUpdate() während des Downloads lädt nicht doppelt', async () => {
    const { cap, calls } = capMock({ nativeVersion: '1.0.0', manifestVersion: '2.0.0' });
    // Download künstlich verzögern
    let release; const gate = new Promise((r) => { release = r; });
    const orig = cap.Plugins.CapacitorUpdater.download;
    cap.Plugins.CapacitorUpdater.download = (o) => gate.then(() => orig(o));
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    await win.OTA.check();
    const p1 = win.OTA.applyUpdate();
    const p2 = win.OTA.applyUpdate(); // busy → sofort false
    await expect(p2).resolves.toBe(false);
    release(); await p1;
    expect(calls.filter((c) => c.startsWith('download')).length).toBe(1);
  });

  it('Download-Fehler → busy wieder frei, Fehler im state, erneuter Versuch möglich', async () => {
    const { cap } = capMock({ nativeVersion: '1.0.0', manifestVersion: '2.0.0' });
    cap.Plugins.CapacitorUpdater.download = () => Promise.reject(new Error('netz weg'));
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    await win.OTA.check();
    await expect(win.OTA.applyUpdate()).rejects.toThrow('netz weg');
    expect(win.OTA.state().busy).toBe(false);
    expect(win.OTA.state().error).toContain('netz weg');
  });

  it('nach Rollback/Reset (laufende Version wieder alt) wird das Update ERNEUT angeboten', async () => {
    // currentVersion() liest das LIVE laufende Bundle (window.APP_VERSION), nie localStorage.
    const { cap } = capMock({ nativeVersion: '1.0.0', manifestVersion: '2.0.0' });
    const win = await loadOta({ appVersion: '1.0.0', capacitor: cap });
    expect(await win.OTA.check()).toBe(true);
    expect(win.OTA.state().version).toBe('2.0.0');
  });

  it('versions() liefert die Diagnose-Daten fürs Profil (aktiv vs. eingebaut)', async () => {
    const { cap } = capMock({ nativeVersion: '0.4.0', bundleId: 'b7' });
    const win = await loadOta({ appVersion: '0.4.1', capacitor: cap });
    await expect(win.OTA.versions()).resolves.toEqual({ current: '0.4.1', native: '0.4.0', bundleId: 'b7' });
  });
});

describe('OTA — Rollback-Schutz (notifyAppReady)', () => {
  it('bestätigt das aktive Bundle sofort bei Skript-Auswertung UND erneut bei init', async () => {
    const { cap, calls } = capMock({ nativeVersion: '1.0.0' });
    await loadOta({ appVersion: '1.0.0', capacitor: cap });
    // mind. 2×: Sofort-Aufruf beim Laden + init (DOMContentLoaded); Retries kommen später dazu.
    expect(calls.filter((c) => c === 'ready').length).toBeGreaterThanOrEqual(2);
  });
});
