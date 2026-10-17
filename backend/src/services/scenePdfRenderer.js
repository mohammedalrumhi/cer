const fs = require('fs');
const PDFDocument = require('pdfkit');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const { loadSharedModule, loadModel } = require('../shared');
const { listFontFiles } = require('../utils/storagePaths');
const {
  loadImageAssets,
  normalizeUtf8,
  resolveElementImageSource,
  resolveImagePath,
} = require('./certificateData');

/*
 * PDF painter for the shared scene (shared/render). It mirrors frontend/src/editor/render/paintOps.js
 * step for step: same paths, same paint order, same transforms. Text is laid out by the same
 * HarfBuzz engine and written as vector outlines. PDFKit is only a vector writer here.
 */

let kitPromise = null;

function loadRenderKit() {
  if (!kitPromise) {
    kitPromise = (async () => {
      const [render, hb, bidiModule, qrModule] = await Promise.all([
        loadSharedModule('render/index.js'),
        import('harfbuzzjs'),
        import('bidi-js'),
        import('qrcode-generator'),
      ]);
      const bidiFactory = bidiModule.default || bidiModule;
      return { render, qrcode: qrModule.default || qrModule, engine: render.createTextEngine({ hb, bidi: bidiFactory() }) };
    })();
  }
  return kitPromise;
}

function ensureFonts(engine, keys, files) {
  for (const key of keys) {
    if (engine.hasFont(key)) continue;
    const file = files.find(({ fileName }) => fileName.replace(/\.(ttf|otf)$/i, '') === key);
    if (file) engine.registerFont(key, fs.readFileSync(file.filePath));
  }
}

/* ── Paint helpers ─────────────────────────────────────────────────────────────── */

/** PDFKit colour or gradient for a resolved paint (shared/render/paint.js). */
function pdfPaint(doc, resolved) {
  if (!resolved) return null;
  if (resolved.kind === 'solid') return resolved.color;
  const gradient = resolved.kind === 'radial'
    ? doc.radialGradient(resolved.cx, resolved.cy, 0, resolved.cx, resolved.cy, resolved.r)
    : doc.linearGradient(resolved.x0, resolved.y0, resolved.x1, resolved.y1);
  for (const stop of resolved.stops) gradient.stop(stop.offset, stop.color, stop.opacity);
  return gradient;
}

function strokeStyle(doc, { strokeWidth, lineCap = 'butt', lineJoin = 'miter', dash = null }) {
  doc.lineWidth(strokeWidth).lineCap(lineCap).lineJoin(lineJoin).miterLimit(10);
  if (dash && dash.length) doc.dash(dash.map((value) => Math.max(0.001, value)));
  else doc.undash();
}

function paintShape(doc, op) {
  for (const item of op.items) {
    if (!item.d) continue;
    if (item.fill) {
      doc.path(item.d);
      doc.fill(pdfPaint(doc, item.fill), item.evenOdd ? 'even-odd' : 'non-zero');
    }
    if (item.stroke && item.strokeWidth > 0) {
      strokeStyle(doc, item);
      doc.path(item.d);
      doc.stroke(item.stroke);
      doc.undash();
    }
  }
}

function paintText(doc, op, { engine, render }) {
  const plan = render.textPaintPlan(op, engine);
  if (!plan || !plan.d) return;

  if (plan.highlightD) {
    doc.save();
    doc.fillOpacity(op.opacity * plan.highlightOpacity);
    doc.path(plan.highlightD).fill(plan.highlightColor);
    doc.restore();
  }

  for (const copy of plan.shadows) {
    doc.save();
    doc.translate(copy.dx, copy.dy);
    doc.fillOpacity(op.opacity * copy.alpha);
    doc.strokeOpacity(op.opacity * copy.alpha);
    doc.path(plan.d).fill(plan.shadowColor);
    if (plan.outline) {
      strokeStyle(doc, { strokeWidth: plan.outline.width * 2, lineJoin: 'round' });
      doc.path(plan.d).stroke(plan.shadowColor);
    }
    doc.restore();
  }

  if (plan.outline) {
    strokeStyle(doc, { strokeWidth: plan.outline.width * 2, lineJoin: 'round', lineCap: 'round' });
    doc.path(plan.d).stroke(plan.outline.color);
  }

  const fill = pdfPaint(doc, op.fill) || '#0f172a';
  doc.path(plan.d).fill(fill);
  if (plan.boldStroke) {
    strokeStyle(doc, { strokeWidth: plan.boldStroke, lineJoin: 'round', lineCap: 'butt' });
    doc.path(plan.d).stroke(fill);
  }
}

