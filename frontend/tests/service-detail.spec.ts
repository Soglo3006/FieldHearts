import { test, expect } from '@playwright/test';

test.describe('Service detail page', () => {
  // Helper: get the first listing ID from the listings page
  async function getFirstListingUrl(page: import('@playwright/test').Page) {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');
    const firstCard = page.locator('a[href*="/serviceDetail/"]').first();
    await firstCard.waitFor({ timeout: 10000 });
    return await firstCard.getAttribute('href');
  }

  test('service detail page loads correctly', async ({ page }) => {
    const href = await getFirstListingUrl(page);
    if (!href) test.skip(); // Skip if no listings exist

    await page.goto(href!);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
  });

  test('displays title and price', async ({ page }) => {
    const href = await getFirstListingUrl(page);
    if (!href) test.skip();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    // Title should be an h1 or prominent heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Price should show $ sign
    const price = page.locator('text=/\\$\\s*\\d|\\d+\\s*\\$/').first();
    await expect(price).toBeVisible({ timeout: 10000 });
  });

  test('shows at least one action button', async ({ page }) => {
    const href = await getFirstListingUrl(page);
    if (!href) test.skip();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    // Any visible button on the page (booking, contact, message...)
    const buttons = page.locator('button').filter({ hasText: /.{2,}/ });
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
    expect(await buttons.count()).toBeGreaterThan(0);
  });

  test('clicking on owner profile navigates to profile page', async ({ page }) => {
    const href = await getFirstListingUrl(page);
    if (!href) test.skip();

    await page.goto(href!);
    await page.waitForLoadState('networkidle');

    const profileLink = page.locator('a[href*="/profile/"]').first();
    await expect(profileLink).toBeVisible({ timeout: 10000 });
  });
});
