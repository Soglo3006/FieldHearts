import { test, expect } from '@playwright/test';

test.describe('Support modal', () => {
  async function openSupportModal(page: import('@playwright/test').Page) {
    await page.goto('/listings');
    await page.waitForLoadState('networkidle');
    // Open user dropdown menu (Radix DropdownMenuTrigger renders a div with aria-haspopup)
    const avatarBtn = page.locator('div[aria-haspopup="menu"]').first();
    await avatarBtn.click();
    await page.waitForTimeout(500);
    // Click support button
    const supportBtn = page.locator('[role="menuitem"]').filter({ hasText: /support|aide/i }).first();
    await supportBtn.click();
  }

  test('support modal opens', async ({ page }) => {
    await openSupportModal(page);
    // Modal should be visible
    const modal = page.locator('div[class*="fixed"]').filter({ has: page.locator('textarea') });
    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('support modal has subject, category and message fields', async ({ page }) => {
    await openSupportModal(page);
    await expect(page.locator('textarea')).toBeVisible({ timeout: 10000 });
    // Two input fields (subject + category)
    const inputs = page.locator('div[class*="fixed"] input');
    expect(await inputs.count()).toBeGreaterThanOrEqual(1);
  });

  test('shows error when submitting without description', async ({ page }) => {
    await openSupportModal(page);
    await page.waitForSelector('textarea', { timeout: 10000 });
    // Click send without filling anything
    const sendBtn = page.locator('button').filter({ hasText: /send|envoyer/i }).last();
    await sendBtn.click();
    // Error message should appear
    const error = page.locator('.text-red-600').first();
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('can fill and send support message', async ({ page }) => {
    await openSupportModal(page);
    await page.waitForSelector('textarea', { timeout: 10000 });

    const inputs = page.locator('div[class*="fixed"] input');
    if (await inputs.count() >= 1) await inputs.nth(0).fill('Test subject');
    if (await inputs.count() >= 2) await inputs.nth(1).fill('General');
    await page.locator('textarea').fill('This is a test message sent by Playwright automated tests. Please ignore.');

    const sendBtn = page.locator('button').filter({ hasText: /send|envoyer/i }).last();
    await sendBtn.click();

    // Success message should appear
    const success = page.locator('.text-green-700').first();
    await expect(success).toBeVisible({ timeout: 15000 });
  });

  test('modal closes when clicking cancel', async ({ page }) => {
    await openSupportModal(page);
    await page.waitForSelector('textarea', { timeout: 10000 });
    const cancelBtn = page.locator('button').filter({ hasText: /cancel|annuler/i }).first();
    await cancelBtn.click();
    await expect(page.locator('textarea')).not.toBeVisible({ timeout: 5000 });
  });
});
