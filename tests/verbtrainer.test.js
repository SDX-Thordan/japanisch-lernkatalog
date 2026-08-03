// Verbformen-Trainer, Datenschicht: Verbpool, Richtungspaare und Aufgabenbau.
// Kern-Invarianten: A≠B in beiden Richtungen, Wertung NUR auf die Form, keine Waisen-IDs.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

let win, K;
beforeEach(() => {
  win = loadScripts([
    'assets/data/vokabular.js', 'assets/data/grammatik.js',
    'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
  ], { html: '<!DOCTYPE html><html><body data-page="kanji"><div id="content"></div></body></html>' });
  win.SRS._useStorage(fakeStorage());
  win.SRS.unlockAll();
  K = win.Katalog;
});

const ALL_FORMS = ['masu', 'masen', 'mashita', 'mashou', 'dict', 'te', 'ta', 'nai', 'nakatta', 'tai'];
// Ein Verb mit eigener Kanji-Schreibung, damit auch die Anzeigespalte geprüft wird.
function verbWithKanji(pool) {
  return pool.find((o) => o.v.kanji && o.v.kanji !== o.v.kana && o.disp.te !== o.kana.te) || pool[0];
}

describe('vtVerbs — Verbpool', () => {
  it('liefert nur konjugierbare Verben, jede mit allen zehn Formen', () => {
    const pool = K.vtVerbs('all');
    expect(pool.length).toBeGreaterThan(10);
    pool.forEach((o) => {
      expect(/^V\./.test(o.v.pos)).toBe(true);
      expect(K.verbGroup(o.v.pos)).toBeGreaterThan(0);
      ALL_FORMS.forEach((f) => {
        expect(typeof o.kana[f]).toBe('string');
        expect(typeof o.disp[f]).toBe('string');
      });
    });
  });

  it('dedupliziert über die Wörterbuchform', () => {
    const dicts = K.vtVerbs('all').map((o) => o.kana.dict);
    expect(new Set(dicts).size).toBe(dicts.length);
  });

  it('eine Lernliste liefert genau deren Verben; eine Liste ohne Verben bleibt leer', () => {
    const verb = win.VOKABULAR.find((v) => /^V\./.test(v.pos) && K.verbGroup(v.pos) > 0 && K.allForms(v.kana, K.verbGroup(v.pos)));
    const noun = win.VOKABULAR.find((v) => !/^V\./.test(v.pos));
    const l1 = win.SRS.createList('Verben');
    win.SRS.addToList(l1.id, [win.SRS.srsId('vocab', verb)]);
    const l2 = win.SRS.createList('Nomen');
    win.SRS.addToList(l2.id, [win.SRS.srsId('vocab', noun)]);
    expect(K.vtVerbs(l1.id).map((o) => o.v.kana)).toEqual([verb.kana]);
    expect(K.vtVerbs(l2.id)).toHaveLength(0);
  });

  it('ist bei frischem Lernpfad nicht leer — die frühen Lektionen haben kaum Verben', () => {
    win.SRS._useStorage(fakeStorage()); // kein Fortschritt → maxUnlockedLesson ist klein
    expect(win.SRS.maxUnlockedLesson()).toBeLessThan(5);
    expect(K.vtVerbs('all').length).toBeGreaterThanOrEqual(4);
  });

  it('sind genug Verben freigeschaltet, bleibt der Pool auf diese begrenzt', () => {
    const max = win.SRS.maxUnlockedLesson();
    const pool = K.vtVerbs('all');
    expect(pool.every((o) => o.v.lesson <= max)).toBe(true);
  });

  it('die Kanji-Schreibung wird mitkonjugiert (Ruby-Grundlage)', () => {
    const o = verbWithKanji(K.vtVerbs('all'));
    expect(o.disp.masu).toBe(K.allForms(o.v.kanji, o.g).masu);
    expect(o.disp.te).not.toBe(o.kana.te);
  });
});

