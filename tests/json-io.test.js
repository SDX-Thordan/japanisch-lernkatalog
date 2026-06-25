// JSON-Sicherung: Export/Import/Merge des Fortschritts.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="profil"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

describe('exportJSON / importJSON', () => {
  it('Round-Trip stellt den Store wieder her', () => {
    SRS.grade('k:学', 1, '2026-06-23');
    const text = SRS.exportJSON();
    expect(typeof text).toBe('string');
    SRS.reset();
    expect(SRS.get('k:学')).toBeFalsy();
    const res = SRS.importJSON(text);
    expect(res.ok).toBe(true);
    expect(SRS.get('k:学').reps).toBe(1);
  });

  it('lehnt kaputte / falsch versionierte Daten ab', () => {
    expect(SRS.importJSON('kein json').ok).toBe(false);
    expect(SRS.importJSON(JSON.stringify({ v: 999, items: {} })).ok).toBe(false);
  });
});

describe('mergeStore() — Konfliktauflösung', () => {
  it('neuere reps/due gewinnen pro Item', () => {
    const a = { v: 1, items: { 'k:学': { reps: 1, due: '2026-06-24' } }, stats: { totalReviews: 1 } };
    const b = { v: 1, items: { 'k:学': { reps: 3, due: '2026-07-01' }, 'k:水': { reps: 1, due: '2026-06-25' } }, stats: { totalReviews: 4 } };
    const m = SRS.__test.mergeStore(a, b);
    expect(m.items['k:学'].reps).toBe(3); // höhere reps
    expect(m.items['k:水']).toBeTruthy(); // nur in b
  });

  it('Import mergt statt zu überschreiben', () => {
    SRS.grade('k:水', 1, '2026-06-23');
    const other = { v: 1, items: { 'k:学': { reps: 2, due: '2026-07-01', ease: 2.5, interval: 4 } }, daily: {}, stats: { streakDays: 0, totalReviews: 2 } };
    SRS.importJSON(JSON.stringify(other), { merge: true });
    expect(SRS.get('k:水')).toBeTruthy(); // vorhandenes bleibt
    expect(SRS.get('k:学')).toBeTruthy(); // importiertes kommt dazu
  });
});
