// Phase 2 editor features: snapping, multi-select + align, crop, long undo/redo, autosave conflict,
// drag from the panels and the shortcuts sheet. Desktop only (pointer + keyboard).
import { expect, test } from '@playwright/test';
import { authed, authenticate, login } from '../support/api.js';
import { docToScreen, drag, editorState, elementById, openEditor, scratchTemplate, screenPoint } from '../support/editor.js';

const SOURCE_ID = 'c0574e38-b6a6-4770-b0a9-4637ab6d1e61';
let token;
let templateId;

test.skip(({ isMobile }) => isMobile, 'desktop interactions');

test.beforeAll(async () => {
  token = await login();
});

test.beforeEach(async ({ context, page }) => {
  await authenticate(context, token);
  templateId = await scratchTemplate(token, SOURCE_ID);
  await openEditor(page, templateId);
});

const addRect = (page, props) => page.evaluate((p) => {
  const state = window.__cerEditor.store.getState();
  state.addElements([{ type: 'rect', rotation: 0, opacity: 1, locked: false, visible: true, fill: '#0f6b52', stroke: null, strokeWidth: 0, cornerRadius: 0, ...p }]);
}, props);

test('snaps a dragged element to the page centre and shows a guide', async ({ page }) => {
  await addRect(page, { id: 'snap-me', x: 100, y: 600, width: 100, height: 60 });
  const { width } = (await editorState(page)).document;
  const from = await screenPoint(page, 'snap-me');
  // Drop 3 px (document) to the side of the centre line: the snap threshold pulls it in.
  const target = await docToScreen(page, width / 2 + 3, 630);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y, { steps: 2 });
  await page.mouse.move(target.x, target.y, { steps: 10 });
  const guides = await page.evaluate(() => window.__cerEditor.stage().find('Line').filter((line) => line.getLayer()?.name() === 'guides').length);
  expect(guides).toBeGreaterThan(0);
  await page.mouse.up();
  const el = await elementById(page, 'snap-me');
  // Snapped to the centre line (or a neighbour's centre right next to it), not left 3 px off.
  expect(Math.abs(el.x + el.width / 2 - width / 2)).toBeLessThanOrEqual(1);
});

test('marquee-selects several elements and aligns them to the left', async ({ page }) => {
  await addRect(page, { id: 'm1', x: 120, y: 520, width: 60, height: 40 });
  await addRect(page, { id: 'm2', x: 200, y: 560, width: 80, height: 40 });
  await addRect(page, { id: 'm3', x: 160, y: 600, width: 40, height: 40 });
  await page.evaluate(() => window.__cerEditor.store.getState().clearSelection());
  // Lock everything else so the marquee only catches the three new boxes.
  await page.evaluate(() => {
    const s = window.__cerEditor.store.getState();
    s.updateElements(s.document.elements.filter((el) => !['m1', 'm2', 'm3'].includes(el.id)).map((el) => el.id), (el) => ({ ...el, locked: true }));
  });
  const a = await docToScreen(page, 110, 510);
  const b = await docToScreen(page, 290, 650);
  await drag(page, a, b);
  expect((await editorState(page)).selection.sort()).toEqual(['m1', 'm2', 'm3']);
  await page.getByTestId('align-left').click();
  const xs = await Promise.all(['m1', 'm2', 'm3'].map(async (id) => (await elementById(page, id)).x));
  expect(new Set(xs).size).toBe(1);
  expect(xs[0]).toBe(120);
});

test('crops an image in its frame with Enter', async ({ page }) => {
  await page.evaluate(() => {
    window.__cerEditor.store.getState().addElements([{ id: 'photo', type: 'frame', shape: 'rect', src: 'uploads/itqan-logo.png', x: 300, y: 300, width: 200, height: 120, rotation: 0, opacity: 1, locked: false, visible: true, fit: 'cover', crop: null, filters: {} }]);
  });
  await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
  const point = await screenPoint(page, 'photo');
  await page.mouse.dblclick(point.x, point.y);
  await expect.poll(() => page.evaluate(() => window.__cerEditor.store.getState().ui.cropId)).toBe('photo');
  await drag(page, point, { x: point.x + 30, y: point.y + 20 });
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__cerEditor.store.getState().ui.cropId)).toBe(null);
  const el = await elementById(page, 'photo');
  // A square logo in a wide frame covers it at full width and can only move vertically.
  expect(el.crop).toBeTruthy();
  expect(el.crop.height).toBeLessThan(1);
  expect(el.crop.y).not.toBeCloseTo((1 - el.crop.height) / 2, 3);
  expect(el.fit).toBe('cover');
});

test('undoes and redoes twenty different actions', async ({ page }) => {
  const original = (await editorState(page)).document;
  const point = await screenPoint(page, 'title');
  await page.mouse.click(point.x, point.y);
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('ArrowRight'); // each press + release is one step
  }
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('ControlOrMeta+d');
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+g');
  await page.keyboard.press('ControlOrMeta+Shift+g');
  await page.keyboard.press('ControlOrMeta+Shift+l');
  await page.keyboard.press('ControlOrMeta+Shift+l');
  const final = await editorState(page);
  expect(final.past).toBe(20);
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ControlOrMeta+z');
  expect(JSON.stringify((await editorState(page)).document.elements)).toBe(JSON.stringify(original.elements));
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('ControlOrMeta+Shift+z');
  expect(JSON.stringify((await editorState(page)).document.elements)).toBe(JSON.stringify(final.document.elements));
});

test('a save conflict asks, and "keep my changes" wins', async ({ page }) => {
  const api = authed(token);
  const stored = await api.get(`/templates/${templateId}`);
  // Someone else saves first.
  await fetch(`http://localhost:4310/api/templates/${templateId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ ...stored, name: 'تعديل من مكان آخر', baseVersion: stored.version }),
  });
  const point = await screenPoint(page, 'title');
  await page.mouse.click(point.x, point.y);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'conflict', { timeout: 10000 });
  await page.getByTestId('conflict-keep').click();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved', { timeout: 10000 });
  const after = await api.get(`/templates/${templateId}`);
  expect(after.elements.find((el) => el.id === 'title').y).toBe(stored.elements.find((el) => el.id === 'title').y + 1);
});

test('drags a shape from the elements panel onto the page', async ({ page }) => {
  const before = (await editorState(page)).document.elements.length;
  const tile = page.getByTestId('tile-star');
  const box = await tile.boundingBox();
  const target = await docToScreen(page, 300, 300);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 20, { steps: 3 });
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.mouse.up();
  const after = (await editorState(page)).document.elements;
  expect(after.length).toBe(before + 1);
  const star = after[after.length - 1];
  expect(star.type).toBe('star');
  expect(star.x + star.width / 2).toBeCloseTo(300, -1);
});

test('opens the shortcuts sheet with ?', async ({ page }) => {
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByRole('dialog', { name: 'اختصارات لوحة المفاتيح' })).toBeVisible();
});
