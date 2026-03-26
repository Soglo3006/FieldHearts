import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL!;
  const password = process.env.TEST_PASSWORD!;

  if (!email || !password) {
    throw new Error('TEST_EMAIL and TEST_PASSWORD must be set in .env.test');
  }

  await page.goto('/login');

  // Step 1: enter email
  await page.fill('#email', email);
  await page.click('button[type="submit"]');

  // Step 2: wait for password field and enter password
  await page.waitForSelector('#password', { timeout: 20000 });
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to home or listings after login
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });

  // Save auth state (cookies + localStorage with Supabase session)
  await page.context().storageState({ path: authFile });
});
