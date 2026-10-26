import { test, expect, type Page } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

/** The visible copy of a control (the sidebar and the bottom bar both exist in the DOM). */
const visible = (page: Page, role: Parameters<Page['getByRole']>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).locator('visible=true').first();

async function openCommunities(page: Page) {
  await visible(page, 'button', /^Communities(,|$)/).click();
  await expect(page.locator('#communities-tab-page')).toBeVisible({ timeout: 30_000 });
}

async function goHome(page: Page) {
  await visible(page, 'button', /^Home(,|$)/).click();
}

test('a member creates a community, posts in it, sees the post linked from home, and RSVPs to an event', async ({ page }) => {
  test.setTimeout(180_000);
  const tag = Date.now();
  const groupName = `Smoke community ${tag}`;
  const postText = `smoke community post ${tag}`;
  const eventName = `Smoke event ${tag}`;

  await registerFreshUser(page, 'community');

  // Create the community; the creator is its owner and therefore a member.
  await openCommunities(page);
  await visible(page, 'button', 'Create community').click();
  const dialog = page.getByRole('dialog', { name: 'Create a community' });
  await dialog.getByRole('textbox', { name: /name/i }).fill(groupName);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await page.getByRole('button', { name: `Open ${groupName}` }).click();
  await expect(page.getByRole('heading', { level: 1, name: groupName })).toBeVisible({ timeout: 30_000 });

  // Post in the community: the composer is shown to members.
  await page.getByRole('textbox', { name: 'Post in this community' }).fill(postText);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.locator('article', { hasText: postText })).toBeVisible({ timeout: 30_000 });

  // The same post on the home feed carries the community link.
  await goHome(page);
  const homePost = page.locator('article', { hasText: postText }).first();
  await expect(homePost).toBeVisible({ timeout: 30_000 });
  await expect(homePost.getByRole('button', { name: `Open community ${groupName}` })).toBeVisible();

  // Create an event and mark going, then reload: the answer is still there.
  await visible(page, 'button', 'Add event').click();
  const eventDialog = page.getByRole('dialog', { name: 'Create an event' });
  await eventDialog.getByRole('textbox', { name: 'Event name' }).fill(eventName);
  await eventDialog.getByRole('button', { name: 'Create event' }).click();
  await expect(eventDialog).toBeHidden({ timeout: 30_000 });

  await visible(page, 'button', `I'm going to ${eventName}`).click();
  await expect(visible(page, 'button', `Going to ${eventName}`)).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(visible(page, 'button', `Going to ${eventName}`)).toBeVisible({ timeout: 30_000 });
});
