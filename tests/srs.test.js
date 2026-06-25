// SRS-Engine: Scheduler (SM-2-light), ID-Ableitung, Fälligkeit, Streak, Persistenz.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
    _dump: () => ({ ...d }),
  };
}

let win, SRS;
beforeEach(() => {
  win = loadWithData(['assets/app.js', 'assets/srs.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

describe('srsId() — stabile IDs aus vorhandenen Feldern', () => {
  it('leitet Kanji/Vokabel/Grammatik-IDs ab', () => {
    expect(SRS.srsId('kanji', { k: '学' })).toBe('k:学');
    expect(SRS.srsId('vocab', { kana: 'わたし', lesson: 1 })).toBe('v:わたし|1');
    expect(SRS.srsId('grammar', { pattern: 'N1 は N2 です' })).toBe('g:N1 は N2 です');
  });
});

describe('sm2() — SM-2-light Scheduler (rein)', () => {
  const T = '2026-06-23';
  it('neues Item, grade „Gewusst" → Intervall 1 Tag', () => {
    const s = SRS.__test.sm2({}, 1, T);
    expect(s.reps).toBe(1);
    expect(s.interval).toBe(1);
    expect(s.due).toBe('2026-06-24');
  });
  it('zweimal „Gewusst" → Intervall 3 Tage', () => {
    let s = SRS.__test.sm2({}, 1, T);
    s = SRS.__test.sm2(s, 1, s.due);
    expect(s.reps).toBe(2);
    expect(s.interval).toBe(3);
  });
  it('dritte Wiederholung wächst per ease (≈ interval*ease)', () => {
    let s = SRS.__test.sm2({}, 1, T);
    s = SRS.__test.sm2(s, 1, s.due);
    const prevInterval = s.interval;
    s = SRS.__test.sm2(s, 1, s.due);
    expect(s.interval).toBeGreaterThan(prevInterval);
  });
  it('„Nochmal" setzt zurück: reps 0, fällig heute, lapses +1, ease sinkt', () => {
    let s = SRS.__test.sm2({}, 1, T);
    s = SRS.__test.sm2(s, 1, s.due);
    const easeBefore = s.ease;
    s = SRS.__test.sm2(s, 0, s.due);
    expect(s.reps).toBe(0);
    expect(s.interval).toBe(0);
    expect(s.due).toBe(s.last);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(easeBefore);
  });
  it('ease fällt nicht unter 1.3', () => {
    let s = {};
    for (let i = 0; i < 12; i++) s = SRS.__test.sm2(s, 0, T);
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });
  it('„Leicht" hebt ease an', () => {
    const good = SRS.__test.sm2({}, 1, T);
    const easy = SRS.__test.sm2({}, 2, T);
    expect(easy.ease).toBeGreaterThan(good.ease);
  });
});

describe('grade() + Fälligkeit + Persistenz', () => {
  it('grade() legt Item an, persistiert und macht es fällig in der Zukunft', () => {
    SRS.grade('k:学', 1, '2026-06-23');
    const it = SRS.get('k:学');
    expect(it).toBeTruthy();
    expect(it.due).toBe('2026-06-24');
    expect(SRS.isDue('k:学', '2026-06-23')).toBe(false);
    expect(SRS.isDue('k:学', '2026-06-24')).toBe(true);
  });
  it('Persistenz übersteht einen Neu-Load aus demselben Storage', () => {
    const store = fakeStorage();
    SRS._useStorage(store);
    SRS.grade('k:水', 1, '2026-06-23');
    // Frische Engine-Instanz auf identischem Storage
    const win2 = loadWithData(['assets/app.js', 'assets/srs.js'], {
      html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
    });
    win2.SRS._useStorage(store);
    expect(win2.SRS.get('k:水').reps).toBe(1);
  });
  it('dueIds() listet nur fällige IDs', () => {
    SRS.grade('k:学', 1, '2026-06-20'); // fällig 06-21
    SRS.grade('k:水', 1, '2026-06-23'); // fällig 06-24
    const due = SRS.dueIds('2026-06-23');
    expect(due).toContain('k:学');
    expect(due).not.toContain('k:水');
  });
});

describe('Streak-Logik (global)', () => {
  it('zählt nur bei completeDaily() — nicht bei einzelnen grade()-Aufrufen', () => {
    // Einzelne Bewertungen (z. B. freies Üben) dürfen den Streak NICHT hochzählen.
    SRS.grade('k:a', 1, '2026-06-20');
    expect(SRS.stats('2026-06-20').streakDays).toBe(0);
  });
  it('gestern aktiv → +1, Lücke → reset, heute → idempotent', () => {
    SRS.completeDaily('2026-06-20');
    expect(SRS.stats('2026-06-20').streakDays).toBe(1);
    SRS.completeDaily('2026-06-21'); // direkt am Folgetag
    expect(SRS.stats('2026-06-21').streakDays).toBe(2);
    SRS.completeDaily('2026-06-21'); // selber Tag → idempotent
    expect(SRS.stats('2026-06-21').streakDays).toBe(2);
    SRS.completeDaily('2026-06-25'); // Lücke → reset auf 1
    expect(SRS.stats('2026-06-25').streakDays).toBe(1);
  });
});
