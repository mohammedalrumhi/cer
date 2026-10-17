/**
 * A tiny builder kit for starter templates. Every starter is made only of editor elements (text,
 * fields, shapes, ornaments, brand images), so teachers can edit every part of it, and every
 * starter is a function of a palette, so one design comes in many colourways.
 */
import { parseHex } from '../render/paint.js';

const BASE = { rotation: 0, opacity: 1, locked: false, visible: true };
const TEXT = { verticalAlign: 'top', kashida: 0, letterSpacing: 0, textDecoration: '', effects: { shadow: null, outline: null, highlight: null } };

/** Mix two hex colours (t = 0 → a, 1 → b). */
export function mix(a, b, t) {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return a;
  const c = (p, q) => Math.round(p + (q - p) * t).toString(16).padStart(2, '0');
  return `#${c(x.r, y.r)}${c(x.g, y.g)}${c(x.b, y.b)}`.toUpperCase();
}

export const tint = (color, t) => mix(color, '#FFFFFF', t);
export const shade = (color, t) => mix(color, '#000000', t);

/** Linear gradient helper. */
export const gradient = (angle, ...colors) => ({
  type: 'linear',
  angle,
  stops: colors.map((color, index) => ({ offset: colors.length === 1 ? 0 : index / (colors.length - 1), color })),
});

