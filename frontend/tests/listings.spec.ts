import { test, expect } from '@playwright/test';

test.describe('Listings page', () => {
  test('loads listings page', async ({ page }) => {
    await page.goto('/listings');
    // Should not redirect to login (auth is saved)
    await expect(page).not.toHaveURL(/login/);
  });

  test('displays at least one listing card or empty state', async ({ page }) => {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');
    // Cards are <Link href="/serviceDetail/..."> elements
    const cards = page.locator('a[href*="/serviceDetail/"]');
    const emptyState = page.locator('text=/aucun|no listing|no result|empty/i');
    const hasCards = await cards.count() > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBe(true);
  });

  test('search input is present', async ({ page }) => {
    await page.goto('/listings');
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[placeholder*="Recherch"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });
});
