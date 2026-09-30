import { DEFAULT_AUTO_FIT, DEFAULT_FONT_FAMILY, DYNAMIC_IMAGE_SIZES } from './elements.js';

/**
 * Template schema versions:
 *   1 — implicit (no `schemaVersion`); two renderers disagreed about defaults.
 *   2 — explicit defaults that reproduce what v1 *printed*, text auto-fit made explicit,
 *       legacy background decoration materialised as editable elements.
 */
export const CURRENT_SCHEMA_VERSION = 2;

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonEmpty(value) {
  return value === null || value === undefined || value === '' ? null : value;
}

/*
 * v1 → v2
 *
 * Rules (see docs/AUDIT.md §7):
 *  - Shapes follow what the PDF printed: missing/null fill or stroke paints nothing, and a
 *    missing strokeWidth is 0.
 *  - Text keeps editor geometry defaults (width 200, fontSize 28) because users arranged it
 *    there, and makes the PDF's implicit shrink-to-fit explicit via `autoFit`.
 *  - Non-custom backgrounds had header/frame decoration drawn only by the PDF; it becomes
 *    ordinary elements so the editor shows (and lets users edit) what gets printed.
 *  - Duplicate element ids are made unique. Nothing is ever deleted.
 */
function legacyDecorElements(template) {
  const width = toNumber(template.width, 1123);
  const height = toNumber(template.height, 794);
  const accent = template.background?.accentColor || '#0f4a3c';
  const base = { rotation: 0, opacity: 1, locked: false, visible: true, cornerRadius: 0 };
  return [
    { ...base, id: 'legacy-decor-header', name: 'شريط علوي', type: 'rect', x: 0, y: 0, width, height: 96, fill: accent, stroke: null, strokeWidth: 0 },
    { ...base, id: 'legacy-decor-frame', name: 'إطار', type: 'rect', x: 24, y: 24, width: width - 48, height: height - 48, fill: null, stroke: accent, strokeWidth: 2 },
    { ...base, id: 'legacy-decor-band', name: 'شريط أبيض', type: 'rect', x: 40, y: 104, width: width - 80, height: 12, fill: '#ffffff', stroke: null, strokeWidth: 0 },
    { ...base, id: 'legacy-decor-foot-left', name: 'زخرفة سفلية', type: 'rect', x: 44, y: height - 92, width: 120, height: 8, fill: accent, stroke: null, strokeWidth: 0 },
    { ...base, id: 'legacy-decor-foot-right', name: 'زخرفة سفلية', type: 'rect', x: width - 164, y: height - 92, width: 120, height: 8, fill: accent, stroke: null, strokeWidth: 0 },
  ];
}

function migrateElementV1(element) {
  const next = { ...element };
  next.x = toNumber(next.x, 0);
  next.y = toNumber(next.y, 0);
  next.rotation = toNumber(next.rotation, 0);
  next.opacity = toNumber(next.opacity ?? 1, 1);
  next.locked = Boolean(next.locked);
  next.visible = next.visible !== false;

  switch (next.type) {
    case 'text':
    case 'dynamicText': {
      next.width = toNumber(next.width, 200);
      next.fontFamily = next.fontFamily || DEFAULT_FONT_FAMILY;
      next.fontSize = toNumber(next.fontSize, 28);
      next.fontStyle = next.fontStyle || 'normal';
      next.fill = next.fill || '#0f172a';
      next.align = next.align || 'center';
      next.lineHeight = Math.max(0.5, toNumber(next.lineHeight, 1.4));
      next.letterSpacing = toNumber(next.letterSpacing, 0);
      next.textDecoration = next.textDecoration || '';
      if (!next.autoFit) next.autoFit = { ...DEFAULT_AUTO_FIT };
      if (next.type === 'dynamicText') next.field = next.field || 'studentName';
      else next.text = next.text ?? '';
      break;
    }
    case 'rect':
    case 'circle': {
      next.width = Math.max(1, toNumber(next.width, next.type === 'rect' ? 100 : 120));
      next.height = Math.max(1, toNumber(next.height, next.type === 'rect' ? 50 : 120));
      next.fill = nonEmpty(next.fill);
      next.stroke = nonEmpty(next.stroke);
      next.strokeWidth = toNumber(next.strokeWidth, 0);
      if (next.type === 'rect') next.cornerRadius = toNumber(next.cornerRadius, 0);
      break;
    }
    case 'line': {
      next.width = toNumber(next.width, 200);
      next.stroke = next.stroke || '#0f172a';
      next.strokeWidth = toNumber(next.strokeWidth, 3) || 3;
      break;
    }
    case 'dynamicImage': {
      next.field = next.field || 'logo';
      const size = DYNAMIC_IMAGE_SIZES[next.field] || DYNAMIC_IMAGE_SIZES.logo;
      next.width = toNumber(next.width, size.width) || size.width;
      next.height = toNumber(next.height, size.height) || size.height;
      break;
    }
    case 'image': {
      next.width = toNumber(next.width, 120) || 120;
      next.height = toNumber(next.height, 80) || 80;
      next.src = next.src || '';
      break;
    }
    default:
      break;
  }

  return next;
}

function uniqueIds(elements) {
  const used = new Set();
  return elements.map((element, index) => {
    let id = typeof element.id === 'string' && element.id ? element.id : `el-${index + 1}`;
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}-${n}`)) n += 1;
      id = `${id}-${n}`;
    }
    used.add(id);
    return id === element.id ? element : { ...element, id };
  });
}

function migrateV1ToV2(template) {
  const next = { ...template };
  next.width = toNumber(next.width, 1123);
  next.height = toNumber(next.height, 794);
  next.orientation = next.orientation || (next.width >= next.height ? 'landscape' : 'portrait');
  next.background = { type: 'solid', color: '#f8f4ea', accentColor: '#0f4a3c', ...(next.background || {}) };

  let elements = Array.isArray(next.elements) ? next.elements.filter((el) => el && typeof el === 'object') : [];
  if (next.background.customLayout !== true) {
    elements = [...legacyDecorElements(next), ...elements];
    next.background = { ...next.background, customLayout: true };
  }

  next.elements = uniqueIds(elements.map(migrateElementV1));
  next.schemaVersion = 2;
  return next;
}

const MIGRATIONS = {
  1: migrateV1ToV2,
};

export function getSchemaVersion(template) {
  const version = Number(template?.schemaVersion);
  return Number.isInteger(version) && version > 0 ? version : 1;
}

/**
 * Upgrade a template to CURRENT_SCHEMA_VERSION. Pure (never mutates input) and idempotent.
 * Templates from a *newer* schema are returned untouched so an old server never downgrades them.
 */
export function migrateTemplate(template) {
  if (!template || typeof template !== 'object') return template;
  let current = structuredClone(template);
  let version = getSchemaVersion(current);

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from schema v${version}`);
    current = step(current);
    version = getSchemaVersion(current);
  }

  return current;
}

export function needsMigration(template) {
  return getSchemaVersion(template) < CURRENT_SCHEMA_VERSION;
}
