import { SYNTHETIC_ITALIC_SKEW, syntheticBoldStrokeWidth } from '@shared/render/index.js';

/*
 * Canvas painter for text ops. Mirrors backend/src/services/scenePdfRenderer.js#paintText
 * transform-for-transform, so any change here must be made there too (the visual regression
 * test will catch a mismatch).
 */

const pathCache = new Map();

function glyphPath2D(engine, key, gid) {
  const cacheKey = `${key}:${gid}`;
  let path = pathCache.get(cacheKey);
  if (!path) {
    path = new Path2D(engine.glyphPath(key, gid));
    pathCache.set(cacheKey, path);
  }
  return path;
}

/**
 * @param {CanvasRenderingContext2D} ctx  native context, already transformed to the element origin
 * @param {object} op  text op from shared/render/scene.js
 * @param {object} engine
 */
export function paintTextOp(ctx, op, engine) {
  const { layout } = op;
  if (!layout) return;
  const boldStroke = op.syntheticBold ? syntheticBoldStrokeWidth(layout.fontSize) : 0;

  ctx.fillStyle = op.fill;
  if (boldStroke) {
    ctx.strokeStyle = op.fill;
    ctx.lineJoin = 'round';
  }

  for (const line of layout.lines) {
    for (const glyph of line.glyphs) {
      const path = glyphPath2D(engine, glyph.key, glyph.gid);
      ctx.save();
      ctx.translate(line.x + glyph.x, line.baseline + glyph.y);
      if (op.syntheticItalic) ctx.transform(1, 0, SYNTHETIC_ITALIC_SKEW, 1, 0, 0);
      ctx.scale(glyph.s, -glyph.s);
      ctx.fill(path);
      if (boldStroke) {
        ctx.lineWidth = boldStroke / glyph.s;
        ctx.stroke(path);
      }
      ctx.restore();
    }
  }

  for (const decoration of layout.decorations) {
    ctx.fillRect(decoration.x, decoration.y - decoration.thickness / 2, decoration.width, decoration.thickness);
  }
}
