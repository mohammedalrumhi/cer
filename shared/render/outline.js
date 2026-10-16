import { SYNTHETIC_ITALIC_SKEW, syntheticBoldStrokeWidth } from './scene.js';
import { fmt, normalizeSegments, rectPath, transformPath } from './path.js';

/**
 * Turns a laid-out text op into one vector outline in element coordinates, plus the effects
 * around it. Both painters (canvas and PDF) paint this plan in the same order:
 *
 *   highlight → shadow copies → outline stroke → fill (+ synthetic bold stroke)
 *
 * Painting text as one path (instead of glyph by glyph) lets gradients span the whole text and
 * gives shadows and outlines a single shape.
 */

const planCache = new WeakMap();
// Normalized glyph outlines per engine (font units), reused across texts.
const glyphCache = new WeakMap();

function glyphSegments(engine, key, gid) {
  let byGlyph = glyphCache.get(engine);
  if (!byGlyph) {
    byGlyph = new Map();
    glyphCache.set(engine, byGlyph);
  }
  const cacheKey = `${key}:${gid}`;
  let segments = byGlyph.get(cacheKey);
  if (segments === undefined) {
    const raw = engine.glyphPath(key, gid);
    segments = raw ? normalizeSegments(raw) : null;
    byGlyph.set(cacheKey, segments);
  }
  return segments;
}

/** Soft shadows are N translucent copies on two rings: PDF has no blur, so both painters do this. */
export function shadowCopies(shadow) {
  if (!shadow) return [];
  const opacity = Math.min(1, Math.max(0, shadow.opacity ?? 0.35));
  const blur = Math.max(0, Number(shadow.blur) || 0);
  const ox = Number(shadow.offsetX) || 0;
  const oy = Number(shadow.offsetY) || 0;
  if (opacity <= 0) return [];
  if (blur < 0.75) return [{ dx: ox, dy: oy, alpha: opacity }];
  const offsets = [[0, 0]];
  for (const [radius, count] of [[blur * 0.45, 6], [blur * 0.9, 10]]) {
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + (count === 10 ? Math.PI / 10 : 0);
      offsets.push([Math.cos(a) * radius, Math.sin(a) * radius]);
    }
  }
  // Where every copy overlaps the shadow reaches `opacity`; edges fade out.
  const alpha = 1 - (1 - opacity) ** (1 / offsets.length);
  return offsets.map(([dx, dy]) => ({ dx: ox + dx, dy: oy + dy, alpha }));
}

function glyphOutline(op, engine) {
  const { layout } = op;
  let d = '';
  const skew = op.syntheticItalic ? SYNTHETIC_ITALIC_SKEW : 0;
  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      const segments = glyphSegments(engine, glyph.key, glyph.gid);
      if (!segments) continue;
      const tx = line.x + glyph.x;
      const ty = line.baseline + glyph.y + op.offsetY;
      const s = glyph.s;
      // translate(tx, ty) · skewX(k) · scale(s, -s)
      d += transformPath(segments, [s, 0, -skew * s, -s, tx, ty]);
    }
  }
  for (const decoration of layout.decorations) {
    d += rectPath(decoration.x, decoration.y - decoration.thickness / 2 + op.offsetY, decoration.width, decoration.thickness);
  }
  return d;
}

function highlightOutline(op) {
  const highlight = op.effects?.highlight;
  if (!highlight) return '';
  const pad = Math.max(0, Number(highlight.padding) || 0);
  const radius = Math.max(0, Number(highlight.radius) || 0);
  const lh = op.layout.lineHeightPx;
  let d = '';
  op.layout.lines.forEach((line, index) => {
    if (line.width <= 0) return;
    d += rectPath(line.x - pad, index * lh + op.offsetY + lh * 0.08, line.width + pad * 2, lh * 0.84, radius);
  });
  return d;
}

/**
 * @param {object} op text op from scene.js (with `layout`)
 * @param {object} engine text engine (for glyph outlines)
 * @returns {null | { d: string, highlightD: string, shadows: Array<{dx:number,dy:number,alpha:number}>,
 *   shadowColor: string, outline: null | { color: string, width: number }, boldStroke: number }}
 */
export function textPaintPlan(op, engine) {
  if (!op?.layout) return null;
  let plan = planCache.get(op);
  if (!plan) {
    const effects = op.effects || {};
    plan = {
      d: glyphOutline(op, engine),
      highlightD: highlightOutline(op),
      highlightColor: effects.highlight?.color || '#fde68a',
      highlightOpacity: effects.highlight?.opacity ?? 1,
      shadows: shadowCopies(effects.shadow),
      shadowColor: effects.shadow?.color || '#000000',
      outline: effects.outline && Number(effects.outline.width) > 0 ? { color: effects.outline.color || '#ffffff', width: Number(effects.outline.width) } : null,
      boldStroke: op.syntheticBold ? syntheticBoldStrokeWidth(op.layout.fontSize) : 0,
    };
    planCache.set(op, plan);
  }
  return plan;
}

/** Translate a path (used for shadow copies when a painter can't translate the context). */
export function offsetPath(d, dx, dy) {
  if (!dx && !dy) return d;
  return transformPath(d, [1, 0, 0, 1, dx, dy]);
}

export { fmt };
