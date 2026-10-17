// Visual regression: the editor canvas must match the generated PDF.
//
// For every stored template and every built-in preset:
//  • each text element is rendered alone (black, on white, at 3×) in the editor and in the PDF;
//    the renders must coincide (sub-pixel offset, ink coverage IoU, ink amount — see thresholds);
//  • the full page (backgrounds, images, shapes, text) must differ on ≤ MAX_PAGE_MISMATCH of pixels.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { templatePresets } from '../../frontend/src/data/presets.js';
import { studioElementsTemplate } from './fixtures/studioElements.js';
import { STARTERS, buildStarter } from '../../shared/templates/index.js';
import { authed, authenticate, login } from '../support/api.js';
import { rasterizePdf } from '../support/pdfRaster.js';
import { inkIoU, pageDiff } from '../support/imageCompare.js';

// Text is compared at print resolution (3 px per template px ≈ 216 dpi for A4 templates), where
// the remaining differences between rasterisers (Skia vs pdf.js anti-aliasing) are negligible.
const TEXT_SCALE = 3;
// Small text is measured at a higher resolution (≥ 100 device px per em), so anti-aliased edge
// pixels don't dominate thin strokes; the thresholds stay the same.
const textScale = (element) => Math.min(8, Math.max(TEXT_SCALE, Math.ceil(100 / (Number(element.fontSize) || 28))));
const MIN_TEXT_IOU = 0.95; // blurred ≥50 % coverage IoU; a ⅓ px shift already scores ≤ 0.87
const MAX_TEXT_OFFSET = 0.1; // template px, best-fit sub-pixel offset between editor and PDF
const MAX_INK_DIFFERENCE = 0.03;
const MAX_PAGE_MISMATCH = 0.01;
const OUT = 'test-results/fidelity';

// Targets are known up front so every test is named after its template. Managed colour
// variants (itqan-template-5-<colour>-…) are served as their base template, so only bases run.
const storedTemplates = JSON.parse(readFileSync(new URL('../../backend/data/templates.json', import.meta.url), 'utf8'))
  .filter((template) => !/^itqan-template-5-(?!students$|adults$)/.test(template.id));
const targets = [
  ...storedTemplates.map((template) => ({ key: template.id, label: template.id.slice(0, 34) })),
  ...templatePresets.map((preset) => ({ key: `preset:${preset.id}`, preset: preset.id, label: `preset:${preset.id}` })),
  { key: 'fixture:studio-elements', preset: 'studio-elements', label: 'fixture:studio-elements' },
  ...STARTERS.map((starter) => ({ key: `starter:${starter.id}`, preset: `starter-${starter.id}`, label: `starter:${starter.id}` })),
];
const FIXTURES = [
  { id: 'studio-elements', payload: studioElementsTemplate },
  ...STARTERS.map((starter) => ({ id: `starter-${starter.id}`, payload: buildStarter(starter.id) })),
];

let token;
let api;
const presetTemplateIds = new Map();

// Idempotent (Playwright restarts the worker after a failure and re-runs beforeAll).
test.beforeAll(async () => {
  token = await login();
  api = authed(token);
  const existing = await api.get('/templates');
  for (const preset of [...templatePresets, ...FIXTURES]) {
    let template = existing.find((item) => item.e2ePreset === preset.id);
    if (!template) template = await (await api.post('/templates', { ...preset.payload, e2ePreset: preset.id })).json();
    presetTemplateIds.set(preset.id, template.id);
  }
  mkdirSync(`${OUT}/rows`, { recursive: true });
});

test.afterAll(() => {
  const rows = readdirSync(`${OUT}/rows`).sort().map((file) => JSON.parse(readFileSync(`${OUT}/rows/${file}`, 'utf8')));
  writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 2));
  const lines = rows.map((row) => `${row.label.padEnd(36)} text=${String(row.textCount).padStart(2)}  minIoU=${row.minIoU.toFixed(3)}  meanIoU=${row.meanIoU.toFixed(3)}  maxOffset=${row.maxOffset.toFixed(3)}px  page=${(row.pageMismatch * 100).toFixed(2)}%`);
  console.log(`\nEditor ↔ PDF fidelity (${rows.length} templates)\n${lines.join('\n')}`);
});

async function pdfFor(template, student, branding) {
  const response = await api.post('/certificates/preview', { template, students: [student], branding });
  expect(response.ok, `preview failed for ${template.id}`).toBeTruthy();
  return Buffer.from(await response.arrayBuffer());
}

