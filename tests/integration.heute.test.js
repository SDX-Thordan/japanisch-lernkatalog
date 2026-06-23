// Integrationstest: Tagesaufgaben-Seite (Heute) — Session bauen, beantworten, Fortschritt zählt.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="heute">
  <span id="h-streak"></span><span id="h-due"></span><span id="h-learned"></span>
  <div id="h-setup"><input id="h-newlimit" value="3"><input id="h-revlimit" value="0"><button id="h-start"></button></div>
  <div id="h-stage" class="hidden"><span id="h-type"></span><span id="h-prog"></span><div id="h-body"></div></div>
  <div id="h-done" class="hidden"></div>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts([
    'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
    'assets/data/grammatik_extra.js', 'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js',
    'assets/data/vokabular_tags.js', 'assets/data/saetze.js',
    'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
  ], { html: BODY });
  win.SRS._useStorage(fakeStorage());
});

function click(elm) { elm.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Heute-Seite', () => {
  it('startet eine Session mit genau newLimit neuen Aufgaben', () => {
    click(win.document.getElementById('h-start'));
    expect(win.document.getElementById('h-stage').classList.contains('hidden')).toBe(false);
    expect(win.document.getElementById('h-prog').textContent).toContain('/ 3');
  });

  it('Karteikarte: Aufdecken → Gewusst schreibt eine Bewertung und rückt vor', () => {
    click(win.document.getElementById('h-start'));
    const before = win.SRS.stats().totalReviews;
    // Falls eine Karteikarte vorliegt (kanji/vocab) → reveal+good; bei Grammatik-Übung → erste Option + Weiter.
    const body = win.document.getElementById('h-body');
    const reveal = body.querySelector('.h-reveal');
    if (reveal) {
      click(reveal);
      click(body.querySelector('.h-good'));
    } else {
      click(body.querySelector('.ex-opt'));
      click(body.querySelector('.h-next'));
    }
    expect(win.SRS.stats().totalReviews).toBe(before + 1);
    expect(win.document.getElementById('h-prog').textContent).toContain('Aufgabe 2 / 3');
  });

  it('nach allen Aufgaben erscheint der Abschluss-Screen', () => {
    click(win.document.getElementById('h-start'));
    for (let n = 0; n < 3; n++) {
      const body = win.document.getElementById('h-body');
      const reveal = body.querySelector('.h-reveal');
      if (reveal) { click(reveal); click(body.querySelector('.h-good')); }
      else { click(body.querySelector('.ex-opt')); click(body.querySelector('.h-next')); }
    }
    expect(win.document.getElementById('h-done').classList.contains('hidden')).toBe(false);
    expect(win.document.getElementById('h-done').textContent).toContain('geschafft');
  });
});
