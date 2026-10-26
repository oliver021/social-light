import { test, expect, type Page } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

// A 1x1 PNG, enough for the upload path (the media service checks the type and size only).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** Open a person from the People widget (the visible copy of the list), landing on their profile. */
async function openPerson(page: Page, name: string) {
  const person = page.locator('button', { hasText: name }).locator('visible=true').first();
  if (!(await person.isVisible())) {
    const seeAll = page.getByRole('button', { name: /^See all/ }).locator('visible=true').first();
    if (await seeAll.isVisible()) await seeAll.click();
  }
  await person.click();
  await expect(page.locator('#profile-tab-page').getByRole('heading', { level: 2, name })).toBeVisible({ timeout: 30_000 });
}

test('A messages B, B reads it and A sees "Seen", then A sends an image that B sees', async ({ browser }) => {
  // Two accounts, a profile visit and a refresh cadence of 15 s: well over the 30 s default.
  test.setTimeout(180_000);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const nameA = 'Smoke messenger-a';
    const nameB = 'Smoke messenger-b';

    await registerFreshUser(pageA, 'messenger-a');
    await registerFreshUser(pageB, 'messenger-b');

    // A opens B's profile and starts the conversation with a text message.
    await openPerson(pageA, nameB);
    await pageA.getByRole('button', { name: `Message ${nameB}` }).click();
    const text = `smoke dm ${Date.now()}`;
    await pageA.getByRole('textbox', { name: `Message ${nameB}` }).fill(text);
    await pageA.getByRole('button', { name: 'Send message' }).click();
    await expect(pageA.getByText(text)).toBeVisible({ timeout: 30_000 });

    // B opens the messenger and A's conversation, and reads it.
    await pageB.getByRole('button', { name: /^Messages(,|$)/ }).first().click();
    await pageB.getByRole('button', { name: `Chat with ${nameA}` }).first().click();
    await expect(pageB.getByText(text)).toBeVisible({ timeout: 30_000 });

    // A's window shows "Seen" once B's receipt is read back (the window refreshes every 15 s).
    await expect(pageA.getByLabel(`Seen by ${nameB}`)).toBeVisible({ timeout: 60_000 });

    // A sends an image; it arrives in B's open window over the hub.
    await pageA.locator('input[type="file"]').first().setInputFiles({
      name: 'smoke.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    await expect(pageB.getByRole('img', { name: `Image from ${nameA}` })).toBeVisible({ timeout: 60_000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
