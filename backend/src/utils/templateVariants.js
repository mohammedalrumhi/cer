const fs = require('fs');
const path = require('path');
const { uploadsDir } = require('./storagePaths');

const BASE_TEMPLATE_VARIANTS = [
  {
    baseId: 'itqan-template-5-students',
    suffix: 'students',
    audienceLabel: 'طلاب',
  },
  {
    baseId: 'itqan-template-5-adults',
    suffix: 'adults',
    audienceLabel: 'دارسون',
  },
];

const COLOR_VARIANTS = [
  { key: 'emerald', label: 'أخضر زمردي', color: '#eef6f1', accentColor: '#2f8f6b' },
  { key: 'burgundy', label: 'عنابي', color: '#f7f1f3', accentColor: '#9a4e5e' },
  { key: 'bronze', label: 'برونزي', color: '#f8f3ea', accentColor: '#9c762f' },
  { key: 'navy', label: 'كحلي', color: '#f2f4f8', accentColor: '#2d4f7c' },
  { key: 'olive', label: 'زيتي', color: '#f4f4ec', accentColor: '#6e7e38' },
  { key: 'plum', label: 'برقوقي', color: '#f5f1f6', accentColor: '#744a7a' },
  { key: 'rosewood', label: 'وردي خشبي', color: '#f7f0f1', accentColor: '#8a434a' },
  { key: 'slate', label: 'رمادي أردوازي', color: '#f1f4f5', accentColor: '#4e6774' },
  { key: 'turquoise', label: 'فيروزي', color: '#eef8f8', accentColor: '#2b9aa0' },
  { key: 'coral', label: 'مرجاني', color: '#fff4f1', accentColor: '#dd6b55' },
  { key: 'lavender', label: 'لافندر', color: '#f6f2fb', accentColor: '#8a6ccf' },
  { key: 'saffron', label: 'زعفراني', color: '#fff8eb', accentColor: '#d79b2f' },
  { key: 'indigo', label: 'نيلي', color: '#f1f3fb', accentColor: '#4b5fc7' },
  { key: 'mint', label: 'نعناعي', color: '#eefaf4', accentColor: '#46a878' },
  { key: 'charcoal', label: 'فحمي', color: '#f1f2f4', accentColor: '#49525c' },
  { key: 'terracotta', label: 'طوبي', color: '#fbf1ed', accentColor: '#b76548' },
  { key: 'petrol', label: 'بترولي', color: '#eef5f6', accentColor: '#2f6f7c' },
  { key: 'mocha', label: 'موكا', color: '#f6f1ed', accentColor: '#8a6852' },
  { key: 'ruby', label: 'ياقوتي', color: '#faf1f4', accentColor: '#b64260' },
  { key: 'peach', label: 'خوخي', color: '#fff5ef', accentColor: '#df946d' },
  { key: 'lilac', label: 'ليلكي', color: '#f7f2fa', accentColor: '#9d7ac2' },
  { key: 'forest', label: 'أخضر غابي', color: '#eef5f1', accentColor: '#2f6b4f' },
  { key: 'azure', label: 'أزرق سماوي', color: '#f0f6fb', accentColor: '#4f88c6' },
  { key: 'sand', label: 'رملي', color: '#faf5ea', accentColor: '#c4a161' },
  { key: 'berry', label: 'توتي', color: '#faf1f5', accentColor: '#b14d74' },
  { key: 'ocean', label: 'محيطي', color: '#eef6f8', accentColor: '#3c7f98' },
  { key: 'steel', label: 'فولاذي', color: '#f1f4f7', accentColor: '#70879c' },
  { key: 'amber', label: 'كهرماني', color: '#fff8ee', accentColor: '#cf8a2f' },
];

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

function getVariantImagePath(key) {
  return `uploads/itqan-template-5-${key}.png`;
}

function hasVariantAsset(key) {
  return fs.existsSync(path.join(uploadsDir, `itqan-template-5-${key}.png`));
}

function buildVariantId(key, suffix) {
  return `itqan-template-5-${key}-${suffix}`;
}

function buildVariantName(label, audienceLabel) {
  const detailLabel = audienceLabel === 'دارسون' || audienceLabel === 'طلاب' ? 'مفصل' : 'مفصل';
  const normalizedAudience = audienceLabel === 'دارسون' ? 'الدارسين' : 'الطلاب';
  return `${label} - ${detailLabel} - ${normalizedAudience}`;
}

function expandTemplatesWithBackgroundVariants(templates = []) {
  const storedIds = new Set(templates.map((template) => template.id));
  const generatedVariants = [];

  for (const colorVariant of COLOR_VARIANTS) {
    if (!hasVariantAsset(colorVariant.key)) continue;

    for (const baseVariant of BASE_TEMPLATE_VARIANTS) {
      const variantId = buildVariantId(colorVariant.key, baseVariant.suffix);
      if (storedIds.has(variantId)) continue;

      const baseTemplate = templates.find((template) => template.id === baseVariant.baseId);
      if (!baseTemplate) continue;

      const variantTemplate = cloneTemplate(baseTemplate);
      variantTemplate.id = variantId;
      variantTemplate.name = buildVariantName(colorVariant.label, baseVariant.audienceLabel);
      variantTemplate.background = {
        ...variantTemplate.background,
        type: 'image',
        color: colorVariant.color,
        accentColor: colorVariant.accentColor,
        imagePath: getVariantImagePath(colorVariant.key),
        customLayout: true,
      };

      generatedVariants.push(variantTemplate);
    }
  }

  return [...templates, ...generatedVariants];
}

module.exports = {
  expandTemplatesWithBackgroundVariants,
};