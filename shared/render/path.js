/**
 * SVG path utilities shared by the editor and the PDF painter.
 *
 * Every vector drawn by the studio (shapes, icons, ornaments, codes, text outlines) ends up as a
 * *normalized* path string: absolute `M L C Z` commands only (quadratics and arcs become cubics).
 * Canvas `Path2D` and PDFKit approximate arcs differently, so normalizing in one place keeps the
 * two painters on exactly the same curves.
 */

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const ARG_COUNT = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** Tokenize a path into [command, args[]] pairs (arc flags may be written without separators). */
export function parsePath(d) {
  const source = String(d || '');
  const commands = [];
  let i = 0;
  let current = null;

  const skip = () => {
    while (i < source.length && /[\s,]/.test(source[i])) i += 1;
  };
  const readNumber = () => {
    skip();
    const match = NUMBER.exec(source.slice(i));
    if (!match) return null;
    i += match[0].length;
    return Number(match[0]);
  };
  const readFlag = () => {
    skip();
    const ch = source[i];
    if (ch === '0' || ch === '1') {
      i += 1;
      return Number(ch);
    }
    return null;
  };

  while (i < source.length) {
    skip();
    if (i >= source.length) break;
    const ch = source[i];
    if (/[a-zA-Z]/.test(ch)) {
      current = ch;
      i += 1;
      if (ch === 'Z' || ch === 'z') {
        commands.push([ch, []]);
        current = null;
      }
      continue;
    }
    if (!current) {
      i += 1; // stray character; ignore
      continue;
    }
    const upper = current.toUpperCase();
    const count = ARG_COUNT[upper];
    const args = [];
    for (let k = 0; k < count; k += 1) {
      const value = upper === 'A' && (k === 3 || k === 4) ? readFlag() : readNumber();
      if (value === null) break;
      args.push(value);
    }
    if (args.length < count) break;
    commands.push([current, args]);
    // Implicit repeats: extra pairs after M are L.
    if (current === 'M') current = 'L';
    else if (current === 'm') current = 'l';
  }
  return commands;
}

/** Convert an SVG elliptical arc to cubic Bézier segments (SVG spec F.6.5). */
function arcToCubics(x1, y1, rx, ry, angle, largeArc, sweep, x2, y2) {
  if (x1 === x2 && y1 === y2) return [];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  if (!rx || !ry) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const sign = largeArc === sweep ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;

  const vectorAngle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = vectorAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  else if (sweep && delta < 0) delta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / segments;
  const k = (4 / 3) * Math.tan(step / 4);
  const result = [];
  let t = theta1;
  const point = (a) => {
    const ex = rx * Math.cos(a);
    const ey = ry * Math.sin(a);
    return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy];
  };
  const derivative = (a) => {
    const ex = -rx * Math.sin(a);
    const ey = ry * Math.cos(a);
    return [cos * ex - sin * ey, sin * ex + cos * ey];
  };
  for (let s = 0; s < segments; s += 1) {
    const t2 = t + step;
    const [px1, py1] = point(t);
    const [px2, py2] = s === segments - 1 ? [x2, y2] : point(t2);
    const [d1x, d1y] = derivative(t);
    const [d2x, d2y] = derivative(t2);
    result.push([px1 + k * d1x, py1 + k * d1y, px2 - k * d2x, py2 - k * d2y, px2, py2]);
    t = t2;
  }
  return result;
}

/**
 * Normalize to absolute M/L/C/Z segments: [['M', x, y], ['C', x1, y1, x2, y2, x, y], …].
 * Quadratics and arcs become exact / approximated cubics.
 * @returns {Array<Array<string|number>>}
 */
