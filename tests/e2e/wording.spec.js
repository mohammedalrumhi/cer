// The congratulation sentence opens as editable words and can be joined into one line.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';
import { editorState, openEditor, scratchTemplate } from '../support/editor.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';

test.skip(({ isMobile }) => isMobile, 'properties panel on desktop');

test('joins the congratulation sentence into one line', async ({ context, page }) => {
  const token = await login();
  await authenticate(context, token);
  await openEditor(page, await scratchTemplate(token, SOURCE_ID));
  await page.evaluate(() => window.__cerEditor.store.getState().addElements([{
    id: 'congrats', type: 'dynamicText', field: 'recipientAchievementSentence', dynamicTextTemplate: '', x: 100, y: 100, width: 700,
    fontSize: 32, fontFamily: 'Cairo-SemiBold', fill: '#0f6b52', align: 'center', rotation: 0, opacity: 1, locked: false, visible: true,
  }]));
  const sentence = { id: 'congrats' };
  await page.evaluate((id) => window.__cerEditor.store.getState().select([id]), sentence.id);
  await page.evaluate(() => window.__cerEditor.store.getState().setUi({ propertiesOpen: true }));
  const text = page.getByTestId('prop-text');
  await expect(text).toHaveValue(/بنجاح \{\{.+\}\}/);
  await page.getByTestId('text-one-line').click();
  const updated = (await editorState(page)).document.elements.find((el) => el.id === sentence.id);
  expect(updated.dynamicTextTemplate).not.toContain('\n');
  expect(updated.dynamicTextTemplate).toContain('{{recipientTitle}}');
});
