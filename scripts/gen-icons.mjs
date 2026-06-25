// Rastert assets/icons/logo.png (Master) zu den App-Icons:
//  - Web/PWA + Apple-Touch (assets/icons/*)
//  - resources/* für @capacitor/assets (Android-Launcher- & Splash-Icons)
// Nutzt das vorinstallierte Chromium (kein Download). Lokal: `node scripts/gen-icons.mjs`.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const masterB64 = readFileSync(resolve(ROOT, 'assets/icons/logo.png')).toString('base64');
const master = `data:image/png;base64,${masterB64}`;
const CREME = '#f3e7d3'; // an die Bildpalette angeglichen
mkdirSync(resolve(ROOT, 'resources'), { recursive: true });

const EXEC = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// scale = Motivgröße relativ zur Kachel; bg = Hintergrund ('transparent' → omitBackground)
const targets = [
  // Web / PWA
  { file: 'assets/icons/icon-192.png', size: 192, scale: 1, bg: 'transparent' },
  { file: 'assets/icons/icon-512.png', size: 512, scale: 1, bg: 'transparent' },
  { file: 'assets/icons/apple-touch-icon.png', size: 180, scale: 1, bg: 'transparent' },
  { file: 'assets/icons/icon-maskable-512.png', size: 512, scale: 0.8, bg: CREME },
  // @capacitor/assets (Android)
  { file: 'resources/icon-only.png', size: 1024, scale: 1, bg: CREME },
  { file: 'resources/icon-foreground.png', size: 1024, scale: 0.66, bg: 'transparent' },
  { file: 'resources/icon-background.png', size: 1024, scale: 0, bg: CREME },
  { file: 'resources/splash.png', size: 2732, scale: 0.28, bg: CREME },
  { file: 'resources/splash-dark.png', size: 2732, scale: 0.28, bg: CREME },
];

const browser = await chromium.launch({ executablePath: EXEC });
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
    const transparent = t.bg === 'transparent';
    const img = t.scale > 0 ? `<img src="${master}">` : '';
    const html = `<!doctype html><meta charset="utf8"><style>
      html,body{margin:0;padding:0}
      .wrap{width:${t.size}px;height:${t.size}px;display:flex;align-items:center;justify-content:center;background:${transparent ? 'transparent' : t.bg}}
      img{width:${Math.round(t.size * t.scale)}px;height:${Math.round(t.size * t.scale)}px;display:block}
      </style><div class="wrap">${img}</div>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buf = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: t.size, height: t.size } });
    writeFileSync(resolve(ROOT, t.file), buf);
    console.log('geschrieben:', t.file, t.size + 'px');
    await page.close();
  }
} finally {
  await browser.close();
}
