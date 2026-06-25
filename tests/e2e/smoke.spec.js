import { test, expect } from '@playwright/test';

test('Übersicht lädt mit gruppierter Tab-Navigation', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.nav-tab', { hasText: 'Heute' })).toBeVisible();
  await expect(page.locator('.nav-tab', { hasText: 'Schreiben' })).toBeVisible();
  await expect(page.locator('.nav-tab', { hasText: 'Profil' })).toBeVisible();
  await expect(page.locator('.nav-group-label', { hasText: 'Nachschlagen' })).toBeVisible();
  // „Freies Üben" als eigener Nachschlagen-Punkt
  await expect(page.locator('.nav-tab .nav-label', { hasText: 'Freies Üben' })).toBeVisible();
  // Version im Footer (aus assets/version.js)
  await expect(page.locator('footer .app-version')).toHaveText(/^Version v\d+\.\d+\.\d+/);
});

test('Mobile: untere Tab-Leiste sichtbar, obere ausgeblendet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/heute.html');
  await expect(page.locator('.bottomnav')).toBeVisible();
  await expect(page.locator('.bottomnav .bn-tab', { hasText: 'Heute' })).toBeVisible();
  await expect(page.locator('#topnav')).toBeHidden();
});

test('Heute startet eine gemischte Session', async ({ page }) => {
  await page.goto('/heute.html');
  await page.click('#h-start');
  await expect(page.locator('#h-stage')).toBeVisible();
  await expect(page.locator('#h-prog')).toContainText('/');
});

test('Grammatik: ein „Üben"-Knopf öffnet die kombinierte Session', async ({ page }) => {
  await page.goto('/grammatik.html');
  // Grammatik-Karten sind eingeklappt — erst aufklappen, dann ist der Üben-Button sichtbar.
  const card = page.locator('.gp:has(.gp-ueben)').first();
  await card.locator('.gp-head').click();
  const ueben = card.locator('.gp-ueben').first();
  await ueben.scrollIntoViewIfNeeded();
  await ueben.click();
  await expect(page.locator('.drill-overlay')).toBeVisible();
  // entweder eine MC-Aufgabe oder ein Übersetzungs-Prompt ist sichtbar
  await expect(page.locator('.drill-overlay .drill-ex .ex-opt, .drill-overlay .drill-prompt').first()).toBeVisible();
});

test('Freies Üben: „Verbformen" öffnet generierte MC-Aufgaben', async ({ page }) => {
  await page.goto('/ueben.html');
  await page.click('[data-src="verbforms"]');
  await expect(page.locator('.drill-overlay .drill-ex .ex-opt').first()).toBeVisible();
});

test('Schreiben lädt das KanjiVG-Canvas', async ({ page }) => {
  await page.goto('/schreiben.html');
  await expect(page.locator('canvas.kw-canvas')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#kw-char')).not.toBeEmpty();
});

test('Profil: Export-Button vorhanden, Forecast gerendert', async ({ page }) => {
  await page.goto('/profil.html');
  await expect(page.locator('#f-export')).toBeVisible();
  await expect(page.locator('#f-forecast .f-bar')).toHaveCount(7);
});

test('Lernpfad zeigt Lektionskarten; L1 offen, L2 gesperrt', async ({ page }) => {
  await page.goto('/lernpfad.html');
  await expect(page.locator('.lp-card')).toHaveCount(25);
  await expect(page.locator('.lp-card').first()).not.toHaveClass(/lp-locked/);
  await expect(page.locator('.lp-card').nth(1)).toHaveClass(/lp-locked/);
  await expect(page.locator('#lp-unlockall')).toBeVisible();
});

test('Listen: Liste anlegen und auf Vokabular „+" vorhanden', async ({ page }) => {
  await page.goto('/listen.html');
  await page.fill('#lst-create-name', 'E2E-Liste');
  await page.click('#lst-create');
  await expect(page.locator('.lst-name')).toHaveText('E2E-Liste');
  // Branding & kein Vorschau-Toggle mehr (Header-Brand, nicht der Footer)
  await expect(page.locator('.brand .brand-name')).toHaveText('Go!');
  await expect(page.locator('.brand .brand-jp')).toHaveText('日本語');
  await page.goto('/vokabular.html');
  await expect(page.locator('#toggle-preview')).toHaveCount(0);
  await expect(page.locator('.v-add').first()).toBeVisible();
});

test('Freies Üben: Hub-Seite öffnet Karteikarten je Quelle', async ({ page }) => {
  await page.goto('/ueben.html');
  await page.click('[data-src="vocab"]');
  await expect(page.locator('.lt-overlay .lt-front')).not.toBeEmpty();
});

test('Kanji: „Schreiben üben" + Stift-Deep-Link pro Karte', async ({ page }) => {
  await page.goto('/kanji.html');
  await expect(page.locator('.page-schreiben')).toBeVisible();
  const pencil = page.locator('.kanji-card .kc-write').first();
  await expect(pencil).toBeVisible();
  await expect(pencil).toHaveAttribute('href', /schreiben\.html\?kanji=/);
});

test('Schreiben: Deep-Link ?kanji= lädt genau dieses Zeichen', async ({ page }) => {
  await page.goto('/schreiben.html?kanji=' + encodeURIComponent('日'));
  await expect(page.locator('#kw-char')).toHaveText('日');
  await expect(page.locator('canvas.kw-canvas')).toBeVisible({ timeout: 10000 });
});
