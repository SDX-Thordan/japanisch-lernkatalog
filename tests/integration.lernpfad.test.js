// Integrationstest: Lernpfad-Seite — Karten rendern, Gating sichtbar, Test-Modal öffnet.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="lernpfad">
  <div class="lp-toolbar"><button id="lp-unlockall"></button></div>
  <div id="lp-root"></div>
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
  win.confirm = () => true; // unlockAll-Bestätigung in jsdom automatisch bejahen
});

function click(elm) { elm.dispatchEvent(new win.Event('click', { bubbles: true })); }
function cards() { return [...win.document.querySelectorAll('.lp-card')]; }

describe('Lernpfad-Seite', () => {
  it('rendert 25 Lektionskarten; L1 offen, L2 gesperrt', () => {
    // init() hat beim Laden bereits mit dem Default-Store gezeichnet (L1 frei, Rest gesperrt).
    const c = cards();
    expect(c.length).toBe(25);
    expect(c[0].classList.contains('lp-locked')).toBe(false);
    expect(c[1].classList.contains('lp-locked')).toBe(true);
    // L1 hat einen „Teil lernen"-Link.
    expect(c[0].querySelector('a.lp-learn')).toBeTruthy();
  });

  it('L1 zeigt eine Teil-Leiste; Teil 1 ist verlinkt, gesperrte Teile nicht', () => {
    const c = cards()[0];
    const learn = c.querySelector('a.lp-learn');
    expect(learn.textContent).toContain('Teil 1 lernen');
    expect(learn.getAttribute('href')).toContain('lesson=1&teil=1');
    const parts = [...c.querySelectorAll('.lp-part')];
    expect(parts.length).toBeGreaterThan(1);
    // Teil 1 (current/unlocked) ist ein Link, gesperrte Teile sind <span> ohne href.
    expect(c.querySelector('a.lp-part')).toBeTruthy();
    const locked = c.querySelector('.lp-part-lock');
    expect(locked).toBeTruthy();
    expect(locked.tagName.toLowerCase()).toBe('span');
  });

  it('nach markPartDone(1,1) ist Teil 2 freigeschaltet (verlinkt)', () => {
    win.SRS.markPartDone(1, 1);
    click(win.document.getElementById('lp-unlockall')); // neu zeichnen
    const c = cards()[0];
    const links = [...c.querySelectorAll('a.lp-part')];
    expect(links.length).toBeGreaterThanOrEqual(2); // Teil 1 + Teil 2 jetzt klickbar
  });

  it('„Alle freischalten" entsperrt sichtbar alle Lektionen', () => {
    click(win.document.getElementById('lp-unlockall'));
    const c = cards();
    expect(c[1].classList.contains('lp-locked')).toBe(false);
    expect(c[19].classList.contains('lp-locked')).toBe(false);
  });

  it('nach Kern-Mastery erscheint „Test starten" und öffnet das Test-Modal', () => {
    // L1-Kern (nur Vokabeln/Grammatik, keine Kanji) beherrschen (Score ≥ MASTER_AT).
    win.SRS.lessonCore(1).forEach((it) => { win.SRS.__test.setScore(it.id, 100); });
    // Redraw über unlockAll (zeichnet die Karten neu).
    click(win.document.getElementById('lp-unlockall'));
    const l1 = cards()[0];
    const testBtn = l1.querySelector('.lp-test-btn');
    expect(testBtn).toBeTruthy();
    click(testBtn);
    const overlay = win.document.querySelector('.lp-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.hidden).toBe(false);
    // Eine Frage ist gerendert.
    expect(win.document.querySelector('.lp-modal-body').children.length).toBeGreaterThan(0);
  });
});
