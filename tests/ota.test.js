// Unit-Test für assets/ota.js: Semver-Vergleich, Web-No-Op und der native Prüf-/Anwenden-Fluss
// (über einen gemockten window.Capacitor). Kein echtes Gerät nötig.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

const BODY = '<!DOCTYPE html><html><body></body></html>';

let win;
beforeEach(() => {
  // url setzen → jsdom aktiviert localStorage (von ota.js für die gemerkte Version genutzt).
  win = loadScripts(['assets/version.js', 'assets/ota.js'], { html: BODY, url: 'https://example.test/' });
});

function nativeCapacitor(manifestVersion, calls) {
  return {
    isNativePlatform: () => true,
    Plugins: {
      CapacitorHttp: { get: () => Promise.resolve({ data: JSON.stringify({ version: manifestVersion }) }) },
      CapacitorUpdater: {
        notifyAppReady: () => { (calls || []).push('ready'); },
        download: () => { (calls || []).push('download'); return Promise.resolve({ id: 'b1' }); },
        set: () => { (calls || []).push('set'); return Promise.resolve(); },
        reload: () => { (calls || []).push('reload'); return Promise.resolve(); },
      },
    },
  };
}

describe('OTA — Versionslogik', () => {
  it('vergleicht Semver numerisch (auch 1.10 > 1.2) und ignoriert -dev-Suffixe', () => {
    expect(win.OTA.isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(win.OTA.isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(win.OTA.isNewer('1.2.0', '1.10.0')).toBe(false); // 10 > 2
    expect(win.OTA.isNewer('1.10.0', '1.2.0')).toBe(true);
    expect(win.OTA.isNewer('1.0.0', '1.0.0-dev.7')).toBe(false); // selbe Zahlen-Version
  });
});

describe('OTA — Web (kein Capacitor)', () => {
  it('ist ein No-Op: check() liefert false, kein Banner-Zustand', async () => {
    expect(typeof win.OTA).toBe('object');
    expect(win.OTA.isNative()).toBe(false);
    await expect(win.OTA.check()).resolves.toBe(false);
    expect(win.OTA.state().available).toBe(false);
  });
});

describe('OTA — nativ (gemockt)', () => {
  it('check() meldet ein neueres Bundle als verfügbar', async () => {
    win.APP_VERSION = '1.0.0';
    win.Capacitor = nativeCapacitor('2.0.0');
    const avail = await win.OTA.check();
    expect(avail).toBe(true);
    expect(win.OTA.state().available).toBe(true);
    expect(win.OTA.state().version).toBe('2.0.0');
  });

  it('check() meldet nichts, wenn das Manifest nicht neuer ist', async () => {
    win.APP_VERSION = '2.0.0';
    win.Capacitor = nativeCapacitor('2.0.0');
    expect(await win.OTA.check()).toBe(false);
    expect(win.OTA.state().available).toBe(false);
  });

  it('applyUpdate() lädt → setzt → reload (in dieser Reihenfolge)', async () => {
    const calls = [];
    win.APP_VERSION = '1.0.0';
    win.Capacitor = nativeCapacitor('2.0.0', calls);
    await win.OTA.check();
    await win.OTA.applyUpdate();
    // notifyAppReady ('ready') kann je nach Tick-Timing dazwischenfunken → herausfiltern.
    expect(calls.filter((c) => c !== 'ready')).toEqual(['download', 'set', 'reload']);
  });

  it('vergleicht gegen die laufende APP_VERSION (kein localStorage-Desync nach Rollback)', async () => {
    // Nach einem Rollback läuft wieder das alte Bundle → APP_VERSION ist alt → Update wird ERNEUT angeboten.
    win.APP_VERSION = '1.0.0';
    win.Capacitor = nativeCapacitor('2.0.0');
    expect(await win.OTA.check()).toBe(true);
    expect(win.OTA.state().version).toBe('2.0.0');
  });
});
