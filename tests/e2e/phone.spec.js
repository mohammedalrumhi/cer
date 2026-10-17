// The editor on a phone: bottom tab bar, bottom sheets, tap to select, pinch to zoom, tap to add.
import { expect, test } from '@playwright/test';
import { authenticate, login } from '../support/api.js';
import { editorState, openEditor, scratchTemplate, screenPoint } from '../support/editor.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';
let token;

test.skip(({ isMobile }) => !isMobile, 'phone layout');

test.beforeAll(async () => {
  token = await login();
});

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, token);
  await openEditor(page, await scratchTemplate(token, SOURCE_ID));
});

test('fits the phone: no sideways scroll, tabs at the bottom, whole page visible', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const rail = await page.getByRole('navigation', { name: 'لوحات المحرر' }).boundingBox();
  const canvas = await page.getByTestId('editor-canvas').boundingBox();
  expect(rail.y).toBeGreaterThan(canvas.y + canvas.height - 1);
  for (const id of ['templates', 'layers']) {
    const tab = await page.getByTestId(`rail-${id}`).boundingBox();
    expect(tab.x).toBeGreaterThanOrEqual(0);
    expect(tab.x + tab.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  }
  await expect(page.getByTestId('editor-generate')).toBeInViewport();
});

test('tap selects, one finger on empty space pans, two fingers pinch-zoom', async ({ page }) => {
  const { document } = await editorState(page);
  const target = document.elements.find((el) => !el.locked && el.visible !== false && ['text', 'dynamicText'].includes(el.type));
  const point = await screenPoint(page, target.id);
  await page.touchscreen.tap(point.x, point.y);
  await expect.poll(async () => (await editorState(page)).selection).toEqual([target.id]);

  const cdp = await page.context().newCDPSession(page);
  const canvas = await page.getByTestId('editor-canvas').boundingBox();
  const cx = canvas.x + canvas.width / 2;
  const top = canvas.y + 20;
  const before = await page.evaluate(() => ({ ...window.__cerEditor.store.getState().viewport }));
  // One finger near the top edge (outside the page) pans.
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: top, id: 1 }] });
  for (let i = 1; i <= 5; i += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: top + i * 20, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const panned = await page.evaluate(() => ({ ...window.__cerEditor.store.getState().viewport }));
  expect(panned.y - before.y).toBeGreaterThan(60);
  expect(panned.zoom).toBeCloseTo(before.zoom, 5);

  // Two fingers moving apart zoom in.
  const cy = canvas.y + canvas.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }] });
  for (let i = 1; i <= 6; i += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx - 40 - i * 15, y: cy, id: 1 }, { x: cx + 40 + i * 15, y: cy, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const zoomed = await page.evaluate(() => window.__cerEditor.store.getState().viewport.zoom);
  expect(zoomed / panned.zoom).toBeGreaterThan(1.8);
});

test('panels open as bottom sheets; tapping an item adds it and closes the sheet', async ({ page }) => {
  const count = (await editorState(page)).document.elements.length;
  await page.getByTestId('rail-fields').tap();
  const sheet = page.getByTestId('panel-fields');
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box.width).toBeGreaterThan(page.viewportSize().width - 2);
  await page.getByTestId('field-gender-text').tap();
  await expect(sheet).toBeHidden();
  const { document } = await editorState(page);
  expect(document.elements.length).toBe(count + 1);
  expect(document.elements.at(-1).text).toBe('{{المتميّز|المتميّزة}}');
});
