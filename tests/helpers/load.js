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

/* Wartet, bis die Bedingung zutrifft — statt eine feste Zahl Ticks zu raten.
   jsdoms FileReader braucht für readAsText 1–2 Makrotasks, unter Last auch mehr; ein festes
   `await tick(); await tick()` ist damit ein Zeitrennen ohne Puffer. Genau daran ist der
   Release-Lauf v0.5.2 gescheitert (leere Meldezeile statt „✗"), während dieselbe Datei lokal
   und im Push-Lauf desselben Commits grün war. Läuft die Zeit ab, nennt der Fehler die
   Wartebedingung — ein echter Fehlschlag tarnt sich so nicht als Timeout. */
export async function waitFor(fn, { timeout = 2000, label = 'Bedingung' } = {}) {
  const until = Date.now() + timeout;
  for (;;) {
    if (fn()) return;
    if (Date.now() > until) throw new Error(`waitFor: „${label}" trat innerhalb von ${timeout} ms nicht ein`);
    await new Promise((r) => setTimeout(r, 0));
  }
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
