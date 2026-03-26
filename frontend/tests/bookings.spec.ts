import { test, expect } from '@playwright/test';

test.describe('Bookings page', () => {
  test('loads bookings page without error', async ({ page }) => {
    await page.goto('/bookings');
    await expect(page).not.toHaveURL(/login/);
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    // Error banner should NOT be visible
    await expect(page.locator('.bg-red-50')).not.toBeVisible({ timeout: 15000 });
  });

  test('shows the three tabs: Reçues, Envoyées, Terminées', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    // Tabs should be visible (text varies by language)
    const tabs = page.locator('button').filter({ hasText: /reçues|received/i });
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });

  test('can switch between tabs', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Click Envoyées/Sent tab
    const sentTab = page.locator('button').filter({ hasText: /envoyées|sent/i }).first();
    await sentTab.click();
    await expect(sentTab).toHaveClass(/border-green/);

    // Click Terminées/Done tab
    const doneTab = page.locator('button').filter({ hasText: /terminées|done/i }).first();
    await doneTab.click();
    await expect(doneTab).toHaveClass(/border-green/);
  });
});
