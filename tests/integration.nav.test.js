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
  it('füllt die obere Tab-Leiste, markiert die aktive Seite, ohne „Üben"', () => {
    const win = page('heute');
    const top = win.document.getElementById('topnav');
    const tabs = [...top.querySelectorAll('.nav-tab')];
    expect(tabs.length).toBeGreaterThanOrEqual(9);
    const labels = tabs.map((a) => a.textContent.trim());
    expect(labels.some((l) => l.includes('Üben'))).toBe(false);
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
});
