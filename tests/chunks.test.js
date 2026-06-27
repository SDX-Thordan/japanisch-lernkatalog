// Unit-Test: Teil-Lektionen (lessonChunks) — deterministische Scheiben + strikte Freischaltung.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win;
beforeEach(() => {
  win = loadScripts(['assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/grammatik.js', 'assets/srs.js']);
  win.SRS._useStorage(fakeStorage());
});

describe('lessonChunks (Teil-Lektionen)', () => {
  it('decken lessonCore lückenlos und in gleicher Reihenfolge ab', () => {
    for (const L of [1, 5, 12, 24]) {
      const core = win.SRS.lessonCore(L).map((c) => c.id);
      const flat = win.SRS.lessonChunks(L).flat().map((c) => c.id);
      expect(flat).toEqual(core);
    }
  });

  it('großes L → viele Teile, kleines L → wenige', () => {
    expect(win.SRS.lessonChunks(5).length).toBeGreaterThanOrEqual(6);
    expect(win.SRS.lessonChunks(24).length).toBeLessThanOrEqual(3);
    expect(win.SRS.lessonChunks(24).length).toBeGreaterThanOrEqual(2);
  });

  it('kein Mini-Restteil: jeder Teil hat genug Inhalt', () => {
    for (let L = 1; L <= 25; L++) {
      const parts = win.SRS.lessonChunks(L);
      if (parts.length > 1) expect(parts[parts.length - 1].length).toBeGreaterThanOrEqual(2);
    }
  });

  it('strikte Freischaltung über markPartDone / nextPart', () => {
    expect(win.SRS.nextPart(1)).toBe(1);
    expect(win.SRS.partsInfo(1)[1].unlocked).toBe(false); // Teil 2 anfangs gesperrt
    win.SRS.markPartDone(1, 1);
    expect(win.SRS.nextPart(1)).toBe(2);
    expect(win.SRS.partsInfo(1)[1].unlocked).toBe(true);  // jetzt frei
    expect(win.SRS.partsInfo(1)[2].unlocked).toBe(false); // Teil 3 noch gesperrt
  });

  it('nextPart wird auf die Teil-Anzahl geklammert', () => {
    const n = win.SRS.lessonChunks(24).length;
    win.SRS.markPartDone(24, n + 5);
    expect(win.SRS.nextPart(24)).toBe(n);
  });
});
