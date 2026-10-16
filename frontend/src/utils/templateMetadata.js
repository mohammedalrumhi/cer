export const TemplateDetailLevel = Object.freeze({
  SIMPLE: 'simple',
  DETAILED: 'detailed',
});

export const TemplateAudienceType = Object.freeze({
  STUDENT: 'student',
  ADULT: 'adult',
});

const COLOR_LABEL_BY_HEX = new Map([
  ['#2f8f6b', 'أخضر زمردي'],
  ['#9a4e5e', 'عنابي'],
  ['#9c762f', 'برونزي'],
  ['#2d4f7c', 'كحلي'],
  ['#6e7e38', 'زيتي'],
  ['#744a7a', 'برقوقي'],
  ['#8a434a', 'وردي خشبي'],
  ['#4e6774', 'رمادي'],
  ['#2b9aa0', 'فيروزي'],
  ['#dd6b55', 'مرجاني'],
  ['#8a6ccf', 'لافندر'],
  ['#d79b2f', 'زعفراني'],
  ['#4b5fc7', 'نيلي'],
  ['#46a878', 'نعناعي'],
  ['#49525c', 'فحمي'],
  ['#b76548', 'طوبي'],
  ['#2f6f7c', 'بترولي'],
  ['#8a6852', 'موكا'],
  ['#b64260', 'ياقوتي'],
  ['#df946d', 'خوخي'],
  ['#9d7ac2', 'ليلكي'],
  ['#2f6b4f', 'أخضر غابي'],
  ['#4f88c6', 'أزرق سماوي'],
  ['#c4a161', 'رملي'],
  ['#b14d74', 'توتي'],
  ['#3c7f98', 'محيطي'],
  ['#70879c', 'فولاذي'],
  ['#cf8a2f', 'كهرماني'],
  ['#c8a97e', 'شمبانيا'],
  ['#8ca9c9', 'بودري'],
  ['#8aa089', 'مريمي'],
  ['#d49aa6', 'وردي ناعم'],
  ['#b7b0a3', 'لؤلؤي'],
  ['#9aaab5', 'ضبابي'],
  ['#a5b97a', 'فستقي'],
  ['#7fb3d5', 'سماوي ناعم'],
  ['#d3ba84', 'فانيلا'],
  ['#d7a1ab', 'ماء الورد'],
  ['#7faa90', 'أوكالبتوس'],
  ['#86b9b1', 'أوبال'],
  ['#dfc277', 'كريمي'],
  ['#e2aa84', 'مشمشي ناعم'],
  ['#aab8c3', 'سحابي'],
  ['#93bfd9', 'أزرق ثلجي'],
  ['#79c3c0', 'مائي ناعم'],
  ['#cfaa8d', 'لوزي'],
  ['#b29bcb', 'ليلكي ناعم'],
  ['#e2bb6f', 'شمسي ناعم'],
  ['#148fad', 'أزرق'],
  ['#0f4a3c', 'أخضر'],
  ['#1a5c3a', 'أخضر'],
  ['#b8893c', 'ذهبي'],
  ['#b68a43', 'ذهبي'],
  ['#c58b94', 'وردي'],
]);

export const RecipientGender = Object.freeze({
  MALE: 'male',
  FEMALE: 'female',
});

export const TEMPLATE_DETAIL_OPTIONS = [
  { value: TemplateDetailLevel.SIMPLE, label: 'بسيط' },
  { value: TemplateDetailLevel.DETAILED, label: 'مفصل' },
];

export const TEMPLATE_AUDIENCE_OPTIONS = [
  { value: TemplateAudienceType.STUDENT, label: 'الطلاب' },
  { value: TemplateAudienceType.ADULT, label: 'الدارسين' },
];

const DETAILED_TEMPLATE_FIELDS = new Set([
  'recitalType',
  'surahRange',
  'programName',
  'calendar',
  'mistakesCount',
  'teacherName',
]);

const DEFAULT_FEMININE_RULES = [
  { type: 'suffix', value: 'ة' },
];

const RECIPIENT_TITLES = Object.freeze({
  [TemplateAudienceType.STUDENT]: Object.freeze({
    [RecipientGender.MALE]: 'الطالب',
    [RecipientGender.FEMALE]: 'الطالبة',
  }),
  [TemplateAudienceType.ADULT]: Object.freeze({
    [RecipientGender.MALE]: 'الدارس',
    [RecipientGender.FEMALE]: 'الدارسة',
  }),
});

function normalizeArabicToken(value) {
  return String(value || '')
    .trim()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/^[^\p{Letter}\p{Number}]+|[^\p{Letter}\p{Number}]+$/gu, '');
}

function getLastNameToken(studentName) {
  return String(studentName || '')
    .split(/\s+/)
    .map((part) => normalizeArabicToken(part))
    .filter(Boolean)
    .at(-1) || '';
}

