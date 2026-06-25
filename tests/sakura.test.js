// Sakura-Blüte: diskrete Blütenblätter nach Schwellen (Streak: 1/3/7/14/30 → 1..5 Blätter).
import { describe, it, expect } from 'vitest';
import { loadScripts } from './helpers/load.js';

const win = loadScripts(['assets/app.js']);
const { sakuraPetals, sakuraSvg } = win.Katalog;

describe('sakuraPetals (Streak-Schwellen)', () => {
  it('bildet Streak-Tage auf 0..5 Blütenblätter ab', () => {
    const cases = [[0, 0], [1, 1], [2, 1], [3, 2], [6, 2], [7, 3], [13, 3], [14, 4], [29, 4], [30, 5], [100, 5]];
    cases.forEach(([days, petals]) => {
      expect(sakuraPetals(days)).toBe(petals);
    });
  });

  it('akzeptiert eigene Schwellen (z. B. Schreib-Häufigkeit 1..5)', () => {
    const th = [1, 2, 3, 4, 5];
    expect(sakuraPetals(0, th)).toBe(0);
    expect(sakuraPetals(3, th)).toBe(3);
    expect(sakuraPetals(9, th)).toBe(5);
  });

  it('kappt bei 5 und behandelt 0/negativ als Knospe', () => {
    expect(sakuraPetals(-4)).toBe(0);
    expect(sakuraPetals(9999)).toBe(5);
  });
});

describe('sakuraSvg', () => {
  it('rendert ein <svg> mit passender Stufenklasse', () => {
    expect(sakuraSvg(0)).toContain('sakura-0');
    expect(sakuraSvg(30)).toContain('sakura-5');
    expect(sakuraSvg(7)).toMatch(/^<svg/);
  });
});
