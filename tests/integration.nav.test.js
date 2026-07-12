// Navigation: renderNav baut gruppierte Top-Tabs + Bottom-Leiste, markiert aktiv, ohne „Üben".
import { describe, it, expect } from 'vitest';
import { loadScripts } from './helpers/load.js';

function page(dataPage, extraMain = '') {
  const html = `<!DOCTYPE html><html><body data-page="${dataPage}">
    <header class="topbar"><div class="topbar-inner">
      <a class="brand"><span class="brand-jp">行</span><span class="brand-name">Go! Nihongo</span></a>
      <nav id="topnav" class="nav"></nav>
    </div></header>
    <main>${extraMain}</main>
  </body></html>`;
  const win = loadScripts(['assets/srs.js', 'assets/app.js'], { html });
  // In jsdom ist readyState beim Skript-Append noch 'loading' → init() wartet auf DOMContentLoaded.
  if (win.document.readyState === 'loading') win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return win;
}

describe('renderNav', () => {
  it('füllt die obere Tab-Leiste, markiert die aktive Seite, mit „Freies Üben"', () => {
    const win = page('heute');
    const top = win.document.getElementById('topnav');
    const tabs = [...top.querySelectorAll('.nav-tab')];
    expect(tabs.length).toBeGreaterThanOrEqual(9);
    const labels = tabs.map((a) => a.querySelector('.nav-label').textContent.trim());
    // „Freies Üben" ist da; das alte Trainings-„Üben" gibt es nicht mehr.
    expect(labels).toContain('Freies Üben');
    expect(labels.some((l) => l === 'Üben')).toBe(false);
    const active = top.querySelector('.nav-tab.active');
    expect(active.textContent).toContain('Heute');
    expect(active.getAttribute('href')).toBe('heute.html');
    // Gruppen-Labels vorhanden
    expect([...top.querySelectorAll('.nav-group-label')].map((s) => s.textContent)).toContain('Nachschlagen');
  });

  it('hängt eine Bottom-Tab-Leiste mit 5 Primärzielen an', () => {
    const win = page('lernpfad');
    const bn = win.document.getElementById('bottomnav');
    expect(bn).toBeTruthy();
    expect(bn.querySelectorAll('.bn-tab').length).toBe(5);
    expect(bn.querySelector('.bn-tab.active').textContent).toContain('Lernpfad');
  });

  it('zeigt auf Nachschlage-Seiten eine Sub-Tab-Zeile, „Nachschlagen" unten ist aktiv', () => {
    const win = page('kanji');
    expect(win.document.querySelector('.subnav')).toBeTruthy();
    expect(win.document.querySelector('.subnav-tab.active').textContent).toContain('Kanji');
    // Bottom-Tab „Nachschlagen" ist auf Referenzseiten aktiv (match-Liste)
    const bnActive = win.document.querySelector('#bottomnav .bn-tab.active');
    expect(bnActive.textContent).toContain('Nachschlagen');
  });

  it('Tabs tragen title-Tooltips (Labels werden beim Scrollen ausgeblendet)', () => {
    const win = page('kanji');
    expect(win.document.querySelector('.subnav-tab.active').title).toBe('Kanji');
    expect([...win.document.querySelectorAll('#topnav .nav-tab')].every((a) => a.title)).toBe(true);
  });
});

describe('Scroll: Menüs kompakt als Icons', () => {
  function frame(win) { return new Promise((r) => win.requestAnimationFrame(() => r())); }

  it('setzt body.scrolled beim Runter- und entfernt sie beim Hochscrollen', async () => {
    const win = page('kanji');
    expect(win.document.body.classList.contains('scrolled')).toBe(false);
    Object.defineProperty(win, 'scrollY', { value: 200, configurable: true, writable: true });
    win.dispatchEvent(new win.Event('scroll'));
    await frame(win);
    expect(win.document.body.classList.contains('scrolled')).toBe(true);
    win.scrollY = 0;
    win.dispatchEvent(new win.Event('scroll'));
    await frame(win);
    expect(win.document.body.classList.contains('scrolled')).toBe(false);
  });

  it('misst die Topbar-Höhe in --topbar-h (Sticky-Anker der Subnav)', () => {
    const win = page('kanji');
    expect(win.document.documentElement.style.getPropertyValue('--topbar-h')).toMatch(/px$/);
  });
});
