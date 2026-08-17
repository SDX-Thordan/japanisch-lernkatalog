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

describe('Suche greift NICHT in Beispieltexte', () => {
  let win, verb, word;
  beforeEach(() => {
    win = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js', 'assets/srs.js', 'assets/app.js']);
    // Eine Vokabel suchen, deren Beispielübersetzung ein markantes Wort enthält,
    // das in ihren eigenen Kerndaten nicht vorkommt.
    const K = win.Katalog;
    for (const v of win.VOKABULAR) {
      const b = win.VOKABULAR_BEISPIELE[v.kana + '|' + v.lesson]; if (!b) continue;
      const core = K.norm([v.kanji, v.kana, v.romaji, v.de, v.pos].join(' '));
      const w = (b.de.toLowerCase().match(/[a-zäöüß]{6,}/g) || []).find((x) => core.indexOf(K.norm(x)) === -1);
      if (w) { verb = v; word = w; break; }
    }
  });

  it('ein Wort, das nur im Beispielsatz steht, liefert keine Treffer', () => {
    expect(word).toBeTruthy();
    search(win, word);
    const hit = visibleRows(win, '.v-row.item')
      .some((r) => r.querySelector('.v-add').dataset.vid === 'v:' + verb.kana + '|' + verb.lesson);
    expect(hit).toBe(false);
  });

  it('dieselbe Vokabel bleibt über ihre Kerndaten auffindbar', () => {
    const findsIt = (q) => {
      search(win, q);
      return visibleRows(win, '.v-row.item')
        .some((r) => r.querySelector('.v-add').dataset.vid === 'v:' + verb.kana + '|' + verb.lesson);
    };
    expect(findsIt(verb.kana)).toBe(true);
    expect(findsIt(verb.de)).toBe(true);
  });

  it('der Beispielsatz wird weiterhin angezeigt — nur nicht durchsucht', () => {
    expect(win.document.querySelectorAll('.v-bsp-inline').length).toBeGreaterThan(20);
  });
});

describe('Kanji-Beispielwörter bleiben durchsuchbar', () => {
  it('ein Beispielwort findet sein Kanji (bewusste Ausnahme)', () => {
    const win = page(KANJI_BODY, ['assets/data/kanji.js', 'assets/srs.js', 'assets/app.js']);
    const k = win.KANJI.find((x) => (x.examples || []).length);
    const ex = k.examples[0];
    search(win, ex.w);
    const cards = visibleRows(win, '.kanji-card.item');
    expect(cards.some((c) => c.querySelector('.kanji-char').textContent === k.k)).toBe(true);
  });
});

describe('Grammatik: Rōmaji ohne Beispieltext', () => {
  const GRAMMAR_BODY = `<!DOCTYPE html><html><body data-page="grammatik">
    <input id="search-input" type="search"><div id="filters"></div><p id="count"></p>
    <div id="content"></div><div id="empty" class="hidden"></div>
  </body></html>`;
  let win, card;
  beforeEach(() => {
    win = page(GRAMMAR_BODY, ['assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
      'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js', 'assets/srs.js', 'assets/app.js']);
    card = [...win.document.querySelectorAll('.gp.item')]
      .find((c) => c.querySelector('.gp-pattern').textContent.indexOf('のほうが') !== -1);
  });

  it('die Umschrift stammt aus dem Muster — alle Schreibweisen treffen', () => {
    expect(card).toBeTruthy();
    ['ほうが', 'houga', 'hou ga', 'hō ga', 'yori'].forEach((q) => {
      search(win, q);
      expect(visibleRows(win, '.gp.item').includes(card), q).toBe(true);
    });
  });

  it('ein Wort aus einem Beispielsatz findet das Muster nicht mehr', () => {
    const g = win.GRAMMATIK.find((x) => x.pattern.indexOf('のほうが') !== -1);
    // „Sommer“ steht nur in der Übersetzung eines Beispielsatzes, nicht im Muster/Titel
    const w = g.beispiele.map((b) => b.de).join(' ').match(/Sommer/);
    expect(w).toBeTruthy();
    search(win, 'Sommer');
    expect(visibleRows(win, '.gp.item').includes(card)).toBe(false);
  });
});

