const fs = require('fs');
const PDFDocument = require('pdfkit');
const { loadSharedModule, loadModel } = require('../shared');
const { listFontFiles } = require('../utils/storagePaths');
const {
  getRecipientAchievementSentenceForTemplate,
  getRecipientTitleForTemplate,
} = require('../utils/templateMetadata');
const {
  loadImageAssets,
  normalizeUtf8,
  resolveElementImageSource,
  resolveImagePath,
} = require('./certificateData');

/*
 * PDF painter for the shared scene (shared/render). Text is laid out by the same HarfBuzz engine
 * the editor uses and written as vector glyph outlines, so the PDF matches the editor exactly.
 * PDFKit is only a vector writer here; none of its own text layout is used.
 */

const RECIPIENT = {
  title: getRecipientTitleForTemplate,
  sentence: getRecipientAchievementSentenceForTemplate,
};

let kitPromise = null;

function loadRenderKit() {
  if (!kitPromise) {
    kitPromise = (async () => {
      const [render, hb, bidiModule] = await Promise.all([
        loadSharedModule('render/index.js'),
        import('harfbuzzjs'),
        import('bidi-js'),
      ]);
      const bidiFactory = bidiModule.default || bidiModule;
      return { render, engine: render.createTextEngine({ hb, bidi: bidiFactory() }) };
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

function withTransform(doc, op, draw) {
  doc.save();
  doc.translate(op.x, op.y);
  if (op.rotation) doc.rotate(op.rotation, { origin: [0, 0] });
  doc.opacity(op.opacity);
  draw();
  doc.restore();
}

function fillAndOrStroke(doc, fill, stroke, strokeWidth) {
  const hasStroke = Boolean(stroke) && strokeWidth > 0;
  if (fill) doc.fillColor(fill);
  if (hasStroke) doc.strokeColor(stroke).lineWidth(strokeWidth);
  if (fill && hasStroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else if (hasStroke) doc.stroke();
}

function paintText(doc, op, engine, render) {
  const { layout } = op;
  if (!layout) return;
  const boldStroke = op.syntheticBold ? render.syntheticBoldStrokeWidth(layout.fontSize) : 0;

  doc.fillColor(op.fill);
  if (boldStroke) doc.strokeColor(op.fill).lineJoin('round');

  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      const outline = engine.glyphPath(glyph.key, glyph.gid);
      if (!outline) continue;
      doc.save();
      doc.translate(line.x + glyph.x, line.baseline + glyph.y);
      if (op.syntheticItalic) doc.transform(1, 0, render.SYNTHETIC_ITALIC_SKEW, 1, 0, 0);
      doc.scale(glyph.s, -glyph.s);
      doc.path(outline);
      if (boldStroke) doc.lineWidth(boldStroke / glyph.s).fillAndStroke();
      else doc.fill();
      doc.restore();
    }
  }

  for (const decoration of layout.decorations) {
    doc.rect(decoration.x, decoration.y - decoration.thickness / 2, decoration.width, decoration.thickness).fill(op.fill);
  }
}

function paintOp(doc, op, { engine, render, imageAssets }) {
  withTransform(doc, op, () => {
    switch (op.kind) {
      case 'rect':
        if (op.cornerRadius > 0) doc.roundedRect(0, 0, op.width, op.height, op.cornerRadius);
        else doc.rect(0, 0, op.width, op.height);
        fillAndOrStroke(doc, op.fill, op.stroke, op.strokeWidth);
        break;
      case 'ellipse':
        doc.ellipse(op.width / 2, op.height / 2, op.width / 2, op.height / 2);
        fillAndOrStroke(doc, op.fill, op.stroke, op.strokeWidth);
        break;
      case 'line':
        doc.moveTo(0, 0).lineTo(op.width, 0).lineWidth(op.strokeWidth).strokeColor(op.stroke).stroke();
        break;
      case 'image': {
        const element = op.source.type === 'field'
          ? { type: 'dynamicImage', field: op.source.value }
          : { type: 'image', src: op.source.value };
        const source = resolveElementImageSource(element, imageAssets);
        if (!source) break;
        try {
          doc.image(source, 0, 0, { width: op.width, height: op.height });
        } catch {
          // Unsupported image data: skip it rather than failing the whole certificate.
        }
        break;
      }
      case 'text':
        paintText(doc, op, engine, render);
        break;
      default:
        break;
    }
  });
}

function paintBackground(doc, scene) {
  doc.save();
  doc.rect(0, 0, scene.width, scene.height).fill(scene.background.color);
  const image = resolveImagePath(scene.background.imagePath);
  if (image) {
    try {
      doc.image(image, 0, 0, { width: scene.width, height: scene.height });
    } catch {
      // Keep the solid background if the image can't be decoded.
    }
  }
  doc.restore();
}

/**
 * Render one page per student. `template` may be any schema version; it is migrated first.
 * @returns {Promise<Buffer>}
 */
async function renderSceneCertificatesPdf({ template: rawTemplate, students, branding = {} }) {
  const [{ render, engine }, { migrateTemplate, buildFieldValues }] = await Promise.all([loadRenderKit(), loadModel()]);
  const template = migrateTemplate(rawTemplate);
  const files = listFontFiles();
  const registry = render.createFontRegistry(files.map(({ fileName }) => fileName));
  ensureFonts(engine, render.requiredFontKeys(template, registry), files);

  const width = Number(template.width) || 1123;
  const height = Number(template.height) || 794;
  const doc = new PDFDocument({
    autoFirstPage: false,
    margin: 0,
    size: [width, height],
    info: {
      Title: normalizeUtf8(template.name || 'Certificates'),
      Author: normalizeUtf8(branding.schoolName || 'Certificate System'),
      Creator: 'Certificate Studio (shared scene renderer)',
    },
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const imageAssets = loadImageAssets(branding);
  for (const student of students) {
    const values = buildFieldValues(student, branding, template, RECIPIENT);
    const scene = render.buildScene(template, { engine, registry, values });
    doc.addPage({ size: [width, height], margin: 0 });
    paintBackground(doc, scene);
    for (const op of scene.ops) paintOp(doc, op, { engine, render, imageAssets });
  }

  doc.end();
  return done;
}

module.exports = {
  renderSceneCertificatesPdf,
};
