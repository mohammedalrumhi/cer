import { DYNAMIC_IMAGE_SIZES, isTextElement } from '../model/elements.js';
import { formatDate, parseIsoDate } from '../model/fields.js';
import { ORNAMENTS, SHAPES, frameClipPath } from '../assets/ornaments.js';
import { code128Modules } from './code128.js';
import { resolvePaint } from './paint.js';
import { ellipsePath, fmt, normalizePath, placePath, polygonPoints, polylinePath, rectPath, roundedPolygonPath, transformPath } from './path.js';
import { qrMatrix } from './qr.js';
import { applyKashida, convertDigits } from './textTransforms.js';

/**
 * Template + data → display list. The editor (Konva) and the PDF (PDFKit) paint the same list,
 * so geometry, text layout and paint cannot drift between them.
 *
 * Every op is positioned at the element origin (x, y), rotated clockwise around it, with `opacity`.
 * Op coordinates are local to that origin; `originY` is where the origin sits inside the op's box
 * (lines are centred on their y, everything else is top-left).
 *
 * @typedef {{ id: string, x: number, y: number, rotation: number, opacity: number, width: number, height: number, originY: number }} OpBase
 * @typedef {{ d: string, fill: object|null, stroke: string|null, strokeWidth: number, dash: number[]|null,
 *   lineCap: 'butt'|'round'|'square', lineJoin: 'miter'|'round'|'bevel', evenOdd: boolean }} PathItem
 * @typedef {OpBase & { kind: 'shape', items: PathItem[] }} ShapeOp
 * @typedef {OpBase & { kind: 'image', source: { type: 'field'|'src', value: string }, fit: string, crop: object|null,
 *   flipX: boolean, flipY: boolean, filters: object|null, clipD: string|null, border: object|null, placeholder: boolean }} ImageOp
 * @typedef {OpBase & { kind: 'text', text: string, layout: object|null, fill: object|null, effects: object,
 *   syntheticBold: boolean, syntheticItalic: boolean, offsetY: number, requestedFontSize: number }} TextOp
 */

const PLACEHOLDER = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;

/** Resolve `{{token}}` placeholders; `{{value}}` means the element's own field. */
export function renderTextTemplate(templateText, values, fallbackField) {
  const raw = String(templateText ?? '');
  if (!raw) return String(values[fallbackField] ?? '');
  return raw.replace(PLACEHOLDER, (_match, token) => String((token === 'value' ? values[fallbackField] : values[token]) ?? ''));
}

/** `{{tokens}}` used in a string (for the "fields" checks in the generator). */
export function placeholderTokens(text) {
  return [...String(text ?? '').matchAll(PLACEHOLDER)].map((match) => match[1]);
}

function dateValue(element, values) {
  const format = element.date || {};
  const date = (format.source === 'today' ? null : parseIsoDate(values.__issueDateIso)) || new Date();
  return formatDate(date, format);
}

export function resolveElementText(element, values) {
  if (element.type === 'dynamicText') return renderTextTemplate(element.dynamicTextTemplate, values, element.field);
  if (element.type === 'dateField') {
    const value = dateValue(element, values);
    return renderTextTemplate(element.dynamicTextTemplate, { ...values, value }, 'value');
  }
  // Static text may carry {{fields}} dropped onto it from the fields panel.
  const text = String(element.text ?? '');
  return text.includes('{{') ? renderTextTemplate(text, values, null) : text;
}

/** "No paint" values. */
function paint(value) {
  return value === null || value === undefined || value === '' || value === 'transparent' ? null : value;
}

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function base(element) {
  return {
    id: element.id,
    x: num(element.x),
    y: num(element.y),
    rotation: num(element.rotation),
    opacity: element.opacity === undefined ? 1 : Math.min(1, Math.max(0, num(element.opacity, 1))),
    originY: 0,
  };
}

function dashArray(dash, strokeWidth) {
  if (!Array.isArray(dash) || dash.length === 0) return null;
  const values = dash.map((v) => Math.max(0, num(v)));
  // Zero-length dashes (dots with round caps) become tiny ones: PDF rejects 0 in a dash array.
  return values.some((v) => v > 0) ? values.map((v) => Math.max(0.001, (v * Math.max(1, strokeWidth)) / 2)) : null;
}

