// Zentrale Übungs-Registry: neue Builder (Vokabel beide Richtungen, Tippen, Kanji-MC/-wählen),
// adaptive pickExercise-Heuristik und die gedeckelte SRS.grade-Regel für Kanji-MC.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, Ex, SRS;
beforeEach(() => {
  win = loadWithData([
    'assets/srs.js',
    'assets/data/vokabular_tags.js',
    'assets/data/saetze.js',
    'assets/data/grammatik_plus.js',
    'assets/app.js',
    'assets/exercises.js',
  ], { html: '<!DOCTYPE html><html><body data-page="heute"><div id="mount"></div></body></html>' });
  Ex = win.Exercises;
  SRS = win.SRS;
  SRS._useStorage(fakeStorage());
});

describe('Vokabel-Übungen — beide Richtungen + Tippen', () => {
  it('vocabRecognizeMC: JP→DE, Bedeutung als Lösung, srsId gesetzt', () => {
    const v = win.VOKABULAR[0];
    const ex = Ex.vocabRecognizeMC(v, []);
    expect(ex.typ).toBe('mc');
    expect(ex.srsId).toBe('v:' + v.kana + '|' + v.lesson);
    expect(ex.optionen[ex.richtig]).toBe(v.de);
  });
  it('vocabProduceMC: DE→JP, deutsche Frage, japanische Optionen', () => {
    const v = win.VOKABULAR[0];
    const ex = Ex.vocabProduceMC(v, []);
    expect(ex.frage).toBe(v.de);
    expect(ex.frageJa).toBe(false);
    expect(ex.optJa).toBe(true);
    const correct = (v.kanji && v.kanji.length) ? v.kanji : v.kana;
    expect(ex.optionen[ex.richtig]).toBe(correct);
  });
  it('vocabInput: Tippen akzeptiert Kana/Rōmaji/Kanji', () => {
    const v = win.VOKABULAR[0];
    const ex = Ex.vocabInput(v);
    expect(ex.typ).toBe('input');
    expect(Ex.acceptsVocabInput(v.kana, ex.accept)).toBe(true);
    expect(Ex.acceptsVocabInput('völliger unsinn', ex.accept)).toBe(false);
  });
});

describe('Kanji-Übungen — Bedeutung + Kanji wählen (gedeckelt)', () => {
  it('kanjiMeaningMC: Glyph→Bedeutung, gradeOpts deckelt bei 70 mit halbem Gewinn', () => {
    const k = win.KANJI[0];
    const ex = Ex.kanjiMeaningMC(k, []);
    expect(ex.srsId).toBe('k:' + k.k);
    expect(ex.optionen[ex.richtig]).toBe(k.meaning);
    expect(ex.gradeOpts).toEqual({ gainCeiling: 70, gainScale: 0.5 });
  });
  it('kanjiPickMC: Bedeutung→Glyph, richtiges Kanji unter den Optionen', () => {
    const k = win.KANJI[0];
    const ex = Ex.kanjiPickMC(k);
    expect(ex.frage).toBe(k.meaning);
    expect(ex.optJa).toBe(true);
    expect(ex.optionen[ex.richtig]).toBe(k.k);
    expect(ex.gradeOpts.gainCeiling).toBe(70);
  });
});

describe('exercisesFor / pickExercise — adaptiv', () => {
  it('Vokabel: <40 Erkennen, 40–70 Produktion, >70 Tippen', () => {
    const item = { id: 'v:' + win.VOKABULAR[0].kana + '|' + win.VOKABULAR[0].lesson, type: 'vocab', data: win.VOKABULAR[0] };
    expect(Ex.pickExercise(item, { score: 10 }).mode).toBe('vocab-recognize');
    expect(Ex.pickExercise(item, { score: 55 }).mode).toBe('vocab-produce');
    expect(Ex.pickExercise(item, { score: 90 }).mode).toBe('vocab-input');
  });
  it('Kanji: ab Score 70 Schreiben (Meister-Pfad)', () => {
    const k = win.KANJI[0];
    const item = { id: 'k:' + k.k, type: 'kanji', data: k };
    expect(Ex.pickExercise(item, { score: 90 }).typ).toBe('write');
    // unter 70: gemischt — mit rng=0 deterministisch die erste Fabrik (Bedeutung-MC)
    expect(Ex.pickExercise(item, { score: 10, rng: () => 0 }).mode).toBe('kanji-meaning');
  });
  it('exercisesFor liefert Fabriken je Typ', () => {
    expect(Ex.exercisesFor({ type: 'vocab', data: win.VOKABULAR[0] }).length).toBe(3);
    expect(Ex.exercisesFor({ type: 'kanji', data: win.KANJI[0] }).length).toBe(3);
  });
});

