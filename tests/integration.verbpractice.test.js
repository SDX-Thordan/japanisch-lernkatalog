// Verbformen üben (て/た/ない): „Formen üben" auf der Verben-Seite öffnet generierte MC-Aufgaben.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="verben">
  <header class="topbar"><div class="topbar-inner"><a class="brand"></a><nav id="topnav" class="nav"></nav></div></header>
  <main>
    <div class="toolbar"><div class="toolbar-row"><input id="search-input"></div><div class="chips" id="filters"></div></div>
    <p class="count" id="count"></p><div id="content"></div>
  </main>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts(['assets/data/vokabular.js', 'assets/srs.js', 'assets/exercises.js', 'assets/app.js'], { html: BODY });
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  win.SRS._useStorage(fakeStorage());
});
function click(e) { e.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Verbformen üben', () => {
  it('„Formen üben" sitzt in der Verben-Toolbar', () => {
    const btn = win.document.querySelector('.toolbar .page-ueben');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Formen üben');
  });

  it('öffnet ein Overlay mit einer Multiple-Choice-Aufgabe und bewertet in SRS', () => {
    click(win.document.querySelector('.page-ueben'));
    const ov = win.document.querySelector('.drill-overlay');
    expect(ov && ov.hidden === false).toBe(true);
    const opts = ov.querySelectorAll('.drill-ex .ex-opt');
    expect(opts.length).toBeGreaterThan(1);
    // eine Antwort wählen → Feedback + SRS-Bewertung (g:V …-Form)
    click(opts[0]);
    expect(ov.querySelector('.ex-feedback')).toBeTruthy();
    expect(win.SRS.stats().totalReviews).toBeGreaterThanOrEqual(1);
  });
});
