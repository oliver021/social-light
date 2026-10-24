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
