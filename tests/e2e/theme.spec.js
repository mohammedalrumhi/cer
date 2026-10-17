// Light is the default theme, even when the device prefers dark; a saved choice still wins.
import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'dark' });

test('opens in light mode by default and keeps a saved choice', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => localStorage.setItem('cer:theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
