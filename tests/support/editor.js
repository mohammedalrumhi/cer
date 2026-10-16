import { authed } from './api.js';

/** Copy a stored template into a fresh one, so a test can edit (and autosave) freely. */
export async function scratchTemplate(token, fromId, patch = {}) {
  const api = authed(token);
  const source = await api.get(`/templates/${fromId}`);
  const { id: _id, version: _v, availableBackgroundVariants: _a, ...rest } = source;
  const response = await api.post('/templates', { ...rest, name: `اختبار ${Date.now()}`, ...patch });
  return (await response.json()).id;
}

export async function openEditor(page, templateId) {
  await page.goto(`/templates/${templateId}/edit`);
  await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
  // The UI web font changes the toolbar height when it arrives, which moves the canvas.
  await page.evaluate(() => document.fonts.ready);
}

export const editorState = (page) => page.evaluate(() => {
  const { document, selection, history } = window.__cerEditor.store.getState();
  return { document, selection: selection.ids, past: history.past.length };
});

export const elementById = (page, id) => page.evaluate((elementId) => window.__cerEditor.store.getState().document.elements.find((el) => el.id === elementId), id);

/** Screen position of a point inside an element (fractions of its scene box). */
export async function screenPoint(page, id, fx = 0.5, fy = 0.5) {
  return page.evaluate(({ elementId, rx, ry }) => {
    const state = window.__cerEditor.store.getState();
    const box = state.boxes.get(elementId);
    const { viewport } = state;
    const rect = window.document.querySelector('[data-testid=editor-canvas]').getBoundingClientRect();
    return { x: rect.left + viewport.x + (box.x + box.width * rx) * viewport.zoom, y: rect.top + viewport.y + (box.y + box.height * ry) * viewport.zoom };
  }, { elementId: id, rx: fx, ry: fy });
}

/** Screen position of a document point. */
export async function docToScreen(page, x, y) {
  return page.evaluate(({ px, py }) => {
    const { viewport } = window.__cerEditor.store.getState();
    const rect = window.document.querySelector('[data-testid=editor-canvas]').getBoundingClientRect();
    return { x: rect.left + viewport.x + px * viewport.zoom, y: rect.top + viewport.y + py * viewport.zoom };
  }, { px: x, py: y });
}

export async function drag(page, from, to, steps = 8) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 2 });
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}
