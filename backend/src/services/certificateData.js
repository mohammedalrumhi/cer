const fs = require('fs');
const path = require('path');
const { resolveBackendAssetPath } = require('../utils/storagePaths');
const {
  getRecipientAchievementSentenceForTemplate,
  getRecipientTitleForTemplate,
} = require('../utils/templateMetadata');

// Certificate data shared by the PDF renderers: dynamic field values and image sources.

function normalizeUtf8(value) {
  if (value === null || value === undefined) return '';
  return Buffer.from(String(value), 'utf8').toString('utf8');
}

function getHijriDateString() {
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-arab', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    const year = get('year').replace(/\s*هـ?$/, '').trim();
    return `${get('day')} / ${get('month')} / ${year} هـ`;
  } catch {
    return new Date().toLocaleDateString('ar-SA');
  }
}

function withHijriSuffix(value) {
  const text = normalizeUtf8(value).trim();
  if (!text) return '';
  return /\s*هـ$/.test(text) ? text : `${text} هـ`;
}

function resolveStudentName(student) {
  if (typeof student === 'string') return normalizeUtf8(student);
  if (student && typeof student === 'object') {
    const candidate = student.name ?? student.studentName ?? student.fullName ?? '';
    return normalizeUtf8(candidate);
  }
  return '';
}

function buildDynamicFieldValues(student, branding, template) {
  const studentName = resolveStudentName(student);
  const issueDate = withHijriSuffix(student?.issueDate || getHijriDateString());
  const values = {
    studentName,
    recipientTitle: getRecipientTitleForTemplate(template, studentName),
    recipientAchievementSentence: getRecipientAchievementSentenceForTemplate(template, studentName, {
      institutionName: branding?.schoolName ? `مؤسسة ${normalizeUtf8(branding.schoolName)}` : undefined,
    }),
    date: issueDate,
    dateLabel: `تاريخ الإصدار: ${issueDate}`,
    issueDate,
    issueDateLabel: `تاريخ الإصدار: ${issueDate}`,
    recitalType: normalizeUtf8(student?.recitalType || ''),
    surahRange: normalizeUtf8(student?.surahRange || ''),
    programName: normalizeUtf8(student?.programName || ''),
    calendar: normalizeUtf8(student?.calendar || ''),
    mistakesCount: normalizeUtf8(student?.mistakesCount || ''),
    teacherName: normalizeUtf8(student?.teacherName || ''),
    schoolName: normalizeUtf8(branding?.schoolName || 'دار الإتقان العالي'),
  };

  if (student && typeof student === 'object') {
    for (const [key, value] of Object.entries(student)) {
      if (value !== null && value !== undefined && !(key in values)) {
        values[key] = normalizeUtf8(value);
      }
    }
  }

  return values;
}

function renderDynamicTextTemplate(templateText, values, fallbackField) {
  const rawTemplate = normalizeUtf8(templateText);
  if (!rawTemplate) return values[fallbackField] || '';

  return rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token) => {
    if (token === 'value') return values[fallbackField] || '';
    return values[token] || '';
  });
}

function resolveImagePath(imagePath, fallbackAsset) {
  if (!imagePath && fallbackAsset) {
    // Bundled defaults in frontend/public/assets; accept any of the listed file names.
    const candidates = Array.isArray(fallbackAsset) ? fallbackAsset : [fallbackAsset];
    return candidates
      .map((name) => path.resolve(__dirname, '../../../frontend/public/assets', name))
      .find((candidate) => fs.existsSync(candidate)) || null;
  }
  if (!imagePath) return null;
  const resolved = resolveBackendAssetPath(imagePath);
  return fs.existsSync(resolved) ? resolved : null;
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

function resolveElementImageSource(element, imageAssets) {
  if (element.type === 'dynamicImage') {
    if (element.field === 'logo') return imageAssets.logo;
    if (element.field === 'signature') return imageAssets.signature;
    if (element.field === 'stamp') return imageAssets.stamp;
    return null;
  }

  if (element.type === 'image') {
    if (typeof element.src !== 'string' || !element.src) return null;
    if (element.src.startsWith('data:image/')) return decodeDataUrl(element.src);
    const resolved = resolveBackendAssetPath(element.src);
    return fs.existsSync(resolved) ? resolved : null;
  }

  return null;
}

function loadImageAssets(branding = {}) {
  // Default assets when branding fields are missing.
  return {
    logo: resolveImagePath(branding.logoPath, 'logo.png'),
    signature: resolveImagePath(branding.signaturePath, ['signture.png', 'signture.jpeg']),
    stamp: resolveImagePath(branding.stampPath, ['stamp.png', 'stamp.jpeg']),
  };
}

module.exports = {
  buildDynamicFieldValues,
  getHijriDateString,
  loadImageAssets,
  normalizeUtf8,
  renderDynamicTextTemplate,
  resolveElementImageSource,
  resolveImagePath,
  resolveStudentName,
  withHijriSuffix,
};
