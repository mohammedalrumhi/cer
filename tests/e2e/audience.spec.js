// Students vs adult learners: the wizard prints a template for either group.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';

test('choosing the group changes the wording for the whole batch', async ({ context, page }) => {
  await authenticate(context, await login());
  await page.goto(`/generate?template=${SOURCE_ID}`);
  const section = page.getByTestId('wizard-audience');
  await expect(section).toBeVisible();
  await section.getByRole('radio', { name: 'الدارسون' }).click();
  await expect(section).toContainText('«الدارسة» للنساء');
  await page.getByTestId('wizard-next').click();
  await expect(page.getByText(/· الدارسون/)).toBeVisible();
});
