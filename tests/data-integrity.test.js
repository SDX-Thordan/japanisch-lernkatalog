// Integrität der Sidecar-Daten: alle Schlüssel verweisen auf echte Katalog-Einträge.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadWithData } from './helpers/load.js';

let win, patterns, vocabIds;
beforeAll(() => {
  win = loadWithData([
    'assets/data/vokabular_tags.js',
    'assets/data/saetze.js',
    'assets/data/grammatik_plus.js',
  ]);
  patterns = new Set((win.GRAMMATIK || []).map((g) => g.pattern));
  vocabIds = new Set((win.VOKABULAR || []).map((v) => 'v:' + v.kana + '|' + v.lesson));
});

describe('SATZ_TEMPLATES', () => {
  it('jeder Schlüssel ist ein existierendes Grammatik-Muster', () => {
    const bad = Object.keys(win.SATZ_TEMPLATES).filter((p) => !patterns.has(p));
    expect(bad).toEqual([]);
  });
  it('jede Vorlage hat jp, de, slots und (falls particle) eine blank', () => {
    const bad = [];
    Object.entries(win.SATZ_TEMPLATES).forEach(([p, arr]) => {
      arr.forEach((t, i) => {
        if (!t.jp || !t.de || !t.slots) bad.push(`${p}[${i}]`);
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('GRAMMATIK_PLUS', () => {
  it('jeder Schlüssel ist ein existierendes Grammatik-Muster', () => {
    const bad = Object.keys(win.GRAMMATIK_PLUS).filter((p) => !patterns.has(p));
    expect(bad).toEqual([]);
  });
  it('Übungen haben einen gültigen Typ und eine Lösung', () => {
    const bad = [];
    Object.entries(win.GRAMMATIK_PLUS).forEach(([p, obj]) => {
      (obj.uebungen || []).forEach((ex, i) => {
        if (ex.typ === 'mc' && (!Array.isArray(ex.optionen) || typeof ex.richtig !== 'number')) bad.push(`${p}[${i}] mc`);
        if (ex.typ === 'cloze' && (ex.luecke == null || !ex.satz)) bad.push(`${p}[${i}] cloze`);
        if (['mc', 'cloze'].indexOf(ex.typ) === -1) bad.push(`${p}[${i}] typ?`);
      });
    });
    expect(bad).toEqual([]);
  });
});

describe('VOKABULAR_TAGS', () => {
  it('jeder Schlüssel löst auf eine echte Vokabel auf', () => {
    const bad = Object.keys(win.VOKABULAR_TAGS).filter((id) => !vocabIds.has(id));
    expect(bad).toEqual([]);
  });
});

describe('Vokabel-Kanji stammen aus dem Katalog', () => {
  let kanjiWin, catalog;
  beforeAll(() => {
    kanjiWin = loadWithData(['assets/data/vokabular.js', 'assets/data/kanji.js']);
    catalog = new Set((kanjiWin.KANJI || []).map((k) => k.k));
  });

  // Diese Lücken-Korrekturen wurden ergänzt — ausschließlich Kanji aus dem Katalog
  // (Nutzer-Vorgabe). Bestand-Vokabeln dürfen weiterhin Kanji außerhalb des Katalogs nutzen.
  const ERGAENZT = [
    ['わたし', 1, '私'], ['ほん', 2, '本'], ['いま', 4, '今'], ['がっこう', 5, '学校'],
    ['ひとり', 5, '一人'], ['みっか', 5, '三日'], ['みせ', 6, '店'], ['なに', 6, '何'],
    ['うえ', 10, '上'], ['そと', 10, '外'], ['ひとり', 11, '一人'], ['とお', 11, '十'],
    ['ふたり', 11, '二人'], ['がいこく', 11, '外国'],
  ];

  it('jedes ergänzte Kanji-Zeichen kommt im Katalog vor', () => {
    const bad = [];
    ERGAENZT.forEach(([, , kanji]) => {
      [...kanji].forEach((ch) => { if (!catalog.has(ch)) bad.push(`${kanji}: ${ch}`); });
    });
    expect(bad).toEqual([]);
  });

  it('jede ergänzte Schreibweise steht im Vokabular', () => {
    const bad = [];
    ERGAENZT.forEach(([kana, lesson, kanji]) => {
      const v = (kanjiWin.VOKABULAR || []).find((x) => x.kana === kana && x.lesson === lesson);
      if (!v || v.kanji !== kanji) bad.push(`${kana}|${lesson} → ${kanji}`);
    });
    expect(bad).toEqual([]);
  });

  it('Spot-Checks bestätigter Schreibweisen', () => {
    const find = (kana, lesson) => (kanjiWin.VOKABULAR || []).find((v) => v.kana === kana && v.lesson === lesson);
    expect(find('ほん', 2).kanji).toBe('本');
    expect(find('みせ', 6).kanji).toBe('店');
    expect(find('わたし', 1).kanji).toBe('私');
    expect(find('がっこう', 5).kanji).toBe('学校');
    // Homophone bleiben bewusst kana-only (kein falsches Kanji).
    expect(find('はい', 1).kanji).toBe('');
    expect(find('せき', 17).kanji).toBe('');
  });
});
