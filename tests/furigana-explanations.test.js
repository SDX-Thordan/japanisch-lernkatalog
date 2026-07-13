// Adaptive Furigana in Erklärungen: Lesungen nur über nicht beherrschten Kanji;
// exakte Furigana-Daten haben Vorrang, sonst Wörterbuch-Fallback (Exercises.autoFuri).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const SCRIPTS = [
  'assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
  'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js',
  'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
  'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
];

let win, furi;
beforeEach(() => {
  win = loadScripts(SCRIPTS, {
    html: '<!DOCTYPE html><html><body data-page="grammatik"><div id="filters"></div><input id="search-input"><div id="content"></div></body></html>',
  });
  win.SRS._useStorage(fakeStorage());
  furi = win.Katalog.furiToRuby;
});

describe('furiToRuby — adaptiv über den Kanji-Lernstand', () => {
  const JP = 'サントスさんは学生じゃありません。'; // hat einen GRAMMATIK_FURIGANA-Eintrag ({学生|がくせい})

  it('nicht beherrschte Kanji bekommen die Lesung aus den Furigana-Daten', () => {
    const html = furi(JP);
    expect(html).toContain('<ruby>学生<rt>がくせい</rt></ruby>');
  });

  it('beherrschte Kanji verlieren die Lesung (kein Ruby mehr)', () => {
    win.SRS.__test.setScore('k:学', 100);
    win.SRS.__test.setScore('k:生', 100);
    const html = furi(JP);
    expect(html).not.toContain('<ruby>');
    expect(html).toContain('学生'); // Wort bleibt, nur ohne Lesung
  });

  it('ohne Furigana-Eintrag greift das Wörterbuch-Furigana (autoFuri) — ebenfalls adaptiv', () => {
    const html = furi('これは本です。'); // kein GRAMMATIK_FURIGANA-Key; 本 steht im Vokabular (ほん)
    expect(html).toContain('<ruby>本<rt>ほん</rt></ruby>');
    win.SRS.__test.setScore('k:本', 100);
    expect(furi('これは本です。')).not.toContain('<ruby>');
  });

  it('Kanji außerhalb des Lernstoffs sind nie beherrscht → Lesung bleibt immer', () => {
    // 駅 ist im Kanji-Katalog NICHT enthalten (kanji.js ist hier bewusst nicht geladen →
    // isMastered("k:駅") ist ohne Lernstand false); Vokabular kennt えき→駅.
    const html = furi('駅はどこですか。');
    expect(html).toContain('<ruby>駅<rt>えき</rt></ruby>');
  });

  it('ohne Exercises fällt es sauber auf reinen Text zurück (kein Crash)', () => {
    const w2 = loadScripts(['assets/data/grammatik_furigana.js', 'assets/srs.js', 'assets/app.js'], {
      html: '<!DOCTYPE html><html><body data-page="heute"></body></html>',
    });
    const out = w2.Katalog.furiToRuby('これは本です。'); // kein Eintrag, kein Exercises
    expect(out).toBe('これは本です。');
  });
});

describe('Erklärungsflächen rendern adaptive Furigana', () => {
  it('Grammatik-Karten: Beispielsätze tragen Ruby über unbeherrschten Kanji', () => {
    const rubies = win.document.querySelectorAll('#content .gp-ex ruby');
    expect(rubies.length).toBeGreaterThan(50);
  });

  it('auch außerhalb der Beispielsätze (Tabelle/Kontrast/Fehler/Erklärung) gibt es jetzt Lesungen', () => {
    const inEx = win.document.querySelectorAll('#content .gp-ex ruby').length;
    const total = win.document.querySelectorAll('#content ruby').length;
    expect(total).toBeGreaterThan(inEx); // vorher war alles außerhalb .gp-ex rohes esc()
  });

  it('Vokabelliste: Beispielsätze (v-ext) tragen Ruby über Wörterbuch-Wörtern', () => {
    const w = loadScripts([
      'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
      'assets/srs.js', 'assets/exercises.js', 'assets/app.js',
    ], {
      html: `<!DOCTYPE html><html><body data-page="vokabular">
        <input id="search-input" type="search"><button id="toggle-readings"></button><button id="toggle-cards"></button>
        <div id="filters"></div><div id="type-filters"></div><p id="count"></p><div id="content"></div><div id="empty" class="hidden"></div>
      </body></html>`,
    });
    w.SRS._useStorage(fakeStorage());
    if (w.document.readyState === 'loading') w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    expect(w.document.querySelectorAll('#content .v-bsp-inline ruby').length).toBeGreaterThan(20);
  });
});
