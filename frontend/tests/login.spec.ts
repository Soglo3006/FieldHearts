import { test, expect } from '@playwright/test';

// These tests run without saved auth state (testing the login UI itself)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login flow', () => {
  test('shows email step on load', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('advances to password step for existing email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', process.env.TEST_EMAIL!);
    await page.click('button[type="submit"]');
    await expect(page.locator('#password')).toBeVisible({ timeout: 10000 });
  });

  test('shows not-found step for unknown email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nonexistent_xyz_99999@test.com');
    await page.click('button[type="submit"]');
    // Should show the "no account found" state with a register link
    await expect(page.locator('a[href*="/register"]')).toBeVisible({ timeout: 10000 });
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', process.env.TEST_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForSelector('#password');
    await page.fill('#password', 'wrongpassword123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 20000 });
  });

  test('full login redirects away from /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', process.env.TEST_EMAIL!);
    await page.click('button[type="submit"]');
    await page.waitForSelector('#password');
    await page.fill('#password', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
    expect(page.url()).not.toContain('/login');
  });
});
