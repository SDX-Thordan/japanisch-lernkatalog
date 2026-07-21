// Verb-Übungen in Lernlisten/Wiederholung: Wörterbuchform ab deren Einführung, weitere
// freigeschaltete Formen bei beherrschten Verben — benotet immer die globale Vokabel-ID.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWithData } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, SRS, Ex, K, verb, vid;
beforeEach(() => {
  win = loadWithData(['assets/srs.js', 'assets/exercises.js', 'assets/app.js'], {
    html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
  });
  SRS = win.SRS; Ex = win.Exercises; K = win.Katalog;
  SRS._useStorage(fakeStorage());
  verb = win.VOKABULAR.find((v) => /^V\./.test(v.pos) && K.conjugate(v.kana, K.verbGroup(v.pos)));
  vid = SRS.srsId('vocab', verb);
});

describe('Freischaltung der Formen て/た/ない (aus den Grammatik-Lektionen)', () => {
  it('gesperrt bei frischem Lernpfad, frei nach unlockAll', () => {
    ['te', 'nai', 'ta'].forEach((f) => expect(Ex.formUnlocked(f)).toBe(false));
    SRS.unlockAll();
    ['te', 'nai', 'ta'].forEach((f) => expect(Ex.formUnlocked(f)).toBe(true));
  });
});

describe('verbDictMC — ます-Form → Wörterbuchform', () => {
  it('richtige Option ist die Wörterbuchform; benotet die Vokabel-ID', () => {
    const ex = Ex.verbDictMC(verb);
    const dict = K.conjugate(verb.kana, K.verbGroup(verb.pos)).dict;
    expect(ex.typ).toBe('mc');
    expect(ex.mode).toBe('verb-dict');
    expect(ex.srsId).toBe(vid);
    expect(ex.optionen[ex.richtig]).toBe(dict);
    expect(new Set(ex.optionen).size).toBe(ex.optionen.length); // keine Dubletten
    expect(ex.frage).toContain('Wörterbuchform');
  });
});

describe('verbFormMC — weitere Form aus der Wörterbuchform', () => {
  it('fragt IMMER aus der Wörterbuchform ab (sie gehört fest zum Lernstoff)', () => {
    const c = K.conjugate(verb.kana, K.verbGroup(verb.pos));
    const ex = Ex.verbFormMC(verb, 'te'); // auch OHNE Freischaltung
    expect(ex.srsId).toBe(vid);
    expect(ex.mode).toBe('verb-form-te');
    expect(ex.optionen[ex.richtig]).toBe(c.te);
    expect(ex.frage).toContain(c.dict); // Prompt aus der Wörterbuchform
    expect(ex.frage).toContain('て-Form');
  });
});

describe('pickExercise — adaptives Einmischen der Verb-Übungen', () => {
  const item = () => ({ id: vid, type: 'vocab', data: verb });

  it('Wörterbuchform wird AUCH ohne Freischaltung geschult (immer Lernstoff)', () => {
    // beherrscht, aber て/た/ない gesperrt → Wörterbuchform-Drill statt Form-Drill
    const ex = Ex.pickExercise(item(), { score: 90, rng: () => 0 });
    expect(ex.mode).toBe('verb-dict');
    expect(ex.srsId).toBe(vid);
    // mittlerer Lernstand, gesperrt → ebenfalls Wörterbuchform
    const ex2 = Ex.pickExercise(item(), { score: 50, rng: () => 0 });
    expect(ex2.mode).toBe('verb-dict');
  });

  it('beherrschtes Verb + Freischaltung → Verbform-Drill (benotet dieselbe ID)', () => {
    SRS.unlockAll();
    const ex = Ex.pickExercise(item(), { score: 90, rng: () => 0 });
    expect(ex.mode).toBe('verb-form-te');
    expect(ex.srsId).toBe(vid);
  });

  it('mittlerer Lernstand + Freischaltung → gelegentlich Wörterbuchform', () => {
    SRS.unlockAll();
    const ex = Ex.pickExercise(item(), { score: 50, rng: () => 0 });
    expect(ex.mode).toBe('verb-dict');
  });

  it('Würfel dagegen → normale Übung (kein Zwang)', () => {
    SRS.unlockAll();
    const ex = Ex.pickExercise(item(), { score: 90, rng: () => 0.99 });
    expect(ex.mode).toBe('vocab-input');
  });

  it('Nicht-Verben sind unberührt', () => {
    const noun = win.VOKABULAR.find((v) => v.pos === 'N.');
    SRS.unlockAll();
    const ex = Ex.pickExercise({ id: SRS.srsId('vocab', noun), type: 'vocab', data: noun }, { score: 90, rng: () => 0 });
    expect(ex.mode).toBe('vocab-input');
  });
});

