import { DYNAMIC_IMAGE_SIZES, isTextElement } from '../model/elements.js';

/**
 * Template + data → display list. The editor (Konva) and the PDF (PDFKit) paint the same list,
 * so geometry, text layout and paint defaults cannot drift between them.
 *
 * @typedef {{ id: string, x: number, y: number, rotation: number, opacity: number }} OpBase
 * @typedef {OpBase & { kind: 'rect', width: number, height: number, fill: string|null, stroke: string|null, strokeWidth: number, cornerRadius: number }} RectOp
 * @typedef {OpBase & { kind: 'ellipse', width: number, height: number, fill: string|null, stroke: string|null, strokeWidth: number }} EllipseOp
 * @typedef {OpBase & { kind: 'line', width: number, stroke: string, strokeWidth: number }} LineOp
 * @typedef {OpBase & { kind: 'image', width: number, height: number, source: { type: 'field'|'src', value: string } }} ImageOp
 * @typedef {OpBase & { kind: 'text', width: number, height: number, fill: string, layout: object|null, syntheticBold: boolean, syntheticItalic: boolean, text: string }} TextOp
 */

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Resolve `{{token}}` placeholders; `{{value}}` means the element's own field. */
export function renderTextTemplate(templateText, values, fallbackField) {
  const raw = String(templateText ?? '');
  if (!raw) return String(values[fallbackField] ?? '');
  return raw.replace(PLACEHOLDER, (_match, token) => String((token === 'value' ? values[fallbackField] : values[token]) ?? ''));
}

export function resolveElementText(element, values) {
  if (element.type === 'dynamicText') return renderTextTemplate(element.dynamicTextTemplate, values, element.field);
  return String(element.text ?? '');
}

/** Paint defaults for schema v2. `null` / '' paint means "none". */
function paint(value) {
  return value === null || value === undefined || value === '' || value === 'transparent' ? null : value;
}

function base(element) {
  return {
    id: element.id,
    x: Number(element.x) || 0,
    y: Number(element.y) || 0,
    rotation: Number(element.rotation) || 0,
    opacity: element.opacity === undefined ? 1 : Math.min(1, Math.max(0, Number(element.opacity))),
  };
}

/** Font keys (resolved files + fallbacks) a template needs before it can be laid out. */
export function requiredFontKeys(template, registry) {
  const keys = new Set(registry.fallbackKeys());
  for (const element of template.elements || []) {
    if (isTextElement(element)) keys.add(registry.resolve(element.fontFamily, element.fontStyle).key);
  }
  return keys;
}

export function textLayoutSpec(element, text, registry) {
  const font = registry.resolve(element.fontFamily, element.fontStyle);
  return {
    font,
    spec: {
      text,
      fontKey: font.key,
      fallbackKeys: registry.fallbackKeys(),
      fontSize: Number(element.fontSize) || 28,
      width: Number(element.width) || 200,
      align: element.align || 'center',
      lineHeight: Number(element.lineHeight) || 1.4,
      letterSpacing: Number(element.letterSpacing) || 0,
      direction: element.direction || 'auto',
      autoFit: element.autoFit || { mode: 'none' },
      underline: String(element.textDecoration || '').includes('underline'),
    },
  };
}

/**
 * @param {object} element
 * @param {{ engine: object, registry: object, values: Record<string, string> }} ctx
 * @returns {RectOp|EllipseOp|LineOp|ImageOp|TextOp|null}
 */
export function elementToOp(element, { engine, registry, values }) {
  if (!element || element.visible === false) return null;
  const common = base(element);

  switch (element.type) {
    case 'text':
    case 'dynamicText': {
      const text = resolveElementText(element, values);
      const { font, spec } = textLayoutSpec(element, text, registry);
      const layout = text && engine.hasFont(font.key) ? engine.layoutText(spec) : null;
      return {
        ...common,
        kind: 'text',
        text,
        width: spec.width,
        height: layout ? layout.height : spec.fontSize * spec.lineHeight,
        fill: element.fill || '#0f172a',
        layout,
        syntheticBold: font.syntheticBold,
        syntheticItalic: font.syntheticItalic,
      };
    }
    case 'rect':
      return {
        ...common,
        kind: 'rect',
        width: Math.max(1, Number(element.width) || 100),
        height: Math.max(1, Number(element.height) || 50),
        fill: paint(element.fill),
        stroke: paint(element.stroke),
        strokeWidth: Number(element.strokeWidth) || 0,
        cornerRadius: Number(element.cornerRadius) || 0,
      };
    case 'circle':
      return {
        ...common,
        kind: 'ellipse',
        width: Math.max(1, Number(element.width) || 120),
        height: Math.max(1, Number(element.height) || 120),
        fill: paint(element.fill),
        stroke: paint(element.stroke),
        strokeWidth: Number(element.strokeWidth) || 0,
      };
    case 'line':
      return {
        ...common,
        kind: 'line',
        width: Number(element.width) || 200,
        stroke: element.stroke || '#0f172a',
        strokeWidth: Number(element.strokeWidth) || 3,
      };
    case 'dynamicImage': {
      const size = DYNAMIC_IMAGE_SIZES[element.field] || DYNAMIC_IMAGE_SIZES.logo;
      return {
        ...common,
        kind: 'image',
        width: Number(element.width) || size.width,
        height: Number(element.height) || size.height,
        source: { type: 'field', value: element.field || 'logo' },
      };
    }
    case 'image':
      return {
        ...common,
        kind: 'image',
        width: Number(element.width) || 120,
        height: Number(element.height) || 80,
        source: { type: 'src', value: element.src || '' },
      };
    default:
      return null;
  }
}

/**
 * @param {object} template schema v2 template
 * @param {{ engine: object, registry: object, values: Record<string, string> }} ctx
 */
export function buildScene(template, ctx) {
  const background = template.background || {};
  return {
    width: Number(template.width) || 1123,
    height: Number(template.height) || 794,
    background: {
      color: background.color || '#f8f4ea',
      imagePath: background.imagePath || null,
    },
    ops: (template.elements || []).map((element) => elementToOp(element, ctx)).filter(Boolean),
  };
}

/* Synthetic styles, shared so both painters embolden/slant identically (Skia-like constants). */
export function syntheticBoldStrokeWidth(fontSize) {
  // Skia interpolates 1/24 of the size at 9px down to 1/32 at 36px and above.
  const t = Math.min(1, Math.max(0, (fontSize - 9) / (36 - 9)));
  return fontSize * (1 / 24 + (1 / 32 - 1 / 24) * t);
}

export const SYNTHETIC_ITALIC_SKEW = -0.25;
