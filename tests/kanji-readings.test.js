// Kanji-Lesungen zuordnen: zwei Spalten (音/訓) mit Mehrfachauswahl, exakte Mengen-Bewertung.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, Ex, SRS;
beforeEach(() => {
  win = loadWithData(['assets/srs.js', 'assets/exercises.js', 'assets/app.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"><div id="mount"></div></body></html>',
  });
  Ex = win.Exercises; SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

const kanjiWithBoth = (win) => win.KANJI.find((k) => (k.on || []).length && (k.kun || []).length);
const stripOku = (r) => String(r).replace(/-/g, '');

describe('kanjiReadingsEx — Aufbau', () => {
  it('baut je eine Spalte für On und Kun mit den Katalog-Lesungen als Lösung', () => {
    const k = kanjiWithBoth(win);
    const ex = Ex.kanjiReadingsEx(k);
    expect(ex.typ).toBe('readings');
    expect(ex.srsId).toBe('k:' + k.k);
    expect(ex.frage).toBe(k.k);
    expect(ex.gradeOpts).toEqual({ gainCeiling: 70, gainScale: 0.5 });
    expect(ex.columns.map((c) => c.kind)).toEqual(['on', 'kun']);
    ex.columns.forEach((c) => {
      const chosen = c.richtig.map((i) => c.optionen[i]).sort();
      expect(chosen).toEqual(k[c.kind].slice().sort());
      expect(new Set(c.optionen).size).toBe(c.optionen.length); // keine Dubletten
      expect(c.optionen.length).toBeGreaterThan(c.richtig.length); // es gibt Distraktoren
    });
  });

  it('Distraktoren stammen aus derselben Lesungsart anderer Kanji', () => {
    const k = kanjiWithBoth(win);
    const ex = Ex.kanjiReadingsEx(k);
    ex.columns.forEach((c) => {
      const pool = new Set(win.KANJI.filter((x) => x.k !== k.k).flatMap((x) => x[c.kind] || []));
      c.optionen.forEach((o, i) => {
        if (c.richtig.indexOf(i) !== -1) return;
        expect(pool.has(o)).toBe(true);
      });
    });
  });

  it('kein Distraktor fällt ohne Okurigana mit einer Lösung zusammen (み vs. み-る)', () => {
    win.KANJI.slice(0, 40).forEach((k) => {
      const ex = Ex.kanjiReadingsEx(k);
      ex.columns.forEach((c) => {
        const solutions = new Set(c.richtig.map((i) => stripOku(c.optionen[i])));
        c.optionen.forEach((o, i) => {
          if (c.richtig.indexOf(i) !== -1) return;
          expect(solutions.has(stripOku(o))).toBe(false);
        });
      });
    });
  });

  it('Kanji ohne Kun-Lesung bekommt nur die On-Spalte', () => {
    const k = win.KANJI.find((x) => !(x.kun || []).length);
    expect(k).toBeTruthy();
    const ex = Ex.kanjiReadingsEx(k);
    expect(ex.columns).toHaveLength(1);
    expect(ex.columns[0].kind).toBe('on');
  });

  it('steht in der Registry vor dem Schreiben (Schreiben bleibt der Meister-Pfad ab 70)', () => {
    const item = { id: 'k:' + win.KANJI[0].k, type: 'kanji', data: win.KANJI[0] };
    const fac = Ex.exercisesFor(item);
    expect(fac).toHaveLength(4);
    expect(fac[2]().typ).toBe('readings');
    expect(Ex.pickExercise(item, { score: 90 }).typ).toBe('write');
  });
});

describe('Bewertung — exakte Menge je Spalte', () => {
  let k, ex;
  beforeEach(() => { k = kanjiWithBoth(win); ex = Ex.kanjiReadingsEx(k); });
  const right = () => ex.columns.map((c) => c.richtig.slice());

  it('genau die richtigen Lesungen → richtig (Reihenfolge egal)', () => {
    expect(Ex.gradeAnswer(ex, right())).toBe(true);
    expect(Ex.gradeAnswer(ex, right().map((a) => a.slice().reverse()))).toBe(true);
  });

  it('eine fehlende Lesung → falsch', () => {
    // Kanji mit mehreren Lesungen in einer Spalte, damit „eine weglassen" überhaupt möglich ist.
    const multi = win.KANJI.find((x) => (x.on || []).length > 1 && (x.kun || []).length);
    const mex = Ex.kanjiReadingsEx(multi);
    const answer = mex.columns.map((c) => c.richtig.slice());
    answer[0] = answer[0].slice(1); // eine On-Lesung fehlt
    expect(Ex.gradeAnswer(mex, answer)).toBe(false);
  });

  it('eine zusätzliche (falsche) Auswahl → falsch; gar nichts gewählt → falsch', () => {
    const extra = right();
    const wrongIdx = ex.columns[0].optionen.findIndex((_, i) => ex.columns[0].richtig.indexOf(i) === -1);
    extra[0] = extra[0].concat([wrongIdx]);
    expect(Ex.gradeAnswer(ex, extra)).toBe(false);
    expect(Ex.gradeAnswer(ex, ex.columns.map(() => []))).toBe(false);
  });
});

describe('Darstellung und Benotung im DOM', () => {
  function render(ex) {
    const mount = win.document.getElementById('mount');
    mount.innerHTML = '';
    const seen = {};
    Ex.renderExercise(ex, mount, { onResult: (ok) => { seen.ok = ok; } });
    return { mount, seen };
  }
  const click = (el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));

  it('zeigt zwei Spalten; richtige Auswahl wird benotet und hebt den Lernstand', () => {
    const k = kanjiWithBoth(win);
    const ex = Ex.kanjiReadingsEx(k);
    const { mount, seen } = render(ex);
    expect(mount.querySelectorAll('.ex-rcol')).toHaveLength(2);
    expect(mount.querySelector('.ex-frage').textContent).toBe(k.k);
    // in jeder Spalte genau die richtigen Optionen anklicken
    const cols = [...mount.querySelectorAll('.ex-rcol')];
    cols.forEach((col, ci) => {
      const btns = [...col.querySelectorAll('.ex-opt')];
      ex.columns[ci].richtig.forEach((i) => click(btns[i]));
      expect(btns.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(ex.columns[ci].richtig.length);
    });
    click(mount.querySelector('.ex-check'));
    expect(seen.ok).toBe(true);
    expect(mount.querySelector('.ex-feedback.ok')).toBeTruthy();
    expect([...mount.querySelectorAll('.ex-opt')].every((b) => b.disabled)).toBe(true);
    expect(SRS.get('k:' + k.k).score).toBeGreaterThan(0);
  });

  it('fehlende Lesung → falsch, verpasste Lösung wird markiert', () => {
    const k = win.KANJI.find((x) => (x.kun || []).length > 1) || kanjiWithBoth(win);
    const ex = Ex.kanjiReadingsEx(k);
    const { mount, seen } = render(ex);
    click(mount.querySelector('.ex-check')); // nichts ausgewählt
    expect(seen.ok).toBe(false);
    expect(mount.querySelector('.ex-feedback.no')).toBeTruthy();
    expect(mount.querySelectorAll('.ex-opt.missed').length).toBeGreaterThan(0);
  });

  it('nach dem Prüfen lässt sich nichts mehr umschalten', () => {
    const ex = Ex.kanjiReadingsEx(kanjiWithBoth(win));
    const { mount } = render(ex);
    click(mount.querySelector('.ex-check'));
    const b = mount.querySelector('.ex-opt');
    const before = b.className;
    click(b);
    expect(b.className).toBe(before);
    expect(mount.querySelector('.ex-check').disabled).toBe(true);
  });
});
