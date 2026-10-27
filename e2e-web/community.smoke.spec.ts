import { test, expect, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

/** The visible copy of a control (the sidebar and the bottom bar both exist in the DOM). */
const visible = (page: Page, role: Parameters<Page['getByRole']>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).locator('visible=true').first();

async function openCommunities(page: Page) {
  await visible(page, 'button', /^Communities(,|$)/).click();
  await expect(page.locator('#communities-tab-page')).toBeVisible({ timeout: 30_000 });
}

/** A 1x1 PNG, enough for the upload path (the media service checks the type and size only). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

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

test('a member posts an image in a community, the owner removes that post from the community, and the author still sees it on their profile', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const tag = Date.now();
  const groupName = `Smoke moderation ${tag}`;
  const postText = `smoke member image ${tag}`;

  // The owner creates the community.
  await registerFreshUser(page, 'community-owner');
  await openCommunities(page);
  await visible(page, 'button', 'Create community').click();
  const dialog = page.getByRole('dialog', { name: 'Create a community' });
  await dialog.getByRole('textbox', { name: /name/i }).fill(groupName);
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  // A second user finds the community, joins it and posts an image in it.
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await registerFreshUser(member, 'community-member');
    await openCommunities(member);
    await member.getByRole('textbox', { name: 'Search communities' }).fill(groupName);
    await member.getByRole('button', { name: `Join ${groupName}` }).click();
    await expect(member.getByRole('button', { name: `Leave ${groupName}` })).toBeVisible({ timeout: 30_000 });
    await member.getByRole('button', { name: `Open ${groupName}` }).click();
    await expect(member.getByRole('heading', { level: 1, name: groupName })).toBeVisible({ timeout: 30_000 });

    await visible(member, 'button', 'Attach image').click();
    await member.locator('input[type="file"]').first().setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: PNG });
    await expect(member.getByRole('img', { name: 'Image 1' })).toBeVisible({ timeout: 30_000 });
    await member.getByRole('textbox', { name: 'Post in this community' }).fill(postText);
    await member.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(member.locator('article', { hasText: postText })).toBeVisible({ timeout: 30_000 });

    // The owner reloads, opens the community and takes the member's post out of it.
    await page.reload();
    await openCommunities(page);
    await page.getByRole('button', { name: `Open ${groupName}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: groupName })).toBeVisible({ timeout: 30_000 });
    const memberPost = page.locator('article', { hasText: postText }).first();
    await expect(memberPost).toBeVisible({ timeout: 30_000 });
    await memberPost.getByRole('button', { name: 'More actions for this post' }).click();
    await page.getByRole('menuitem', { name: 'Remove from community' }).click();
    const removeDialog = page.getByRole('dialog', { name: `Remove this post from ${groupName}?` });
    await removeDialog.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(removeDialog).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('article', { hasText: postText })).toHaveCount(0, { timeout: 30_000 });

    // The post was only taken out of the community: the author still sees it on their profile.
    await visible(member, 'button', /^(My profile|Profile)(,|$)/).click();
    await expect(member.locator('#profile-tab-page')).toBeVisible({ timeout: 30_000 });
    await expect(member.locator('#profile-tab-page').locator('article', { hasText: postText })).toBeVisible({ timeout: 30_000 });
  } finally {
    await memberContext.close();
  }
});
