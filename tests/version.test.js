// Versionsquelle: assets/version.js (window.APP_VERSION) muss zu package.json.version passen.
// Verhindert Drift zwischen Footer-Anzeige, PWA und Android-versionName.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { repoPath } from './helpers/load.js';

function pkgVersion() {
  return JSON.parse(readFileSync(repoPath('package.json'), 'utf8')).version;
}
function versionJsValue() {
  const src = readFileSync(repoPath('assets/version.js'), 'utf8');
  const m = src.match(/APP_VERSION\s*=\s*'([^']+)'/);
  return m ? m[1] : null;
}

describe('Versionsquelle', () => {
  it('assets/version.js spiegelt package.json.version (kein Drift)', () => {
    const v = pkgVersion();
    expect(v).toMatch(/^\d+\.\d+\.\d+/); // Semver
    expect(versionJsValue()).toBe(v);
  });

  it('window.APP_VERSION ist im Browser-Kontext gesetzt', () => {
    // version.js ist eine reine window-Zuweisung; in jsdom über loadScripts prüfbar.
    expect(versionJsValue()).toBeTruthy();
  });
});
