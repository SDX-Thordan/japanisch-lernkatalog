// Rastert assets/icons/logo.png (Master) zu den App-Icons (PWA + Apple-Touch).
// Nutzt das vorinstallierte Chromium (kein Download). Lokal: `node scripts/gen-icons.mjs`.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const masterB64 = readFileSync(resolve(ROOT, 'assets/icons/logo.png')).toString('base64');
const master = `data:image/png;base64,${masterB64}`;
const PAD_BG = '#f3e7d3'; // creme, an die Bildpalette angeglichen (für maskable-Sicherheitsrand)

const EXEC = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const targets = [
  { file: 'assets/icons/icon-192.png', size: 192, scale: 1 },
  { file: 'assets/icons/icon-512.png', size: 512, scale: 1 },
  { file: 'assets/icons/apple-touch-icon.png', size: 180, scale: 1 },
  // maskable: Motiv auf ~80 % verkleinert, creme-Hintergrund → Mask schneidet nichts ab.
  { file: 'assets/icons/icon-maskable-512.png', size: 512, scale: 0.8 },
];

const browser = await chromium.launch({ executablePath: EXEC });
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
    const html = `<!doctype html><meta charset="utf8"><style>
      html,body{margin:0;padding:0}
      .wrap{width:${t.size}px;height:${t.size}px;display:flex;align-items:center;justify-content:center;background:${t.scale < 1 ? PAD_BG : 'transparent'}}
      img{width:${Math.round(t.size * t.scale)}px;height:${Math.round(t.size * t.scale)}px;display:block}
      </style><div class="wrap"><img src="${master}"></div>`;
    await page.setContent(html, { waitUntil: 'networkidle' });
    const buf = await page.screenshot({ omitBackground: t.scale === 1, clip: { x: 0, y: 0, width: t.size, height: t.size } });
    writeFileSync(resolve(ROOT, t.file), buf);
    console.log('geschrieben:', t.file, t.size + 'px', t.scale < 1 ? '(maskable)' : '');
    await page.close();
  }
} finally {
  await browser.close();
}
