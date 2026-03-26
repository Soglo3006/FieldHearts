import { test, expect } from '@playwright/test';

test.describe('My listings page', () => {
  test('loads without redirecting to login', async ({ page }) => {
    await page.goto('/my-listings');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
  });

  test('shows listings or empty state', async ({ page }) => {
    await page.goto('/my-listings');
    await page.waitForLoadState('networkidle');
    // Either listing cards or a "post your first listing" empty state
    const hasListings = await page.locator('a[href*="/serviceDetail/"]').count() > 0;
    const hasEmptyState = await page.locator('a[href="/post"]').isVisible().catch(() => false);
    expect(hasListings || hasEmptyState).toBe(true);
  });

  test('has a button to create a new listing', async ({ page }) => {
    await page.goto('/my-listings');
    await page.waitForLoadState('networkidle');
    const postBtn = page.locator('a[href="/post"]').first();
    await expect(postBtn).toBeVisible({ timeout: 10000 });
  });
});