export function detectGenderFromName(studentName, rules = DEFAULT_FEMININE_RULES) {
  const lastToken = getLastNameToken(studentName);
  if (!lastToken) return RecipientGender.MALE;

  const isFeminine = rules.some((rule) => {
    if (rule.type === 'suffix') return lastToken.endsWith(rule.value);
    if (rule.type === 'exact') return lastToken === rule.value;
    if (typeof rule.test === 'function') return rule.test(lastToken);
    return false;
  });

  return isFeminine ? RecipientGender.FEMALE : RecipientGender.MALE;
}

function inferTemplateDetailLevel(template) {
  const dynamicFields = Array.isArray(template?.elements)
    ? template.elements
        .filter((element) => element?.type === 'dynamicText')
        .map((element) => element.field)
    : [];

  return dynamicFields.some((field) => DETAILED_TEMPLATE_FIELDS.has(field))
    ? TemplateDetailLevel.DETAILED
    : TemplateDetailLevel.SIMPLE;
}

function normalizeHexColor(value) {
  return String(value || '').trim().toLowerCase();
}

function extractColorLabelFromName(name) {
  const value = String(name || '');
  const match = value.match(/لون\s+(.+?)\s+-/);
  if (match?.[1]) return match[1].trim();

  const tokens = ['زمردي', 'عنابي', 'برونزي', 'كحلي', 'زيتي', 'برقوقي', 'وردي خشبي', 'رمادي', 'فيروزي', 'مرجاني', 'لافندر', 'زعفراني', 'نيلي', 'نعناعي', 'فحمي', 'طوبي', 'بترولي', 'موكا', 'ياقوتي', 'خوخي', 'ليلكي', 'أخضر غابي', 'أزرق سماوي', 'رملي', 'توتي', 'محيطي', 'فولاذي', 'كهرماني', 'ذهبي', 'وردي', 'أزرق', 'أخضر'];
  return tokens.find((token) => value.includes(token)) || '';
}

function getFallbackColorLabel(template) {
  const accent = normalizeHexColor(template?.background?.accentColor);
  const background = normalizeHexColor(template?.background?.color);
  return COLOR_LABEL_BY_HEX.get(accent)
    || COLOR_LABEL_BY_HEX.get(background)
    || extractColorLabelFromName(template?.name)
    || 'مخصص';
}

export class TemplateProfile {
  constructor(template = {}) {
    this.detailLevel = template.detailLevel === TemplateDetailLevel.DETAILED
      ? TemplateDetailLevel.DETAILED
      : inferTemplateDetailLevel(template);
    this.audienceType = template.audienceType === TemplateAudienceType.ADULT
      ? TemplateAudienceType.ADULT
      : TemplateAudienceType.STUDENT;
  }

  static fromTemplate(template) {
    return new TemplateProfile(template);
  }

  toJSON() {
    return {
      detailLevel: this.detailLevel,
      audienceType: this.audienceType,
    };
  }
}

export class RecipientDescriptor {
  constructor({ templateProfile, gender, title }) {
    this.templateProfile = templateProfile;
    this.gender = gender;
    this.title = title;
  }
}

export function resolveRecipientDescriptor(template, studentName, options = {}) {
  const templateProfile = TemplateProfile.fromTemplate(template);
  const gender = options.gender === RecipientGender.FEMALE || options.gender === RecipientGender.MALE
    ? options.gender
    : detectGenderFromName(studentName, options.rules || DEFAULT_FEMININE_RULES);
  const title = RECIPIENT_TITLES[templateProfile.audienceType][gender];

  return new RecipientDescriptor({ templateProfile, gender, title });
}

export function getRecipientTitleForTemplate(template, studentName, options = {}) {
  return resolveRecipientDescriptor(template, studentName, options).title;
}

export function getRecipientAchievementSentenceForTemplate(template, studentName, options = {}) {
  const title = getRecipientTitleForTemplate(template, studentName, options);
  const institutionName = String(options.institutionName || 'مؤسسة دار الإتقان العالي').trim();
  return `تبارك ${institutionName}\nبنجاح ${title} :`;
}

export function normalizeTemplateMetadata(template = {}) {
  // A name the user gave wins; the generated "colour - detail - audience" label is only a fallback.
  const ownName = typeof template.name === 'string' ? template.name.trim() : '';
  return {
    ...template,
    name: ownName || getTemplateDisplayName(template),
    ...TemplateProfile.fromTemplate(template).toJSON(),
  };
}

export function getTemplateDetailLabel(template) {
  return TemplateProfile.fromTemplate(template).detailLevel === TemplateDetailLevel.DETAILED ? 'مفصل' : 'بسيط';
}

export function getTemplateAudienceLabel(template) {
  return TemplateProfile.fromTemplate(template).audienceType === TemplateAudienceType.ADULT ? 'الدارسين' : 'الطلاب';
}

export function getTemplateDisplayName(template = {}) {
  if (Array.isArray(template?.availableBackgroundVariants) && template.availableBackgroundVariants.length > 0) {
    return `${getTemplateDetailLabel(template)} - ${getTemplateAudienceLabel(template)}`;
  }
  return `${getFallbackColorLabel(template)} - ${getTemplateDetailLabel(template)} - ${getTemplateAudienceLabel(template)}`;
}