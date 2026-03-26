import { test, expect } from '@playwright/test';

test.describe('Post a listing', () => {
  test('loads post page without redirecting to login', async ({ page }) => {
    await page.goto('/post');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
  });

  test('shows both mode buttons: Offer and Looking', async ({ page }) => {
    await page.goto('/post');
    await page.waitForLoadState('networkidle');
    // Two toggle buttons for offer / looking modes
    const buttons = page.locator('button[type="button"]').filter({ hasText: /offer|offre|looking|cherche/i });
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch between offer and looking modes', async ({ page }) => {
    await page.goto('/post');
    await page.waitForLoadState('networkidle');
    const lookingBtn = page.locator('button[type="button"]').filter({ hasText: /looking|cherche/i }).first();
    await lookingBtn.click();
    await expect(lookingBtn).toHaveClass(/bg-green-700/);

    const offerBtn = page.locator('button[type="button"]').filter({ hasText: /offer|offre/i }).first();
    await offerBtn.click();
    await expect(offerBtn).toHaveClass(/bg-green-700/);
  });

  test('form is visible with required fields', async ({ page }) => {
    await page.goto('/post');
    await page.waitForLoadState('networkidle');
    // Title field has id="serviceTitle"
    await expect(page.locator('#serviceTitle')).toBeVisible({ timeout: 10000 });
  });
});