/** Start a builder for a page of width W and height H. */
export function page(W, H) {
  const elements = [];
  const centerX = (w) => Math.round((W - w) / 2);
  const add = (element) => {
    elements.push(element);
    return element;
  };

  return {
    W,
    H,
    elements,
    centerX,
    /** Static text. `x` defaults to centred. */
    text(id, text, { y, x, w = W - 160, size = 28, font = 'Amiri-Regular', color = '#1B2A23', align = 'center', bold = false, lineHeight = 1.4, ...rest }) {
      return add({ ...BASE, ...TEXT, id, type: 'text', text, x: x ?? centerX(w), y, width: w, fontSize: size, fontFamily: font, fontStyle: bold ? 'bold' : 'normal', fill: color, align, lineHeight, autoFit: { mode: 'none' }, ...rest });
    },
    /** Field-bound text ({{field}} or a template around it). */
    field(id, field, { y, x, w = W - 200, size = 36, font = 'Cairo-Bold', color = '#1B2A23', align = 'center', template = '', lineHeight = 1.35, fit = true, ...rest }) {
      return add({
        ...BASE, ...TEXT, id, type: 'dynamicText', field, dynamicTextTemplate: template, x: x ?? centerX(w), y, width: w, fontSize: size, fontFamily: font, fontStyle: 'normal', fill: color, align, lineHeight,
        autoFit: fit ? { mode: 'shrink', minScale: 0.55, minFontSize: 12 } : { mode: 'none' },
        ...rest,
      });
    },
    date(id, { y, x, w = 360, size = 22, font = 'Cairo-Regular', color = '#5F6D65', calendar = 'hijri', style = 'long', template = '', align = 'center' }) {
      return add({ ...BASE, ...TEXT, id, type: 'dateField', x: x ?? centerX(w), y, width: w, fontSize: size, fontFamily: font, fontStyle: 'normal', fill: color, align, lineHeight: 1.4, autoFit: { mode: 'shrink', minScale: 0.6, minFontSize: 10 }, date: { calendar, style, source: 'issue' }, dynamicTextTemplate: template });
    },
    rect(id, { x, y, w, h, fill = null, stroke = null, strokeWidth = 0, radius = 0, dash = null, opacity = 1 }) {
      return add({ ...BASE, id, type: 'rect', x: x ?? centerX(w), y, width: w, height: h, fill, stroke, strokeWidth, cornerRadius: radius, dash, opacity });
    },
    circle(id, { x, y, w, h = w, fill = null, stroke = null, strokeWidth = 0, opacity = 1 }) {
      return add({ ...BASE, id, type: 'circle', x: x ?? centerX(w), y, width: w, height: h, fill, stroke, strokeWidth, dash: null, opacity });
    },
    line(id, { x, y, w, color = '#B8893C', width = 2, dash = null, cap = 'round', start = 'none', end = 'none' }) {
      return add({ ...BASE, id, type: 'line', x: x ?? centerX(w), y, width: w, height: 4, stroke: color, strokeWidth: width, dash, lineCap: cap, startHead: start, endHead: end });
    },
    ornament(id, ornament, { x, y, w, h = w, color = '#B8893C', accent = '#0F6B52', weight = 2, rotation = 0, opacity = 1 }) {
      return add({ ...BASE, id, type: 'ornament', ornament, x: x ?? centerX(w), y, width: w, height: h, color, accentColor: accent, strokeWidth: weight, rotation, opacity });
    },
    shape(id, shape, { x, y, w, h, fill, stroke = null, strokeWidth = 0, opacity = 1, rotation = 0 }) {
      return add({ ...BASE, id, type: 'shape', shape, x: x ?? centerX(w), y, width: w, height: h, fill, stroke, strokeWidth, dash: null, opacity, rotation });
    },
    star(id, { x, y, w, h = w, points = 5, inner = 0.48, fill, rotation = 0, opacity = 1 }) {
      return add({ ...BASE, id, type: 'star', x: x ?? centerX(w), y, width: w, height: h, points, innerRadius: inner, fill, stroke: null, strokeWidth: 0, cornerRadius: 0, dash: null, rotation, opacity });
    },
    polygon(id, { x, y, w, h = w, sides = 6, fill, radius = 0, rotation = 0, opacity = 1, stroke = null, strokeWidth = 0 }) {
      return add({ ...BASE, id, type: 'polygon', x: x ?? centerX(w), y, width: w, height: h, sides, fill, stroke, strokeWidth, cornerRadius: radius, dash: null, rotation, opacity });
    },
    brand(id, field, { x, y, w, h = w }) {
      return add({ ...BASE, id, type: 'dynamicImage', field, x: x ?? centerX(w), y, width: w, height: h, fit: 'contain', crop: null, flipX: false, flipY: false, filters: {}, cornerRadius: 0, border: null });
    },
    qr(id, { x, y, w = 110, color = '#1B2A23' }) {
      return add({ ...BASE, id, type: 'qrcode', x, y, width: w, height: w, value: '{{verifyUrl}}', color, background: '#FFFFFF', ecLevel: 'M' });
    },
    /** Four corner ornaments, mirrored by rotation around the page. */
    corners(prefix, ornament, { inset = 36, size = 130, color, accent }) {
      const spots = [
        [inset, inset, 0],
        [W - inset, inset, 90],
        [W - inset, H - inset, 180],
        [inset, H - inset, 270],
      ];
      spots.forEach(([x, y, rotation], index) => add({ ...BASE, id: `${prefix}-${index + 1}`, type: 'ornament', ornament, x, y, width: size, height: size, color, accentColor: accent, strokeWidth: 2, rotation, opacity: 1 }));
    },
    /** Three signature labels with lines across the bottom (right to left: teacher, supervisor, management). */
    signatures(prefix, { y, labels = ['المعلّم/ة', 'المشرف/ة', 'الإدارة'], color = '#5F6D65', lineColor = '#CDC2AB', w = 220, font = 'Cairo-SemiBold', size = 20 }) {
      const gap = (W - 160 - w * labels.length) / Math.max(1, labels.length - 1);
      labels.forEach((label, index) => {
        const x = W - 80 - w - index * (w + gap);
        add({ ...BASE, ...TEXT, id: `${prefix}-label-${index + 1}`, type: 'text', text: label, x, y, width: w, fontSize: size, fontFamily: font, fontStyle: 'normal', fill: color, align: 'center', lineHeight: 1.4, autoFit: { mode: 'none' } });
        add({ ...BASE, id: `${prefix}-line-${index + 1}`, type: 'line', x: x + 20, y: y + size * 3.4, width: w - 40, height: 4, stroke: lineColor, strokeWidth: 1.5, dash: null, lineCap: 'round', startHead: 'none', endHead: 'none' });
      });
    },
    done(meta) {
      return {
        schemaVersion: 3,
        width: W,
        height: H,
        orientation: W > H ? 'landscape' : W < H ? 'portrait' : 'square',
        digits: 'arabic',
        page: { margins: { top: 40, right: 40, bottom: 40, left: 40 }, bleed: 0 },
        detailLevel: 'simple',
        audienceType: 'student',
        ...meta,
        elements,
      };
    },
  };
}
