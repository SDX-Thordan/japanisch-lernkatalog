// Inhalts-Integrität: validiert Struktur von GRAMMATIK_PLUS, SATZ_TEMPLATES, VOKABULAR_TAGS
// gegen die Renderer-Erwartungen (Exercises) und die Vokabel-/Grammatik-Daten.
import { describe, it, expect } from 'vitest';
import { loadScripts } from './helpers/load.js';

function win() {
  return loadScripts([
    'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js',
    'assets/data/grammatik_extra.js', 'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js',
    'assets/data/vokabular_tags.js', 'assets/data/saetze.js',
    'assets/srs.js', 'assets/exercises.js',
  ], { html: '<!DOCTYPE html><html><body></body></html>' });
}

const W = win();
const PATTERNS = new Set((W.GRAMMATIK || []).map((g) => g.pattern));
const VOCAB_IDS = new Set((W.VOKABULAR || []).map((v) => 'v:' + v.kana + '|' + v.lesson));
const TAG_INDEX = W.Exercises.buildTagIndex();

describe('GRAMMATIK_PLUS — Struktur', () => {
  const P = W.GRAMMATIK_PLUS || {};
  it('jeder Schlüssel ist ein existierendes Grammatikmuster', () => {
    Object.keys(P).forEach((pat) => expect(PATTERNS.has(pat), pat).toBe(true));
  });
  it('jede Übung ist wohlgeformt (mc/cloze/order)', () => {
    Object.entries(P).forEach(([pat, entry]) => {
      (entry.uebungen || []).forEach((u, i) => {
        const where = `${pat} #${i}`;
        expect(typeof u.typ, where).toBe('string');
        if (u.typ === 'mc') {
          expect(Array.isArray(u.optionen), where).toBe(true);
          expect(u.optionen.length, where).toBeGreaterThanOrEqual(2);
          expect(new Set(u.optionen).size, where + ' (Duplikate)').toBe(u.optionen.length);
          expect(Number.isInteger(u.richtig), where).toBe(true);
          expect(u.richtig, where).toBeGreaterThanOrEqual(0);
          expect(u.richtig, where).toBeLessThan(u.optionen.length);
          expect(String(u.frage || '').length, where).toBeGreaterThan(0);
        } else if (u.typ === 'cloze') {
          expect(String(u.satz || ''), where).toContain('＿');
          expect(String(u.luecke || '').length, where).toBeGreaterThan(0);
        } else if (u.typ === 'order') {
          expect(Array.isArray(u.chunks) && Array.isArray(u.solution), where).toBe(true);
          expect([...u.chunks].sort().join('|'), where).toBe([...u.solution].sort().join('|'));
        } else {
          throw new Error('Unbekannter Übungstyp in ' + where + ': ' + u.typ);
        }
      });
    });
  });
  it('jedes Grammatikmuster hat mindestens eine Übung (Abdeckung)', () => {
    (W.GRAMMATIK || []).forEach((g) => {
      const e = P[g.pattern];
      expect(e && Array.isArray(e.uebungen) && e.uebungen.length >= 1, 'ohne Übung: ' + g.pattern).toBe(true);
    });
  });
  it('kontrast-Einträge haben a/b/note', () => {
    Object.entries(P).forEach(([pat, entry]) => {
      (entry.kontrast || []).forEach((k, i) => {
        expect(k.a && k.b && k.note, `${pat} kontrast #${i}`).toBeTruthy();
      });
    });
  });
});

describe('SATZ_TEMPLATES — Struktur & Füllbarkeit', () => {
  const S = W.SATZ_TEMPLATES || {};
  it('jeder Schlüssel ist ein existierendes Grammatikmuster', () => {
    Object.keys(S).forEach((pat) => expect(PATTERNS.has(pat), pat).toBe(true));
  });
  it('Vorlagen sind wohlgeformt und füllbar', () => {
    Object.entries(S).forEach(([pat, tpls]) => {
      tpls.forEach((tpl, i) => {
        const where = `${pat} #${i}`;
        const tokens = tpl.jp.trim().split(/\s+/);
        // blank kommt als Token in jp vor
        if (tpl.blank) expect(tokens, where + ' blank').toContain(tpl.blank);
        // jeder {slot} in jp ist in slots definiert
        tokens.forEach((tok) => {
          const m = tok.match(/^\{(\w+)\}$/);
          if (m) expect(tpl.slots[m[1]], where + ' slot ' + m[1]).toBeTruthy();
        });
        // jeder {slot} in de ist definiert
        (tpl.de.match(/\{(\w+)\}/g) || []).forEach((s) => {
          const name = s.slice(1, -1);
          expect(tpl.slots[name], where + ' de-slot ' + name).toBeTruthy();
        });
        // jeder Tag-Slot hat ≥1 Füller
        Object.entries(tpl.slots).forEach(([name, def]) => {
          if (def.tag) expect((TAG_INDEX[def.tag] || []).length, where + ' tag ' + def.tag).toBeGreaterThan(0);
        });
        // fillTemplate erzeugt einen Satz ohne offene Platzhalter
        const f = W.Exercises.fillTemplate(tpl, {});
        expect(f.jp, where + ' jp').not.toContain('?');
        expect(f.jp, where + ' jp').not.toMatch(/\{|\}/);
        expect(f.de, where + ' de').not.toMatch(/\{|\}/);
      });
    });
  });
});

describe('VOKABULAR_TAGS — Auflösbarkeit', () => {
  it('jeder Tag-Schlüssel verweist auf eine reale Vokabel', () => {
    Object.keys(W.VOKABULAR_TAGS || {}).forEach((id) => {
      expect(VOCAB_IDS.has(id), id).toBe(true);
    });
  });
});

describe('Lektionstests sind befüllbar', () => {
  it('buildLessonTest liefert für L1–25 jeweils ≥ 8 Aufgaben', () => {
    W.SRS._useStorage(null);
    for (let L = 1; L <= 25; L++) {
      const n = W.Exercises.buildLessonTest(L, 10).length;
      expect(n, 'Lektion ' + L).toBeGreaterThanOrEqual(8);
    }
  });
});
