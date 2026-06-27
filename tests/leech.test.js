// Unit-Test: SRS.leeches erkennt häufig verfehlte, noch nicht beherrschte Items.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win;
beforeEach(() => {
  win = loadScripts(['assets/data/vokabular.js', 'assets/data/grammatik.js', 'assets/data/kanji.js', 'assets/srs.js']);
  win.SRS._useStorage(fakeStorage());
});

describe('SRS.leeches (schwierige Wörter)', () => {
  it('flaggt ein Item ab 4 Fehlversuchen, solange es nicht beherrscht ist', () => {
    const id = win.SRS.lessonCore(1).filter((c) => c.type === 'vocab')[0].id;
    for (let i = 0; i < 4; i++) win.SRS.grade(id, 0, '2026-06-10'); // 4 Fehlversuche → lapses=4
    const ls = win.SRS.leeches('2026-06-11');
    const hit = ls.find((x) => x.id === id);
    expect(hit).toBeTruthy();
    expect(hit.lapses).toBeGreaterThanOrEqual(4);
  });

  it('ein gemeistertes Item ist KEIN Leech (auch mit Fehlversuchen)', () => {
    const id = win.SRS.lessonCore(1).filter((c) => c.type === 'vocab')[0].id;
    for (let i = 0; i < 5; i++) win.SRS.grade(id, 0, '2026-06-10');
    win.SRS.__test.setScore(id, 100, '2026-06-11'); // jetzt beherrscht
    const ls = win.SRS.leeches('2026-06-11');
    expect(ls.some((x) => x.id === id)).toBe(false);
  });

  it('wenige Fehlversuche (< 4) zählen nicht als Leech', () => {
    const id = win.SRS.lessonCore(1).filter((c) => c.type === 'vocab')[1].id;
    win.SRS.grade(id, 0, '2026-06-10');
    win.SRS.grade(id, 0, '2026-06-10');
    expect(win.SRS.leeches('2026-06-11').some((x) => x.id === id)).toBe(false);
  });
});
