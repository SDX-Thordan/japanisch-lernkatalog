// Schreibt assets/version.js aus package.json.version — die EINE Versionsquelle.
// So zeigen Footer (Web/PWA/APK) und Android-versionName stets dieselbe Semver.
// Idempotent; wird von build:www vorangestellt und kann per `npm run version:gen` laufen.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const version = String(pkg.version || '0.0.0');

const out = `/* AUTO-GENERIERT von scripts/gen-version.mjs — nicht von Hand ändern.
   Quelle ist package.json "version". Anpassen über: Version bumpen + \`npm run version:gen\`. */
window.APP_VERSION = '${version}';
`;

writeFileSync(join(ROOT, 'assets', 'version.js'), out);
console.log('assets/version.js → v' + version);
