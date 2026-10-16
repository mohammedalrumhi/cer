/** Colour conversions for the picker. Hue in degrees, s/v in 0–1. */
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/** Normalise #rgb / #rrggbb / #rrggbbaa to #RRGGBB, or null if invalid. */
export function normalizeHex(input) {
  let s = String(input || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/./g, (c) => c + c);
  if (/^[0-9a-f]{8}$/i.test(s)) s = s.slice(0, 6);
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : null;
}

export function hexToRgb(hex) {
  const n = normalizeHex(hex) || '#000000';
  return [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
}

export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function hexToHsv(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export function hsvToHex({ h, s, v }) {
  const sat = clamp01(s);
  const val = clamp01(v);
  const c = val * sat;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const [r, g, b] = hh < 1 ? [c, x, 0] : hh < 2 ? [x, c, 0] : hh < 3 ? [0, c, x] : hh < 4 ? [0, x, c] : hh < 5 ? [x, 0, c] : [c, 0, x];
  const m = val - c;
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/** Readable check mark on a swatch. */
export function isLight(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 170;
}
