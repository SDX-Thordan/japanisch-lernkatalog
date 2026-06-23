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
  const learn = page.locator('.gp-plus .gp-learn').first();
  await learn.scrollIntoViewIfNeeded();
  await learn.click();
  await expect(page.locator('.gp-ex-host .ex-opt').first()).toBeVisible();
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
