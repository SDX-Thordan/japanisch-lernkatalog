// Verben-Seite: „Formen üben" führt zum dedizierten Verbformen-Trainer (verbtrainer.html).
// Die Übungen selbst prüft tests/integration.verbtrainer.test.js.
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

describe('Verbformen üben', () => {
  it('„Formen üben" sitzt in der Verben-Toolbar und verweist auf den Trainer', () => {
    const btn = win.document.querySelector('.toolbar .page-ueben');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Formen üben');
    expect(btn.tagName).toBe('A');
    expect(btn.getAttribute('href')).toBe('verbtrainer.html');
  });

  it('der Trainer steht auch in der Navigation', () => {
    const link = [...win.document.querySelectorAll('#topnav a')].find((a) => a.getAttribute('href') === 'verbtrainer.html');
    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Verbtrainer');
  });
});