describe('Suchindex: reine Funktionen == gerenderter dataset.search', () => {
  // Die drei Index-Ausdrücke wurden aus vocabRow/kanjiCard/grammarCard herausgelöst, damit das
  // Hinzufügen-Overlay ohne gerenderten Katalog suchen kann. Dieser Test hält beide Seiten synchron:
  // weicht die reine Funktion vom gerenderten Index ab, findet das Overlay andere Treffer als die Seite.
  const GRAMMAR_BODY = `<!DOCTYPE html><html><body data-page="grammatik">
    <input id="search-input" type="search"><div id="filters"></div><p id="count"></p>
    <div id="content"></div><div id="empty" class="hidden"></div>
  </body></html>`;

  it('Vokabeln: jede gerenderte Zeile trägt genau vocabSearchIndex(w)', () => {
    const win = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js']);
    const rows = [...win.document.querySelectorAll('.v-row.item')];
    expect(rows.length).toBe(win.VOKABULAR.length);
    // Reihenfolge der Zeilen kann von der Datenreihenfolge abweichen → über den Index-Wert vergleichen.
    const rendered = rows.map((r) => r.dataset.search).sort();
    const pure = win.VOKABULAR.map((w) => win.Katalog.vocabSearchIndex(w)).sort();
    expect(rendered).toEqual(pure);
  });

  it('Kanji: jede gerenderte Karte trägt genau kanjiSearchIndex(k)', () => {
    const win = page(KANJI_BODY, ['assets/data/kanji.js', 'assets/srs.js', 'assets/app.js']);
    const cards = [...win.document.querySelectorAll('.kanji-card.item')];
    expect(cards.length).toBe(win.KANJI.length);
    expect(cards.map((c) => c.dataset.search).sort())
      .toEqual(win.KANJI.map((k) => win.Katalog.kanjiSearchIndex(k)).sort());
  });

  it('Grammatik: jede gerenderte Karte trägt genau grammarSearchIndex(g)', () => {
    const win = page(GRAMMAR_BODY, ['assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
      'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js', 'assets/srs.js', 'assets/app.js']);
    const cards = [...win.document.querySelectorAll('.gp.item')];
    expect(cards.length).toBe(win.GRAMMATIK.length);
    expect(cards.map((c) => c.dataset.search).sort())
      .toEqual(win.GRAMMATIK.map((g) => win.Katalog.grammarSearchIndex(g)).sort());
  });

  it('searchHit: Substring, leerzeichenfreie Zweitfassung, leerer Begriff trifft alles', () => {
    const win = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js']);
    const hit = win.Katalog.searchHit;
    expect(hit('mizu wasser', 'wasser', 'wasser')).toBe(true);
    expect(hit('mizu wasser', 'feuer', 'feuer')).toBe(false);
    expect(hit('n1 nohouga n2', 'hou ga', 'houga')).toBe(true); // nur über die 2. Fassung
    expect(hit('irgendwas', '', '')).toBe(true);
    expect(hit(undefined, 'x', 'x')).toBe(false); // kein Index → kein Treffer, kein Absturz
  });
});

describe('Suchen-Taste schließt die Tastatur', () => {
  let win, input;
  beforeEach(() => {
    win = page(VOCAB_BODY, ['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js']);
    input = win.document.getElementById('search-input');
  });
  const enter = () => input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

  it('Enter nimmt den Fokus vom Suchfeld (die Bildschirmtastatur geht zu)', () => {
    input.focus();
    expect(win.document.activeElement).toBe(input);
    enter();
    expect(win.document.activeElement).not.toBe(input);
  });

  it('der Suchbegriff und die Trefferliste bleiben erhalten', () => {
    search(win, win.VOKABULAR[0].kana);
    const before = visibleRows(win, '.v-row.item').length;
    expect(before).toBeGreaterThan(0);
    input.focus(); enter();
    expect(input.value).toBe(win.VOKABULAR[0].kana);
    expect(visibleRows(win, '.v-row.item').length).toBe(before);
  });

  it('Enter löst kein Standardverhalten aus (kein Formular-Absenden)', () => {
    const ev = new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('andere Tasten lassen den Fokus in Ruhe', () => {
    input.focus();
    input.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    expect(win.document.activeElement).toBe(input);
  });
});