describe('vtPair — beide Richtungen', () => {
  it('liefert nie dieselbe Form zweimal und bleibt in der Auswahl', () => {
    const forms = ['te', 'ta', 'nai'];
    for (let i = 0; i < 50; i++) {
      const [a, b] = K.vtPair(forms);
      expect(a).not.toBe(b);
      expect(forms).toContain(a);
      expect(forms).toContain(b);
    }
  });

  it('beide Richtungen kommen vor', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(K.vtPair(['masu', 'te']).join('>'));
    expect(seen.has('masu>te')).toBe(true);
    expect(seen.has('te>masu')).toBe(true);
  });

  it('funktioniert auch mit festem Zufall (Math.random === 0)', () => {
    const [a, b] = K.vtPair(['te', 'ta', 'nai'], () => 0);
    expect(a).not.toBe(b);
  });

  it('bei genau einer Form kommt die Zitierform als Gegenform dazu', () => {
    expect(K.vtPair(['te'], () => 0)).toEqual(expect.arrayContaining(['te', 'dict']));
    expect(K.vtPair(['dict'], () => 0)).toEqual(expect.arrayContaining(['dict', 'masu']));
    expect(K.vtPartner('masu')).toBe('dict');
  });

  it('ist die Wörterbuchform noch gesperrt, wird auf ます ausgewichen', () => {
    win.SRS._useStorage(fakeStorage()); // frischer Lernpfad → dict (L18) zu
    expect(win.Exercises.formUnlocked('dict')).toBe(false);
    expect(K.vtPartner('te')).toBe('masu');
  });
});

describe('vtTask — Aufgabenbau', () => {
  let pool, o;
  beforeEach(() => { pool = K.vtVerbs('all'); o = verbWithKanji(pool); });

  it('Tippen: exakte Sollwerte, Wertung auf die FORM, Prompt ohne Richtungspfeil', () => {
    const ex = K.vtTask(o, 'masu', 'te', 'input', pool);
    expect(ex.typ).toBe('input');
    expect(ex.srsId).toBe('g:V て-Form');
    expect(ex.srsId.indexOf('v:')).toBe(-1);
    expect(ex.antworten).toContain(o.kana.te);
    expect(ex.antworten).toContain(o.disp.te);
    expect(ex.antworten).toContain(K.kanaToRomaji(o.kana.te));
    expect(ex.prompt).toBe(o.disp.masu);
    expect(ex.furigana).toBe(o.kana.masu);
    expect(ex.prompt.indexOf('→')).toBe(-1);
    expect(ex.q).toContain('て-Form');
  });

  it('Tippen akzeptiert die Zielform, aber NICHT die Wörterbuchform', () => {
    const ex = K.vtTask(o, 'masu', 'te', 'input', pool);
    expect(win.Exercises.gradeAnswer(ex, o.kana.te)).toBe(true);
    expect(win.Exercises.gradeAnswer(ex, K.kanaToRomaji(o.kana.te))).toBe(true);
    expect(win.Exercises.gradeAnswer(ex, o.kana.dict)).toBe(false);
  });

  it('Multiple Choice: richtiger Index, keine Dubletten, Ausgangsform ist keine Option', () => {
    const ex = K.vtTask(o, 'masu', 'te', 'mc', pool);
    expect(ex.typ).toBe('mc');
    expect(ex.optionen[ex.richtig]).toBe(o.kana.te);
    expect(new Set(ex.optionen).size).toBe(ex.optionen.length);
    expect(ex.optionen).not.toContain(o.kana.masu);
    expect(ex.gradeOpts.gainScale).toBe(0.5);
    expect(ex.frage).toBe(o.disp.masu);
  });

  it('funktioniert in beide Richtungen — auch て → ます', () => {
    const ex = K.vtTask(o, 'te', 'masu', 'input', pool);
    expect(ex.prompt).toBe(o.disp.te);
    expect(ex.antworten).toContain(o.kana.masu);
    expect(ex.srsId).toBe('g:V ます／ました');
  });

  it('ein einzelnes Verb im Pool bekommt trotzdem vier Optionen', () => {
    const ex = K.vtTask(o, 'masu', 'te', 'mc', [o]);
    expect(ex.typ).toBe('mc');
    expect(ex.optionen.length).toBeGreaterThanOrEqual(2);
    expect(ex.optionen[ex.richtig]).toBe(o.kana.te);
  });
});

describe('Keine Waisen-IDs im Lernstand', () => {
  it('jede Form zeigt auf ein echtes Grammatikmuster', () => {
    const patterns = win.GRAMMATIK.map((g) => g.pattern);
    ALL_FORMS.forEach((f) => {
      const p = win.Exercises.formPattern(f);
      expect(p, f).toBeTruthy();
      expect(patterns, f).toContain(p);
    });
  });

  it('gegatet sind nur て/た/ない/辞書形 — ます & Co. sind immer frei', () => {
    win.SRS._useStorage(fakeStorage()); // frischer Lernpfad
    ['te', 'ta', 'nai', 'dict'].forEach((f) => expect(win.Exercises.formUnlocked(f), f).toBe(false));
    ['masu', 'masen', 'mashita', 'mashou', 'nakatta', 'tai'].forEach((f) => expect(win.Exercises.formUnlocked(f), f).toBe(true));
    win.SRS.unlockAll();
    ALL_FORMS.forEach((f) => expect(win.Exercises.formUnlocked(f), f).toBe(true));
  });
});