describe('Wörterbuchform ist wichtiger als die ます-Form', () => {
  it('beim freien Tippen zählt die Wörterbuchform immer als richtig', () => {
    const c = K.conjugate(verb.kana, K.verbGroup(verb.pos));
    expect(Ex.acceptsVocabInput(c.dict, verb)).toBe(true);       // Kana-Wörterbuchform
    expect(Ex.acceptsVocabInput(verb.kana, verb)).toBe(true);    // ます-Form bleibt gültig
    expect(Ex.acceptsVocabInput(c.dict + 'x', verb)).toBe(false);
    // Nicht-Verben unverändert
    const noun = win.VOKABULAR.find((v) => v.pos === 'N.');
    expect(Ex.acceptsVocabInput(noun.kana, noun)).toBe(true);
  });

  it('dominiert die Produktion ab Lernstand 40 (50 % statt gelegentlich)', () => {
    // rng 0.45: früher (34 %) wäre das die normale Produktions-MC gewesen
    const ex = Ex.pickExercise({ id: vid, type: 'vocab', data: verb }, { score: 50, rng: () => 0.45 });
    expect(ex.mode).toBe('verb-dict');
  });
});

describe('Fortschritt bleibt global (Liste = Lernpfad = Heute)', () => {
  it('Benotung der Verb-Drills schreibt auf dieselbe v:-ID wie überall', () => {
    SRS.unlockAll();
    const ex = Ex.pickExercise({ id: vid, type: 'vocab', data: verb }, { score: 90, rng: () => 0 });
    expect(ex.srsId).toBe(SRS.srsId('vocab', verb)); // kanonische ID
    const before = SRS.scoreOf(vid);
    SRS.grade(ex.srsId, 1, '2026-07-14');
    expect(SRS.get(vid).score).toBeGreaterThan(before);
  });
});

describe('Grammatik dediziert: generierte Drills in der Registry', () => {
  it('V て-Form liefert einen Konjugations-Drill mit g:-ID', () => {
    const g = win.GRAMMATIK.find((x) => x.pattern === 'V て-Form');
    const fac = Ex.exercisesFor({ id: 'g:' + g.pattern, type: 'grammar', data: g });
    const ex = fac[0](); // Drill-Fabrik steht vorn
    expect(ex.typ).toBe('mc');
    expect(ex.srsId).toBe('g:V て-Form');
    expect(ex.frage).toContain('て-Form');
  });

  it('auch das 辞書形-Muster hat jetzt einen generierten Drill', () => {
    const g = win.GRAMMATIK.find((x) => x.pattern === 'V 辞書形 (Wörterbuchform)');
    const fac = Ex.exercisesFor({ id: 'g:' + g.pattern, type: 'grammar', data: g });
    const ex = fac[0]();
    expect(ex.srsId).toBe('g:V 辞書形 (Wörterbuchform)');
    expect(ex.frage).toContain('Wörterbuchform');
    // richtige Option ist die Wörterbuchform des abgefragten Verbs
    expect(ex.optionen[ex.richtig]).toBeTruthy();
  });

  it('genVerbFormExercises("dict") erzeugt gültige MC-Aufgaben', () => {
    const exs = K.genVerbFormExercises('dict', 5);
    expect(exs.length).toBeGreaterThan(0);
    exs.forEach((x) => {
      expect(x.typ).toBe('mc');
      expect(x.richtig).toBeGreaterThanOrEqual(0);
      expect(x.optionen[x.richtig]).toBeTruthy();
      expect(new Set(x.optionen).size).toBe(x.optionen.length);
    });
  });
});
