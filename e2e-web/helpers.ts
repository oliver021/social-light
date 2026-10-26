import { expect, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';

/**
 * Register a brand-new account through the sign-up card and wait until the signed-in
 * shell replaces the auth card. Every credential is generated here; no password is
 * hard-coded in any spec.
 */
export async function registerFreshUser(page: Page, tag: string): Promise<{ email: string; password: string }> {
  const email = `smoke-${tag}-${Date.now()}@example.test`;
  const password = `Sl!${randomBytes(6).toString('hex')}a1`;

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.getByLabel('Display name').fill(`Smoke ${tag}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();

  await expect(page.getByLabel('Password')).toBeHidden({ timeout: 30_000 });
  return { email, password };
}

/**
 * Open a person from the People widget (its visible copy), landing on their profile. The
 * widget shows 5 people until "See all" is pressed, so expand it when the person is not
 * among them. The list is read at login: reload first if the person registered afterwards.
 */
export async function openPerson(page: Page, name: string): Promise<void> {
  const person = page.locator('button', { hasText: name }).locator('visible=true').first();
  if (!(await person.isVisible())) {
    const seeAll = page.getByRole('button', { name: /^See all/ }).locator('visible=true').first();
    if (await seeAll.isVisible()) await seeAll.click();
  }
  await person.click();
  await expect(page.locator('#profile-tab-page').getByRole('heading', { level: 2, name })).toBeVisible({ timeout: 30_000 });
}
