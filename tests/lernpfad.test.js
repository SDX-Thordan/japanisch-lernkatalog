// Lernpfad: Lektions-Freischaltung, Kern-Mastery (inkl. Kanji-Schreiben), Lektionstests.
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
  win = loadWithData(['assets/app.js', 'assets/srs.js', 'assets/exercises.js'], {
    html: '<!DOCTYPE html><html><body data-page="lernpfad"></body></html>',
  });
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

// Alle Kern-Items einer Lektion auf „beherrscht" bringen (Score ≥ MASTER_AT; Kanji inkl. Schreiben).
// Score wird deterministisch gesetzt (umgeht Pro-Wort-/Tagescap), Datum = heute (kein Zerfall).
function masterLesson(L) {
  SRS.lessonCore(L).forEach((c) => {
    SRS.__test.setScore(c.id, 100);
    if (c.type === 'kanji') SRS.gradeWrite(c.id, true);
  });
}

describe('Kanji-Stufe → Lektion-Mapping', () => {
  it('mappt alle sechs Stufen auf eine Lektion', () => {
    ['A1.2', 'A1.3', 'A1.4', 'A1.5', 'A1.6', 'A1.7'].forEach((lv) => {
      expect(typeof SRS.kanjiLessonOf(lv)).toBe('number');
    });
    expect(SRS.kanjiLessonOf('A1.2')).toBe(6);
    expect(SRS.kanjiLessonOf('A1.7')).toBe(20);
  });
  it('lessonCore enthält Vokabeln, Grammatik und die zugeordneten Kanji', () => {
    const core = SRS.lessonCore(6);
    const types = core.reduce((a, c) => ((a[c.type] = (a[c.type] || 0) + 1), a), {});
    expect(types.vocab).toBeGreaterThan(0);
    expect(types.grammar).toBeGreaterThan(0);
    expect(types.kanji).toBeGreaterThan(0); // A1.2-Kanji hängen an L6
  });
});

describe('Default-Gating', () => {
  it('nur Lektion 1 ist freigeschaltet', () => {
    expect(SRS.lessonState(1).unlocked).toBe(true);
    expect(SRS.lessonState(2).unlocked).toBe(false);
    expect(SRS.maxUnlockedLesson()).toBe(1);
  });
  it('buildQueue mit maxLesson liefert keine Items aus gesperrten Lektionen', () => {
    const q = SRS.buildQueue({ maxLesson: 1, newLimit: 100, reviewLimit: 100 });
    const lessons = [...new Set(q.map((x) => SRS.__test.itemLesson(x.type, x.data)))];
    expect(lessons).toEqual([1]);
  });
});

describe('Kanji-Schreib-Mastery', () => {
  it('Kanji ist erst nach korrektem Schreiben beherrscht', () => {
    const k = SRS.lessonCore(6).find((c) => c.type === 'kanji');
    SRS.__test.setScore(k.id, 100); // gut erkannt, aber noch nicht geschrieben
    expect(SRS.isMastered(k.id)).toBe(false);
    expect(SRS.needsWriting(k.id)).toBe(true);
    SRS.gradeWrite(k.id, true);
    expect(SRS.isMastered(k.id)).toBe(true);
    expect(SRS.needsWriting(k.id)).toBe(false);
  });
  it('Vokabeln/Grammatik brauchen kein Schreiben', () => {
    const v = SRS.lessonCore(1).find((c) => c.type === 'vocab');
    SRS.__test.setScore(v.id, 100);
    expect(SRS.isMastered(v.id)).toBe(true);
    expect(SRS.needsWriting(v.id)).toBe(false);
  });
});

describe('Freischalten: Kern beherrschen + Test bestehen', () => {
  it('Test erst nach voller Kern-Mastery wählbar; Bestehen schaltet die nächste Lektion frei', () => {
    expect(SRS.canTakeTest(1)).toBe(false);
    masterLesson(1);
    const cp = SRS.coreProgress(1);
    expect(cp.fraction).toBe(1);
    expect(SRS.lessonState(1).coreMastered).toBe(true);
    expect(SRS.canTakeTest(1)).toBe(true);

    // Durchgefallen: L2 bleibt gesperrt.
    let r = SRS.recordLessonTest(1, 0.7);
    expect(r.passed).toBe(false);
    expect(SRS.lessonState(2).unlocked).toBe(false);

    // Bestanden: L2 frei.
    r = SRS.recordLessonTest(1, 0.9);
    expect(r.passed).toBe(true);
    expect(SRS.lessonState(2).unlocked).toBe(true);
    expect(SRS.lessonState(1).testPassed).toBe(true);
    expect(SRS.maxUnlockedLesson()).toBe(2);
  });

  it('unlockAll öffnet alle Lektionen des Pfads', () => {
    SRS.unlockAll();
    expect(SRS.lessonState(25).unlocked).toBe(true);
    expect(SRS.maxUnlockedLesson()).toBe(25);
  });
});

describe('buildLessonTest', () => {
  it('liefert Aufgaben mit gültigen MC-Indizes', () => {
    const test = win.Exercises.buildLessonTest(6, 10);
    expect(test.length).toBeGreaterThan(0);
    expect(test.length).toBeLessThanOrEqual(10);
    test.filter((x) => x.typ === 'mc').forEach((x) => {
      expect(x.richtig).toBeGreaterThanOrEqual(0);
      expect(x.richtig).toBeLessThan(x.optionen.length);
    });
  });
});

describe('Export/Import erhält den Lektionsstatus', () => {
  it('round-trip behält testPassed & bestScore', () => {
    masterLesson(1);
    SRS.recordLessonTest(1, 0.9);
    const dump = SRS.exportJSON();

    // frischer Store, dann importieren (merge)
    SRS._useStorage(fakeStorage());
    expect(SRS.lessonState(1).testPassed).toBe(false);
    SRS.importJSON(dump, { merge: true });
    expect(SRS.lessonState(1).testPassed).toBe(true);
    expect(SRS.lessonState(1).bestScore).toBeGreaterThanOrEqual(0.9);
    expect(SRS.lessonState(2).unlocked).toBe(true);
  });
});
