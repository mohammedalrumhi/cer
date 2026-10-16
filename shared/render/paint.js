/**
 * Paints: a solid colour string, or a gradient object
 *   { type: 'linear', angle, stops: [{ offset, color, opacity? }] }   (CSS angle: 0° up, 90° right)
 *   { type: 'radial', stops, cx?, cy?, r? }                            (fractions of the box)
 * `null`, '' and 'transparent' mean "no paint".
 *
 * resolvePaint() turns a paint into absolute coordinates inside a w×h box, so the canvas and the
 * PDF build exactly the same gradient.
 */

export function isGradient(paint) {
  return Boolean(paint && typeof paint === 'object' && Array.isArray(paint.stops) && paint.stops.length > 0);
}

export function isNoPaint(paint) {
  return paint === null || paint === undefined || paint === '' || paint === 'transparent' || paint === 'none';
}

function sortedStops(stops) {
  return [...stops]
    .map((stop) => ({
      offset: Math.min(1, Math.max(0, Number(stop.offset) || 0)),
      color: String(stop.color || '#000000'),
      opacity: stop.opacity === undefined ? 1 : Math.min(1, Math.max(0, Number(stop.opacity))),
    }))
    .sort((a, b) => a.offset - b.offset)
    // Explicit end stops: canvas holds the end colours, a PDF stitching function only does if the
    // stops cover 0…1.
    .reduce((list, stop, index, all) => {
      if (index === 0 && stop.offset > 0) list.push({ ...stop, offset: 0 });
      list.push(stop);
      if (index === all.length - 1 && stop.offset < 1) list.push({ ...stop, offset: 1 });
      return list;
    }, []);
}

/**
 * @returns {null | { kind: 'solid', color: string }
 *   | { kind: 'linear', x0: number, y0: number, x1: number, y1: number, stops: object[] }
 *   | { kind: 'radial', cx: number, cy: number, r: number, stops: object[] }}
 */
export function resolvePaint(paint, w, h, box = { x: 0, y: 0 }) {
  if (isNoPaint(paint)) return null;
  if (!isGradient(paint)) return { kind: 'solid', color: String(paint) };
  const stops = sortedStops(paint.stops);
  if (stops.length === 1) return { kind: 'solid', color: stops[0].color };
  if (paint.type === 'radial') {
    const cx = box.x + (paint.cx ?? 0.5) * w;
    const cy = box.y + (paint.cy ?? 0.5) * h;
    return { kind: 'radial', cx, cy, r: (paint.r ?? 1) * (Math.max(w, h) / 2), stops };
  }
  const rad = ((Number(paint.angle) || 0) * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = box.x + w / 2;
  const cy = box.y + h / 2;
  return { kind: 'linear', x0: cx - dx * half, y0: cy - dy * half, x1: cx + dx * half, y1: cy + dy * half, stops };
}

/** "#rgb" / "#rrggbb" / "#rrggbbaa" → { r, g, b, a } (null for anything else). */
export function parseHex(color) {
  let s = String(color || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/./g, (c) => c + c);
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
    };
  }
  return null;
}

/** CSS colour with extra opacity applied (for canvas gradient stops). */
export function withOpacity(color, opacity = 1) {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const a = Math.round(rgb.a * opacity * 1000) / 1000;
  return a >= 1 ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

/** Every solid colour inside a paint (gradient stops included). */
export function paintColors(paint) {
  if (isNoPaint(paint)) return [];
  if (isGradient(paint)) return paint.stops.map((stop) => stop.color).filter(Boolean);
  return [String(paint)];
}

/** A representative solid colour for UI swatches. */
export function paintSwatch(paint) {
  return paintColors(paint)[0] || null;
}

/** CSS `background` value for a paint (UI previews). */
export function paintToCss(paint) {
  if (isNoPaint(paint)) return 'transparent';
  if (!isGradient(paint)) return String(paint);
  const stops = sortedStops(paint.stops).map((stop) => `${withOpacity(stop.color, stop.opacity)} ${Math.round(stop.offset * 100)}%`).join(', ');
  if (paint.type === 'radial') return `radial-gradient(circle at ${(paint.cx ?? 0.5) * 100}% ${(paint.cy ?? 0.5) * 100}%, ${stops})`;
  return `linear-gradient(${Number(paint.angle) || 0}deg, ${stops})`;
}

/** Map every colour in a paint through `fn` (palette swaps). */
export function mapPaint(paint, fn) {
  if (isNoPaint(paint)) return paint;
  if (!isGradient(paint)) return fn(String(paint));
  return { ...paint, stops: paint.stops.map((stop) => ({ ...stop, color: fn(stop.color) })) };
}
