// buildQueue(): fällige zuerst, Limits, Verschränkung, Preview-Filter.
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

describe('buildQueue()', () => {
  it('liefert neue Items (ohne Zustand) bis newLimit, reason="new"', () => {
    const q = SRS.buildQueue({ sources: ['kanji'], newLimit: 5, reviewLimit: 0, today: '2026-06-23' });
    expect(q.length).toBe(5);
    expect(q.every((x) => x.reason === 'new')).toBe(true);
    expect(q.every((x) => x.type === 'kanji' && x.data && x.id)).toBe(true);
  });

  it('respektiert reviewLimit und nimmt fällige zuerst', () => {
    // Drei Kanji fällig machen (in der Vergangenheit gelernt)
    const ks = (win.KANJI || []).slice(0, 3).map((k) => 'k:' + k.k);
    ks.forEach((id) => SRS.grade(id, 1, '2026-06-01')); // längst fällig
    const q = SRS.buildQueue({ sources: ['kanji'], newLimit: 2, reviewLimit: 2, today: '2026-06-23' });
    const dueItems = q.filter((x) => x.reason === 'due');
    expect(dueItems.length).toBe(2);
    expect(q.filter((x) => x.reason === 'new').length).toBe(2);
  });

  it('Preview (Lektion > 20) standardmäßig ausgeschlossen, mit includePreview enthalten', () => {
    const without = SRS.buildQueue({ sources: ['vocab'], newLimit: 9999, reviewLimit: 0, today: '2026-06-23' });
    const withPrev = SRS.buildQueue({ sources: ['vocab'], newLimit: 9999, reviewLimit: 0, today: '2026-06-23', includePreview: true });
    const lessons = (arr) => arr.map((x) => x.data.lesson);
    expect(Math.max(...lessons(without))).toBeLessThanOrEqual(20);
    expect(Math.max(...lessons(withPrev))).toBeGreaterThan(20);
  });

  it('verschränkt fällige und neue Items (nicht alle due am Stück)', () => {
    const ks = (win.KANJI || []).slice(0, 4).map((k) => 'k:' + k.k);
    ks.forEach((id) => SRS.grade(id, 1, '2026-06-01'));
    const q = SRS.buildQueue({ sources: ['kanji'], newLimit: 4, reviewLimit: 4, today: '2026-06-23' });
    const reasons = q.map((x) => x.reason);
    // Es darf nicht erst alle 'due' und dann alle 'new' sein (Verschränkung).
    const firstNew = reasons.indexOf('new');
    const lastDue = reasons.lastIndexOf('due');
    expect(firstNew).toBeLessThan(lastDue);
  });
});
