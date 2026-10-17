const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { loadModel, loadSharedModule } = require('../shared');
const { convertArabicBack } = require('arabic-reshaper');
const { fontsDir } = require('../utils/storagePaths');
const {
  loadImageAssets,
  normalizeUtf8,
  resolveElementImageSource,
  resolveImagePath,
} = require('./certificateData');

// v1 renderer (PDFKit text layout). Kept behind PDF_ENGINE=legacy for comparison and rollback;
// the default is the shared-scene renderer in scenePdfRenderer.js.

let cachedFontFiles = null;

function containsArabic(value) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
}

function containsArabicPresentationForms(value) {
  return /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value);
}

function stripBidiControlMarks(value) {
  // Remove hidden direction controls that often come from copy/paste and break PDF rendering order.
  return value.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
}

function normalizeArabicInput(value) {
  let text = normalizeUtf8(value);
  // NFKC normalizes Arabic presentation forms to standard base Arabic letters.
  text = stripBidiControlMarks(text).normalize('NFKC');
  return text;
}

function mirrorRtlBrackets(value) {
  const mirrorMap = {
    '(': ')',
    ')': '(',
    '[': ']',
    ']': '[',
    '{': '}',
    '}': '{',
    '<': '>',
    '>': '<',
  };

  return value.replace(/[()\[\]{}<>]/g, (ch) => mirrorMap[ch] || ch);
}

function reverseNumericRuns(value) {
  return String(value || '').replace(/[0-9\u0660-\u0669]+/g, (match) => Array.from(match).reverse().join(''));
}

function shapeText(value) {
  let text = normalizeArabicInput(value);
  if (!text || !containsArabic(text)) return text;

  try {
    // Always normalize presentation-form Arabic back to base characters.
    // Let the PDF font/viewer handle glyph shaping and bidi flow naturally.
    if (containsArabicPresentationForms(text)) {
      text = convertArabicBack(text);
    }

    return reverseNumericRuns(mirrorRtlBrackets(text));
  } catch {
    return reverseNumericRuns(mirrorRtlBrackets(normalizeArabicInput(value)));
  }
}

// Shared modules (ESM), loaded before rendering starts.
let shared = null;

function resolveDynamicTextValue(element, student, branding, template) {
  const recipient = { title: shared.model.getRecipientTitleForTemplate, sentence: shared.model.getRecipientAchievementSentenceForTemplate };
  const values = shared.model.buildFieldValues(student, branding, template, recipient);
  return shared.scene.renderTextTemplate(element.dynamicTextTemplate, values, element.field);
}

function getFontCandidates(fontFamily, isBold, isItalic) {
  const family = String(fontFamily || '').trim();
  const styles = [];

  if (isBold && isItalic) {
    styles.push('BoldItalic', 'BoldOblique', 'Bold Italic', 'Bold Oblique');
  }
  if (isBold) {
    styles.push('Bold');
  }
  if (isItalic) {
    styles.push('Italic', 'Oblique');
  }
  styles.push('Regular', '');

  const candidates = [];
  const add = (candidate) => {
    if (candidate && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  if (family) {
    for (const style of styles) {
      const suffix = style ? `-${style}` : '';
      add(path.join(fontsDir, `${family}${suffix}.ttf`));
      add(path.join(fontsDir, `${family}${suffix}.otf`));
      add(path.join(fontsDir, `${family} ${style}.ttf`));
      add(path.join(fontsDir, `${family} ${style}.otf`));
    }
  }

  return candidates;
}

function getFontFiles() {
  if (cachedFontFiles) return cachedFontFiles;

  try {
    cachedFontFiles = fs.readdirSync(fontsDir)
      .filter((file) => ['.ttf', '.otf'].includes(path.extname(file).toLowerCase()));
  } catch {
    cachedFontFiles = [];
  }

  return cachedFontFiles;
}

function normalizeFontToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.(ttf|otf)$/i, '')
    .replace(/[\s_-]+/g, '');
}

function resolveExactFontPath(fontFamily) {
  const family = String(fontFamily || '').trim();
  if (!family) return null;

  const exactPath = ['.ttf', '.otf']
    .map((extension) => path.join(fontsDir, `${family}${extension}`))
    .find((candidate) => fs.existsSync(candidate));
  if (exactPath) return exactPath;

  const normalizedFamily = normalizeFontToken(family);
  const matchingFile = getFontFiles().find((file) => normalizeFontToken(file) === normalizedFamily);
  return matchingFile ? path.join(fontsDir, matchingFile) : null;
}

