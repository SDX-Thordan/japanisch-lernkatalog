// Charakterisierungstests des bestehenden Verb-Konjugators.
// Sichert die vorhandene Logik ab, BEVOR app.js angefasst wird (window.Katalog-Export).
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWithData } from './helpers/load.js';

let K;

beforeAll(() => {
  // app.js mit data-page="kanji" laden, damit init() ohne #content harmlos durchläuft.
  const win = loadWithData(['assets/app.js'], {
    html: '<!DOCTYPE html><html><body data-page="kanji"></body></html>',
  });
  K = win.Katalog;
});

describe('window.Katalog wird von app.js exportiert', () => {
  it('stellt die Konjugator-Funktionen bereit', () => {
    expect(K).toBeTruthy();
    expect(typeof K.conjugate).toBe('function');
    expect(typeof K.allForms).toBe('function');
    expect(typeof K.verbGroup).toBe('function');
  });
});

describe('verbGroup() — Gruppenerkennung aus pos', () => {
  it('erkennt Gruppe I/II/III', () => {
    expect(K.verbGroup('V. I')).toBe(1);
    expect(K.verbGroup('V. II')).toBe(2);
    expect(K.verbGroup('V. III')).toBe(3);
    expect(K.verbGroup('N.')).toBe(0);
  });
});

describe('conjugate() — Grundformen aus der ます-Form', () => {
  it('Gruppe I: かいます → かう/かって/かった/かわない', () => {
    expect(K.conjugate('かいます', 1)).toEqual({
      dict: 'かう', te: 'かって', ta: 'かった', nai: 'かわない',
    });
  });
  it('Gruppe I: のみます → のむ/のんで/のんだ/のまない', () => {
    expect(K.conjugate('のみます', 1)).toEqual({
      dict: 'のむ', te: 'のんで', ta: 'のんだ', nai: 'のまない',
    });
  });
  it('Gruppe I Ausnahme 行きます → 行く/行って/行った', () => {
    const c = K.conjugate('行きます', 1);
    expect(c.dict).toBe('行く');
    expect(c.te).toBe('行って');
    expect(c.ta).toBe('行った');
  });
  it('Gruppe II: たべます → たべる/たべて/たべた/たべない', () => {
    expect(K.conjugate('たべます', 2)).toEqual({
      dict: 'たべる', te: 'たべて', ta: 'たべた', nai: 'たべない',
    });
  });
  it('Gruppe III: します → する/して/した/しない', () => {
    expect(K.conjugate('します', 3)).toEqual({
      dict: 'する', te: 'して', ta: 'した', nai: 'しない',
    });
  });
  it('Gruppe III: きます → くる/きて/きた/こない', () => {
    expect(K.conjugate('きます', 3)).toEqual({
      dict: 'くる', te: 'きて', ta: 'きた', nai: 'こない',
    });
  });
});

describe('allForms() — voller Formensatz', () => {
  it('liefert masu/masen/mashita/mashou/tai/nakatta', () => {
    const f = K.allForms('たべます', 2);
    expect(f.masu).toBe('たべます');
    expect(f.masen).toBe('たべません');
    expect(f.mashita).toBe('たべました');
    expect(f.mashou).toBe('たべましょう');
    expect(f.tai).toBe('たべたい');
    expect(f.nakatta).toBe('たべなかった');
  });
});
