import { ellipsePath, normalizePath, polylinePath, rectPath } from './path.js';

/**
 * Convert SVG element nodes ([tag, attrs], as in lucide's icon data) into normalized path strings,
 * so icons are stored as plain paths and both painters draw them without an icon library.
 */
export function svgNodeToPath(tag, attrs = {}) {
  const n = (key, fallback = 0) => {
    const value = Number(attrs[key]);
    return Number.isFinite(value) ? value : fallback;
  };
  switch (tag) {
    case 'path':
      return normalizePath(attrs.d || '');
    case 'circle':
      return ellipsePath(n('cx'), n('cy'), n('r'), n('r'));
    case 'ellipse':
      return ellipsePath(n('cx'), n('cy'), n('rx'), n('ry'));
    case 'rect':
      return rectPath(n('x'), n('y'), n('width'), n('height'), n('rx', n('ry')));
    case 'line':
      return normalizePath(`M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`);
    case 'polyline':
    case 'polygon': {
      const values = String(attrs.points || '').trim().split(/[\s,]+/).map(Number).filter(Number.isFinite);
      const points = [];
      for (let i = 0; i + 1 < values.length; i += 2) points.push([values[i], values[i + 1]]);
      return polylinePath(points, tag === 'polygon');
    }
    default:
      return '';
  }
}

export function iconNodeToPaths(nodes) {
  return (nodes || []).map(([tag, attrs]) => svgNodeToPath(tag, attrs)).filter(Boolean);
}
