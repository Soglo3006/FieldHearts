import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile  = path.join(__dirname, '../playwright/.auth/user.json');
const authFile2 = path.join(__dirname, '../playwright/.auth/user2.json');

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login', { timeout: 90000 });
  await page.fill('#email', email);
  await page.click('button[type="submit"]');
  await page.waitForSelector('#password', { timeout: 20000 });
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

setup('authenticate user1 (seller)', async ({ page }) => {
  const email = process.env.TEST_EMAIL!;
  const password = process.env.TEST_PASSWORD!;
  if (!email || !password) throw new Error('TEST_EMAIL and TEST_PASSWORD must be set');
  await loginAs(page, email, password);
  await page.context().storageState({ path: authFile });
});

setup('authenticate user2 (buyer)', async ({ page }) => {
  const email = process.env.TEST_EMAIL_2!;
  const password = process.env.TEST_PASSWORD_2!;
  if (!email || !password) throw new Error('TEST_EMAIL_2 and TEST_PASSWORD_2 must be set');
  await loginAs(page, email, password);
  await page.context().storageState({ path: authFile2 });
});
