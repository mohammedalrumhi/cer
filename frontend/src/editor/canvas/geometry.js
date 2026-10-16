/**
 * Element geometry for interaction (selection, snapping, align). cer rotates an element clockwise
 * around its origin (x, y) — Konva's default — so stored templates keep their positions. Ops give
 * the box: local rect (0, -originY) … (width, height - originY).
 *
 * @typedef {{ x: number, y: number, width: number, height: number }} Box
 */

/** Axis-aligned bounds of an op (or { x, y, width, height, rotation, originY }). */
export function opBounds(op) {
  const w = Number(op.width) || 0;
  const h = Number(op.height) || 0;
  const oy = Number(op.originY) || 0;
  const rotation = Number(op.rotation) || 0;
  if (!rotation) return { x: op.x, y: op.y - oy, width: w, height: h };
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [[0, -oy], [w, -oy], [w, h - oy], [0, h - oy]].map(([lx, ly]) => [op.x + lx * cos - ly * sin, op.y + lx * sin + ly * cos]);
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** Rotated corners of an op (for the hover outline). */
export function opCorners(op) {
  const w = Number(op.width) || 0;
  const h = Number(op.height) || 0;
  const oy = Number(op.originY) || 0;
  const rad = ((Number(op.rotation) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [[0, -oy], [w, -oy], [w, h - oy], [0, h - oy]].map(([lx, ly]) => [op.x + lx * cos - ly * sin, op.y + lx * sin + ly * cos]);
}

export function union(boxes) {
  if (!boxes.length) return null;
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const b of boxes) {
    x1 = Math.min(x1, b.x);
    y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.width);
    y2 = Math.max(y2, b.y + b.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function intersects(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function rectFromPoints(ax, ay, bx, by) {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
}

export const round2 = (n) => Math.round(n * 100) / 100;