function paintImage(doc, op, image, render) {
  if (!image) return;
  const rect = render.imageDrawRect(op, image.width, image.height);
  doc.save();
  if (op.clipD) doc.path(op.clipD).clip();
  doc.rect(0, 0, op.width, op.height).clip();
  if (op.flipX || op.flipY) {
    doc.translate(op.flipX ? op.width : 0, op.flipY ? op.height : 0);
    doc.scale(op.flipX ? -1 : 1, op.flipY ? -1 : 1);
  }
  try {
    doc.image(image, rect.x, rect.y, { width: rect.width, height: rect.height });
  } catch {
    // Unsupported image data: skip it rather than failing the whole certificate.
  }
  doc.restore();
  if (op.border) {
    strokeStyle(doc, { strokeWidth: op.border.width });
    doc.path(op.borderD).stroke(op.border.color);
  }
}

/* ── Images (with shared pixel filters) ───────────────────────────────────────── */

const filteredCache = new Map(); // process-wide: source key + filters → PNG buffer

function decodeImage(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: png.data };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  }
  return null;
}

function filteredBuffer(source, filters, render) {
  const key = `${typeof source === 'string' ? source : `buf:${source.length}:${source.subarray(0, 64).toString('base64')}`}|${render.filtersKey(filters)}`;
  if (!filteredCache.has(key)) {
    let result = null;
    try {
      const raw = typeof source === 'string' ? fs.readFileSync(source) : source;
      const decoded = decodeImage(raw);
      if (decoded) {
        render.applyFilters(decoded.data, decoded.width, decoded.height, filters);
        const png = new PNG({ width: decoded.width, height: decoded.height });
        png.data = Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength);
        result = PNG.sync.write(png);
      }
    } catch {
      result = null;
    }
    if (filteredCache.size > 64) filteredCache.delete(filteredCache.keys().next().value);
    filteredCache.set(key, result);
  }
  return filteredCache.get(key);
}

/** Per-document image loader: each source is embedded once, however many pages use it. */
function createImageLoader(doc, imageAssets, render) {
  const opened = new Map();
  return (op) => {
    const element = op.source.type === 'field'
      ? { type: 'dynamicImage', field: op.source.value }
      : { type: 'image', src: op.source.value };
    let source = resolveElementImageSource(element, imageAssets);
    if (!source) return null;
    const useFilters = render.hasFilters(op.filters);
    const key = `${typeof source === 'string' ? source : `buf:${source.length}:${source.subarray(0, 64).toString('base64')}`}|${useFilters ? render.filtersKey(op.filters) : ''}`;
    if (!opened.has(key)) {
      let image = null;
      try {
        if (useFilters) source = filteredBuffer(source, op.filters, render) || source;
        image = doc.openImage(source);
      } catch {
        image = null;
      }
      opened.set(key, image);
    }
    return opened.get(key);
  };
}

function paintBackground(doc, scene, loadBackground) {
  doc.save();
  doc.rect(0, 0, scene.width, scene.height).fill(pdfPaint(doc, scene.background.fill) || '#ffffff');
  const image = loadBackground(scene.background.imagePath);
  if (image) {
    try {
      if (scene.background.imageOpacity < 1) doc.fillOpacity(scene.background.imageOpacity);
      doc.image(image, 0, 0, { width: scene.width, height: scene.height });
    } catch {
      // Keep the solid background if the image can't be decoded.
    }
  }
  doc.restore();
}

