import { test, expect } from '@playwright/test';

test('Übersicht lädt mit Navigation zu den neuen Seiten', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.nav a', { hasText: 'Heute' })).toBeVisible();
  await expect(page.locator('.nav a', { hasText: 'Schreiben' })).toBeVisible();
  await expect(page.locator('.nav a', { hasText: 'Fortschritt' })).toBeVisible();
});

test('Heute startet eine gemischte Session', async ({ page }) => {
  await page.goto('/heute.html');
  await page.click('#h-start');
  await expect(page.locator('#h-stage')).toBeVisible();
  await expect(page.locator('#h-prog')).toContainText('/');
});

test('Grammatik zeigt „Mehr erklären" und kann eine Übung öffnen', async ({ page }) => {
  await page.goto('/grammatik.html');
  // Grammatik-Karten sind eingeklappt — erst aufklappen, dann ist der Üben-Button sichtbar.
  const card = page.locator('.gp:has(.gp-plus .gp-learn)').first();
  await card.locator('.gp-head').click();
  const learn = card.locator('.gp-plus .gp-learn').first();
  await learn.scrollIntoViewIfNeeded();
  await learn.click();
  await expect(card.locator('.gp-ex-host .ex-opt').first()).toBeVisible();
});

test('Schreiben lädt das KanjiVG-Canvas', async ({ page }) => {
  await page.goto('/schreiben.html');
  await expect(page.locator('canvas.kw-canvas')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#kw-char')).not.toBeEmpty();
});

test('Fortschritt: Export-Button vorhanden, Forecast gerendert', async ({ page }) => {
  await page.goto('/fortschritt.html');
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
  // Branding & kein Vorschau-Toggle mehr
  await expect(page.locator('.brand-name')).toHaveText('Go! Nihongo');
  await page.goto('/vokabular.html');
  await expect(page.locator('#toggle-preview')).toHaveCount(0);
  await expect(page.locator('.v-add').first()).toBeVisible();
});