export function normalizeSegments(d) {
  const out = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCubic = null;
  let lastQuad = null;

  for (const [command, args] of parsePath(d)) {
    const rel = command === command.toLowerCase();
    const type = command.toUpperCase();
    const ax = (value) => (rel ? x + value : value);
    const ay = (value) => (rel ? y + value : value);
    let nextCubic = null;
    let nextQuad = null;

    switch (type) {
      case 'M':
        x = ax(args[0]);
        y = ay(args[1]);
        startX = x;
        startY = y;
        out.push(['M', x, y]);
        break;
      case 'L':
        x = ax(args[0]);
        y = ay(args[1]);
        out.push(['L', x, y]);
        break;
      case 'H':
        x = rel ? x + args[0] : args[0];
        out.push(['L', x, y]);
        break;
      case 'V':
        y = rel ? y + args[0] : args[0];
        out.push(['L', x, y]);
        break;
      case 'C': {
        const seg = ['C', ax(args[0]), ay(args[1]), ax(args[2]), ay(args[3]), ax(args[4]), ay(args[5])];
        out.push(seg);
        nextCubic = [seg[3], seg[4]];
        x = seg[5];
        y = seg[6];
        break;
      }
      case 'S': {
        const [rx1, ry1] = lastCubic ? [2 * x - lastCubic[0], 2 * y - lastCubic[1]] : [x, y];
        const seg = ['C', rx1, ry1, ax(args[0]), ay(args[1]), ax(args[2]), ay(args[3])];
        out.push(seg);
        nextCubic = [seg[3], seg[4]];
        x = seg[5];
        y = seg[6];
        break;
      }
      case 'Q':
      case 'T': {
        const [qx, qy] = type === 'Q'
          ? [ax(args[0]), ay(args[1])]
          : lastQuad ? [2 * x - lastQuad[0], 2 * y - lastQuad[1]] : [x, y];
        const ex = type === 'Q' ? ax(args[2]) : ax(args[0]);
        const ey = type === 'Q' ? ay(args[3]) : ay(args[1]);
        // Exact cubic form of the quadratic. PDFKit writes "Q" with the PDF "v" operator, which is a
        // different curve; converting here keeps canvas and PDF glyph outlines identical.
        out.push(['C', x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey]);
        nextQuad = [qx, qy];
        x = ex;
        y = ey;
        break;
      }
      case 'A': {
        const ex = ax(args[5]);
        const ey = ay(args[6]);
        for (const c of arcToCubics(x, y, args[0], args[1], args[2], args[3], args[4], ex, ey)) out.push(['C', ...c]);
        x = ex;
        y = ey;
        break;
      }
      case 'Z':
        out.push(['Z']);
        x = startX;
        y = startY;
        break;
      default:
        break;
    }
    lastCubic = nextCubic;
    lastQuad = nextQuad;
  }
  return out;
}

export function fmt(n) {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

export function segmentsToString(segments) {
  let s = '';
  for (const seg of segments) {
    s += seg[0];
    for (let i = 1; i < seg.length; i += 1) s += (i > 1 ? ' ' : '') + fmt(seg[i]);
  }
  return s;
}

const normalizeCache = new Map();

/** Normalized string for any SVG path (cached; icon and ornament paths repeat a lot). */
export function normalizePath(d) {
  const key = String(d || '');
  let hit = normalizeCache.get(key);
  if (hit === undefined) {
    hit = segmentsToString(normalizeSegments(key));
    if (normalizeCache.size > 5000) normalizeCache.clear();
    normalizeCache.set(key, hit);
  }
  return hit;
}

/**
 * Apply an affine matrix [a, b, c, d, e, f] (x' = a·x + c·y + e, y' = b·x + d·y + f) to a path.
 * @param {string|Array} path normalized string or segments
 */
export function transformPath(path, [a, b, c, d, e, f]) {
  const segments = typeof path === 'string' ? normalizeSegments(path) : path;
  let s = '';
  for (const seg of segments) {
    s += seg[0];
    for (let i = 1; i < seg.length; i += 2) {
      const x = seg[i];
      const y = seg[i + 1];
      s += (i > 1 ? ' ' : '') + fmt(a * x + c * y + e) + ' ' + fmt(b * x + d * y + f);
    }
  }
  return s;
}

/** Scale + translate shortcut. */
export function placePath(path, sx, sy, tx = 0, ty = 0) {
  return transformPath(path, [sx, 0, 0, sy, tx, ty]);
}

/** Bounding box of a path from its points and control points (good enough for layout). */
export function pathBounds(path) {
  const segments = typeof path === 'string' ? normalizeSegments(path) : path;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    for (let i = 1; i < seg.length; i += 2) {
      minX = Math.min(minX, seg[i]);
      maxX = Math.max(maxX, seg[i]);
      minY = Math.min(minY, seg[i + 1]);
      maxY = Math.max(maxY, seg[i + 1]);
    }
  }
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : { x: 0, y: 0, width: 0, height: 0 };
}