/** @returns {PathItem} */
function item(d, { fill = null, stroke = null, strokeWidth = 0, dash = null, lineCap = 'butt', lineJoin = 'miter', evenOdd = false } = {}) {
  return { d, fill, stroke, strokeWidth, dash, lineCap, lineJoin, evenOdd };
}

/** Font keys (resolved files + fallbacks) a template needs before it can be laid out. */
export function requiredFontKeys(template, registry) {
  const keys = new Set(registry.fallbackKeys());
  for (const element of template.elements || []) {
    if (isTextElement(element)) keys.add(registry.resolve(element.fontFamily, element.fontStyle).key);
    if (element.type === 'barcode' && element.showText !== false) keys.add(registry.resolve('Cairo', 'normal').key);
  }
  return keys;
}

export function textLayoutSpec(element, text, registry) {
  const font = registry.resolve(element.fontFamily, element.fontStyle);
  const decoration = String(element.textDecoration || '');
  return {
    font,
    spec: {
      text,
      fontKey: font.key,
      fallbackKeys: registry.fallbackKeys(),
      fontSize: num(element.fontSize, 28) || 28,
      width: num(element.width, 200) || 200,
      align: element.align || 'center',
      lineHeight: num(element.lineHeight, 1.4) || 1.4,
      letterSpacing: num(element.letterSpacing),
      direction: element.direction || 'auto',
      autoFit: element.autoFit || { mode: 'none' },
      underline: decoration.includes('underline'),
      strike: decoration.includes('line-through'),
    },
  };
}

function textOp(element, common, { engine, registry, values, digits }) {
  const raw = resolveElementText(element, values);
  const text = applyKashida(convertDigits(raw, digits), element.kashida);
  const { font, spec } = textLayoutSpec(element, text, registry);
  const layout = text && engine.hasFont(font.key) ? engine.layoutText(spec) : null;
  const contentHeight = layout ? layout.height : spec.fontSize * spec.lineHeight;
  const boxHeight = num(element.height) > 0 && element.verticalAlign && element.verticalAlign !== 'top' ? num(element.height) : 0;
  const free = Math.max(0, boxHeight - contentHeight);
  const offsetY = element.verticalAlign === 'middle' ? free / 2 : element.verticalAlign === 'bottom' ? free : 0;
  const height = Math.max(contentHeight, boxHeight);
  return {
    ...common,
    kind: 'text',
    text,
    width: spec.width,
    height,
    fill: resolvePaint(element.fill || '#0f172a', spec.width, height),
    effects: element.effects || {},
    layout,
    offsetY,
    requestedFontSize: spec.fontSize,
    syntheticBold: font.syntheticBold,
    syntheticItalic: font.syntheticItalic,
  };
}

function lineOp(element, common) {
  const length = num(element.width, 200) || 200;
  const sw = Math.max(0.5, num(element.strokeWidth, 3) || 3);
  const color = element.stroke || '#0f172a';
  const start = element.startHead || 'none';
  const end = element.endHead || 'none';
  const head = Math.max(8, sw * 3);
  const height = Math.max(sw, start !== 'none' || end !== 'none' ? head : 0);
  const cy = height / 2;
  const items = [];

  // Triangle-style heads replace the end of the stroke so the cap doesn't poke past the tip.
  const inset = (kind) => (kind === 'triangle' ? head * 0.85 : kind === 'arrow' ? sw * 0.5 : 0);
  const x0 = inset(start);
  const x1 = length - inset(end);
  items.push(item(`M${fmt(x0)} ${fmt(cy)}L${fmt(Math.max(x0, x1))} ${fmt(cy)}`, {
    stroke: color,
    strokeWidth: sw,
    dash: dashArray(element.dash, sw),
    lineCap: element.lineCap || 'butt',
  }));

  const addHead = (kind, x, dir) => {
    if (kind === 'none') return;
    const back = x - dir * head;
    if (kind === 'arrow') {
      items.push(item(polylinePath([[back, cy - head / 2], [x, cy], [back, cy + head / 2]], false), { stroke: color, strokeWidth: sw, lineCap: 'round', lineJoin: 'round' }));
    } else if (kind === 'triangle') {
      items.push(item(polylinePath([[back, cy - head / 2], [x, cy], [back, cy + head / 2]]), { fill: { kind: 'solid', color } }));
    } else if (kind === 'circle') {
      items.push(item(ellipsePath(x - dir * head * 0.25, cy, head / 2.6, head / 2.6), { fill: { kind: 'solid', color } }));
    } else if (kind === 'square') {
      items.push(item(rectPath(x - head * 0.4 - dir * head * 0.1, cy - head * 0.4, head * 0.8, head * 0.8), { fill: { kind: 'solid', color } }));
    } else if (kind === 'diamond') {
      const c = x - dir * head * 0.5;
      items.push(item(polylinePath([[c - head / 2, cy], [c, cy - head / 2], [c + head / 2, cy], [c, cy + head / 2]]), { fill: { kind: 'solid', color } }));
    }
  };
  addHead(start, 0, -1);
  addHead(end, length, 1);
  return { ...common, kind: 'shape', width: length, height, originY: cy, items };
}

