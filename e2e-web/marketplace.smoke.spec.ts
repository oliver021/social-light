import { test, expect, type Page } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

/** The visible copy of a control (the sidebar and the bottom bar both exist in the DOM). */
const visible = (page: Page, role: Parameters<Page['getByRole']>[0], name: string | RegExp) =>
  page.getByRole(role, { name }).locator('visible=true').first();

async function openMarketplace(page: Page) {
  await visible(page, 'button', /^Marketplace(,|$)/).click();
  await expect(page.locator('#marketplace-tab-page')).toBeVisible({ timeout: 30_000 });
}

test('a member loads the whole catalog, runs a smart search and opens a product', async ({ page }) => {
  test.setTimeout(180_000);
  await registerFreshUser(page, 'market');
  await openMarketplace(page);

  const market = page.locator('#marketplace-tab-page');
  const cards = market.locator('article');

  // The seeded catalog has 101 products; "Load more" appends pages of 24 until none remain.
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 10; i++) {
    const more = market.getByRole('button', { name: 'Load more' });
    if (!(await more.isVisible())) break;
    // After the last page the button disappears, so wait for the cards to grow instead.
    const before = await cards.count();
    await more.click();
    await expect.poll(() => cards.count(), { timeout: 30_000 }).toBeGreaterThan(before);
  }
  await expect(market.getByRole('status')).toContainText('101 products', { timeout: 30_000 });
  await expect(cards).toHaveCount(101, { timeout: 30_000 });

  // Smart search (pgvector) returns results for a related phrase.
  await market.getByRole('textbox', { name: 'Search the marketplace' }).fill('running shoes');
  await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  expect(await cards.count()).toBeGreaterThan(0);

  // Opening a product shows its detail with a stock state.
  await market.getByRole('button', { name: /^View / }).first().click();
  const dialog = page.getByRole('dialog').first();
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText(/^(In stock|Out of stock)$/)).toBeVisible({ timeout: 30_000 });
});
