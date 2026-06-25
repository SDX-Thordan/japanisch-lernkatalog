// Integrationstest: Grammatik-Seite rendert „Mehr erklären" + lauffähige Übungen.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win;
beforeEach(() => {
  win = loadScripts([
    'assets/data/grammatik.js',
    'assets/data/grammatik_extra.js',
    'assets/data/grammatik_furigana.js',
    'assets/data/grammatik_plus.js',
    'assets/srs.js',
    'assets/exercises.js',
    'assets/app.js',
  ], { html: '<!DOCTYPE html><html><body data-page="grammatik"><div id="filters"></div><input id="search-input"><div id="content"></div></body></html>' });
  win.SRS._useStorage(fakeStorage());
});

describe('Grammatik-Seite', () => {
  it('rendert Karten + „Mehr erklären"; genau EIN „Üben"-Knopf pro Karte (kein alter Plus-Knopf)', () => {
    expect(win.document.querySelectorAll('.gp.item').length).toBeGreaterThan(20);
    expect(win.document.querySelectorAll('.gp-plus').length).toBeGreaterThan(0);
    // der frühere zweite Knopf im Plus-Block ist weg
    expect(win.document.querySelectorAll('.gp-plus .gp-learn').length).toBe(0);
    // keine Karte hat mehr als einen üben-Knopf; es gibt mindestens einen „Üben"-Knopf
    [...win.document.querySelectorAll('.gp.item')].forEach((c) => {
      expect(c.querySelectorAll('.gp-learn').length).toBeLessThanOrEqual(1);
    });
    expect(win.document.querySelectorAll('.gp-ueben').length).toBeGreaterThan(0);
  });

  it('„Üben" öffnet die kombinierte Session (Overlay) mit Aufgabe oder Satz', () => {
    const btn = win.document.querySelector('.gp-ueben');
    expect(btn).toBeTruthy();
    btn.dispatchEvent(new win.Event('click', { bubbles: true }));
    const ov = win.document.querySelector('.drill-overlay');
    expect(ov && ov.hidden === false).toBe(true);
    // Session läuft (Fortschritt gesetzt) und der sichtbare Block hat Inhalt — egal welcher Aufgabentyp.
    expect(ov.querySelector('.drill-prog').textContent).toContain('Aufgabe');
    const exHost = ov.querySelector('.drill-ex');
    const trBox = ov.querySelector('.drill-tr');
    const exShown = !!(exHost && !exHost.classList.contains('hidden') && exHost.children.length > 0);
    const promptEl = ov.querySelector('.drill-prompt');
    const trShown = !!(trBox && !trBox.classList.contains('hidden') && promptEl && promptEl.textContent.length > 0);
    expect(exShown || trShown).toBe(true);
  });
});
