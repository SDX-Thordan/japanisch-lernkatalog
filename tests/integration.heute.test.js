// Integrationstest: Heute = reine Wiederholung — fällige (gestartete, zerfallene) Items abarbeiten.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="heute">
  <span id="h-streak"></span><span id="h-due"></span><span id="h-learned"></span>
  <div id="h-setup"><input id="h-revlimit" value="30"><button id="h-start"></button></div>
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
  win.Math.random = () => 0; // deterministisch
});

function click(elm) { elm.dispatchEvent(new win.Event('click', { bubbles: true })); }
// n L1-Vokabeln „angefangen" (Score 20) → unter MASTER_AT → fällig zur Wiederholung.
function makeDue(n) {
  const ids = win.SRS.lessonCore(1).filter((c) => c.type === 'vocab').slice(0, n).map((c) => c.id);
  ids.forEach((id) => win.SRS.grade(id, 1));
  return ids;
}

describe('Heute (Wiederholung)', () => {
  it('ohne fällige Items: sofort der „nichts fällig"-Abschluss', () => {
    click(win.document.getElementById('h-start'));
    expect(win.document.getElementById('h-done').classList.contains('hidden')).toBe(false);
    expect(win.document.getElementById('h-done').textContent).toContain('nichts fällig');
  });

  it('startet eine Wiederholungs-Session mit genau den fälligen Items', () => {
    makeDue(3);
    click(win.document.getElementById('h-start'));
    expect(win.document.getElementById('h-stage').classList.contains('hidden')).toBe(false);
    expect(win.document.getElementById('h-prog').textContent).toContain('/ 3');
  });

  it('Karteikarte: Aufdecken → Gewusst bewertet und rückt vor', () => {
    makeDue(3);
    click(win.document.getElementById('h-start'));
    const before = win.SRS.stats().totalReviews;
    const body = win.document.getElementById('h-body');
    click(body.querySelector('.h-reveal'));
    click(body.querySelector('.h-good'));
    expect(win.SRS.stats().totalReviews).toBe(before + 1);
    expect(win.document.getElementById('h-prog').textContent).toContain('Aufgabe 2 / 3');
  });

  it('nach allen fälligen Items erscheint der Abschluss-Screen', () => {
    makeDue(3);
    click(win.document.getElementById('h-start'));
    for (let n = 0; n < 3; n++) {
      const body = win.document.getElementById('h-body');
      click(body.querySelector('.h-reveal'));
      click(body.querySelector('.h-good'));
    }
    expect(win.document.getElementById('h-done').classList.contains('hidden')).toBe(false);
    expect(win.document.getElementById('h-done').textContent).toContain('geschafft');
  });
});
