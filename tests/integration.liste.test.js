// Listen-Detailseite (liste.html?id=…): zeigt die Einträge wie im Katalog und nutzt die
// gemeinsame Such-/Filter-Maschinerie. Einträge lassen sich hier direkt entfernen.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadScripts, repoPath } from './helpers/load.js';

function fakeStorage(seed) {
  const d = { ...(seed || {}) };
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="liste">
  <h1 id="li-title"></h1><p id="li-sub"></p><div id="li-actions"></div><p id="li-msg"></p>
  <input id="search-input" type="search"><button id="toggle-readings"></button><button id="toggle-cards"></button>
  <div id="type-filters"></div><p id="count"></p><div id="content"></div><div class="empty hidden" id="empty"></div>
</body></html>`;

const DATA = [
  'assets/data/kanji.js', 'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
  'assets/data/vokabular_tags.js', 'assets/data/grammatik.js', 'assets/data/grammatik_extra.js',
  'assets/data/grammatik_furigana.js', 'assets/data/grammatik_plus.js', 'assets/data/saetze.js',
  'assets/srs.js', 'assets/exercises.js',
];

// app.js erst NACH dem Anlegen der Liste auswerten — renderListe läuft beim Laden.
function openListe(id, fill) {
  const win = loadScripts(DATA, { html: BODY, url: 'https://example.test/liste.html?id=' + id });
  win.SRS._useStorage(fakeStorage());
  win.Math.random = () => 0;
  const made = fill ? fill(win) : null;
  const s = win.document.createElement('script');
  s.textContent = readFileSync(repoPath('assets/app.js'), 'utf8');
  win.document.head.appendChild(s);
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return { win, made };
}
// Gemischte Liste: Vokabel + Kanji + Grammatik
function mixedList(win) {
  const l = win.SRS.createList('Meine Mischung');
  win.SRS.addToList(l.id, [
    win.SRS.srsId('vocab', win.VOKABULAR[0]),
    'k:' + win.KANJI[0].k,
    'g:' + win.GRAMMATIK[0].pattern,
  ]);
  return l;
}
const click = (win, el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));
const search = (win, q) => {
  const i = win.document.getElementById('search-input');
  i.value = q; i.dispatchEvent(new win.Event('input', { bubbles: true }));
};
const visible = (win, sel) => [...win.document.querySelectorAll(sel)].filter((e) => !e.classList.contains('hidden'));

describe('liste.html — Aufbau', () => {
  it('zeigt Name, Anzahl und je Typ eine Sektion mit den Katalog-Elementen', () => {
    const { win } = openListe('l1', mixedList);
    expect(win.document.getElementById('li-title').textContent).toBe('Meine Mischung');
    expect(win.document.getElementById('li-sub').textContent).toContain('3 Einträge');
    expect(win.document.querySelectorAll('#content .group')).toHaveLength(3);
    expect(win.document.querySelector('#content .v-row.item')).toBeTruthy();   // Vokabelzeile
    expect(win.document.querySelector('#content .kanji-card.item')).toBeTruthy(); // Kanji-Karte
    expect(win.document.querySelector('#content .gp.item')).toBeTruthy();      // Grammatikkarte
    expect(win.document.getElementById('count').textContent).toContain('3 von 3');
  });

  it('bietet Üben, Export und den Rückweg an', () => {
    const { win } = openListe('l1', mixedList);
    expect(win.document.querySelector('#li-actions .li-train')).toBeTruthy();
    expect(win.document.querySelector('#li-actions .li-export')).toBeTruthy();
    expect(win.document.querySelector('#li-actions .li-back').getAttribute('href')).toBe('listen.html');
  });

  it('unbekannte Liste → Hinweis statt Absturz', () => {
    const { win } = openListe('gibtsnicht', mixedList);
    expect(win.document.getElementById('li-title').textContent).toContain('nicht gefunden');
    expect(win.document.querySelectorAll('#content .item')).toHaveLength(0);
  });
});

describe('liste.html — Suche und Filter', () => {
  it('Suche greift auf die Suchindizes der Katalog-Elemente zurück', () => {
    const { win } = openListe('l1', mixedList);
    // Kana des Vokabels: die Vokabelzeile muss sichtbar bleiben …
    search(win, win.VOKABULAR[0].kana);
    expect(visible(win, '#content .v-row.item').length).toBe(1);
    // … und die Kanji-Karte, die damit nichts zu tun hat, verschwinden.
    expect(visible(win, '#content .kanji-card.item').length).toBe(0);
  });

  it('ein nicht vorkommender Begriff blendet alles aus und zeigt den Leer-Hinweis', () => {
    const { win } = openListe('l1', mixedList);
    search(win, 'zzzgibtsnicht');
    expect(visible(win, '#content .item').length).toBe(0);
    expect(win.document.getElementById('count').textContent).toContain('0 von 3');
    expect(win.document.getElementById('empty').classList.contains('hidden')).toBe(false);
  });

  it('Typ-Chips filtern nach Vokabeln/Kanji/Grammatik', () => {
    const { win } = openListe('l1', mixedList);
    const chips = [...win.document.querySelectorAll('#type-filters .chip')].map((c) => c.dataset.tval);
    expect(chips).toEqual(['all', 'vocab', 'kanji', 'grammar']);
    click(win, win.document.querySelector('#type-filters .chip[data-tval="kanji"]'));
    expect(visible(win, '#content .item').length).toBe(1);
    expect(visible(win, '#content .kanji-card.item').length).toBe(1);
  });
});

describe('liste.html — Einträge entfernen', () => {
  it('entfernt den Eintrag, aktualisiert Kopf und Zähler und klappt nichts auf', () => {
    const { win, made } = openListe('l1', mixedList);
    const row = win.document.querySelector('#content .v-row.item');
    click(win, row.querySelector('.li-rm'));
    expect(win.SRS.listItems(made.id)).toHaveLength(2);
    expect(win.document.querySelector('#content .v-row.item')).toBe(null);
    expect(win.document.getElementById('li-sub').textContent).toContain('2 Einträge');
    expect(win.document.getElementById('count').textContent).toContain('2 von 2');
    expect(row.classList.contains('expanded')).toBe(false); // ✕ klappt die Zeile nicht auf
  });
});

describe('liste.html — Üben', () => {
  it('„Üben" öffnet den geteilten Trainer mit einer Übung', () => {
    const { win } = openListe('l1', mixedList);
    click(win, win.document.querySelector('#li-actions .li-train'));
    const ov = win.document.querySelector('.lt-overlay');
    expect(ov && !ov.hidden).toBe(true);
    expect(ov.querySelector('.lt-ex')).toBeTruthy();
  });
});

// Beim Aufklappen eines Verbs: Verbgruppe, Ausnahme-Hinweis und ein Popup mit allen Formen.
// Verben werden gezielt gesucht — VOKABULAR[0] ist keines.
function verbList(win, kana) {
  // Ohne win.Katalog — app.js wird erst NACH diesem Callback ausgewertet.
  const v = kana
    ? win.VOKABULAR.find((x) => x.kana === kana)
    : win.VOKABULAR.find((x) => /^V\./.test(x.pos));
  const l = win.SRS.createList('Verben');
  win.SRS.addToList(l.id, [win.SRS.srsId('vocab', v), win.SRS.srsId('vocab', win.VOKABULAR[0])]);
  return { l, v };
}
const verbRow = (win, v) => [...win.document.querySelectorAll('#content .v-row.item')]
  .find((r) => r.querySelector('.v-add').dataset.vid === 'v:' + v.kana + '|' + v.lesson);

describe('liste.html — Verbgruppe beim Aufklappen', () => {
  it('zeigt die Gruppe als Chip; ein Nicht-Verb bekommt keinen', () => {
    let made;
    const { win } = openListe('l1', (w) => { made = verbList(w); return made.l; });
    const row = verbRow(win, made.v);
    const chip = row.querySelector('.v-ext .v-vgrp-lbl');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toBe('Gruppe ' + ['', 'I', 'II', 'III'][win.Katalog.verbGroup(made.v.pos)]);
    // die ます-Form bleibt daneben stehen
    expect(row.querySelector('.v-ext .v-masu-inline')).toBeTruthy();
    // Nicht-Verb: kein Chip
    const other = [...win.document.querySelectorAll('#content .v-row.item')].find((r) => r !== row);
    expect(other.querySelector('.v-vgrp-lbl')).toBe(null);
  });

  it('„Alle Formen" öffnet das Popup und klappt die Zeile NICHT zu', () => {
    let made;
    const { win } = openListe('l1', (w) => { made = verbList(w); return made.l; });
    const row = verbRow(win, made.v);
    expect(row.classList.contains('expanded')).toBe(false);
    click(win, row.querySelector('.v-forms'));
    expect(row.classList.contains('expanded')).toBe(false); // Klick klappt nicht um
    const ov = win.document.getElementById('verbforms-overlay');
    expect(ov.hidden).toBe(false);
    // alle acht Formen mit den Werten aus allForms
    const g = win.Katalog.verbGroup(made.v.pos);
    const f = win.Katalog.allForms(made.v.kana, g);
    const cells = [...ov.querySelectorAll('.vf-table .vf-row td')].map((td) => td.textContent);
    expect(cells).toHaveLength(8);
    ['dict', 'masu', 'masen', 'ta', 'te', 'nai', 'tai', 'mashou'].forEach((k) => {
      expect(cells.some((c) => c.indexOf(f[k]) !== -1), k).toBe(true);
    });
    expect(ov.querySelector('.vf-sub').textContent).toContain('Gruppe');
  });

  it('das Popup schließt per ✕, Hintergrund-Klick und Escape', () => {
    let made;
    const { win } = openListe('l1', (w) => { made = verbList(w); return made.l; });
    const open = () => click(win, verbRow(win, made.v).querySelector('.v-forms'));
    const ov = () => win.document.getElementById('verbforms-overlay');
    open(); click(win, ov().querySelector('.vf-close'));
    expect(ov().hidden).toBe(true);
    open(); click(win, ov()); // Hintergrund
    expect(ov().hidden).toBe(true);
    open(); win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(ov().hidden).toBe(true);
  });

  it('eine Formzeile im Popup zeigt die Bildungsregel', () => {
    let made;
    const { win } = openListe('l1', (w) => { made = verbList(w); return made.l; });
    click(win, verbRow(win, made.v).querySelector('.v-forms'));
    const first = win.document.querySelector('#verbforms-overlay .vf-row');
    expect(first.classList.contains('open')).toBe(false);
    click(win, first);
    expect(first.classList.contains('open')).toBe(true);
    expect(first.querySelector('.vf-rule').textContent).toContain('Bildung');
  });
});

describe('liste.html — Ausnahme-Hinweise', () => {
  const noteOf = (win, v) => {
    const n = verbRow(win, v).querySelector('.v-ext .v-vnote');
    return n ? n.textContent : '';
  };
  it('行きます nennt die て-/た-Form, あります die Verneinung', () => {
    let made;
    let { win } = openListe('l1', (w) => { made = verbList(w, 'いきます'); return made.l; });
    expect(noteOf(win, made.v)).toContain('行って');
    ({ win } = openListe('l1', (w) => { made = verbList(w, 'あります'); return made.l; }));
    expect(noteOf(win, made.v)).toContain('ない');
  });

  it('帰ります wird als falsches Gruppe-II-Verb markiert, たべます gar nicht', () => {
    let made;
    let { win } = openListe('l1', (w) => { made = verbList(w, 'かえります'); return made.l; });
    expect(noteOf(win, made.v)).toContain('Gruppe II');
    ({ win } = openListe('l1', (w) => { made = verbList(w, 'たべます'); return made.l; }));
    expect(noteOf(win, made.v)).toBe('');
  });
});
