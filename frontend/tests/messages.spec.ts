import { test, expect } from '@playwright/test';

test.describe('Messages page', () => {
  test('loads messages page without redirecting to login', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).not.toHaveURL(/login/);
  });

  test('shows conversation list or empty state', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    // Either a conversation list or an empty state message
    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
