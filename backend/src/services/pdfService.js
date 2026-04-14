const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function normalizeUtf8(value) {
  if (value === null || value === undefined) return '';
  return Buffer.from(String(value), 'utf8').toString('utf8');
}

function resolveFieldValue(field, studentName, branding) {
  if (field === 'studentName') return normalizeUtf8(studentName);
  if (field === 'date') {
    return new Intl.DateTimeFormat('ar-SA-u-nu-arab', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).format(new Date());
  }
  if (field === 'schoolName') return normalizeUtf8(branding.schoolName || 'دار الإتقان العالي');
  return '';
}

function findArabicFontPath() {
  const candidates = [
    path.resolve(__dirname, '../../assets/fonts/Amiri-Regular.ttf'),
    '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}


function resolveImagePath(imagePath, fallbackAsset) {
  if (!imagePath && fallbackAsset) {
    // fallbackAsset is a path relative to project root
    const fallback = path.resolve(__dirname, '../../frontend/public/assets', fallbackAsset);
    return fs.existsSync(fallback) ? fallback : null;
  }
  if (!imagePath) return null;
  const resolved = path.resolve(__dirname, '../../', String(imagePath).replace(/^\//, ''));
  return fs.existsSync(resolved) ? resolved : null;
}

function drawBackground(doc, template) {
  const width = Number(template.width) || 1123;
  const height = Number(template.height) || 794;
  const bgColor = template.background?.color || '#f8f4ea';
  const accentColor = template.background?.accentColor || '#0f4a3c';

  doc.save();
  doc.rect(0, 0, width, height).fill(bgColor);
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

function getTextX(element) {
  const width = Number(element.width) || 900;
  const x = Number(element.x) || 120;

  if (element.align === 'left') return x;
  if (element.align === 'right') return x - width;
  return x - width / 2;
}

function drawTemplateElement(doc, template, element, student, branding, imageAssets, arabicFontPath) {
  const pageHeight = Number(template.height) || 794;

  if (element.type === 'text' || element.type === 'dynamicText') {
    const sourceText = element.type === 'dynamicText'
      ? resolveFieldValue(element.field, student, branding)
      : normalizeUtf8(element.text || '');

    if (!sourceText) return;

    const fontSize = Number(element.fontSize) || 26;
    const color = element.fill || '#0f172a';
    const width = Number(element.width) || 900;
    const x = getTextX(element);
    const y = Number(element.y) || 120;


    // Multi-font support
    let fontPath = null;
    if (element.fontFamily) {
      // Try to resolve font from assets/fonts
      const candidate = path.resolve(__dirname, '../../assets/fonts', `${element.fontFamily}-Regular.ttf`);
      if (fs.existsSync(candidate)) {
        fontPath = candidate;
      }
    }
    if (!fontPath && arabicFontPath) {
      fontPath = arabicFontPath;
    }
    doc.font(fontPath || 'Helvetica');

    doc
      .fontSize(fontSize)
      .fillColor(color)
      .text(sourceText, x, y, {
        width,
        align: element.align || 'center',
        lineBreak: false,
        features: ['rtla', 'rlig', 'calt'],
      });

    return;
  }

  if (element.type === 'dynamicImage') {
    let imagePath = null;
    if (element.field === 'logo') imagePath = imageAssets.logo;
    else if (element.field === 'signature') imagePath = imageAssets.signature;
    else if (element.field === 'stamp') imagePath = imageAssets.stamp;
    if (!imagePath) return;

    const x = Number(element.x) || 80;
    const y = Number(element.y) || 120;
    const width = Number(element.width) || 120;
    const height = Number(element.height) || 60;

    try {
      doc.image(imagePath, x, y, { width, height });
    } catch (error) {
      // Ignore unsupported images and continue rendering the PDF.
    }

    return;
  }

  // Keep lint/no-unused-vars clean for possible future template element types.
  void pageHeight;
}

async function buildCertificatesPdf({ template, students, branding }) {
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

  // Use default assets if branding fields are missing
  const imageAssets = {
    logo: resolveImagePath(branding.logoPath, 'logo.png'),
    signature: resolveImagePath(branding.signaturePath, 'signture.jpeg'),
    stamp: resolveImagePath(branding.stampPath, 'stamp.jpeg'),
  };

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
  buildCertificatesPdf,
};
