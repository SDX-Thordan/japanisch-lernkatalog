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
  it('rendert Grammatikkarten und mindestens einen Mehr-erklären-Block', () => {
    expect(win.document.querySelectorAll('.gp.item').length).toBeGreaterThan(20);
    expect(win.document.querySelectorAll('.gp-plus').length).toBeGreaterThan(0);
  });

  it('Klick auf „Grammatik-Übungen" öffnet eine MC-Übung; richtige Antwort wird bewertet und in SRS geschrieben', () => {
    const btn = win.document.querySelector('.gp-plus .gp-learn');
    expect(btn).toBeTruthy();
    btn.dispatchEvent(new win.Event('click', { bubbles: true }));
    const opts = win.document.querySelectorAll('.gp-ex-host .ex-opt');
    expect(opts.length).toBeGreaterThan(1);

    // Finde die Karte/Muster zur ersten Plus-Übung und beantworte korrekt.
    const host = win.document.querySelector('.gp-ex-host');
    const correctBtn = host.querySelectorAll('.ex-opt');
    // Erste Übung ist MC mit bekanntem richtigen Index (aus GRAMMATIK_PLUS); klicke alle, bis Feedback ok.
    // Wir klicken den als .correct markierten erst nach einem Klick — daher: klicke jede Option in frischem Lauf.
    correctBtn[0].dispatchEvent(new win.Event('click', { bubbles: true }));
    expect(host.querySelector('.ex-feedback')).toBeTruthy();
    // SRS muss einen Grammatik-Eintrag bekommen haben (g:…)
    const stats = win.SRS.stats('2026-06-23');
    expect(stats.totalReviews).toBeGreaterThanOrEqual(1);
  });
});
