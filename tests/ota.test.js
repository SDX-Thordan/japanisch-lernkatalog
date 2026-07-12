// Unit-Test für assets/ota.js (STUB — OTA ist deaktiviert): meldet nie ein Update,
// bestätigt aber weiterhin das aktive Bundle (notifyAppReady) gegen capgo-Auto-Rollback.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadScripts, repoPath } from './helpers/load.js';

const BODY = '<!DOCTYPE html><html><body></body></html>';

function loadOta({ capacitor } = {}) {
  // Capacitor muss VOR ota.js existieren (der Sofort-confirmReady liest ihn beim Laden).
  const win = loadScripts([], { html: BODY, url: 'https://example.test/' });
  if (capacitor) win.Capacitor = capacitor;
  const script = win.document.createElement('script');
  script.textContent = readFileSync(repoPath('assets/ota.js'), 'utf8');
  win.document.head.appendChild(script);
  return win;
}

describe('OTA — deaktiviert (Stub)', () => {
  it('Web: No-Op, check() liefert false, kein Update-Zustand', async () => {
    const win = loadOta();
    expect(typeof win.OTA).toBe('object');
    expect(win.OTA.isNative()).toBe(false);
    await expect(win.OTA.check()).resolves.toBe(false);
    await expect(win.OTA.applyUpdate()).resolves.toBe(false);
    expect(win.OTA.state().available).toBe(false);
  });

  it('nativ: check() meldet NIE ein Update (OTA abgeschaltet)', async () => {
    const win = loadOta({
      capacitor: {
        isNativePlatform: () => true,
        Plugins: { CapacitorUpdater: { notifyAppReady: () => Promise.resolve() } },
      },
    });
    expect(win.OTA.isNative()).toBe(true);
    await expect(win.OTA.check()).resolves.toBe(false);
    expect(win.OTA.state().available).toBe(false);
  });

  it('nativ: bestätigt das aktive Bundle sofort (notifyAppReady gegen Auto-Rollback)', () => {
    const calls = [];
    loadOta({
      capacitor: {
        isNativePlatform: () => true,
        Plugins: { CapacitorUpdater: { notifyAppReady: () => { calls.push('ready'); return Promise.resolve(); } } },
      },
    });
    expect(calls).toContain('ready'); // Sofort-Aufruf beim Skript-Load
  });

  it('onChange liefert den (leeren) Zustand sofort, ohne je ein Update zu melden', () => {
    const win = loadOta();
    const seen = [];
    win.OTA.onChange((st) => seen.push(st));
    expect(seen).toHaveLength(1);
    expect(seen[0].available).toBe(false);
  });
});
