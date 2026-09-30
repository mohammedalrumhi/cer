// Editor happy path on desktop and mobile viewports (see playwright.config.js projects).
import { expect, test } from '@playwright/test';
import { authed, authenticate, login } from '../support/api.js';

const TEMPLATE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';

let token;

test.beforeAll(async () => {
  token = await login();
});

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, token);
  await page.goto(`/templates/${TEMPLATE_ID}/edit`);
  await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
});

const state = (page, fn) => page.evaluate(fn);

/** Screen position of a document point. */
async function screenPoint(page, id, fx = 0.5, fy = 0.5) {
  return page.evaluate(({ elementId, rx, ry }) => {
    const { document, viewport } = window.__cerEditor.store.getState();
    const element = document.elements.find((el) => el.id === elementId);
    const node = window.__cerEditor.stage().findOne(`#${elementId}`);
    const height = element.height ?? node.height();
    const rect = window.document.querySelector('[data-testid=editor-canvas]').getBoundingClientRect();
    return {
      x: rect.left + viewport.x + (element.x + element.width * rx) * viewport.zoom,
      y: rect.top + viewport.y + (element.y + height * ry) * viewport.zoom,
    };
  }, { elementId: id, rx: fx, ry: fy });
}

async function elementX(page, id) {
  return page.evaluate((elementId) => window.__cerEditor.store.getState().document.elements.find((el) => el.id === elementId).x, id);
}

test('select, drag, undo and redo an element', async ({ page }) => {
  const start = await elementX(page, 'student-name');
  const point = await screenPoint(page, 'student-name');

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 20, point.y + 10, { steps: 4 });
  await page.mouse.move(point.x + 60, point.y + 30, { steps: 4 });
  await page.mouse.up();

  expect(await state(page, () => window.__cerEditor.store.getState().selection.ids)).toEqual(['student-name']);
  const zoom = await state(page, () => window.__cerEditor.store.getState().viewport.zoom);
  const moved = await elementX(page, 'student-name');
  expect(moved - start).toBeCloseTo(60 / zoom, 0);
  // One drag = one undo step.
  expect(await state(page, () => window.__cerEditor.store.getState().history.past.length)).toBe(1);

  await page.keyboard.press('ControlOrMeta+z');
  expect(await elementX(page, 'student-name')).toBe(start);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(await elementX(page, 'student-name')).toBe(moved);
});

test('nudges with arrow keys and saves across a reload', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcuts are desktop-only');
  const point = await screenPoint(page, 'body-2');
  await page.mouse.click(point.x, point.y);
  const start = await elementX(page, 'body-2');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await elementX(page, 'body-2')).toBe(start + 11);

  await page.getByRole('button', { name: 'حفظ' }).click();
  await expect(page.getByRole('status')).toHaveText('تم الحفظ بنجاح');
  await page.reload();
  await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
  expect(await elementX(page, 'body-2')).toBe(start + 11);

  // Restore the shared fixture for other tests.
  const api = authed(token);
  const template = await api.get(`/templates/${TEMPLATE_ID}`);
  template.elements = template.elements.map((el) => (el.id === 'body-2' ? { ...el, x: start } : el));
  await fetch(`http://localhost:4310/api/templates/${TEMPLATE_ID}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(template),
  });
});

test('context menu duplicates the selection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'long-press menu arrives in phase 3');
  const before = await state(page, () => window.__cerEditor.store.getState().document.elements.length);
  const point = await screenPoint(page, 'title');
  await page.mouse.click(point.x, point.y, { button: 'right' });
  await page.getByRole('menuitem', { name: /تكرار/ }).click();
  expect(await state(page, () => window.__cerEditor.store.getState().document.elements.length)).toBe(before + 1);
  const selected = await state(page, () => window.__cerEditor.store.getState().selection.ids);
  expect(selected).toHaveLength(1);
  expect(selected[0]).not.toBe('title');
});

test('edits text in place', async ({ page }) => {
  const point = await screenPoint(page, 'body-2');
  await page.mouse.dblclick(point.x, point.y);
  const editor = page.getByRole('textbox', { name: 'تحرير النص' });
  await expect(editor).toBeVisible();
  await editor.fill('مع خالص الشكر\nوالتقدير');
  await editor.press('ControlOrMeta+Enter');
  await expect(editor).toBeHidden();
  const text = await state(page, () => window.__cerEditor.store.getState().document.elements.find((el) => el.id === 'body-2').text);
  expect(text).toBe('مع خالص الشكر\nوالتقدير');
});

test('previews the PDF', async ({ page, isMobile }) => {
  const trigger = isMobile ? page.getByRole('button', { name: 'معاينة' }) : page.getByRole('button', { name: 'معاينة PDF' });
  const [popup] = await Promise.all([page.waitForEvent('popup'), trigger.click()]);
  expect(popup.url()).toMatch(/^blob:/);
});
