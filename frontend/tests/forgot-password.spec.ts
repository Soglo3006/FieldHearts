import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Forgot password page', () => {
  test('loads the form correctly', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows confirmation after submitting a valid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    // After submit, a success message should appear (CheckCircle or confirmation text)
    const confirmation = page.locator('.text-green-700, .text-green-600, [class*="green"]').filter({ hasText: /.+/ }).first();
    await expect(confirmation).toBeVisible({ timeout: 10000 });
  });

  test('has a back to login link', async ({ page }) => {
    await page.goto('/forgot-password');
    const backLink = page.locator('a[href="/login"]');
    await expect(backLink).toBeVisible();
  });
});
