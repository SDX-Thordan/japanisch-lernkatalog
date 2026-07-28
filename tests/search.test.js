// Suche: Verben müssen über Wörterbuch- UND ます-Form (Kana, Kanji, Rōmaji) auffindbar sein;
// Kun-Lesungen mit Okurigana-Strich („み-る") über die reine Lesung („みる").
// Getestet wird der ECHTE Filterlauf über #search-input, nicht nur der Indexinhalt.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const VOCAB_BODY = `<!DOCTYPE html><html><body data-page="vokabular">
  <input id="search-input" type="search"><button id="toggle-readings"></button><button id="toggle-cards"></button>
  <div id="filters"></div><div id="type-filters"></div><p id="count"></p><div id="content"></div><div id="empty" class="hidden"></div>
</body></html>`;

const KANJI_BODY = `<!DOCTYPE html><html><body data-page="kanji">
  <input id="search-input" type="search"><button id="toggle-readings"></button><button id="toggle-cards"></button>
  <div id="filters"></div><p id="count"></p><div id="content"></div><div id="empty" class="hidden"></div>
</body></html>`;

function page(html, scripts) {
  const win = loadScripts(scripts, { html });
  win.SRS._useStorage(fakeStorage());
  // In jsdom ist readyState beim Skript-Append noch 'loading' → init() wartet auf DOMContentLoaded.
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return win;
}
// Suchbegriff eintippen und den echten Filter laufen lassen.
function search(win, q) {
  const input = win.document.getElementById('search-input');
  input.value = q;
  input.dispatchEvent(new win.Event('input', { bubbles: true }));
}
function visibleRows(win, sel) {
  return [...win.document.querySelectorAll(sel)].filter((r) => !r.classList.contains('hidden'));
}

describe('norm() — Trennzeichen', () => {
  let K;
  beforeEach(() => { K = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js']).Katalog; });

  it('entfernt den Okurigana-Strich, mappt ・ auf ein Leerzeichen', () => {
    expect(K.norm('み-る')).toBe('みる');
    expect(K.norm('イチ・イツ')).toBe('イチ イツ');
  });

  it('lässt den Chōonpu unangetastet und faltet weiterhin Makronen', () => {
    expect(K.norm('コーヒー')).toBe('コーヒー');
    expect(K.norm('kyōshi')).toBe('kyoshi');
  });

  it('vereinheitlicht lange Vokale in Rōmaji (houga = hoo ga = hō ga)', () => {
    expect(K.norm('houga')).toBe(K.norm('hō ga').replace(' ', ''));
    expect(K.norm('hoo')).toBe('ho');
    expect(K.norm('yuubinkyoku')).toBe(K.norm('yūbinkyoku'));
  });
});

describe('Vokabelsuche findet Verben über beide Formen', () => {
  let win, verb, forms;
  beforeEach(() => {
    win = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js', 'assets/srs.js', 'assets/app.js']);
    const K = win.Katalog;
    // Ein Verb mit Kanji-Schreibung, damit auch die geschriebene Wörterbuchform geprüft wird.
    verb = win.VOKABULAR.find((v) => /^V\./.test(v.pos) && v.kanji && v.kanji !== v.kana && K.conjugate(v.kana, K.verbGroup(v.pos)));
    forms = K.allForms(verb.kana, K.verbGroup(verb.pos));
  });

  function findsVerb(q) {
    search(win, q);
    const rows = visibleRows(win, '.v-row.item');
    return rows.some((r) => r.querySelector('.v-add').dataset.vid === 'v:' + verb.kana + '|' + verb.lesson);
  }

  it('ます-Form (Kana und Rōmaji) findet das Verb', () => {
    expect(findsVerb(verb.kana)).toBe(true);
    expect(findsVerb(verb.romaji)).toBe(true);
  });

  it('Wörterbuchform findet das Verb — Kana, Kanji und Rōmaji', () => {
    expect(findsVerb(forms.dict)).toBe(true);
    expect(findsVerb(win.Katalog.kanaToRomaji(forms.dict))).toBe(true);
    const writtenDict = win.Katalog.allForms(verb.kanji, win.Katalog.verbGroup(verb.pos)).dict;
    expect(findsVerb(writtenDict)).toBe(true);
  });

  it('auch て-/た-/ない-Form findet das Verb', () => {
    ['te', 'ta', 'nai'].forEach((k) => expect(findsVerb(forms[k])).toBe(true));
  });

  it('filtert weiterhin aus: ein Fantasiewort zeigt keine Treffer', () => {
    search(win, 'zzzgibtsnicht');
    expect(visibleRows(win, '.v-row.item').length).toBe(0);
    expect(win.document.getElementById('empty').classList.contains('hidden')).toBe(false);
  });
});

describe('Kanji-Suche: Kun-Lesung ohne Trennstrich', () => {
  it('„みる" findet 見 (Katalog schreibt „み-る")', () => {
    const win = page(KANJI_BODY, ['assets/data/kanji.js', 'assets/srs.js', 'assets/app.js']);
    search(win, 'みる');
    const cards = visibleRows(win, '.kanji-card.item');
    expect(cards.some((c) => c.querySelector('.kanji-char').textContent === '見')).toBe(true);
  });
});
