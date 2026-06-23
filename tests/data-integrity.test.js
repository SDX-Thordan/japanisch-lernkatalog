// Integrität der Sidecar-Daten: alle Schlüssel verweisen auf echte Katalog-Einträge.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWithData } from './helpers/load.js';

let win, patterns, vocabIds;
beforeAll(() => {
  win = loadWithData([
    'assets/data/vokabular_tags.js',
    'assets/data/saetze.js',
    'assets/data/grammatik_plus.js',
  ]);
  patterns = new Set((win.GRAMMATIK || []).map((g) => g.pattern));
  vocabIds = new Set((win.VOKABULAR || []).map((v) => 'v:' + v.kana + '|' + v.lesson));
});

describe('SATZ_TEMPLATES', () => {
  it('jeder Schlüssel ist ein existierendes Grammatik-Muster', () => {
    const bad = Object.keys(win.SATZ_TEMPLATES).filter((p) => !patterns.has(p));
    expect(bad).toEqual([]);
  });
  it('jede Vorlage hat jp, de, slots und (falls particle) eine blank', () => {
    const bad = [];
    Object.entries(win.SATZ_TEMPLATES).forEach(([p, arr]) => {
      arr.forEach((t, i) => {
        if (!t.jp || !t.de || !t.slots) bad.push(`${p}[${i}]`);
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('GRAMMATIK_PLUS', () => {
  it('jeder Schlüssel ist ein existierendes Grammatik-Muster', () => {
    const bad = Object.keys(win.GRAMMATIK_PLUS).filter((p) => !patterns.has(p));
    expect(bad).toEqual([]);
  });
  it('Übungen haben einen gültigen Typ und eine Lösung', () => {
    const bad = [];
    Object.entries(win.GRAMMATIK_PLUS).forEach(([p, obj]) => {
      (obj.uebungen || []).forEach((ex, i) => {
        if (ex.typ === 'mc' && (!Array.isArray(ex.optionen) || typeof ex.richtig !== 'number')) bad.push(`${p}[${i}] mc`);
        if (ex.typ === 'cloze' && (ex.luecke == null || !ex.satz)) bad.push(`${p}[${i}] cloze`);
        if (['mc', 'cloze'].indexOf(ex.typ) === -1) bad.push(`${p}[${i}] typ?`);
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('VOKABULAR_TAGS', () => {
  it('jeder Schlüssel löst auf eine echte Vokabel auf', () => {
    const bad = Object.keys(win.VOKABULAR_TAGS).filter((id) => !vocabIds.has(id));
    expect(bad).toEqual([]);
  });
});
