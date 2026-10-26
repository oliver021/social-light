import { test, expect, type Page } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

/** Open a person from the People widget (the visible copy of the list), landing on their profile. */
// The widget shows 5 people until "See all" is pressed, so expand it when the person is not
// among them. The list is read at login: reload first if the person registered afterwards.
async function openPerson(page: Page, name: string) {
  const person = page.locator('button', { hasText: name }).locator('visible=true').first();
  if (!(await person.isVisible())) {
    const seeAll = page.getByRole('button', { name: /^See all/ }).locator('visible=true').first();
    if (await seeAll.isVisible()) await seeAll.click();
  }
  await person.click();
  await expect(page.locator('#profile-tab-page').getByRole('heading', { level: 2, name })).toBeVisible({ timeout: 30_000 });
}

async function goHome(page: Page) {
  // The Home item's name gains ", N unread notifications" when there are alerts.
  await page.getByRole('button', { name: /^Home(,|$)/ }).locator('visible=true').first().click();
}

test('A and B become friends, then A blocks B and B\'s post leaves A\'s feed', async ({ browser }) => {
  // Two accounts and several reloads: well over the 30 s default.
  test.setTimeout(120_000);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const nameA = 'Smoke friends-a';
    const nameB = 'Smoke friends-b';

    await registerFreshUser(pageA, 'friends-a');
    await registerFreshUser(pageB, 'friends-b');

    // B posts, so there is a post to disappear from A's feed later.
    const text = `smoke friends post ${Date.now()}`;
    await pageB.getByRole('textbox', { name: 'Post text' }).fill(text);
    await pageB.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(pageB.locator('article', { hasText: text })).toBeVisible({ timeout: 30_000 });

    // A opens B and sends a friend request. A signed up before B, so reload to see B.
    await pageA.reload();
    await openPerson(pageA, nameB);
    const profileA = pageA.locator('#profile-tab-page');
    await profileA.getByRole('button', { name: `Add ${nameB} as a friend` }).click();
    await expect(profileA.getByRole('button', { name: `Friend request to ${nameB} sent. Open the request menu` })).toBeVisible({ timeout: 30_000 });

    // B accepts from the Friend requests card on the home tab.
    await pageB.reload();
    await pageB.getByRole('button', { name: `Accept friend request from ${nameA}` }).locator('visible=true').first().click();

    // Both sides now show Friends. A reloads so its friend rows are read again.
    await pageA.reload();
    await openPerson(pageA, nameB);
    await expect(pageA.locator('#profile-tab-page').getByRole('button', { name: `Friends with ${nameB}. Open the friend menu` })).toBeVisible({ timeout: 30_000 });

    await openPerson(pageB, nameA);
    await expect(pageB.locator('#profile-tab-page').getByRole('button', { name: `Friends with ${nameA}. Open the friend menu` })).toBeVisible({ timeout: 30_000 });

    // A follows B, so B's post is in A's home feed.
    await pageA.locator('#profile-tab-page').getByRole('button', { name: `Follow ${nameB}` }).click();
    await goHome(pageA);
    await expect(pageA.locator('article', { hasText: text })).toBeVisible({ timeout: 30_000 });

    // A blocks B from B's profile: confirm first, and the profile becomes the block notice.
    await openPerson(pageA, nameB);
    await pageA.locator('#profile-tab-page').getByRole('button', { name: `More actions for ${nameB}` }).click();
    await pageA.getByRole('menuitem', { name: `Block ${nameB}` }).click();
    const dialog = pageA.getByRole('dialog');
    await expect(dialog).toContainText("They won't be told.");
    await dialog.getByRole('button', { name: 'Block', exact: true }).click();
    await expect(pageA.locator('#profile-tab-page').getByText(`You blocked ${nameB}.`)).toBeVisible({ timeout: 30_000 });

    // B's post is gone from A's home feed.
    await goHome(pageA);
    await expect(pageA.locator('article', { hasText: text })).toHaveCount(0);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
