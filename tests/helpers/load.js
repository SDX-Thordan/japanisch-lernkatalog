// Test-Helfer: lädt die Browser-Skripte (window-Globals) in eine JSDOM-Umgebung.
// Die App-Skripte sind klassische IIFEs, die an `window` hängen — kein ESM/CJS.
// Wir lesen sie als Text und führen sie über ein <script> im JSDOM-Dokument aus,
// sodass `window`, `document` und `localStorage` real verfügbar sind.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

export function repoPath(rel) {
  return resolve(ROOT, rel);
}

// Erzeugt eine JSDOM-Umgebung und lädt die angegebenen Skript-Dateien (relativ zum Repo-Root)
// nacheinander in der Reihenfolge der Liste. `html` erlaubt eigenes Markup (z. B. data-page).
export function loadScripts(relPaths, { html = '<!DOCTYPE html><html><body></body></html>', url } = {}) {
  const opts = { runScripts: 'dangerously', pretendToBeVisual: true };
  if (url) opts.url = url;
  const dom = new JSDOM(html, opts);
  const { window } = dom;
  for (const rel of relPaths) {
    const code = readFileSync(repoPath(rel), 'utf8');
    const script = window.document.createElement('script');
    script.textContent = code;
    window.document.head.appendChild(script);
  }
  return window;
}

// Bequemer Zugriff: lädt alle Datendateien + ein Zielmodul und gibt window zurück.
export function loadWithData(extraPaths = [], opts = {}) {
  const data = [
    'assets/data/kanji.js',
    'assets/data/vokabular.js',
    'assets/data/grammatik.js',
    'assets/data/grammatik_extra.js',
    'assets/data/grammatik_furigana.js',
  ];
  return loadScripts([...data, ...extraPaths], opts);
}
