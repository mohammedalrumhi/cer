import { imageDrawRect, textPaintPlan, withOpacity } from '@shared/render/index.js';

/*
 * Canvas 2D painter for scene ops (shared/render/scene.js). Used by the Konva editor (inside each
 * node's sceneFunc) and by thumbnails and image exports (plain canvas). It mirrors
 * backend/src/services/scenePdfRenderer.js step for step: change one, change the other — the
 * fidelity test (tests/visual) catches any drift.
 *
 * Every function draws in op-local coordinates: the caller has already translated to the element
 * origin, rotated, applied opacity and shifted by -op.originY.
 */

const pathCache = new Map();

export function path2D(d) {
  let path = pathCache.get(d);
  if (!path) {
    path = new Path2D(d);
    if (pathCache.size > 4000) pathCache.clear();
    pathCache.set(d, path);
  }
  return path;
}

/** Canvas fill/stroke style for a resolved paint (see shared/render/paint.js#resolvePaint). */
export function canvasPaint(ctx, resolved) {
  if (!resolved) return null;
  if (resolved.kind === 'solid') return resolved.color;
  const gradient = resolved.kind === 'radial'
    ? ctx.createRadialGradient(resolved.cx, resolved.cy, 0, resolved.cx, resolved.cy, resolved.r)
    : ctx.createLinearGradient(resolved.x0, resolved.y0, resolved.x1, resolved.y1);
  for (const stop of resolved.stops) gradient.addColorStop(stop.offset, withOpacity(stop.color, stop.opacity));
  return gradient;
}

function applyStroke(ctx, item) {
  ctx.strokeStyle = item.stroke;
  ctx.lineWidth = item.strokeWidth;
  ctx.lineCap = item.lineCap || 'butt';
  ctx.lineJoin = item.lineJoin || 'miter';
  ctx.miterLimit = 10;
  ctx.setLineDash(item.dash || []);
}

export function paintShapeOp(ctx, op) {
  for (const item of op.items) {
    if (!item.d) continue;
    const path = path2D(item.d);
    if (item.fill) {
      ctx.fillStyle = canvasPaint(ctx, item.fill);
      ctx.fill(path, item.evenOdd ? 'evenodd' : 'nonzero');
    }
    if (item.stroke && item.strokeWidth > 0) {
      applyStroke(ctx, item);
      ctx.stroke(path);
      ctx.setLineDash([]);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} op text op
 * @param {object} engine HarfBuzz text engine (glyph outlines)
 */
export function paintTextOp(ctx, op, engine) {
  const plan = textPaintPlan(op, engine);
  if (!plan || !plan.d) return;
  const glyphs = path2D(plan.d);

  if (plan.highlightD) {
    ctx.save();
    ctx.globalAlpha *= plan.highlightOpacity;
    ctx.fillStyle = plan.highlightColor;
    ctx.fill(path2D(plan.highlightD));
    ctx.restore();
  }

  if (plan.shadows.length) {
    ctx.save();
    ctx.fillStyle = plan.shadowColor;
    const base = ctx.globalAlpha;
    for (const copy of plan.shadows) {
      ctx.globalAlpha = base * copy.alpha;
      ctx.save();
      ctx.translate(copy.dx, copy.dy);
      ctx.fill(glyphs);
      if (plan.outline) {
        ctx.lineWidth = plan.outline.width * 2;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = plan.shadowColor;
        ctx.stroke(glyphs);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  if (plan.outline) {
    ctx.strokeStyle = plan.outline.color;
    ctx.lineWidth = plan.outline.width * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(glyphs);
  }

  const fill = canvasPaint(ctx, op.fill) || '#0f172a';
  ctx.fillStyle = fill;
  ctx.fill(glyphs);
  if (plan.boldStroke) {
    ctx.strokeStyle = fill;
    ctx.lineWidth = plan.boldStroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.stroke(glyphs);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} op image op
 * @param {CanvasImageSource & { naturalWidth?: number, width: number }} image (already filtered)
 */
export function paintImageOp(ctx, op, image) {
  if (!image) return;
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (!iw || !ih) return;
  const rect = imageDrawRect(op, iw, ih);
  ctx.save();
  if (op.clipD) ctx.clip(path2D(op.clipD));
  ctx.beginPath();
  ctx.rect(0, 0, op.width, op.height);
  ctx.clip();
  if (op.flipX || op.flipY) {
    ctx.translate(op.flipX ? op.width : 0, op.flipY ? op.height : 0);
    ctx.scale(op.flipX ? -1 : 1, op.flipY ? -1 : 1);
  }
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
  if (op.border) {
    ctx.strokeStyle = op.border.color;
    ctx.lineWidth = op.border.width;
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    ctx.stroke(path2D(op.borderD));
  }
}

/** Background: fill paint, then the image stretched to the page. */
export function paintBackground(ctx, scene, image) {
  ctx.fillStyle = canvasPaint(ctx, scene.background.fill) || '#ffffff';
  ctx.fillRect(0, 0, scene.width, scene.height);
  if (image) {
    ctx.save();
    ctx.globalAlpha *= scene.background.imageOpacity ?? 1;
    ctx.drawImage(image, 0, 0, scene.width, scene.height);
    ctx.restore();
  }
}

/**
 * Paint a whole op on a plain canvas (thumbnails, PNG/JPG output): transform, then the op body.
 * @param {(op: object) => CanvasImageSource|null} imageFor
 */
export function paintOpOnCanvas(ctx, op, { engine, imageFor }) {
  ctx.save();
  ctx.translate(op.x, op.y);
  if (op.rotation) ctx.rotate((op.rotation * Math.PI) / 180);
  ctx.globalAlpha *= op.opacity;
  if (op.originY) ctx.translate(0, -op.originY);
  if (op.kind === 'shape') paintShapeOp(ctx, op);
  else if (op.kind === 'text') paintTextOp(ctx, op, engine);
  else if (op.kind === 'image' && !op.placeholder) paintImageOp(ctx, op, imageFor?.(op));
  ctx.restore();
}

export function paintSceneOnCanvas(ctx, scene, { engine, imageFor, backgroundImage }) {
  paintBackground(ctx, scene, backgroundImage);
  for (const op of scene.ops) paintOpOnCanvas(ctx, op, { engine, imageFor });
}
