// Unit-Test: Exercises.acceptsVocabInput akzeptiert Romaji, Kana/Furigana ODER Kanji als richtig.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

let win;
beforeEach(() => {
  // app.js liefert window.Katalog (norm/kanaToRomaji), das exercises.js für den Abgleich nutzt.
  win = loadScripts(['assets/data/vokabular.js', 'assets/srs.js', 'assets/exercises.js', 'assets/app.js']);
});
const A = (input, v) => win.Exercises.acceptsVocabInput(input, v);

describe('acceptsVocabInput (Mehrform-Eingabe)', () => {
  it('akzeptiert Romaji, Kana und Kanji für dasselbe Wort', () => {
    const v = { kanji: '私', kana: 'わたし', romaji: 'watashi', de: 'ich', lesson: 1 };
    expect(A('watashi', v)).toBe(true);   // Romaji
    expect(A('わたし', v)).toBe(true);     // Kana / Furigana
    expect(A('私', v)).toBe(true);         // Kanji
    expect(A('  Watashi ', v)).toBe(true); // getrimmt + Groß/Klein egal
    expect(A('anata', v)).toBe(false);     // falsch
    expect(A('', v)).toBe(false);          // leer
  });

  it('Wort ohne Kanji: Kana/Romaji zählen, leeres Kanji-Feld wird ignoriert', () => {
    const v = { kanji: '', kana: 'あなた', romaji: 'anata', de: 'du, Sie', lesson: 1 };
    expect(A('anata', v)).toBe(true);
    expect(A('あなた', v)).toBe(true);
    expect(A('watashi', v)).toBe(false);
  });
});
