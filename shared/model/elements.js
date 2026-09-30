import { createId } from './ids.js';

/**
 * @typedef {'text'|'dynamicText'|'image'|'dynamicImage'|'rect'|'circle'|'line'} ElementType
 *
 * @typedef {object} AutoFit
 * @property {'none'|'shrink'} mode   shrink: reduce font size until the longest line fits `width`
 * @property {number} [minScale]      lower bound as a fraction of fontSize (default 0.72)
 * @property {number} [minFontSize]   absolute lower bound in px (default 12)
 *
 * @typedef {object} BaseElement
 * @property {string} id
 * @property {ElementType} type
 * @property {string} [name]
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} [height]
 * @property {number} rotation   degrees clockwise around (x, y)
 * @property {number} opacity    0..1
 * @property {boolean} locked
 * @property {boolean} visible
 */

export const ELEMENT_TYPES = ['text', 'dynamicText', 'image', 'dynamicImage', 'rect', 'circle', 'line'];
export const TEXT_TYPES = new Set(['text', 'dynamicText']);
export const IMAGE_TYPES = new Set(['image', 'dynamicImage']);
export const SHAPE_TYPES = new Set(['rect', 'circle', 'line']);

export const DEFAULT_FONT_FAMILY = 'Amiri-Regular';
export const DEFAULT_AUTO_FIT = Object.freeze({ mode: 'shrink', minScale: 0.72, minFontSize: 12 });

export const DYNAMIC_IMAGE_SIZES = Object.freeze({
  logo: { width: 113, height: 113 },
  stamp: { width: 113, height: 113 },
  signature: { width: 113, height: 60 },
});

export function isTextElement(element) {
  return TEXT_TYPES.has(element?.type);
}

export function isImageElement(element) {
  return IMAGE_TYPES.has(element?.type);
}

const BASE_DEFAULTS = { rotation: 0, opacity: 1, locked: false, visible: true };

const TYPE_DEFAULTS = {
  text: {
    width: 300,
    text: 'نص جديد',
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 28,
    fontStyle: 'normal',
    textDecoration: '',
    fill: '#0f172a',
    align: 'center',
    lineHeight: 1.4,
    letterSpacing: 0,
    growDirection: 'right',
    autoFit: { mode: 'none' },
  },
  dynamicText: {
    width: 400,
    field: 'studentName',
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 36,
    fontStyle: 'bold',
    textDecoration: '',
    fill: '#0f172a',
    align: 'center',
    lineHeight: 1.4,
    letterSpacing: 0,
    growDirection: 'right',
    autoFit: { ...DEFAULT_AUTO_FIT },
  },
  rect: { width: 200, height: 120, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2, cornerRadius: 0 },
  circle: { width: 120, height: 120, fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2 },
  line: { width: 300, height: 4, stroke: '#0f172a', strokeWidth: 3 },
  image: { width: 200, height: 150, src: '' },
  dynamicImage: { field: 'logo' },
};

/**
 * Factory for new elements. Every element gets a fresh id; `overrides` win over defaults.
 * @param {ElementType} type
 * @param {Partial<BaseElement> & Record<string, unknown>} [overrides]
 */
export function createElement(type, overrides = {}) {
  if (!ELEMENT_TYPES.includes(type)) {
    throw new Error(`Unknown element type: ${type}`);
  }

  const typeDefaults = TYPE_DEFAULTS[type];
  const element = {
    id: createId(),
    type,
    x: 200,
    y: 200,
    ...BASE_DEFAULTS,
    ...structuredClone(typeDefaults),
    ...overrides,
  };

  if (type === 'dynamicImage') {
    const size = DYNAMIC_IMAGE_SIZES[element.field] || DYNAMIC_IMAGE_SIZES.logo;
    element.width = overrides.width ?? size.width;
    element.height = overrides.height ?? size.height;
  }

  element.id = overrides.id || element.id;
  return element;
}

/** Deep copy with fresh ids, offset for paste/duplicate. */
export function cloneElement(element, { dx = 0, dy = 0 } = {}) {
  const copy = structuredClone(element);
  copy.id = createId();
  copy.x = (Number(copy.x) || 0) + dx;
  copy.y = (Number(copy.y) || 0) + dy;
  return copy;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Structural validation. Returns human-readable errors (English, for logs/API) instead of throwing.
 * Intentionally lenient about unknown extra properties so older/newer clients can coexist.
 */
export function validateTemplate(template) {
  const errors = [];
  if (!template || typeof template !== 'object') return ['template must be an object'];

  for (const key of ['width', 'height']) {
    if (!isFiniteNumber(template[key]) || template[key] <= 0 || template[key] > 20000) {
      errors.push(`${key} must be a number between 1 and 20000`);
    }
  }

  if (!Array.isArray(template.elements)) {
    errors.push('elements must be an array');
    return errors;
  }

  const seen = new Set();
  template.elements.forEach((element, index) => {
    const where = `elements[${index}]`;
    if (!element || typeof element !== 'object') {
      errors.push(`${where} must be an object`);
      return;
    }
    if (!ELEMENT_TYPES.includes(element.type)) errors.push(`${where}.type "${element.type}" is not supported`);
    if (typeof element.id !== 'string' || !element.id) errors.push(`${where}.id is required`);
    else if (seen.has(element.id)) errors.push(`${where}.id "${element.id}" is duplicated`);
    seen.add(element.id);
    for (const key of ['x', 'y']) {
      if (!isFiniteNumber(element[key])) errors.push(`${where}.${key} must be a finite number`);
    }
  });

  return errors;
}