function paintOp(doc, op, deps) {
  doc.save();
  doc.translate(op.x, op.y);
  if (op.rotation) doc.rotate(op.rotation, { origin: [0, 0] });
  doc.opacity(op.opacity);
  if (op.originY) doc.translate(0, -op.originY);
  if (op.kind === 'shape') paintShape(doc, op);
  else if (op.kind === 'text') paintText(doc, op, deps);
  else if (op.kind === 'image' && !op.placeholder) paintImage(doc, op, deps.loadImage(op), deps.render);
  doc.restore();
}

/** One certificate onto the current page at (x, y) scaled by `scale` (2-up sheets). */
function paintCertificate(doc, scene, deps, { x = 0, y = 0, scale = 1, clip = false } = {}) {
  doc.save();
  if (x || y) doc.translate(x, y);
  if (scale !== 1) doc.scale(scale, scale);
  // On a shared sheet, keep each certificate inside its own slot.
  if (clip) doc.rect(0, 0, scene.width, scene.height).clip();
  paintBackground(doc, scene, deps.loadBackground);
  for (const op of scene.ops) paintOp(doc, op, deps);
  doc.restore();
}

/* ── Documents ─────────────────────────────────────────────────────────────────── */

/**
 * Prepare everything needed to paint certificates of one template (fonts, engine, assets).
 * Reused by single PDFs, merged PDFs and the bulk job runner.
 */
async function prepareTemplate(rawTemplate, branding = {}) {
  const [{ render, engine, qrcode }, model] = await Promise.all([loadRenderKit(), loadModel()]);
  const template = model.migrateTemplate(rawTemplate);
  const files = listFontFiles();
  const registry = render.createFontRegistry(files.map(({ fileName }) => fileName));
  ensureFonts(engine, render.requiredFontKeys(template, registry), files);
  const imageAssets = loadImageAssets(branding);
  return {
    template,
    branding,
    render,
    engine,
    registry,
    imageAssets,
    sceneFor(student, extra = {}) {
      const values = model.buildFieldValues(student, branding, template, { title: model.getRecipientTitleForTemplate, sentence: model.getRecipientAchievementSentenceForTemplate }, extra);
      return render.buildScene(template, { engine, registry, values, qrcode });
    },
  };
}

const SHEET_LAYOUTS = {
  /** One certificate per page, at its own size. */
  '1up': null,
  /** Two certificates on one A4 sheet (stacked when landscape, side by side when portrait). */
  '2up': true,
};

// Templates are designed in CSS px (96 dpi; A4 landscape = 1123 × 794); PDF units are points.
const PX_TO_PT = 0.75;
const A4_PT = { long: 841.89, short: 595.28 };

/**
 * Printed size of one certificate: its 96-dpi size in points, scaled down to fit A4 (same
 * orientation) when larger, so "actual size" printing never crops (e.g. 1414 × 2000 → A4).
 */
function physicalPage(width, height) {
  const landscape = width >= height;
  const maxW = landscape ? A4_PT.long : A4_PT.short;
  const maxH = landscape ? A4_PT.short : A4_PT.long;
  let scale = PX_TO_PT;
  // 1 % tolerance keeps 1123 × 794 at exactly 96 dpi.
  if (width * scale > maxW * 1.01 || height * scale > maxH * 1.01) scale = Math.min(maxW / width, maxH / height);
  return { size: [width * scale, height * scale], scale };
}

function sheetGeometry(width, height) {
  // A4 in the same px-like units the templates use (1123 × 794 for landscape A4).
  const landscape = width >= height;
  const sheet = landscape ? { width: 794, height: 1123 } : { width: 1123, height: 794 };
  const margin = 24;
  const slots = landscape
    ? [{ x: margin, y: margin }, { x: margin, y: sheet.height / 2 + margin / 2 }]
    : [{ x: margin, y: margin }, { x: sheet.width / 2 + margin / 2, y: margin }];
  const slotW = landscape ? sheet.width - margin * 2 : sheet.width / 2 - margin * 1.5;
  const slotH = landscape ? sheet.height / 2 - margin * 1.5 : sheet.height - margin * 2;
  const scale = Math.min(slotW / width, slotH / height);
  // Laid out in px, then converted to points (the sheet becomes a real A4 page).
  return {
    sheet: { width: sheet.width * PX_TO_PT, height: sheet.height * PX_TO_PT },
    scale: scale * PX_TO_PT,
    slots: slots.map((slot) => ({
      x: (slot.x + (slotW - width * scale) / 2) * PX_TO_PT,
      y: (slot.y + (slotH - height * scale) / 2) * PX_TO_PT,
    })),
  };
}

