import { test, expect } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

test('user B opens user A from the People widget, sees A\'s post, and follows A', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // A signs up and posts.
    await registerFreshUser(pageA, 'profiles-a');
    const nameA = 'Smoke profiles-a';
    const text = `smoke profile post ${Date.now()}`;
    await pageA.getByRole('textbox', { name: 'Post text' }).fill(text);
    await pageA.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(pageA.locator('article', { hasText: text })).toBeVisible({ timeout: 30_000 });

    // B signs up, then opens A from the People widget (the visible copy of the list).
    await registerFreshUser(pageB, 'profiles-b');
    await pageB.locator('button', { hasText: nameA }).locator('visible=true').first().click();

    // A's profile: header, A's post, and the follow control.
    const profile = pageB.locator('#profile-tab-page');
    await expect(profile.getByRole('heading', { level: 2, name: nameA })).toBeVisible({ timeout: 30_000 });
    await expect(profile.locator('article', { hasText: text })).toBeVisible({ timeout: 30_000 });

    await profile.getByRole('button', { name: `Follow ${nameA}` }).click();
    await expect(profile.getByRole('button', { name: `Unfollow ${nameA}` })).toBeVisible({ timeout: 30_000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
