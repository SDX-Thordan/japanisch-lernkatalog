// Satz-Template-Engine: Slots korrekt füllen, Übungen mit korrekter Lösung erzeugen,
// strukturelle Validität der ausgelieferten Vorlagen.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWithData } from './helpers/load.js';

let win, Ex, pickFirst;
beforeAll(() => {
  win = loadWithData([
    'assets/app.js',
    'assets/data/vokabular_tags.js',
    'assets/data/saetze.js',
    'assets/exercises.js',
  ]);
  Ex = win.Exercises;
  pickFirst = (arr) => arr[0];
});

describe('Tag-Index', () => {
  it('baut tag → Vokabel-Liste aus VOKABULAR_TAGS', () => {
    const idx = Ex.buildTagIndex();
    expect(idx.person && idx.person.length).toBeGreaterThan(0);
    expect(idx.person[0]).toHaveProperty('de');
    expect(idx.person[0]).toHaveProperty('kana');
  });
});

describe('fillTemplate()', () => {
  it('füllt Slots deterministisch und baut jp + de', () => {
    const tpl = win.SATZ_TEMPLATES['N を V'][0];
    const f = Ex.fillTemplate(tpl, { pick: pickFirst });
    expect(f.jp).toContain(f.chosen.subj.jp);
    expect(f.jp).toContain(f.chosen.obj.jp);
    expect(f.jp).toContain('を');
    expect(f.de.length).toBeGreaterThan(0);
    // verb ist fixiert
    expect(f.jp).toContain(tpl.slots.verb.fixed);
  });

  it('nutzt nur Vokabeln mit dem geforderten Tag', () => {
    const idx = Ex.buildTagIndex();
    const tpl = win.SATZ_TEMPLATES['N を V'][0];
    const f = Ex.fillTemplate(tpl, { pick: pickFirst });
    const objKanaList = idx[tpl.slots.obj.tag].map((v) => v.kana);
    expect(objKanaList).toContain(f.chosen.obj.kana);
  });
});

describe('Übungstypen aus Vorlage', () => {
  it('Partikel-MC: korrekte Option ist die geblankte Partikel', () => {
    const tpl = win.SATZ_TEMPLATES['N を V'][0];
    const f = Ex.fillTemplate(tpl, { pick: pickFirst });
    const ex = Ex.particleExercise(f);
    expect(ex.typ).toBe('mc');
    expect(ex.optionen[ex.richtig]).toBe('を');
    expect(ex.frage).toContain('＿');
    expect(ex.srsId).toBe('g:N を V');
  });

  it('Order: Lösung in Reihenfolge ergibt wieder den Satz', () => {
    const tpl = win.SATZ_TEMPLATES['N を V'][0];
    const f = Ex.fillTemplate(tpl, { pick: pickFirst });
    const ex = Ex.orderExercise(f);
    expect(ex.typ).toBe('order');
    expect(ex.solution.join('')).toBe(f.jp.replace(/[。\s]/g, ''));
    // Chunks sind dieselben wie die Lösung (nur gemischt)
    expect([...ex.chunks].sort()).toEqual([...ex.solution].sort());
  });
});

describe('gradeAnswer()', () => {
  it('bewertet mc / cloze / order', () => {
    expect(Ex.gradeAnswer({ typ: 'mc', richtig: 1 }, 1)).toBe(true);
    expect(Ex.gradeAnswer({ typ: 'mc', richtig: 1 }, 0)).toBe(false);
    expect(Ex.gradeAnswer({ typ: 'cloze', luecke: 'は' }, 'は')).toBe(true);
    expect(Ex.gradeAnswer({ typ: 'cloze', luecke: 'は' }, 'を')).toBe(false);
    expect(Ex.gradeAnswer({ typ: 'order', solution: ['a', 'b', 'c'] }, ['a', 'b', 'c'])).toBe(true);
    expect(Ex.gradeAnswer({ typ: 'order', solution: ['a', 'b', 'c'] }, ['a', 'c', 'b'])).toBe(false);
  });
});

describe('Strukturelle Validität aller Vorlagen', () => {
  it('jeder Slot-Tag hat mindestens einen Füller, jede blank-Partikel kommt im Satz vor', () => {
    const idx = Ex.buildTagIndex();
    const problems = [];
    Object.keys(win.SATZ_TEMPLATES).forEach((pat) => {
      win.SATZ_TEMPLATES[pat].forEach((tpl, i) => {
        Object.keys(tpl.slots).forEach((name) => {
          const def = tpl.slots[name];
          if (def.tag && !(idx[def.tag] && idx[def.tag].length)) problems.push(`${pat}[${i}] Tag ohne Füller: ${def.tag}`);
          if (!def.tag && !def.fixed) problems.push(`${pat}[${i}] Slot ${name} ohne tag/fixed`);
        });
        // jeder {name} im jp muss in slots definiert sein
        (tpl.jp.match(/\{(\w+)\}/g) || []).forEach((m) => {
          const n = m.slice(1, -1);
          if (!tpl.slots[n]) problems.push(`${pat}[${i}] {${n}} ohne Slot-Definition`);
        });
        if (tpl.blank && tpl.jp.indexOf('{') === -1 && tpl.jp.indexOf(tpl.blank) === -1) {
          problems.push(`${pat}[${i}] blank "${tpl.blank}" nicht im Satz`);
        }
      });
    });
    expect(problems).toEqual([]);
  });
});
