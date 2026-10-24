import { test, expect } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

test('register, then reload stays signed in', async ({ page }) => {
  await registerFreshUser(page, 'auth');
  await page.reload();
  await expect(page.getByLabel('Password')).toBeHidden({ timeout: 30_000 });
});