function findArabicFontPath(fontFamily, fontStyle) {
  const style = String(fontStyle || 'normal').toLowerCase();
  const isBold = style.includes('bold');
  const isItalic = style.includes('italic');
  const exactMatch = resolveExactFontPath(fontFamily);
  if (exactMatch) return exactMatch;
  const familyCandidates = getFontCandidates(fontFamily, isBold, isItalic);
  const fallbackCandidates = [
    ...getFontCandidates('Amiri', isBold, isItalic),
    '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];

  return [...familyCandidates, ...fallbackCandidates].find((candidate) => fs.existsSync(candidate)) || null;
}


function getDynamicImageDefaults(field) {
  if (field === 'signature') {
    return { width: 113, height: 60 };
  }
  // logo and stamp are square by default.
  return { width: 113, height: 113 };
}

function withElementTransform(doc, element, draw) {
  doc.save();
  doc.opacity(element.opacity ?? 1);

  const rotation = Number(element.rotation) || 0;
  const x = Number(element.x) || 0;
  const y = Number(element.y) || 0;

  if (rotation !== 0) {
    doc.rotate(rotation, { origin: [x, y] });
  }

  draw();
  doc.restore();
}

function applyFont(doc, element) {
  const fontPath = findArabicFontPath(element.fontFamily, element.fontStyle);
  doc.font(fontPath || 'Helvetica');
  return fontPath;
}

function getTextOptions(element, sourceText) {
  const fontSize = Number(element.fontSize) || 26;
  const lineHeight = Math.max(0.5, Number(element.lineHeight) || 1.4);
  const letterSpacing = Number(element.letterSpacing) || 0;
  const hasExplicitNewLines = String(sourceText || '').includes('\n');
  const isArabic = containsArabic(sourceText);

  return {
    width: Math.max(1, Number(element.width) || 900),
    align: element.align || 'center',
    lineBreak: !hasExplicitNewLines,
    lineGap: Math.max(0, (lineHeight - 1) * fontSize),
    characterSpacing: isArabic ? 0 : letterSpacing,
    underline: element.textDecoration === 'underline',
    // Keep standard ligature/context features; avoid forcing rtla to prevent double-direction processing.
    features: ['rlig', 'calt'],
  };
}

function resolveTextLayout(doc, element, sourceText, renderedText) {
  const originalFontSize = Number(element.fontSize) || 26;
  const options = getTextOptions(element, sourceText);
  const lines = String(renderedText || '').split('\n');

  const maxWidth = options.width;
  const minFontSize = Math.max(12, Math.round(originalFontSize * 0.72));
  let fontSize = originalFontSize;
  doc.fontSize(fontSize);
  let measuredWidth = Math.max(
    ...lines.map((line) => doc.widthOfString(line, { ...options, lineBreak: false, lineGap: 0 }))
  );

  while (measuredWidth > maxWidth && fontSize > minFontSize) {
    fontSize -= 1;
    doc.fontSize(fontSize);
    measuredWidth = Math.max(
      ...lines.map((line) => doc.widthOfString(line, {
        ...options,
        lineBreak: false,
        lineGap: 0,
      }))
    );
  }

  return {
    fontSize,
    options: {
      ...options,
      lineGap: Math.max(0, (Math.max(0.5, Number(element.lineHeight) || 1.4) - 1) * fontSize),
    },
  };
}

function getTextVerticalOffset(element, sourceText, fontSize) {
  if (element.type !== 'dynamicText') return 0;

  const normalizedSize = Number(fontSize) || Number(element.fontSize) || 26;
  const factor = containsArabic(sourceText) ? 0.09 : 0.06;
  return Math.round(normalizedSize * factor);
}

function drawExplicitMultilineText(doc, text, x, y, element, options) {
  const lines = String(text || '').split('\n');
  const lineHeight = Math.max(0.5, Number(element.lineHeight) || 1.4);
  const fontSize = Number(doc._fontSize) || Number(element.fontSize) || 26;
  const step = fontSize * lineHeight;

  lines.forEach((line, index) => {
    doc.text(line, x, y + (index * step), {
      ...options,
      lineBreak: false,
      lineGap: 0,
    });
  });
}

function drawBackground(doc, template) {
  const width = Number(template.width) || 1123;
  const height = Number(template.height) || 794;
  const bgColor = template.background?.color || '#f8f4ea';
  const accentColor = template.background?.accentColor || '#0f4a3c';
  const backgroundImage = resolveImagePath(template.background?.imagePath);

  doc.save();
  doc.rect(0, 0, width, height).fill(bgColor);

  if (backgroundImage) {
    try {
      doc.image(backgroundImage, 0, 0, { width, height });
    } catch {
      // Ignore unsupported background image formats and keep solid background.
    }
  }

  // Templates with customLayout:true manage all extra visuals via their elements array.
  if (template.background?.customLayout) {
    doc.restore();
    return;
  }

  doc.rect(0, 0, width, 96).fill(accentColor);
  doc.lineWidth(2);
  doc.strokeColor(accentColor);
  doc.rect(24, 24, width - 48, height - 48).stroke();
  doc.fillColor('#ffffff');
  doc.rect(40, 104, width - 80, 12).fill();
  doc.fillColor(accentColor);
  doc.rect(44, height - 92, 120, 8).fill();
  doc.rect(width - 164, height - 92, 120, 8).fill();
  doc.restore();
}

function drawTemplateElement(doc, template, element, student, branding, imageAssets, arabicFontPath) {
  void template;
  void arabicFontPath;

  if (element.visible === false) {
    return;
  }

  if (element.type === 'text' || element.type === 'dynamicText') {
    const sourceText = element.type === 'dynamicText'
      ? resolveDynamicTextValue(element, student, branding, template)
      : normalizeUtf8(element.text || '');

    if (!sourceText) return;

    const renderedText = shapeText(sourceText);
    const color = element.fill || '#0f172a';
    const x = Number(element.x) || 0;
    const y = Number(element.y) || 120;

    withElementTransform(doc, element, () => {
      applyFont(doc, element);
      const { fontSize, options } = resolveTextLayout(doc, element, sourceText, renderedText);
      const verticalOffset = getTextVerticalOffset(element, sourceText, fontSize);
      doc
        .fontSize(fontSize)
        .fillColor(color);

      if (String(sourceText || '').includes('\n')) {
        drawExplicitMultilineText(doc, renderedText, x, y - verticalOffset, element, options);
        return;
      }

      doc.text(renderedText, x, y - verticalOffset, options);
    });

    return;
  }

  if (element.type === 'rect') {
    const rx = Number(element.x) || 0;
    const ry = Number(element.y) || 0;
    const rw = Math.max(1, Number(element.width) || 100);
    const rh = Math.max(1, Number(element.height) || 50);
    const rfill = element.fill || null;
    const rstroke = element.stroke || null;
    const rsw = Number(element.strokeWidth) || 0;
    const rcr = Number(element.cornerRadius) || 0;
    if (!rfill && (!rstroke || rsw === 0)) return;
    withElementTransform(doc, element, () => {
      if (rfill) doc.fillColor(rfill);
      if (rstroke && rsw > 0) {
        doc.strokeColor(rstroke);
        doc.lineWidth(rsw);
      }
      if (rcr > 0) doc.roundedRect(rx, ry, rw, rh, rcr);
      else doc.rect(rx, ry, rw, rh);
      if (rfill && rstroke && rsw > 0) doc.fillAndStroke();
      else if (rfill) doc.fill();
      else doc.stroke();
    });
    return;
  }

  if (element.type === 'circle') {
    const x = Number(element.x) || 0;
    const y = Number(element.y) || 0;
    const width = Math.max(1, Number(element.width) || 120);
    const height = Math.max(1, Number(element.height) || 120);
    const fill = element.fill || null;
    const stroke = element.stroke || null;
    const strokeWidth = Number(element.strokeWidth) || 0;

    withElementTransform(doc, element, () => {
      if (fill) doc.fillColor(fill);
      if (stroke && strokeWidth > 0) {
        doc.strokeColor(stroke);
        doc.lineWidth(strokeWidth);
      }
      doc.ellipse(x + width / 2, y + height / 2, width / 2, height / 2);
      if (fill && stroke && strokeWidth > 0) doc.fillAndStroke();
      else if (fill) doc.fill();
      else doc.stroke();
    });
    return;
  }

  if (element.type === 'line') {
    const x = Number(element.x) || 0;
    const y = Number(element.y) || 0;
    const width = Number(element.width) || 200;
    const stroke = element.stroke || '#0f172a';
    const strokeWidth = Number(element.strokeWidth) || 3;

    withElementTransform(doc, element, () => {
      doc
        .lineWidth(strokeWidth)
        .strokeColor(stroke)
        .moveTo(x, y)
        .lineTo(x + width, y)
        .stroke();
    });
    return;
  }

  if (element.type === 'dynamicImage' || element.type === 'image') {
    const imageSource = resolveElementImageSource(element, imageAssets);
    if (!imageSource) return;

    const x = Number(element.x) || 80;
    const y = Number(element.y) || 120;
    const dynamicDefaults = element.type === 'dynamicImage'
      ? getDynamicImageDefaults(element.field)
      : { width: 120, height: 60 };
    const width = Number(element.width) || dynamicDefaults.width;
    const height = Number(element.height) || dynamicDefaults.height;

    try {
      withElementTransform(doc, element, () => {
        doc.image(imageSource, x, y, { width, height });
      });
    } catch (error) {
      // Ignore unsupported images and continue rendering the PDF.
    }

    return;
  }
}

async function renderCertificatesPdf({ template, students, branding }) {
  if (!shared) {
    const [model, scene] = await Promise.all([loadModel(), loadSharedModule('render/scene.js')]);
    shared = { model, scene };
  }
  const pageWidth = Number(template.width) || 1123;
  const pageHeight = Number(template.height) || 794;
  const arabicFontPath = findArabicFontPath();

  const doc = new PDFDocument({
    autoFirstPage: false,
    margin: 0,
    size: [pageWidth, pageHeight],
    bufferPages: true,
    info: {
      Title: normalizeUtf8(template.name || 'Certificates'),
      Author: 'Certificate System',
      Subject: 'Arabic Certificates UTF-8',
    },
  });

  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const imageAssets = loadImageAssets(branding);

  for (const student of students) {
    doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
    drawBackground(doc, template);

    for (const element of template.elements || []) {
      drawTemplateElement(doc, template, element, student, branding, imageAssets, arabicFontPath);
    }
  }

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

module.exports = {
  renderLegacyCertificatesPdf: renderCertificatesPdf,
};
