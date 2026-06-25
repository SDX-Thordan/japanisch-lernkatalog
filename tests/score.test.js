// Lernpunktzahl 0–100: Gewinn/Strafe, Pro-Wort-/Tagescap, Strafe-1×-pro-Tag + Freeze, Zerfall, Migration.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

describe('Lernpunktzahl', () => {
  it('richtig +20, gedeckelt auf 100', () => {
    SRS.grade('v:a|1', 1, '2026-06-10');
    expect(SRS.get('v:a|1').score).toBe(20);
    // über mehrere Tage (Pro-Wort-Cap 40/Tag) bis 100
    ['2026-06-10', '2026-06-11', '2026-06-11', '2026-06-12', '2026-06-12'].forEach((d) => SRS.grade('v:a|1', 1, d));
    expect(SRS.get('v:a|1').score).toBe(100);
  });

  it('Strafe nur einmal pro Tag; danach für den Tag eingefroren (kein Gain)', () => {
    SRS.grade('v:b|1', 1, '2026-06-10'); // 20
    SRS.grade('v:b|1', 0, '2026-06-10'); // −15 → 5
    expect(SRS.get('v:b|1').score).toBe(5);
    SRS.grade('v:b|1', 0, '2026-06-10'); // zweiter Fehler → keine weitere Strafe
    expect(SRS.get('v:b|1').score).toBe(5);
    SRS.grade('v:b|1', 1, '2026-06-10'); // richtig nach Fehler → kein Gain (eingefroren)
    expect(SRS.get('v:b|1').score).toBe(5);
    // am Folgetag wieder steigerbar
    SRS.grade('v:b|1', 1, '2026-06-11');
    expect(SRS.get('v:b|1').score).toBe(25);
  });

  it('Pro-Wort-Cap: ein Wort steigt am selben Tag nur bis 40', () => {
    SRS.grade('v:c|1', 1, '2026-06-10');
    SRS.grade('v:c|1', 1, '2026-06-10');
    SRS.grade('v:c|1', 1, '2026-06-10'); // dritter Gewinn am selben Tag wird gedeckelt
    expect(SRS.get('v:c|1').score).toBe(40);
  });

  it('globaler Tagescap: insgesamt max. 400 Punkte/Tag', () => {
    // 10 Wörter × 40 = 400 (Pro-Wort-Cap) → globaler Cap erreicht
    for (let i = 0; i < 10; i++) { SRS.grade('v:g' + i + '|1', 1, '2026-06-10'); SRS.grade('v:g' + i + '|1', 1, '2026-06-10'); }
    SRS.grade('v:extra|1', 1, '2026-06-10'); // global gedeckelt → kein Gain
    expect(SRS.get('v:extra|1').score).toBe(0);
    expect(SRS.stats('2026-06-10').dailyGain).toBe(400);
  });

  it('Zerfall: nach der Schonfrist sinkt der effektive Lernstand sanft', () => {
    SRS.grade('v:d|1', 1, '2026-06-01'); SRS.grade('v:d|1', 1, '2026-06-01'); // 40 am 01.
    expect(SRS.effectiveScore('v:d|1', '2026-06-01')).toBe(40);
    expect(SRS.effectiveScore('v:d|1', '2026-06-04')).toBe(40); // Schonfrist 3 Tage
    // 9 Tage Pause: Zerfall 2·(9−3)=12 → 28
    expect(SRS.effectiveScore('v:d|1', '2026-06-10')).toBe(28);
  });

  it('Migration: Alt-Item mit reps (ohne score) → abgeleiteter Lernstand', () => {
    SRS.importJSON(JSON.stringify({
      v: 1, items: { 'k:学': { reps: 2, last: '2026-06-20' } }, lessons: {}, lists: {}, daily: {}, stats: {},
    }), { merge: false });
    expect(SRS.effectiveScore('k:学', '2026-06-20')).toBe(80); // reps 2 → 80
  });
});
