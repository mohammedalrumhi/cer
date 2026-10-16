import { mapPaint, paintColors, parseHex } from '../render/paint.js';

/**
 * Palettes: the main colours of a design, ranked by how much they are used, and recolouring a
 * design by mapping one palette onto another ("apply colours only", colour variants).
 */

const PAINT_KEYS = ['fill', 'stroke', 'color', 'accentColor', 'background'];

function normalize(color) {
  const rgb = parseHex(color);
  if (!rgb) return null;
  return `#${[rgb.r, rgb.g, rgb.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function isNeutral(hex) {
  const { r, g, b } = parseHex(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  return max - min < 18 && (light > 235 || light < 30);
}

/** Main colours (most used first), ignoring near-white and near-black. */
export function extractPalette(template, limit = 6) {
  const counts = new Map();
  const add = (paint, weight) => {
    for (const color of paintColors(paint)) {
      const hex = normalize(color);
      if (hex && !isNeutral(hex)) counts.set(hex, (counts.get(hex) || 0) + weight);
    }
  };
  for (const el of template.elements || []) {
    const area = Math.max(1, (Number(el.width) || 100) * (Number(el.height) || 40)) ** 0.5;
    for (const key of PAINT_KEYS) add(el[key], area);
  }
  add(template.background?.fill || template.background?.color, 200);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([hex]) => hex);
}

/** Replace colours throughout a template. `mapping` is a Map of #RRGGBB → colour. */
export function recolorTemplate(template, mapping) {
  const swap = (color) => mapping.get(normalize(color) || '') || color;
  const elements = (template.elements || []).map((el) => {
    const next = { ...el };
    for (const key of PAINT_KEYS) if (el[key] !== undefined && el[key] !== null) next[key] = mapPaint(el[key], swap);
    if (el.effects?.outline) next.effects = { ...el.effects, outline: { ...el.effects.outline, color: swap(el.effects.outline.color) } };
    if (el.border) next.border = { ...el.border, color: swap(el.border.color) };
    return next;
  });
  const background = { ...(template.background || {}) };
  if (background.color) background.color = swap(background.color);
  if (background.fill) background.fill = mapPaint(background.fill, swap);
  if (background.accentColor) background.accentColor = swap(background.accentColor);
  return { ...template, elements, background };
}

/** Map the target's palette onto the source's palette, rank by rank. */
export function applyPaletteOf(target, source) {
  const from = extractPalette(target);
  const to = extractPalette(source);
  const mapping = new Map(from.map((hex, index) => [hex, to[index % Math.max(1, to.length)]]).filter(([, value]) => value));
  return recolorTemplate(target, mapping);
}
