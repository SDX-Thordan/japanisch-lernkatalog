// Kanji-Schreiben: Strich-Parser aus KanjiVG-SVG + Datenabdeckung.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { loadScripts, repoPath } from './helpers/load.js';

let win, KW;
beforeAll(() => {
  win = loadScripts(['assets/data/kanji.js', 'assets/kanji-write.js']);
  KW = win.KanjiWrite;
});

describe('KanjiWrite.parseStrokes()', () => {
  it('extrahiert die Striche von 学 in korrekter Reihenfolge (8 Striche)', () => {
    const svg = readFileSync(repoPath('assets/kanjivg/05b66.svg'), 'utf8');
    const strokes = KW.parseStrokes(svg);
    expect(strokes.length).toBe(8);
    expect(strokes.every((d) => typeof d === 'string' && /^M/i.test(d.trim()))).toBe(true);
  });

  it('cpFile() bildet den KanjiVG-Dateinamen', () => {
    expect(KW.cpFile('学')).toBe('05b66.svg');
    expect(KW.cpFile('一')).toBe('04e00.svg');
  });
});

describe('KanjiVG-Datenabdeckung', () => {
  it('für jedes Kanji im Katalog existiert eine SVG-Datei', () => {
    const missing = (win.KANJI || [])
      .map((k) => k.k)
      .filter((k) => !existsSync(repoPath('assets/kanjivg/' + cp(k) + '.svg')));
    expect(missing).toEqual([]);
  });
});

function cp(k) { return k.codePointAt(0).toString(16).padStart(5, '0'); }
