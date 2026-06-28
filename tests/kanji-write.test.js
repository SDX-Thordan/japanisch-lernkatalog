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

describe('KanjiWrite.strokeMatches() — strenge Strichbewertung', () => {
  // 一: ein waagerechter Strich von links (11,54) nach rechts (98,54), Mitte (54,54).
  const ichi = { start: { x: 11, y: 54 }, end: { x: 98, y: 54 }, mid: { x: 54, y: 54 } };

  it('akzeptiert einen korrekt nachgezogenen Strich', () => {
    const pts = [{ x: 12, y: 55 }, { x: 54, y: 54 }, { x: 97, y: 53 }];
    expect(KW.strokeMatches(pts, ichi)).toBe(true);
  });

  it('wertet einen deutlich zu tief gesetzten Strich als Fehler', () => {
    const pts = [{ x: 12, y: 80 }, { x: 54, y: 80 }, { x: 97, y: 80 }]; // 26 Einheiten zu tief
    expect(KW.strokeMatches(pts, ichi)).toBe(false);
  });

  it('lehnt die umgekehrte Strichrichtung ab', () => {
    const pts = [{ x: 97, y: 54 }, { x: 54, y: 54 }, { x: 12, y: 54 }]; // rechts → links
    expect(KW.strokeMatches(pts, ichi)).toBe(false);
  });

  it('erkennt einen in der Mitte stark verformten Strich (Endpunkte ok, Mitte daneben)', () => {
    const pts = [{ x: 12, y: 54 }, { x: 54, y: 92 }, { x: 97, y: 54 }]; // Mitte 38 Einheiten weg
    expect(KW.strokeMatches(pts, ichi)).toBe(false);
  });

  it('bleibt ohne Geometrie nachsichtig', () => {
    expect(KW.strokeMatches([{ x: 0, y: 0 }, { x: 5, y: 5 }], null)).toBe(true);
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