function strokeOptions(element, joint = 'miter') {
  const stroke = paint(element.stroke);
  const sw = num(element.strokeWidth);
  return stroke && sw > 0 ? { stroke, strokeWidth: sw, dash: dashArray(element.dash, sw), lineJoin: joint } : {};
}

function libraryOp(element, common) {
  const w = Math.max(1, num(element.width, 160));
  const h = Math.max(1, num(element.height, 160));
  const entry = ORNAMENTS[element.ornament] || ORNAMENTS.star8;
  const weight = Math.max(0.25, num(element.strokeWidth, 2));
  const colors = { primary: element.color || '#b8893c', accent: element.accentColor || element.color || '#0f6b52' };
  const items = entry.build(w, h).filter((part) => part.d).map((part) => {
    const color = colors[part.role] || colors.primary;
    return part.mode === 'stroke'
      ? item(normalizePath(part.d), { stroke: color, strokeWidth: weight * (part.width || 1), lineCap: 'round', lineJoin: 'round' })
      : item(normalizePath(part.d), { fill: resolvePaint(color, w, h), evenOdd: Boolean(part.evenOdd) });
  });
  return { ...common, kind: 'shape', width: w, height: h, items };
}

function iconOp(element, common) {
  const w = Math.max(1, num(element.width, 96));
  const h = Math.max(1, num(element.height, 96));
  const s = Math.min(w, h) / 24;
  const tx = (w - 24 * s) / 2;
  const ty = (h - 24 * s) / 2;
  const color = element.color || '#0f6b52';
  const sw = Math.max(0.25, num(element.strokeWidth, 2)) * s;
  const d = (element.paths || []).map((path) => placePath(normalizePath(path), s, s, tx, ty)).join('');
  const items = d ? [item(d, { stroke: color, strokeWidth: sw, lineCap: 'round', lineJoin: 'round' })] : [];
  if (element.fill && paint(element.fill)) items.unshift(item(d, { fill: resolvePaint(element.fill, w, h) }));
  return { ...common, kind: 'shape', width: w, height: h, items };
}

function qrOp(element, common, { qrcode, values }) {
  const w = Math.max(1, num(element.width, 140));
  const h = Math.max(1, num(element.height, 140));
  const value = renderTextTemplate(element.value ?? '', values, null);
  const items = [];
  if (paint(element.background)) items.push(item(rectPath(0, 0, w, h), { fill: { kind: 'solid', color: element.background } }));
  const matrix = qrMatrix(qrcode, value || ' ', element.ecLevel);
  if (matrix) {
    const quiet = 1;
    const count = matrix.length + quiet * 2;
    const m = Math.min(w, h) / count;
    const ox = (w - m * count) / 2 + quiet * m;
    const oy = (h - m * count) / 2 + quiet * m;
    let d = '';
    matrix.forEach((row, r) => {
      // Horizontal runs keep the path short.
      for (let c = 0; c < row.length;) {
        if (!row[c]) { c += 1; continue; }
        let end = c;
        while (end < row.length && row[end]) end += 1;
        d += `M${fmt(ox + c * m)} ${fmt(oy + r * m)}H${fmt(ox + end * m)}V${fmt(oy + (r + 1) * m)}H${fmt(ox + c * m)}Z`;
        c = end;
      }
    });
    items.push(item(normalizePath(d), { fill: { kind: 'solid', color: element.color || '#111111' } }));
  }
  return { ...common, kind: 'shape', width: w, height: h, items };
}

