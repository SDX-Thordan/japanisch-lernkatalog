// Persistentes Aktivitäts-Log: Tagesverlauf für Profil-Charts (Punkte/Tag, Kalender).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, _dump: () => ({ ...d }) };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

describe('Aktivitäts-Log', () => {
  it('grade akkumuliert Punkte und Bewertungen je Tag', () => {
    SRS.grade('v:a|1', 1, '2026-06-10'); // +20, 1 review
    SRS.grade('v:b|1', 1, '2026-06-10'); // +20, 1 review
    SRS.grade('v:c|1', 0, '2026-06-10'); // Strafe, kein gain, 1 review
    const h = SRS.dailyHistory('2026-06-10', 1);
    expect(h).toHaveLength(1);
    expect(h[0].date).toBe('2026-06-10');
    expect(h[0].gain).toBe(40);
    expect(h[0].reviews).toBe(3);
    expect(h[0].active).toBe(true);
  });

  it('dailyHistory liefert N Tage chronologisch, fehlende mit Nullen', () => {
    SRS.grade('v:a|1', 1, '2026-06-08');
    SRS.grade('v:a|1', 1, '2026-06-10');
    const h = SRS.dailyHistory('2026-06-10', 5); // 06.-10.
    expect(h.map((d) => d.date)).toEqual(['2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10']);
    expect(h[0]).toMatchObject({ gain: 0, reviews: 0, active: false });
    expect(h[2]).toMatchObject({ gain: 20, reviews: 1, active: true });
    expect(h[4]).toMatchObject({ gain: 20, reviews: 1, active: true });
  });

  it('übersteht den Tageswechsel (anders als store.daily)', () => {
    SRS.grade('v:a|1', 1, '2026-06-10'); // schreibt activity[2026-06-10]
    // Eine Bewertung an einem späteren Tag leert store.daily, NICHT aber das Aktivitäts-Log.
    SRS.grade('v:a|1', 1, '2026-06-12');
    const h = SRS.dailyHistory('2026-06-12', 3);
    expect(h[0]).toMatchObject({ date: '2026-06-10', gain: 20, active: true });
    expect(h[2]).toMatchObject({ date: '2026-06-12', gain: 20, active: true });
    // store.daily hält nur den aktuellen Tag → Tagesgewinn am 10. ist dort weg, im Log aber erhalten.
    expect(SRS.dailyGain('2026-06-12')).toBe(20);
  });

  it('Export/Import (merge) erhält das Aktivitäts-Log; je Tag das Maximum', () => {
    SRS.grade('v:a|1', 1, '2026-06-10'); // gain 20 am 10.
    const dump = SRS.exportJSON();
    // frischer Store, anderer Tag, dann mergen
    SRS._useStorage(fakeStorage());
    SRS.grade('v:a|1', 1, '2026-06-11'); // gain 20 am 11.
    SRS.importJSON(dump, { merge: true });
    const h = SRS.dailyHistory('2026-06-11', 2);
    expect(h[0]).toMatchObject({ date: '2026-06-10', gain: 20 }); // aus dem Import
    expect(h[1]).toMatchObject({ date: '2026-06-11', gain: 20 }); // lokal
  });
});
