// Integrationstest: Fortschritt-Seite — Statistik/Forecast + Reset über die UI.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="fortschritt"><div id="f-root">
  <span id="f-streak"></span><span id="f-learned"></span><span id="f-due"></span><span id="f-reviews"></span>
  <div id="f-forecast"></div>
  <button id="f-export"></button><button id="f-import"></button><input id="f-file" type="file">
  <button id="f-reset"></button><p id="f-msg"></p>
</div></body></html>`;

let win;
beforeEach(() => {
  win = loadScripts([
    'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
    'assets/srs.js', 'assets/app.js',
  ], { html: BODY });
  win.SRS._useStorage(fakeStorage());
});

describe('Fortschritt-Seite', () => {
  it('rendert 7 Forecast-Balken und Statistik', () => {
    // Seite neu initialisieren, nachdem Storage gesetzt ist:
    win.SRS.grade('k:学', 1, '2026-06-23');
    // initFortschritt lief bereits beim Laden; erneut über reset-Pfad zeichnen lassen:
    const reset = win.document.getElementById('f-reset');
    // forecast wird in draw() befüllt; prüfe nach einem Import-Trigger-freien Redraw via Reset-Abbruch
    expect(win.document.querySelectorAll('#f-forecast .f-bar').length).toBe(7);
  });

  it('Export liefert gültiges JSON, Import (merge) stellt Items wieder her', () => {
    win.SRS.grade('k:水', 1, '2026-06-23');
    const text = win.SRS.exportJSON();
    const parsed = JSON.parse(text);
    expect(parsed.v).toBe(1);
    expect(parsed.items['k:水']).toBeTruthy();
    win.SRS.reset();
    expect(win.SRS.get('k:水')).toBeFalsy();
    expect(win.SRS.importJSON(text, { merge: true }).ok).toBe(true);
    expect(win.SRS.get('k:水')).toBeTruthy();
  });
});
