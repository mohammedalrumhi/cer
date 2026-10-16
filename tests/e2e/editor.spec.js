// Editor happy path on desktop and mobile viewports (see playwright.config.js projects).
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';
import { drag, editorState, elementById, openEditor, scratchTemplate, screenPoint } from '../support/editor.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';
let token;
let templateId;

test.beforeAll(async () => {
  token = await login();
});

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, token);
  templateId = await scratchTemplate(token, SOURCE_ID);
  await openEditor(page, templateId);
});

test('select, drag, undo and redo an element', async ({ page }) => {
  const start = (await elementById(page, 'student-name')).x;
  const point = await screenPoint(page, 'student-name');
  await page.keyboard.down('Alt'); // no snapping, so the move is exact
  await drag(page, point, { x: point.x + 60, y: point.y + 30 });
  await page.keyboard.up('Alt');

  const { selection, past } = await editorState(page);
  expect(selection).toEqual(['student-name']);
  const zoom = await page.evaluate(() => window.__cerEditor.store.getState().viewport.zoom);
  const moved = (await elementById(page, 'student-name')).x;
  expect(moved - start).toBeCloseTo(60 / zoom, 0);
  expect(past).toBe(1); // one drag = one undo step

  await page.getByTestId('undo').click();
  expect((await elementById(page, 'student-name')).x).toBe(start);
  await page.getByTestId('redo').click();
  expect((await elementById(page, 'student-name')).x).toBe(moved);
});

test('nudges with arrow keys and autosaves across a reload', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcuts are desktop-only');
  const point = await screenPoint(page, 'body-2');
  await page.mouse.click(point.x, point.y);
  const start = (await elementById(page, 'body-2')).x;
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect((await elementById(page, 'body-2')).x).toBe(start + 11);
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10000 });
  await page.reload();
  await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
  expect((await elementById(page, 'body-2')).x).toBe(start + 11);
});

test('context menu duplicates the selection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'right-click is desktop-only');
  const before = (await editorState(page)).document.elements.length;
  const point = await screenPoint(page, 'title');
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.getByRole('menuitem', { name: /تكرار/ }).click();
  const after = await editorState(page);
  expect(after.document.elements.length).toBe(before + 1);
  expect(after.selection).toHaveLength(1);
  expect(after.selection[0]).not.toBe('title');
});

test('edits text in place as one undo step', async ({ page }) => {
  const point = await screenPoint(page, 'body-2');
  await page.mouse.dblclick(point.x, point.y);
  const editor = page.getByRole('textbox', { name: 'تحرير النص' });
  await expect(editor).toBeVisible();
  await editor.fill('مع خالص الشكر');
  await editor.pressSequentially('\nوالتقدير');
  await editor.press('ControlOrMeta+Enter');
  await expect(editor).toBeHidden();
  const { document, past } = await editorState(page);
  expect(document.elements.find((el) => el.id === 'body-2').text).toBe('مع خالص الشكر\nوالتقدير');
  expect(past).toBe(1);
});

test('previews the PDF', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the file menu is checked on desktop');
  await page.getByTestId('editor-more').click();
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('menuitem', { name: 'معاينة PDF' }).click()]);
  expect(popup.url()).toMatch(/^blob:/);
});
