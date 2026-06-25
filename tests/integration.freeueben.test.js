// Freies Üben: „Üben"-Button auf Nachschlage-Seiten öffnet ein Karteikarten-Overlay.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="vokabular">
  <header class="topbar"><div class="topbar-inner">
    <a class="brand"></a><nav id="topnav" class="nav"></nav>
  </div></header>
  <main>
    <div class="toolbar"><div class="toolbar-row"><input id="search-input"></div>
      <div class="chips" id="filters"></div><div class="chips" id="type-filters"></div></div>
    <p class="count" id="count"></p>
    <div id="content"></div>
  </main>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts(['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js'], { html: BODY });
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  win.SRS._useStorage(fakeStorage());
});
function click(e) { e.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Freies Üben', () => {
  it('zeigt einen „Üben"-Button und öffnet ein Karteikarten-Overlay', () => {
    const btn = win.document.querySelector('.page-ueben');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Üben');
    click(btn);
    const ov = win.document.querySelector('.lt-overlay');
    expect(ov && !ov.hidden).toBe(true);
    // eine Vorderseite ist gerendert
    expect(win.document.querySelector('.lt-front').textContent.length).toBeGreaterThan(0);
    // Aufdecken zeigt die Rückseite
    click(ov.querySelector('.fr-reveal'));
    expect(ov.querySelector('.lt-back').classList.contains('hidden')).toBe(false);
  });
});
