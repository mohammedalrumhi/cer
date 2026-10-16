/**
 * Image filters on RGBA pixels, shared by the editor (canvas ImageData) and the PDF renderer
 * (decoded PNG/JPEG), so a filtered photo prints exactly as it looks.
 *
 * @typedef {{ brightness?: number, contrast?: number, saturation?: number, blur?: number, grayscale?: boolean }} ImageFilters
 *   brightness, contrast, saturation: −1 … 1 (0 = unchanged); blur: radius in image px.
 */

export function hasFilters(filters) {
  if (!filters) return false;
  return Boolean(filters.grayscale)
    || Math.abs(Number(filters.brightness) || 0) > 0.001
    || Math.abs(Number(filters.contrast) || 0) > 0.001
    || Math.abs(Number(filters.saturation) || 0) > 0.001
    || (Number(filters.blur) || 0) > 0.05;
}

export function filtersKey(filters) {
  if (!hasFilters(filters)) return '';
  const f = (v) => Math.round((Number(v) || 0) * 1000) / 1000;
  return `b${f(filters.brightness)}c${f(filters.contrast)}s${f(filters.saturation)}r${f(filters.blur)}g${filters.grayscale ? 1 : 0}`;
}

function boxBlur(src, dst, width, height, radius, horizontal) {
  const r = Math.max(1, Math.round(radius));
  const span = r * 2 + 1;
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  for (let line = 0; line < lines; line += 1) {
    const at = (i) => {
      const clamped = Math.min(length - 1, Math.max(0, i));
      return (horizontal ? line * width + clamped : clamped * width + line) * 4;
    };
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sa = 0;
    for (let i = -r; i <= r; i += 1) {
      const p = at(i);
      sr += src[p]; sg += src[p + 1]; sb += src[p + 2]; sa += src[p + 3];
    }
    for (let i = 0; i < length; i += 1) {
      const o = at(i);
      dst[o] = sr / span; dst[o + 1] = sg / span; dst[o + 2] = sb / span; dst[o + 3] = sa / span;
      const add = at(i + r + 1);
      const sub = at(i - r);
      sr += src[add] - src[sub]; sg += src[add + 1] - src[sub + 1]; sb += src[add + 2] - src[sub + 2]; sa += src[add + 3] - src[sub + 3];
    }
  }
}

/**
 * Apply filters in place. Order: brightness → contrast → saturation/grayscale → blur.
 * @param {Uint8ClampedArray|Uint8Array} data RGBA
 */
export function applyFilters(data, width, height, filters) {
  if (!hasFilters(filters)) return data;
  const brightness = (Number(filters.brightness) || 0) * 255;
  const contrast = Number(filters.contrast) || 0;
  const cf = contrast >= 0 ? 1 + contrast * 2 : 1 + contrast;
  const saturation = filters.grayscale ? -1 : Number(filters.saturation) || 0;
  const sf = 1 + saturation;
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightness;
    let g = data[i + 1] + brightness;
    let b = data[i + 2] + brightness;
    if (cf !== 1) {
      r = (r - 128) * cf + 128;
      g = (g - 128) * cf + 128;
      b = (b - 128) * cf + 128;
    }
    if (sf !== 1) {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = l + (r - l) * sf;
      g = l + (g - l) * sf;
      b = l + (b - l) * sf;
    }
    data[i] = Math.round(clamp(r));
    data[i + 1] = Math.round(clamp(g));
    data[i + 2] = Math.round(clamp(b));
  }
  const blur = Number(filters.blur) || 0;
  if (blur > 0.05) {
    // Three box-blur passes approximate a Gaussian of the same radius.
    const tmp = new Float32Array(data.length);
    const work = new Float32Array(data);
    const radius = blur / 1.7;
    for (let pass = 0; pass < 3; pass += 1) {
      boxBlur(work, tmp, width, height, radius, true);
      boxBlur(tmp, work, width, height, radius, false);
    }
    for (let i = 0; i < data.length; i += 1) data[i] = Math.round(work[i]);
  }
  return data;
}
