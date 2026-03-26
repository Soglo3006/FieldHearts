import { test, expect } from '@playwright/test';

test.describe('Wallet page', () => {
  test('loads without redirecting to login', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
  });

  test('displays balance card', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    // Balance is shown — look for $ symbol or balance-related text
    const balanceEl = page.locator('text=/\\$|solde|balance/i').first();
    await expect(balanceEl).toBeVisible({ timeout: 10000 });
  });

  test('shows transaction tabs or history section', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');
    // Tabs component (received/sent/all)
    const tabs = page.locator('[role="tablist"], [data-radix-collection-item]').first();
    await expect(tabs).toBeVisible({ timeout: 10000 });
  });
});
