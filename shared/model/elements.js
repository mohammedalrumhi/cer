import { createId } from './ids.js';

/**
 * @typedef {'text'|'dynamicText'|'dateField'|'image'|'dynamicImage'|'frame'|'rect'|'circle'|'polygon'|'star'|'line'|'shape'|'ornament'|'icon'|'qrcode'|'barcode'} ElementType
 *
 * Paint (fill): a colour string, null for none, or a gradient
 *   { type: 'linear', angle, stops: [{ offset, color }] } | { type: 'radial', stops }  (see shared/render/paint.js)
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
 * @property {string|null} [groupId]   elements sharing a groupId select and move together
 */

export const ELEMENT_TYPES = [
  'text', 'dynamicText', 'dateField',
  'image', 'dynamicImage', 'frame',
  'rect', 'circle', 'polygon', 'star', 'line', 'shape', 'ornament', 'icon',
  'qrcode', 'barcode',
];
export const TEXT_TYPES = new Set(['text', 'dynamicText', 'dateField']);
export const IMAGE_TYPES = new Set(['image', 'dynamicImage', 'frame']);
export const SHAPE_TYPES = new Set(['rect', 'circle', 'polygon', 'star', 'line', 'shape']);
/** Types whose aspect ratio is locked while resizing. */
export const RATIO_LOCKED_TYPES = new Set(['image', 'dynamicImage', 'icon', 'qrcode', 'ornament']);

export const NO_EFFECTS = Object.freeze({ shadow: null, outline: null, highlight: null });
export const NO_FILTERS = Object.freeze({ brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false });

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

const TEXT_EXTRAS = { verticalAlign: 'top', kashida: 0, effects: { shadow: null, outline: null, highlight: null } };
const IMAGE_EXTRAS = { fit: 'fill', crop: null, flipX: false, flipY: false, filters: { ...NO_FILTERS }, cornerRadius: 0, border: null };

const TYPE_DEFAULTS = {
  text: {
    ...TEXT_EXTRAS,
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
    ...TEXT_EXTRAS,
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
  dateField: {
    ...TEXT_EXTRAS,
    width: 360,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: 24,
    fontStyle: 'normal',
    textDecoration: '',
    fill: '#1b2a23',
    align: 'center',
    lineHeight: 1.4,
    letterSpacing: 0,
    autoFit: { ...DEFAULT_AUTO_FIT },
    date: { calendar: 'hijri', style: 'long', source: 'issue' },
    dynamicTextTemplate: '',
  },
  rect: { width: 200, height: 120, fill: '#d3eadf', stroke: null, strokeWidth: 0, cornerRadius: 0, dash: null },
  circle: { width: 120, height: 120, fill: '#d3eadf', stroke: null, strokeWidth: 0, dash: null },
  polygon: { width: 160, height: 150, sides: 6, fill: '#0f6b52', stroke: null, strokeWidth: 0, cornerRadius: 0, dash: null },
  star: { width: 160, height: 160, points: 5, innerRadius: 0.48, fill: '#b8893c', stroke: null, strokeWidth: 0, cornerRadius: 0, dash: null },
  line: { width: 300, height: 4, stroke: '#1b2a23', strokeWidth: 3, dash: null, lineCap: 'round', startHead: 'none', endHead: 'none' },
  shape: { width: 360, height: 90, shape: 'ribbon', fill: '#0f6b52', stroke: null, strokeWidth: 0, dash: null },
  ornament: { width: 160, height: 160, ornament: 'star8', color: '#b8893c', accentColor: '#0f6b52', strokeWidth: 2 },
  icon: { width: 96, height: 96, iconName: 'star', paths: [], color: '#0f6b52', strokeWidth: 2 },
  image: { ...IMAGE_EXTRAS, width: 200, height: 150, src: '' },
  dynamicImage: { ...IMAGE_EXTRAS, field: 'logo' },
  frame: { ...IMAGE_EXTRAS, width: 240, height: 240, shape: 'circle', src: '', fit: 'cover' },
  qrcode: { width: 140, height: 140, value: '{{verifyUrl}}', color: '#111111', background: '#ffffff', ecLevel: 'M' },
  barcode: { width: 300, height: 96, value: '{{serial}}', color: '#111111', background: null, showText: true },
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
