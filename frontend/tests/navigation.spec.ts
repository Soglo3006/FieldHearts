import { test, expect } from '@playwright/test';

test.describe('Navigation header', () => {
  test('header is visible on listings page', async ({ page }) => {
    await page.goto('/listings');
    await expect(page.locator('header, nav').first()).toBeVisible();
  });

  test('can navigate to listings from header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const listingsLink = page.locator('a[href="/listings"]').first();
    await expect(listingsLink).toBeVisible();
    await listingsLink.click();
    await expect(page).toHaveURL(/\/listings/);
  });

  test('can navigate to bookings directly', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/bookings/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('can navigate to messages directly', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/messages/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('post listing button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const postLink = page.locator('a[href="/post"]').first();
    await expect(postLink).toBeVisible();
  });
});
