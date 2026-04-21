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

const FAMILY_BY_BASE_ID = new Map(BASE_TEMPLATE_VARIANTS.map((variant) => [variant.baseId, variant]));

function getTemplateTimestamp(template) {
  const rawValue = template?.updatedAt || template?.createdAt || 0;
  const value = Number(new Date(rawValue));
  return Number.isFinite(value) ? value : 0;
}

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

function parseManagedVariantTemplateId(templateId) {
  const value = String(templateId || '').trim();
  for (const baseVariant of BASE_TEMPLATE_VARIANTS) {
    const match = value.match(new RegExp(`^itqan-template-5-(.+)-${baseVariant.suffix}$`));
    if (!match?.[1]) continue;
    return {
      ...baseVariant,
      colorKey: match[1],
      variantId: value,
    };
  }
  return null;
}

function isManagedTemplateFamilyMember(templateId) {
  return FAMILY_BY_BASE_ID.has(templateId) || Boolean(parseManagedVariantTemplateId(templateId));
}

function getAvailableBackgroundVariants() {
  return COLOR_VARIANTS
    .filter((variant) => hasVariantAsset(variant.key))
    .map((variant) => ({
      ...variant,
      imagePath: getVariantImagePath(variant.key),
    }));
}

function buildCanonicalManagedTemplate(familyConfig, familyTemplates, availableVariants) {
  if (!familyTemplates.length) return null;

  const baseTemplate = familyTemplates.find((template) => template.id === familyConfig.baseId) || familyTemplates[0];
  const layoutSource = familyTemplates.reduce((latest, template) => (
    getTemplateTimestamp(template) > getTemplateTimestamp(latest) ? template : latest
  ), familyTemplates[0]);

  const canonicalTemplate = cloneTemplate(baseTemplate);
  canonicalTemplate.orientation = layoutSource.orientation || canonicalTemplate.orientation;
  canonicalTemplate.width = layoutSource.width || canonicalTemplate.width;
  canonicalTemplate.height = layoutSource.height || canonicalTemplate.height;
  canonicalTemplate.elements = cloneTemplate(layoutSource.elements || canonicalTemplate.elements || []);
  canonicalTemplate.updatedAt = getTemplateTimestamp(layoutSource) >= getTemplateTimestamp(baseTemplate)
    ? layoutSource.updatedAt || canonicalTemplate.updatedAt
    : canonicalTemplate.updatedAt;
  canonicalTemplate.availableBackgroundVariants = availableVariants;

  return canonicalTemplate;
}

function collapseTemplatesWithBackgroundVariants(templates = []) {
  const availableVariants = getAvailableBackgroundVariants();
  const canonicalTemplates = [];
  const addedFamilyIds = new Set();

  for (const template of templates) {
    if (!isManagedTemplateFamilyMember(template.id)) {
      canonicalTemplates.push({
        ...template,
        availableBackgroundVariants: Array.isArray(template.availableBackgroundVariants)
          ? template.availableBackgroundVariants
          : [],
      });
      continue;
    }

    const familyConfig = FAMILY_BY_BASE_ID.get(template.id) || parseManagedVariantTemplateId(template.id);
    if (!familyConfig || addedFamilyIds.has(familyConfig.baseId)) continue;

    const familyTemplates = templates.filter((candidate) => {
      if (candidate.id === familyConfig.baseId) return true;
      const parsed = parseManagedVariantTemplateId(candidate.id);
      return parsed?.baseId === familyConfig.baseId;
    });

    const canonicalTemplate = buildCanonicalManagedTemplate(familyConfig, familyTemplates, availableVariants);
    if (!canonicalTemplate) continue;

    canonicalTemplates.push(canonicalTemplate);
    addedFamilyIds.add(familyConfig.baseId);
  }

  return canonicalTemplates;
}

function applyBackgroundVariant(template, variantKey) {
  const availableVariants = Array.isArray(template?.availableBackgroundVariants)
    ? template.availableBackgroundVariants
    : [];
  const selectedVariant = availableVariants.find((variant) => variant.key === variantKey);
  if (!template || !selectedVariant) return template;

  const nextTemplate = cloneTemplate(template);
  nextTemplate.background = {
    ...nextTemplate.background,
    type: 'image',
    color: selectedVariant.color,
    accentColor: selectedVariant.accentColor,
    imagePath: selectedVariant.imagePath,
    customLayout: true,
  };
  return nextTemplate;
}

function resolveTemplateWithBackgroundVariant(templates = [], templateId, variantKey) {
  const collapsedTemplates = collapseTemplatesWithBackgroundVariants(templates);
  const explicitTemplate = collapsedTemplates.find((template) => template.id === templateId);
  if (explicitTemplate) {
    return applyBackgroundVariant(explicitTemplate, variantKey);
  }

  const managedVariant = parseManagedVariantTemplateId(templateId);
  if (managedVariant) {
    const baseTemplate = collapsedTemplates.find((template) => template.id === managedVariant.baseId);
    if (!baseTemplate) return null;
    return applyBackgroundVariant(baseTemplate, variantKey || managedVariant.colorKey);
  }

  const storedTemplate = templates.find((template) => template.id === templateId);
  return storedTemplate ? cloneTemplate(storedTemplate) : null;
}

async function deleteTemplateFamily(storage, templateId) {
  const managedVariant = FAMILY_BY_BASE_ID.get(templateId) || parseManagedVariantTemplateId(templateId);
  if (!managedVariant) {
    return storage.deleteTemplate(templateId);
  }

  const templates = await storage.listTemplates();
  const familyIds = templates
    .filter((template) => {
      if (template.id === managedVariant.baseId) return true;
      const parsed = parseManagedVariantTemplateId(template.id);
      return parsed?.baseId === managedVariant.baseId;
    })
    .map((template) => template.id);

  if (!familyIds.length) return false;

  let deletedAny = false;
  for (const familyId of familyIds) {
    const deleted = await storage.deleteTemplate(familyId);
    deletedAny = deletedAny || deleted;
  }
  return deletedAny;
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
  applyBackgroundVariant,
  collapseTemplatesWithBackgroundVariants,
  COLOR_VARIANTS,
  deleteTemplateFamily,
  expandTemplatesWithBackgroundVariants,
  getAvailableBackgroundVariants,
  parseManagedVariantTemplateId,
  resolveTemplateWithBackgroundVariant,
};