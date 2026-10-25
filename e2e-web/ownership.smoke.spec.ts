import { test, expect } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

test('a post I wrote can be deleted from its menu and stays gone after reload', async ({ page }) => {
  await registerFreshUser(page, 'ownership');
  const text = `smoke delete me ${Date.now()}`;

  await page.getByRole('textbox', { name: 'Post text' }).fill(text);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  const card = page.locator('article', { hasText: text });
  await expect(card).toBeVisible({ timeout: 30_000 });

  await card.getByRole('button', { name: 'More actions for this post' }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this post?' });
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText(text)).toBeHidden({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByLabel('Password')).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(text)).toBeHidden({ timeout: 30_000 });
});
