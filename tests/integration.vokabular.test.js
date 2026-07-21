// Integrationstest: Vokabular-Seite — erweiterte Bedeutung (Beispiel) klappt per Klick auf die Zeile auf.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="vokabular">
  <input id="search-input" type="search">
  <button id="toggle-readings"></button><button id="toggle-cards"></button>
  <div id="filters"></div><div id="type-filters"></div>
  <p id="count"></p><div id="content"></div><div id="empty" class="hidden"></div>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts([
    'assets/data/vokabular.js', 'assets/data/vokabular_beispiele.js',
    'assets/srs.js', 'assets/app.js',
  ], { html: BODY });
  win.SRS._useStorage(fakeStorage());
});
function click(e) { e.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Vokabular — erweiterte Bedeutung aufklappen', () => {
  it('zeigt die einfache Übersetzung, hält das Beispiel aber zunächst verborgen', () => {
    const row = win.document.querySelector('.item[data-ext]');
    expect(row).toBeTruthy();
    // Einfache Übersetzung (de) ist im Text der Zeile vorhanden.
    expect(row.querySelector('.de').textContent.trim().length).toBeGreaterThan(0);
    // Beispielblock existiert, ist aber noch nicht aufgeklappt.
    expect(row.querySelector('.v-ext')).toBeTruthy();
    expect(row.classList.contains('expanded')).toBe(false);
  });

  it('Klick auf die Zeile klappt das Beispiel auf und wieder zu', () => {
    const row = win.document.querySelector('.item[data-ext]');
    click(row);
    expect(row.classList.contains('expanded')).toBe(true);
    click(row);
    expect(row.classList.contains('expanded')).toBe(false);
  });

  it('Listen-Zähler am ＋-Button: „1+" nach dem Hinzufügen, „2+" bei zweiter Liste, ✓ im Picker', () => {
    const btn = win.document.querySelector('.v-add');
    expect(btn.textContent).toBe('＋'); // noch in keiner Liste
    const vid = btn.dataset.vid;

    // Picker öffnen und über die echte UI eine neue Liste anlegen & hinzufügen.
    click(btn);
    const ov = win.document.querySelector('.pick-overlay');
    expect(ov.hidden).toBe(false);
    ov.querySelector('.pick-name').value = 'Meine Liste';
    click(ov.querySelector('.pick-add'));
    expect(btn.textContent).toBe('1+');
    expect(btn.classList.contains('in-list')).toBe(true);
    expect(btn.title).toContain('In 1 Liste');
    // Im Picker ist die Liste jetzt mit ✓ markiert.
    expect(ov.querySelector('.pick-list.pick-has')).toBeTruthy();

    // Zweite Liste → „2+".
    ov.querySelector('.pick-name').value = 'Zweite';
    click(ov.querySelector('.pick-add'));
    expect(btn.textContent).toBe('2+');
    expect(win.SRS.listsContaining(vid).length).toBe(2);

    // Andere Buttons bleiben unberührt.
    const other = [...win.document.querySelectorAll('.v-add')].find((b) => b !== btn);
    expect(other.textContent).toBe('＋');
  });

  it('Verben: Wörterbuchform als Stichwort, ます-Form erst beim Aufklappen', () => {
    const K = win.Katalog;
    const verb = win.VOKABULAR.find((v) => /^V\./.test(v.pos) && K.conjugate(v.kana, K.verbGroup(v.pos)));
    const c = K.conjugate(verb.kana, K.verbGroup(verb.pos));
    const btn = [...win.document.querySelectorAll('.v-add')].find((b) => b.dataset.vid === 'v:' + verb.kana + '|' + verb.lesson);
    const row = btn.closest('.v-row');
    // Stichwort ist die Wörterbuchform (Kana-Lesung = dict), NICHT die ます-Form
    expect(row.querySelector('.v-word').textContent.endsWith(c.dict.slice(-1))).toBe(true);
    expect(row.querySelector('.v-main').textContent).not.toContain('ます');
    // ます-Form liegt im aufklappbaren Bereich
    expect(row.dataset.ext).toBe('1');
    expect(row.querySelector('.v-ext .v-masu-inline').textContent).toContain(verb.kana);
    expect(row.classList.contains('expanded')).toBe(false); // zu Beginn zugeklappt
    // SRS-ID bleibt unverändert an der ます-Form hängen (kein Fortschritts-Bruch)
    expect(btn.dataset.vid).toBe('v:' + verb.kana + '|' + verb.lesson);
    // beide Formen bleiben suchbar
    expect(row.dataset.search).toContain(win.Katalog.norm(verb.kana));
    expect(row.dataset.search).toContain(win.Katalog.norm(c.dict));
  });

  it('nimmt den Beispieltext in den Suchindex der Zeile auf', () => {
    // Eine Zeile finden, deren Beispieltext ein reines ASCII-Wort (≥5) enthält,
    // das norm() unverändert lässt → robuste Teilstring-Prüfung im Suchindex.
    const rows = [...win.document.querySelectorAll('.item[data-ext]')];
    let found = null;
    for (const r of rows) {
      const w = (r.querySelector('.v-ext').textContent.toLowerCase().match(/[a-z]{5,}/g) || [])[0];
      if (w) { found = { r, w }; break; }
    }
    expect(found).toBeTruthy();
    expect((found.r.dataset.search || '').includes(found.w)).toBe(true);
  });
});
