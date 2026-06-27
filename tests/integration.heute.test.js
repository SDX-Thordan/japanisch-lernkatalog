// Integrationstest: Heute = reine Wiederholung — fällige (gestartete, zerfallene) Items abarbeiten.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="heute">
  <div class="page-intro"><span class="kicker"></span><h1>Heute</h1><p></p></div>
  <span id="h-streak"></span><span id="h-due"></span><span id="h-learned"></span>
  <div id="h-setup"><div class="src-pick"><input id="h-revlimit" value="30"></div><button id="h-start"></button></div>
  <div id="h-stage" class="hidden"><span id="h-type"></span><span id="h-prog"></span><div id="h-body"></div></div>
  <div id="h-done" class="hidden"></div>
</body></html>`;

const SCRIPTS = [
  'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
  'assets/data/grammatik_extra.js', 'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js',
  'assets/data/vokabular_tags.js', 'assets/data/saetze.js',
  'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
];

let win;
beforeEach(() => {
  win = loadScripts(SCRIPTS, { html: BODY });
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

describe('Heute im Lernpfad-Modus (?lesson=L)', () => {
  // init() ist an DOMContentLoaded gebunden (JSDOM feuert das asynchron) → kurz auf den Tick warten.
  function tick() { return new Promise((r) => setTimeout(r, 0)); }
  function lessonWin() {
    const w = loadScripts(SCRIPTS, { html: BODY, url: 'https://example.test/heute.html?lesson=1' });
    w.SRS._useStorage(fakeStorage());
    w.Math.random = () => 0;
    return w;
  }

  it('startet den geführten Kurs sofort — ohne erst die Wiederholungs-Maske zu zeigen', async () => {
    const w = lessonWin();
    await tick();
    // Kein Klick nötig: das Setup ist sofort verborgen, die Bühne sichtbar.
    expect(w.document.getElementById('h-setup').classList.contains('hidden')).toBe(true);
    expect(w.document.getElementById('h-stage').classList.contains('hidden')).toBe(false);
    // Erste Phase ist „Vokabeln" und der Fortschritt nennt die Lektion (nur neue Items).
    expect(w.document.getElementById('h-prog').textContent).toContain('Vokabeln');
    expect(w.document.getElementById('h-prog').textContent).toContain('Lektion 1');
    // Seite ist als Kurs umbeschriftet, nicht als Wiederholung.
    expect(w.document.querySelector('.page-intro h1').textContent).toContain('Lektion 1 lernen');
    // Die Wiederholungs-Steuerung (max. Aufgaben) ist im Kurs-Modus ausgeblendet.
    expect(w.document.querySelector('.src-pick').classList.contains('hidden')).toBe(true);
  });

  it('führt Vokabeln pädagogisch ein: erst vorstellen, dann erkennen (kein blindes Raten)', async () => {
    const w = lessonWin();
    await tick();
    const body = w.document.getElementById('h-body');
    // 1) VORSTELLEN: Lernkarte zeigt die Bedeutung offen + „Verstanden"-Button (keine verdeckte Karte).
    expect(body.querySelector('.tc-card')).toBeTruthy();
    const de = body.querySelector('.tc-de').textContent;
    expect(de.length).toBeGreaterThan(0);
    expect(body.querySelector('.tc-next')).toBeTruthy();
    expect(body.querySelector('.h-reveal')).toBeFalsy(); // KEINE blinde Karteikarte als erster Schritt
    click(body.querySelector('.tc-next'));
    // 2) ERKENNEN: Multiple-Choice mit 4 Optionen für dasselbe Wort.
    const opts = [...body.querySelectorAll('.rc-opt')];
    expect(opts.length).toBe(4);
    const correct = opts.find((o) => o.dataset.de === de);
    expect(correct).toBeTruthy();
    click(correct);
    expect(correct.classList.contains('rc-correct')).toBe(true);
    const next = body.querySelector('.h-next');
    expect(next).toBeTruthy();
    click(next);
    // Richtig erkannt → Lernstand des Worts ist gestartet.
    expect(w.SRS.stats().learned).toBeGreaterThanOrEqual(1);
  });
});