function barcodeOp(element, common, { engine, registry, values }) {
  const w = Math.max(1, num(element.width, 300));
  const h = Math.max(1, num(element.height, 96));
  const value = renderTextTemplate(element.value ?? '', values, null) || ' ';
  const color = element.color || '#111111';
  const items = [];
  if (paint(element.background)) items.push(item(rectPath(0, 0, w, h), { fill: { kind: 'solid', color: element.background } }));
  const showText = element.showText !== false;
  const textSize = showText ? Math.max(8, Math.min(h * 0.2, w / Math.max(6, value.length) * 1.4)) : 0;
  const barsHeight = h - (showText ? textSize * 1.35 : 0);
  const widths = code128Modules(value);
  const total = widths.reduce((sum, v) => sum + v, 0) + 20; // 10-module quiet zones
  const unit = w / total;
  let x = 10 * unit;
  let d = '';
  widths.forEach((width, index) => {
    if (index % 2 === 0) d += rectPath(x, 0, width * unit, barsHeight);
    x += width * unit;
  });
  if (showText) {
    const font = registry.resolve('Cairo', 'normal');
    if (engine.hasFont(font.key)) {
      const layout = engine.layoutText({ text: value, fontKey: font.key, fallbackKeys: registry.fallbackKeys(), fontSize: textSize, width: w, align: 'center', lineHeight: 1, direction: 'ltr' });
      for (const line of layout.lines) {
        for (const glyph of line.glyphs) {
          const outline = engine.glyphPath(glyph.key, glyph.gid);
          if (outline) d += transformPath(outline, [glyph.s, 0, 0, -glyph.s, line.x + glyph.x, barsHeight + textSize * 0.2 + line.baseline + glyph.y]);
        }
      }
    }
  }
  items.push(item(d, { fill: { kind: 'solid', color } }));
  return { ...common, kind: 'shape', width: w, height: h, items };
}

function imageOp(element, common) {
  const isDynamic = element.type === 'dynamicImage';
  const size = isDynamic ? DYNAMIC_IMAGE_SIZES[element.field] || DYNAMIC_IMAGE_SIZES.logo : null;
  const w = Math.max(1, num(element.width, size?.width ?? 120) || size?.width || 120);
  const h = Math.max(1, num(element.height, size?.height ?? 80) || size?.height || 80);
  const radius = num(element.cornerRadius);
  const clipD = element.type === 'frame' ? frameClipPath(element.shape, w, h, radius) : radius > 0 ? rectPath(0, 0, w, h, radius) : null;
  const border = element.border && num(element.border.width) > 0 && element.border.color ? { color: element.border.color, width: num(element.border.width) } : null;
  const src = isDynamic ? element.field || 'logo' : element.src || '';
  return {
    ...common,
    kind: 'image',
    width: w,
    height: h,
    source: { type: isDynamic ? 'field' : 'src', value: src },
    fit: element.fit || (element.type === 'frame' ? 'cover' : 'fill'),
    crop: element.crop || null,
    flipX: Boolean(element.flipX),
    flipY: Boolean(element.flipY),
    filters: element.filters || null,
    clipD,
    borderD: border ? clipD || rectPath(0, 0, w, h) : null,
    border,
    placeholder: element.type === 'frame' && !src,
  };
}

/**
 * Where the full source image is drawn inside the op box (local coordinates), for a given
 * natural image size. Cropping and fit are expressed as "draw the whole image here, clipped".
 */
export function imageDrawRect(op, naturalWidth, naturalHeight) {
  const w = op.width;
  const h = op.height;
  const c = op.crop || { x: 0, y: 0, width: 1, height: 1 };
  const srcW = Math.max(1e-6, c.width) * naturalWidth;
  const srcH = Math.max(1e-6, c.height) * naturalHeight;
  let sx;
  let sy;
  if (op.fit === 'cover') sx = sy = Math.max(w / srcW, h / srcH);
  else if (op.fit === 'contain') sx = sy = Math.min(w / srcW, h / srcH);
  else {
    sx = w / srcW;
    sy = h / srcH;
  }
  const drawnW = srcW * sx;
  const drawnH = srcH * sy;
  const left = (w - drawnW) / 2;
  const top = (h - drawnH) / 2;
  return {
    x: left - c.x * naturalWidth * sx,
    y: top - c.y * naturalHeight * sy,
    width: naturalWidth * sx,
    height: naturalHeight * sy,
    // The visible region (for "contain", the image is smaller than the box).
    clip: { x: Math.max(0, left), y: Math.max(0, top), width: Math.min(w, drawnW), height: Math.min(h, drawnH) },
  };
}