async function exportEditorPage(page) {
  const dataUrl = await page.evaluate(() => window.__cerEditor.exportPage(1));
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/** Render one element alone at `scale`, cropped to its padded bounds (template units). */
async function exportEditorElement(page, id, scale) {
  const { dataUrl, region } = await page.evaluate(({ elementId, pixelRatio }) => {
    const stage = window.__cerEditor.stage();
    const pageGroup = stage.findOne('.page');
    const ui = [...stage.find('.ui'), ...stage.find('.guides')];
    const children = pageGroup.getChildren();
    const previous = { visible: children.map((node) => node.visible()), x: pageGroup.x(), y: pageGroup.y(), scale: pageGroup.scaleX() };
    children.forEach((node) => node.visible(node.id() === elementId));
    ui.forEach((node) => node.hide());
    pageGroup.position({ x: 0, y: 0 });
    pageGroup.scale({ x: 1, y: 1 });
    try {
      const box = pageGroup.findOne(`#${elementId}`).getClientRect({ relativeTo: pageGroup });
      const pad = 8;
      const r = {
        x: Math.floor(box.x - pad),
        y: Math.floor(box.y - pad),
        width: Math.ceil(box.width + pad * 2),
        height: Math.ceil(box.height + pad * 2),
      };
      return { region: r, dataUrl: stage.toDataURL({ ...r, pixelRatio }) };
    } finally {
      children.forEach((node, index) => node.visible(previous.visible[index]));
      ui.forEach((node) => node.show());
      pageGroup.position({ x: previous.x, y: previous.y });
      pageGroup.scale({ x: previous.scale, y: previous.scale });
    }
  }, { elementId: id, pixelRatio: scale });
  return { png: Buffer.from(dataUrl.split(',')[1], 'base64'), region };
}

for (const [index, target] of targets.entries()) {
  test(`${target.label} renders identically in editor and PDF`, async ({ browser }) => {
    const templateId = target.preset ? presetTemplateIds.get(target.preset) : target.key;

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await authenticate(context, token);
    const page = await context.newPage();
    await page.goto(`/templates/${templateId}/edit`);
    await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();
    await page.waitForLoadState('networkidle');

    const { document, sampleStudent, branding } = await page.evaluate(() => ({
      document: window.__cerEditor.store.getState().document,
      sampleStudent: window.__cerEditor.sampleStudent,
      branding: window.__cerEditor.branding,
    }));
    const size = { width: Math.round(document.width), height: Math.round(document.height) };
    const slug = target.label.replace(/[^\w-]+/g, '_').slice(0, 40);

    // Full page.
    const editorPage = await exportEditorPage(page);
    const pdfPage = await rasterizePdf(context, await pdfFor(document, sampleStudent, branding));
    const { ratio, diffPng } = pageDiff(editorPage, pdfPage, size);
    writeFileSync(`${OUT}/${slug}-editor.png`, editorPage);
    writeFileSync(`${OUT}/${slug}-pdf.png`, pdfPage);
    writeFileSync(`${OUT}/${slug}-diff.png`, diffPng);

    // Each text element alone, forced to opaque black so ink is comparable (never saved).
    await page.evaluate(() => window.__cerEditor.stopAutosave());
    const texts = document.elements.filter((el) => ['text', 'dynamicText', 'dateField'].includes(el.type) && el.visible !== false);
    await page.evaluate((ids) => {
      window.__cerEditor.store.getState().updateElements(ids, (el) => ({ ...el, fill: '#000000', opacity: 1 }));
    }, texts.map((el) => el.id));
    await page.locator('[data-testid=editor-canvas][data-scene-ready=true]').waitFor();

    const results = [];
    for (const element of texts) {
      const scale = textScale(element);
      const { png: editorPng, region } = await exportEditorElement(page, element.id, scale);
      const isolated = {
        ...document,
        background: { type: 'solid', color: '#ffffff', customLayout: true },
        elements: [{ ...element, fill: '#000000', opacity: 1 }],
      };
      const pdfPng = await rasterizePdf(context, await pdfFor(isolated, sampleStudent, branding), { scale, region });
      const metrics = inkIoU(editorPng, pdfPng, { width: region.width * scale, height: region.height * scale });
      if (metrics.inkPixels > 0) results.push({ id: element.id, scale, ...metrics, offset: Math.max(metrics.dx, metrics.dy) / scale });
      if (metrics.inkPixels > 0 && metrics.iou < MIN_TEXT_IOU) {
        writeFileSync(`${OUT}/${slug}-${element.id}-editor.png`, editorPng);
        writeFileSync(`${OUT}/${slug}-${element.id}-pdf.png`, pdfPng);
      }
    }

    const ious = results.map((row) => row.iou);
    const row = {
      label: target.label,
      id: templateId,
      textCount: results.length,
      minIoU: ious.length ? Math.min(...ious) : 1,
      meanIoU: ious.length ? ious.reduce((a, b) => a + b, 0) / ious.length : 1,
      maxOffset: Math.max(0, ...results.map((r) => r.offset)),
      pageMismatch: ratio,
      elements: results,
    };
    writeFileSync(`${OUT}/rows/${String(index).padStart(2, '0')}.json`, JSON.stringify(row, null, 2));
    await context.close();

    for (const result of results) {
      expect.soft(result.iou, `${target.label} › ${result.id} ink IoU`).toBeGreaterThanOrEqual(MIN_TEXT_IOU);
      expect.soft(result.offset, `${target.label} › ${result.id} offset`).toBeLessThanOrEqual(MAX_TEXT_OFFSET);
      expect.soft(Math.abs(result.inkRatio - 1), `${target.label} › ${result.id} ink amount`).toBeLessThanOrEqual(MAX_INK_DIFFERENCE);
    }
    expect.soft(ratio, `${target.label} full-page mismatch`).toBeLessThanOrEqual(MAX_PAGE_MISMATCH);
  });
}
