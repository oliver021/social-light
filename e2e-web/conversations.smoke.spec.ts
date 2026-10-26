import { test, expect } from '@playwright/test';
import { registerFreshUser } from './helpers';

test.skip(!process.env.SL_WEB_URL, 'needs the running stack');

test('a comment, a reply to it and a like on the reply persist, and the reply stays nested after reload', async ({ page }) => {
  await registerFreshUser(page, 'conversations');
  const stamp = Date.now();
  const text = `smoke thread ${stamp}`;
  const comment = `smoke comment ${stamp}`;
  const reply = `smoke reply ${stamp}`;
  const name = 'Smoke conversations';

  // A post to talk under.
  await page.getByRole('textbox', { name: 'Post text' }).fill(text);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  const card = page.locator('article', { hasText: text });
  await expect(card).toBeVisible({ timeout: 30_000 });

  // A top-level comment.
  await card.getByRole('button', { name: 'Comment', exact: true }).click();
  await page.getByRole('textbox', { name: 'Write a comment' }).fill(comment);
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(card.getByText(comment)).toBeVisible({ timeout: 30_000 });

  // A reply to that comment: Enter sends it.
  await card.getByRole('button', { name: `Reply to ${name}` }).first().click();
  await page.getByRole('textbox', { name: `Write a reply to ${name}` }).fill(reply);
  await page.keyboard.press('Enter');
  await expect(card.getByText(reply)).toBeVisible({ timeout: 30_000 });

  // Like the reply (the second comment-like control of this name in the thread).
  await card.getByRole('button', { name: `Like comment by ${name}` }).nth(1).click();
  await expect(card.getByRole('button', { name: `Like comment by ${name}` }).nth(1)).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });

  // Reload: the reply is still there, still liked, and still in the thread.
  await page.reload();
  await expect(page.getByLabel('Password')).toBeHidden({ timeout: 30_000 });
  const reloaded = page.locator('article', { hasText: text });
  await reloaded.getByRole('button', { name: 'Comment', exact: true }).click();
  const thread = reloaded.getByRole('list', { name: 'Comments' });
  await expect(thread.getByText(reply)).toBeVisible({ timeout: 30_000 });
  await expect(thread.getByRole('button', { name: `Like comment by ${name}` }).nth(1)).toHaveAttribute('aria-pressed', 'true');
});
