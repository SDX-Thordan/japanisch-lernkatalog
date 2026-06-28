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

// Alle Kern-Items einer Lektion auf „beherrscht" bringen (Score ≥ MASTER_AT — für alle Typen gleich).
// Score wird deterministisch gesetzt (umgeht Pro-Wort-/Tagescap), Datum = heute (kein Zerfall).
function masterLesson(L) {
  SRS.lessonCore(L).forEach((c) => { SRS.__test.setScore(c.id, 100); });
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

describe('Mastery einheitlich über den 0–100-Score', () => {
  it('Kanji ist bei Score ≥ MASTER_AT beherrscht (Schreiben treibt den Score, kein Extra-Gate)', () => {
    const k = SRS.lessonCore(6).find((c) => c.type === 'kanji');
    SRS.__test.setScore(k.id, 60);
    expect(SRS.isMastered(k.id)).toBe(false); // unter 80
    SRS.__test.setScore(k.id, 100);
    expect(SRS.isMastered(k.id)).toBe(true);  // kein separates Schreib-Gate mehr
  });
  it('Vokabeln/Grammatik: gleiche Schwelle', () => {
    const v = SRS.lessonCore(1).find((c) => c.type === 'vocab');
    SRS.__test.setScore(v.id, 100);
    expect(SRS.isMastered(v.id)).toBe(true);
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

describe('Ganze Lektion als gelernt markieren', () => {
  it('setzt neue Kern-Items auf fällig, schaltet die Lektion frei und lässt höhere Scores unangetastet', () => {
    const core = SRS.lessonCore(1);
    expect(core.length).toBeGreaterThan(0);
    // Ein Item bereits beherrscht (100) — darf nicht abgesenkt werden.
    const mastered = core.find((c) => c.type === 'vocab');
    SRS.__test.setScore(mastered.id, 100);

    const n = SRS.markLessonLearned(1, '2026-06-10');
    expect(n).toBe(core.length - 1); // alle außer dem schon beherrschten

    // Neue Items sind nun gestartet UND fällig (Score 60 < MASTER_AT) → direkt in der Wiederholung.
    core.filter((c) => c.id !== mastered.id).forEach((c) => {
      expect(SRS.scoreOf(c.id, '2026-06-10')).toBe(60);
      expect(SRS.isDue(c.id, '2026-06-10')).toBe(true);
    });
    // Bereits beherrschtes Item bleibt bei 100 und ist nicht fällig.
    expect(SRS.scoreOf(mastered.id, '2026-06-10')).toBe(100);
    expect(SRS.isDue(mastered.id, '2026-06-10')).toBe(false);

    // Freigeschaltet, damit „Heute" die Wiederholung auch erreicht.
    expect(SRS.lessonState(1).unlocked).toBe(true);
  });

  it('nochmaliges Markieren hebt nichts weiter an (idempotent über dem Startwert)', () => {
    SRS.markLessonLearned(1, '2026-06-10');
    expect(SRS.markLessonLearned(1, '2026-06-10')).toBe(0);
  });

  it('markiert alle Teile als erledigt und macht die Lektion test-bereit', () => {
    SRS.markLessonLearned(1, '2026-06-10');
    // a) alle Teile erledigt
    expect(SRS.partsInfo(1).every((p) => p.done)).toBe(true);
    // test-bereit, auch ohne volle Mastery (Items bei 60)
    expect(SRS.lessonState(1).learned).toBe(true);
    expect(SRS.lessonState(1).coreMastered).toBe(false);
    expect(SRS.canTakeTest(1)).toBe(true);
  });

  it('Fail-safe: nächste Lektion erst nach bestandenem Test frei', () => {
    SRS.markLessonLearned(1, '2026-06-10');
    // b/c) „als gelernt" allein schaltet L2 NICHT frei
    expect(SRS.lessonState(2).unlocked).toBe(false);
    // Durchgefallen → L2 bleibt gesperrt
    SRS.recordLessonTest(1, 0.5);
    expect(SRS.lessonState(2).unlocked).toBe(false);
    // Bestanden → L2 frei (Test ist das Gate)
    SRS.recordLessonTest(1, 0.9);
    expect(SRS.lessonState(2).unlocked).toBe(true);
  });
});

describe('Test-Gate ab Lernstand ≥ 40 (erfüllt, nicht voll gemeistert)', () => {
  function setAll(L, score) {
    const today = SRS.__test.todayISO();
    SRS.lessonCore(L).forEach((c) => SRS.__test.setScore(c.id, score, today));
  }
  it('alle Kern-Items ≥ 40 → erfüllt + test-bereit, aber nicht beherrscht', () => {
    setAll(1, 40);
    const cp = SRS.coreProgress(1);
    expect(cp.readyFraction).toBe(1);
    expect(cp.ready).toBe(cp.total);
    expect(cp.fraction).toBe(0); // noch nichts „beherrscht" (≥80)
    const st = SRS.lessonState(1);
    expect(st.coreReady).toBe(true);
    expect(st.coreMastered).toBe(false);
    expect(SRS.canTakeTest(1)).toBe(true);
    // Items bleiben fällig (Wiederholung bis 80)
    expect(SRS.isDue(SRS.lessonCore(1)[0].id)).toBe(true);
  });
  it('ein Item < 40 → nicht test-bereit', () => {
    setAll(1, 40);
    SRS.__test.setScore(SRS.lessonCore(1)[0].id, 30, SRS.__test.todayISO());
    expect(SRS.lessonState(1).coreReady).toBe(false);
    expect(SRS.canTakeTest(1)).toBe(false);
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
