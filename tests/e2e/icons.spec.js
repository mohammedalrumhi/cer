// The Islamic icon set: listed under its own heading, found by Arabic search, added as an icon.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';
import { editorState, openEditor, scratchTemplate } from '../support/editor.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';

test('adds an Islamic icon from the elements panel', async ({ context, page, isMobile }) => {
  const token = await login();
  await authenticate(context, token);
  await openEditor(page, await scratchTemplate(token, SOURCE_ID));
  const count = (await editorState(page)).document.elements.length;
  const panel = page.getByTestId('panel-elements');
  // Desktop opens with this panel already showing; phones start with no sheet open.
  if (!(await panel.isVisible())) await page.getByTestId('rail-elements').click();
  await expect(panel.getByRole('heading', { name: 'أيقونات إسلامية' })).toBeVisible();
  await panel.getByRole('searchbox').fill('مسجد');
  const tile = panel.getByTestId('icon-islamic-mosque');
  await (isMobile ? tile.tap() : tile.click());
  const { document } = await editorState(page);
  expect(document.elements.length).toBe(count + 1);
  const added = document.elements.at(-1);
  expect(added.type).toBe('icon');
  expect(added.paths.length).toBeGreaterThan(5);
});