/**
 * @param {object} element
 * @param {{ engine: object, registry: object, values: Record<string, string>, digits?: string, qrcode?: Function }} ctx
 * @returns {ShapeOp|ImageOp|TextOp|null}
 */
export function elementToOp(element, ctx) {
  if (!element || element.visible === false) return null;
  const common = base(element);

  switch (element.type) {
    case 'text':
    case 'dynamicText':
    case 'dateField':
      return textOp(element, common, ctx);
    case 'rect': {
      const w = Math.max(1, num(element.width, 100) || 100);
      const h = Math.max(1, num(element.height, 50) || 50);
      return { ...common, kind: 'shape', width: w, height: h, items: [item(rectPath(0, 0, w, h, num(element.cornerRadius)), { fill: resolvePaint(paint(element.fill), w, h), ...strokeOptions(element) })] };
    }
    case 'circle': {
      const w = Math.max(1, num(element.width, 120) || 120);
      const h = Math.max(1, num(element.height, 120) || 120);
      return { ...common, kind: 'shape', width: w, height: h, items: [item(ellipsePath(w / 2, h / 2, w / 2, h / 2), { fill: resolvePaint(paint(element.fill), w, h), ...strokeOptions(element) })] };
    }
    case 'polygon':
    case 'star': {
      const w = Math.max(1, num(element.width, 160));
      const h = Math.max(1, num(element.height, 160));
      const points = element.type === 'star'
        ? polygonPoints(w, h, Math.max(3, Math.round(num(element.points, 5))), Math.min(0.95, Math.max(0.1, num(element.innerRadius, 0.48))))
        : polygonPoints(w, h, Math.max(3, Math.round(num(element.sides, 6))));
      const d = normalizePath(roundedPolygonPath(points, num(element.cornerRadius)));
      return { ...common, kind: 'shape', width: w, height: h, items: [item(d, { fill: resolvePaint(paint(element.fill), w, h), ...strokeOptions(element, 'round') })] };
    }
    case 'shape': {
      const w = Math.max(1, num(element.width, 200));
      const h = Math.max(1, num(element.height, 80));
      const entry = SHAPES[element.shape] || SHAPES.ribbon;
      return { ...common, kind: 'shape', width: w, height: h, items: [item(normalizePath(entry.build(w, h)), { fill: resolvePaint(paint(element.fill), w, h), ...strokeOptions(element, 'round'), evenOdd: Boolean(entry.evenOdd) })] };
    }
    case 'line':
      return lineOp(element, common);
    case 'ornament':
      return libraryOp(element, common);
    case 'icon':
      return iconOp(element, common);
    case 'qrcode':
      return qrOp(element, common, ctx);
    case 'barcode':
      return barcodeOp(element, common, ctx);
    case 'image':
    case 'dynamicImage':
    case 'frame':
      return imageOp(element, common);
    default:
      return null;
  }
}

/**
 * @param {object} template schema v3 template
 * @param {{ engine: object, registry: object, values: Record<string, string>, qrcode?: Function }} ctx
 */
export function buildScene(template, ctx) {
  const background = template.background || {};
  const width = num(template.width, 1123) || 1123;
  const height = num(template.height, 794) || 794;
  const full = { ...ctx, digits: template.digits || 'keep' };
  return {
    width,
    height,
    background: {
      fill: resolvePaint(background.fill || background.color || '#f8f4ea', width, height),
      imagePath: background.imagePath || null,
      imageOpacity: background.imageOpacity === undefined ? 1 : num(background.imageOpacity, 1),
    },
    ops: (template.elements || []).map((element) => elementToOp(element, full)).filter(Boolean),
  };
}

/* Synthetic styles, shared so both painters embolden/slant identically (Skia-like constants). */
export function syntheticBoldStrokeWidth(fontSize) {
  // Skia interpolates 1/24 of the size at 9px down to 1/32 at 36px and above.
  const t = Math.min(1, Math.max(0, (fontSize - 9) / (36 - 9)));
  return fontSize * (1 / 24 + (1 / 32 - 1 / 24) * t);
}

export const SYNTHETIC_ITALIC_SKEW = -0.25;