/* ── Primitive builders (all return normalized strings) ─────────────────────────── */

const KAPPA = 0.5522847498307936;

export function rectPath(x, y, w, h, radius = 0) {
  const r = Math.max(0, Math.min(Number(radius) || 0, w / 2, h / 2));
  if (!r) return `M${fmt(x)} ${fmt(y)}L${fmt(x + w)} ${fmt(y)}L${fmt(x + w)} ${fmt(y + h)}L${fmt(x)} ${fmt(y + h)}Z`;
  const k = r * (1 - KAPPA);
  return [
    `M${fmt(x + r)} ${fmt(y)}`,
    `L${fmt(x + w - r)} ${fmt(y)}`,
    `C${fmt(x + w - k)} ${fmt(y)} ${fmt(x + w)} ${fmt(y + k)} ${fmt(x + w)} ${fmt(y + r)}`,
    `L${fmt(x + w)} ${fmt(y + h - r)}`,
    `C${fmt(x + w)} ${fmt(y + h - k)} ${fmt(x + w - k)} ${fmt(y + h)} ${fmt(x + w - r)} ${fmt(y + h)}`,
    `L${fmt(x + r)} ${fmt(y + h)}`,
    `C${fmt(x + k)} ${fmt(y + h)} ${fmt(x)} ${fmt(y + h - k)} ${fmt(x)} ${fmt(y + h - r)}`,
    `L${fmt(x)} ${fmt(y + r)}`,
    `C${fmt(x)} ${fmt(y + k)} ${fmt(x + k)} ${fmt(y)} ${fmt(x + r)} ${fmt(y)}`,
    'Z',
  ].join('');
}

export function ellipsePath(cx, cy, rx, ry) {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    `M${fmt(cx - rx)} ${fmt(cy)}`,
    `C${fmt(cx - rx)} ${fmt(cy - oy)} ${fmt(cx - ox)} ${fmt(cy - ry)} ${fmt(cx)} ${fmt(cy - ry)}`,
    `C${fmt(cx + ox)} ${fmt(cy - ry)} ${fmt(cx + rx)} ${fmt(cy - oy)} ${fmt(cx + rx)} ${fmt(cy)}`,
    `C${fmt(cx + rx)} ${fmt(cy + oy)} ${fmt(cx + ox)} ${fmt(cy + ry)} ${fmt(cx)} ${fmt(cy + ry)}`,
    `C${fmt(cx - ox)} ${fmt(cy + ry)} ${fmt(cx - rx)} ${fmt(cy + oy)} ${fmt(cx - rx)} ${fmt(cy)}`,
    'Z',
  ].join('');
}

export function polylinePath(points, closed = true) {
  if (points.length === 0) return '';
  let s = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < points.length; i += 1) s += `L${fmt(points[i][0])} ${fmt(points[i][1])}`;
  return closed ? `${s}Z` : s;
}

/** Points of a regular polygon (innerRatio undefined) or star, stretched to fill a w×h box. */
export function polygonPoints(w, h, sides, innerRatio) {
  const count = innerRatio === undefined ? sides : sides * 2;
  const raw = [];
  for (let i = 0; i < count; i += 1) {
    const r = innerRatio !== undefined && i % 2 === 1 ? innerRatio : 1;
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    raw.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return raw.map(([x, y]) => [((x - minX) / (maxX - minX || 1)) * w, ((y - minY) / (maxY - minY || 1)) * h]);
}

/** Polygon with rounded corners (quadratic corner curves), for softer badges and seals. */
export function roundedPolygonPath(points, radius) {
  if (!radius) return polylinePath(points);
  const n = points.length;
  let s = '';
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const d1 = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    const d2 = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const a = [cur[0] + ((prev[0] - cur[0]) * r) / d1, cur[1] + ((prev[1] - cur[1]) * r) / d1];
    const b = [cur[0] + ((next[0] - cur[0]) * r) / d2, cur[1] + ((next[1] - cur[1]) * r) / d2];
    s += `${i === 0 ? 'M' : 'L'}${fmt(a[0])} ${fmt(a[1])}Q${fmt(cur[0])} ${fmt(cur[1])} ${fmt(b[0])} ${fmt(b[1])}`;
  }
  return `${s}Z`;
}
