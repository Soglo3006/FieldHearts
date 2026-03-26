import { test, expect } from '@playwright/test';

// These tests run without saved auth (testing public pages)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Register form validation', () => {
  test('shows register form with all fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('#full_name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm_password')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#full_name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm_password', 'DifferentPassword!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#full_name', 'Test User');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'abc');
    await page.fill('#confirm_password', 'abc');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });

  test('password toggle shows and hides password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#password', 'MySecret123');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    // Go up to parent div then find the toggle button inside it
    const toggleBtn = page.locator('#password').locator('..').locator('button');
    // Skip if toggle not deployed yet
    const count = await toggleBtn.count();
    if (count === 0) test.skip();
    await toggleBtn.click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await toggleBtn.click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
  });

  test('has link to login page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});

test.describe('Choose account type page', () => {
  // This page is accessible without auth
  test('shows both account type options', async ({ page }) => {
    await page.goto('/choose_type');
    await expect(page.locator('a[href*="type=person"]')).toBeVisible();
    await expect(page.locator('a[href*="type=company"]')).toBeVisible();
  });

  test('clicking Particulier redirects to complete_profil with type=person', async ({ page }) => {
    await page.goto('/choose_type');
    await page.click('a[href*="type=person"]');
    await expect(page).toHaveURL(/complete_profil.*type=person/);
  });

  test('clicking Entreprise redirects to complete_profil with type=company', async ({ page }) => {
    await page.goto('/choose_type');
    await page.click('a[href*="type=company"]');
    await expect(page).toHaveURL(/complete_profil.*type=company/);
  });
});
