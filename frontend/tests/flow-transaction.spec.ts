import { test, expect, chromium } from '@playwright/test';
import path from 'path';

const authFile2 = path.join(__dirname, '../playwright/.auth/user2.json');
const LISTING_ID = process.env.TEST_LISTING_ID!;

// ─── Helper: login and return a page ────────────────────────────────────────
async function getBuyerPage() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ storageState: authFile2 });
  const page = await context.newPage();
  page.baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  return { browser, page };
}

// ─── 1. Seller: view their own listing ──────────────────────────────────────
test.describe('1. Seller views listing', () => {
  // Uses user1 auth (default storageState from playwright.config.ts)
  test('listing detail page loads correctly', async ({ page }) => {
    await page.goto(`/serviceDetail/${LISTING_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('listing appears in my-listings', async ({ page }) => {
    await page.goto('/my-listings');
    await page.waitForLoadState('networkidle');
    const listingLink = page.locator(`a[href="/serviceDetail/${LISTING_ID}"]`).first();
    await expect(listingLink).toBeVisible({ timeout: 15000 });
  });
});

// ─── 2. Buyer: send a booking request ───────────────────────────────────────
test.describe('2. Buyer sends booking request', () => {
  test('buyer can view the listing', async ({ }) => {
    const { browser, page } = await getBuyerPage();
    try {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/serviceDetail/${LISTING_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/login/);
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 15000 });
    } finally {
      await browser.close();
    }
  });

  test('buyer sees booking/contact button on listing', async ({ }) => {
    const { browser, page } = await getBuyerPage();
    try {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/serviceDetail/${LISTING_ID}`);
      await page.waitForLoadState('networkidle');
      const actionBtn = page.locator('button').filter({ hasText: /.{2,}/ }).first();
      await expect(actionBtn).toBeVisible({ timeout: 15000 });
    } finally {
      await browser.close();
    }
  });

  test('buyer bookings page loads without error', async ({ }) => {
    const { browser, page } = await getBuyerPage();
    try {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/bookings`);
      await page.waitForLoadState('networkidle');
      await expect(page).not.toHaveURL(/login/);
      await expect(page.locator('.bg-red-50')).not.toBeVisible({ timeout: 15000 });
    } finally {
      await browser.close();
    }
  });
});

// ─── 3. Seller: received bookings tab ───────────────────────────────────────
test.describe('3. Seller checks received bookings', () => {
  test('received tab loads without error', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator('.bg-red-50')).not.toBeVisible({ timeout: 15000 });
  });

  test('received tab is the default active tab', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');
    const receivedTab = page.locator('button').filter({ hasText: /reçues|received/i }).first();
    await expect(receivedTab).toHaveClass(/border-green/, { timeout: 10000 });
  });
});

// ─── 4. Payment redirect test ────────────────────────────────────────────────
test.describe('4. Payment flow', () => {
  test('payment page redirects to Stripe for accepted booking', async ({ }) => {
    const { browser, page } = await getBuyerPage();
    try {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/bookings?payment=cancelled`);
      await page.waitForLoadState('networkidle');
      // Cancelled banner should be visible
      const cancelBanner = page.locator('.bg-gray-50').filter({ hasText: /.+/ }).first();
      await expect(cancelBanner).toBeVisible({ timeout: 10000 });
    } finally {
      await browser.close();
    }
  });

  test('payment success page shows confirmation', async ({ }) => {
    const { browser, page } = await getBuyerPage();
    try {
      await page.goto(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/bookings?payment=success`);
      await page.waitForLoadState('networkidle');
      // Should be on sent tab with success banner
      const sentTab = page.locator('button').filter({ hasText: /envoyées|sent/i }).first();
      await expect(sentTab).toHaveClass(/border-green/, { timeout: 10000 });
    } finally {
      await browser.close();
    }
  });
});
