// Freies Üben (Hub-Seite ueben.html): Quelle wählen → Karteikarten-Overlay öffnet.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadScripts } from './helpers/load.js';

function fakeStorage() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } };
}

const BODY = `<!DOCTYPE html><html><body data-page="ueben">
  <header class="topbar"><div class="topbar-inner">
    <a class="brand"></a><nav id="topnav" class="nav"></nav>
  </div></header>
  <main>
    <div class="ueben-pick" id="ueben-root">
      <button class="navcard ueben-card" type="button" data-src="vocab"><h3>Vokabeln</h3></button>
    </div>
  </main>
</body></html>`;

let win;
beforeEach(() => {
  win = loadScripts(['assets/data/vokabular.js', 'assets/srs.js', 'assets/app.js'], { html: BODY });
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  win.SRS._useStorage(fakeStorage());
});
function click(e) { e.dispatchEvent(new win.Event('click', { bubbles: true })); }

describe('Freies Üben (Hub)', () => {
  it('Klick auf eine Quelle öffnet ein Karteikarten-Overlay', () => {
    const btn = win.document.querySelector('[data-src="vocab"]');
    expect(btn).toBeTruthy();
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
