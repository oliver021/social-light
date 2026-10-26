import { test, expect, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

/** The visible copy of a control (the sidebar and the bottom bar both exist in the DOM). */
const visible = (page: Page, role: Parameters<Page['getByRole']>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).locator('visible=true').first();

/** A 1x1 PNG, so the logo goes through the real upload path without a fixture file. */
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function openOrganizations(page: Page) {
  await visible(page, 'button', /^Organizations(,|$)/).click();
  await expect(page.locator('#organizations-tab-page')).toBeVisible({ timeout: 30_000 });
}

test('an owner creates an organization with a logo, a second user joins, and both see two members', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const tag = Date.now();
  const orgName = `Smoke organization ${tag}`;

  // The owner creates the organization with a logo.
  await registerFreshUser(page, 'org-owner');
  await openOrganizations(page);
  await visible(page, 'button', 'Create organization').click();
  const dialog = page.getByRole('dialog', { name: 'Create an organization' });
  await dialog.getByRole('textbox', { name: 'Name' }).fill(orgName);
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: LOGO_PNG });
  await expect(dialog.getByAltText('Logo (optional) preview')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });

  const ownerCard = page.locator('article', { hasText: orgName }).first();
  await expect(ownerCard).toBeVisible({ timeout: 30_000 });
  await expect(ownerCard.getByText('1 member')).toBeVisible();
  await expect(ownerCard.getByText('Owner', { exact: true })).toBeVisible();

  // A second user finds the organization and joins it.
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await registerFreshUser(member, 'org-member');
    await openOrganizations(member);
    await member.getByRole('textbox', { name: 'Search organizations' }).fill(orgName);
    await member.getByRole('button', { name: `Join ${orgName}` }).click();
    await expect(member.getByRole('button', { name: `Leave ${orgName}` })).toBeVisible({ timeout: 30_000 });
    await expect(member.locator('article', { hasText: orgName }).getByText('2 members')).toBeVisible();

    // The owner reloads and sees both members on the page, with the roles.
    await page.reload();
    await openOrganizations(page);
    await expect(page.locator('article', { hasText: orgName }).getByText('2 members')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: `Open ${orgName}` }).click();
    await expect(page.getByRole('heading', { level: 1, name: orgName })).toBeVisible({ timeout: 30_000 });
    const members = page.getByRole('heading', { name: 'Members' }).locator('xpath=ancestor::section[1]');
    await expect(members.getByText('Owner', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(members.getByText('Smoke org-member')).toBeVisible({ timeout: 30_000 });
  } finally {
    await memberContext.close();
  }
});
