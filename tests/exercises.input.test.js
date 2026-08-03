// Tippen-Übung: zwei Betriebsarten. ex.accept (Vokabel) bleibt liberal, ex.antworten prüft EXAKT.
// Kern-Regression: im Verbformen-Trainer darf die Wörterbuchform NICHT als て-Form durchgehen.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, doc, E;
beforeEach(() => {
  win = loadScripts([
    'assets/data/vokabular.js', 'assets/data/kanji.js', 'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
  ], { html: '<!DOCTYPE html><html><body data-page="kanji"><div id="mount"></div></body></html>' });
  win.SRS._useStorage(fakeStorage());
  doc = win.document; E = win.Exercises;
});

const mount = () => doc.getElementById('mount');
function type(ex, value) {
  const m = mount(); m.innerHTML = '';
  E.renderExercise(ex, m, {});
  m.querySelector('.ex-input').value = value;
  m.querySelector('.ex-check').dispatchEvent(new win.Event('click', { bubbles: true }));
  return m.querySelector('.ex-feedback');
}

describe('gradeAnswer für Tippen', () => {
  it('ex.antworten wird exakt geprüft — Kana und Rōmaji zählen, die Wörterbuchform nicht', () => {
    const ex = { typ: 'input', antworten: ['かって', '買って', 'katte'] };
    expect(E.gradeAnswer(ex, 'かって')).toBe(true);
    expect(E.gradeAnswer(ex, '買って')).toBe(true);
    expect(E.gradeAnswer(ex, 'katte')).toBe(true);
    expect(E.gradeAnswer(ex, 'かう')).toBe(false);   // ← der eigentliche Punkt
    expect(E.gradeAnswer(ex, 'かいます')).toBe(false);
    expect(E.gradeAnswer(ex, '')).toBe(false);
  });

  it('der Vokabel-Zweig bleibt liberal (Wörterbuchform gilt weiterhin)', () => {
    const K = win.Katalog;
    const v = win.VOKABULAR.find((x) => /^V\./.test(x.pos) && K.conjugate(x.kana, K.verbGroup(x.pos)));
    const dict = K.conjugate(v.kana, K.verbGroup(v.pos)).dict;
    const ex = { typ: 'input', accept: v };
    expect(E.gradeAnswer(ex, v.kana)).toBe(true);
    expect(E.gradeAnswer(ex, dict)).toBe(true);
    expect(E.gradeAnswer(ex, 'zzz')).toBe(false);
  });
});

describe('renderInput', () => {
  it('zeigt bei ex.loesung die Musterlösung statt der Vokabelformen', () => {
    const fb = type({ typ: 'input', prompt: 'かいます', antworten: ['かって'], loesung: '買って（かって）' }, 'かう');
    expect(fb.classList.contains('no')).toBe(true);
    expect(fb.textContent).toContain('Lösung: 買って（かって）');
  });

  it('richtige Eingabe wird angenommen und wertet die srsId', () => {
    const fb = type({ typ: 'input', srsId: 'g:V て-Form', prompt: 'かいます', antworten: ['かって'] }, 'かって');
    expect(fb.classList.contains('ok')).toBe(true);
    expect(win.SRS.scoreOf('g:V て-Form')).toBeGreaterThan(0);
  });

  it('promptJa + furigana erzeugen Ruby; ex.placeholder wird übernommen', () => {
    const m = mount(); m.innerHTML = '';
    E.renderExercise({ typ: 'input', big: true, promptJa: true, prompt: '買います', furigana: 'かいます',
      antworten: ['かって'], placeholder: 'Kana oder Rōmaji …', q: 'Bilde die て-Form.' }, m, {});
    const p = m.querySelector('.ex-frage.ja');
    expect(p).toBeTruthy();
    expect(p.querySelector('ruby')).toBeTruthy();
    expect(m.querySelector('.ex-input').placeholder).toBe('Kana oder Rōmaji …');
    expect(m.querySelector('.ex-subprompt').textContent).toContain('て-Form');
  });

  it('ohne promptJa bleibt der Prompt reiner Text (Vokabel-Tippen unverändert)', () => {
    const m = mount(); m.innerHTML = '';
    const v = win.VOKABULAR[0];
    E.renderExercise({ typ: 'input', big: true, prompt: v.de, accept: v }, m, {});
    const p = m.querySelector('.ex-frage');
    expect(p.classList.contains('ja')).toBe(false);
    expect(p.querySelector('ruby')).toBe(null);
    expect(m.querySelector('.ex-input').placeholder).toBe('Rōmaji, Kana oder Kanji …');
  });
});