/**
 * Render certificates into one PDF document.
 * @param {object} options
 * @param {Array<object>} options.students
 * @param {'1up'|'2up'} [options.layout]
 * @param {(student: object, index: number) => object} [options.extraFor] serial / verifyUrl per student
 * @param {import('stream').Writable} [options.output] stream the PDF here instead of buffering it
 * @param {(done: number, total: number) => void} [options.onProgress]
 * @param {() => boolean} [options.isCancelled]
 * @returns {Promise<Buffer|null>} the PDF bytes when no `output` stream is given
 */
async function renderCertificatesDocument({ template: rawTemplate, students, branding = {}, layout = '1up', extraFor, output, onProgress, isCancelled, prepared }) {
  const kit = prepared || await prepareTemplate(rawTemplate, branding);
  const { template } = kit;
  const width = Number(template.width) || 1123;
  const height = Number(template.height) || 794;
  const twoUp = SHEET_LAYOUTS[layout] && students.length > 0;
  const geometry = twoUp ? sheetGeometry(width, height) : null;
  const single = geometry ? null : physicalPage(width, height);
  const pageSize = geometry ? [geometry.sheet.width, geometry.sheet.height] : single.size;

  const doc = new PDFDocument({
    autoFirstPage: false,
    margin: 0,
    size: pageSize,
    info: {
      Title: normalizeUtf8(template.name || 'شهادات'),
      Author: normalizeUtf8(branding.schoolName || 'دار الإتقان العالي'),
      Creator: 'استوديو الشهادات',
    },
  });

  const chunks = [];
  let done;
  if (output) {
    doc.pipe(output);
    done = new Promise((resolve, reject) => {
      output.on('finish', () => resolve(null));
      output.on('error', reject);
      doc.on('error', reject);
    });
  } else {
    doc.on('data', (chunk) => chunks.push(chunk));
    done = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  const loadImage = createImageLoader(doc, kit.imageAssets, kit.render);
  const backgrounds = new Map();
  const loadBackground = (imagePath) => {
    if (!imagePath) return null;
    if (!backgrounds.has(imagePath)) {
      const file = resolveImagePath(imagePath);
      let image = null;
      try { image = file ? doc.openImage(file) : null; } catch { image = null; }
      backgrounds.set(imagePath, image);
    }
    return backgrounds.get(imagePath);
  };
  const deps = { engine: kit.engine, render: kit.render, loadImage, loadBackground };

  for (let index = 0; index < students.length; index += 1) {
    if (isCancelled?.()) break;
    const scene = kit.sceneFor(students[index], extraFor ? extraFor(students[index], index) : undefined);
    if (geometry) {
      const slot = index % geometry.slots.length;
      if (slot === 0) doc.addPage({ size: pageSize, margin: 0 });
      paintCertificate(doc, scene, deps, { ...geometry.slots[slot], scale: geometry.scale, clip: true });
    } else {
      doc.addPage({ size: pageSize, margin: 0 });
      paintCertificate(doc, scene, deps, { scale: single.scale });
    }
    onProgress?.(index + 1, students.length);
    // Let the event loop breathe between pages (progress polling, cancellation, other requests).
    if (index % 10 === 9) await new Promise((resolve) => setImmediate(resolve));
  }

  doc.end();
  return done;
}

/**
 * Render one page per student. `template` may be any schema version; it is migrated first.
 * @returns {Promise<Buffer>}
 */
async function renderSceneCertificatesPdf({ template, students, branding = {} }) {
  return renderCertificatesDocument({ template, students, branding });
}

module.exports = {
  prepareTemplate,
  renderCertificatesDocument,
  renderSceneCertificatesPdf,
  sheetGeometry,
};