describe('Lernkarten-UX: große Karte + Furigana bei unbeherrschten Kanji', () => {
  it('vocabRecognizeMC ist eine große Karte mit Unterfrage', () => {
    const ex = Ex.vocabRecognizeMC(win.VOKABULAR[0], []);
    expect(ex.big).toBe(true);
    expect(ex.q).toBe('Was bedeutet das?');
  });
  it('Furigana nur, solange die Kanji des Worts nicht beherrscht sind', () => {
    const v = win.VOKABULAR.find((x) => x.kanji && /[一-龯]/.test(x.kanji));
    expect(v).toBeTruthy();
    // Standard: Kanji unbeherrscht → Lesung als Furigana mitgeben
    expect(Ex.vocabRecognizeMC(v, []).furigana).toBe(v.kana);
    // Alle Kanji beherrscht → keine Furigana mehr
    [...v.kanji].forEach((c) => { if (/[一-龯]/.test(c)) SRS.__test.setScore('k:' + c, 100); });
    expect(Ex.vocabRecognizeMC(v, []).furigana).toBeUndefined();
  });
  it('reine Kana-Wörter bekommen keine Furigana', () => {
    const kana = win.VOKABULAR.find((x) => !x.kanji || !x.kanji.length);
    expect(Ex.vocabRecognizeMC(kana, []).furigana).toBeUndefined();
  });
});

describe('autoFuri — Furigana in Übungstexten (nur unbeherrschte Kanji)', () => {
  it('annotiert ein bekanntes Kanji-Wort im Satz, Partikel/Kana bleiben', () => {
    const html = Ex.autoFuri('わたしも会社員です。');
    expect(html).toContain('<ruby>会社員<rt>かいしゃいん</rt></ruby>');
    expect(html).toContain('わたしも'); // Partikel/Kana unverändert
    expect(html).toContain('です。');
    expect(html).not.toContain('<ruby>わ'); // keine Furigana über reinem Kana
  });
  it('keine Furigana, wenn alle Kanji des Worts beherrscht sind', () => {
    ['会', '社', '員'].forEach((c) => SRS.__test.setScore('k:' + c, 100));
    expect(Ex.autoFuri('会社員です。')).not.toContain('<ruby>');
  });
  it('lässt die Lücke (＿) und unbekannte Zeichen unangetastet', () => {
    const html = Ex.autoFuri('あの人＿＿会社員です。');
    expect(html).toContain('＿＿');
    expect(html).toContain('<ruby>会社員');
  });
  it('reine Kana-Optionen bekommen keine Furigana', () => {
    expect(Ex.autoFuri('すし')).toBe('すし');
  });
});

describe('SRS.grade — gainCeiling / gainScale (Kanji-MC-Regel)', () => {
  it('gainScale halbiert den Gewinn', () => {
    SRS.grade('k:test1', 1, '2026-06-10', { gainScale: 0.5 });
    expect(SRS.scoreOf('k:test1', '2026-06-10')).toBe(10); // GAIN 20 * 0.5
  });
  it('gainCeiling deckelt nach oben, aber Strafe bleibt ungedeckelt', () => {
    SRS.__test.setScore('k:test2', 65, '2026-06-10');
    SRS.grade('k:test2', 1, '2026-06-10', { gainCeiling: 70, gainScale: 0.5 }); // +10 → aber Deckel 70
    expect(SRS.scoreOf('k:test2', '2026-06-10')).toBe(70);

    SRS.__test.setScore('k:test3', 70, '2026-06-10');
    SRS.grade('k:test3', 1, '2026-06-10', { gainCeiling: 70, gainScale: 0.5 }); // schon am Deckel → kein Gewinn
    expect(SRS.scoreOf('k:test3', '2026-06-10')).toBe(70);

    SRS.__test.setScore('k:test4', 70, '2026-06-10');
    SRS.grade('k:test4', 0, '2026-06-10', { gainCeiling: 70 }); // falsch → Strafe trotz Deckel
    expect(SRS.scoreOf('k:test4', '2026-06-10')).toBe(55); // 70 − PENALTY(15)
  });
});
