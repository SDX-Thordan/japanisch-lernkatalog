// Staged die Web-Assets nach www/ (Capacitor webDir), damit nur die App in die APK wandert
// — ohne android/, node_modules/, tests/ usw. Idempotent: www/ wird vorher geleert.
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WWW = join(ROOT, 'www');

rmSync(WWW, { recursive: true, force: true });
mkdirSync(WWW, { recursive: true });

// Einzelne Dateien/Ordner, die in die App gehören.
const include = ['assets', 'manifest.webmanifest', 'service-worker.js'];

// Alle HTML-Seiten im Wurzelverzeichnis automatisch mitnehmen.
for (const name of readdirSync(ROOT)) {
  if (name.endsWith('.html')) include.push(name);
}

for (const item of include) {
  const src = join(ROOT, item);
  try {
    statSync(src);
    cpSync(src, join(WWW, item), { recursive: true });
  } catch {
    console.warn('übersprungen (fehlt):', item);
  }
}

console.log('www/ aufgebaut aus:', include.join(', '));
