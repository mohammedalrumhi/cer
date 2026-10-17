// The template card's "…" menu: opens (it used to blank the page) and its links work.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';

test('template card menu opens and «edit» opens the editor', async ({ context, page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await authenticate(context, await login());
  await page.goto('/');
  await page.getByTestId('template-menu').first().click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem')).toHaveCount(5);
  await menu.getByRole('menuitem').first().click();
  await expect(page).toHaveURL(/\/templates\/.+\/edit/);
  expect(errors).toEqual([]);
});
