import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/** Decode a PNG and composite it over white, resizing-free (sizes must already match). */
export function decodeOnWhite(buffer) {
  const png = PNG.sync.read(buffer);
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    data[i] = Math.round(data[i] * alpha + 255 * (1 - alpha));
    data[i + 1] = Math.round(data[i + 1] * alpha + 255 * (1 - alpha));
    data[i + 2] = Math.round(data[i + 2] * alpha + 255 * (1 - alpha));
    data[i + 3] = 255;
  }
  return png;
}

function cropTo(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  out.data.fill(255);
  for (let y = 0; y < Math.min(height, png.height); y += 1) {
    const rowBytes = Math.min(width, png.width) * 4;
    png.data.copy(out.data, y * width * 4, y * png.width * 4, y * png.width * 4 + rowBytes);
  }
  return out;
}

/** Darkness (0 = white … 255 = black) per pixel. */
function darkness(png) {
  const out = new Float32Array(png.width * png.height);
  for (let i = 0, p = 0; i < png.data.length; i += 4, p += 1) {
    out[p] = 255 - (0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2]);
  }
  return out;
}

/** Separable Gaussian blur; removes rasteriser anti-aliasing noise, keeps geometry. */
function blur(values, width, height, sigma) {
  const radius = Math.ceil(sigma * 3);
  const kernel = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i += 1) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(weight);
    sum += weight;
  }
  for (let i = 0; i < kernel.length; i += 1) kernel[i] /= sum;
  const tmp = new Float32Array(values.length);
  const out = new Float32Array(values.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) acc += values[y * width + Math.min(width - 1, Math.max(0, x + k))] * kernel[k + radius];
      tmp[y * width + x] = acc;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let acc = 0;
      for (let k = -radius; k <= radius; k += 1) acc += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x] * kernel[k + radius];
      out[y * width + x] = acc;
    }
  }
  return out;
}

/** Sub-pixel offset of profile `b` relative to `a` (least L1 error, linear interpolation). */
function profileShift(a, b, maxShift = 3, step = 0.0625) {
  let best = { error: Infinity, shift: 0 };
  for (let shift = -maxShift; shift <= maxShift + 1e-9; shift += step) {
    let error = 0;
    for (let i = 0; i < a.length; i += 1) {
      const position = i - shift;
      const lo = Math.floor(position);
      const t = position - lo;
      const value = (b[lo] ?? 0) * (1 - t) + (b[lo + 1] ?? 0) * t;
      error += Math.abs(a[i] - value);
    }
    if (error < best.error) best = { error, shift };
  }
  return best.shift;
}

/**
 * Compare two renders of the same text.
 *  - iou:   IoU of ≥50 % coverage after a σ = `sigma` px blur (robust to anti-aliasing, still
 *           drops below ~0.87 for a 1 px shift);
 *  - dx/dy: best-fit sub-pixel offset between the renders, in px;
 *  - inkRatio: total ink of b / a.
 */
export function inkIoU(bufferA, bufferB, { width, height, sigma = 1 }) {
  const rawA = darkness(cropTo(decodeOnWhite(bufferA), width, height));
  const rawB = darkness(cropTo(decodeOnWhite(bufferB), width, height));
  const a = blur(rawA, width, height, sigma);
  const b = blur(rawB, width, height, sigma);

  let intersection = 0;
  let union = 0;
  let inkA = 0;
  let inkB = 0;
  const columnsA = new Float64Array(width);
  const columnsB = new Float64Array(width);
  const rowsA = new Float64Array(height);
  const rowsB = new Float64Array(height);
  for (let i = 0; i < a.length; i += 1) {
    const inA = a[i] >= 128;
    const inB = b[i] >= 128;
    if (inA && inB) intersection += 1;
    if (inA || inB) union += 1;
    inkA += rawA[i];
    inkB += rawB[i];
    const x = i % width;
    const y = (i - x) / width;
    columnsA[x] += rawA[i]; columnsB[x] += rawB[i];
    rowsA[y] += rawA[i]; rowsB[y] += rawB[i];
  }

  return {
    iou: union === 0 ? 1 : intersection / union,
    inkPixels: union,
    inkRatio: inkA === 0 ? 1 : inkB / inkA,
    dx: Math.abs(profileShift(columnsA, columnsB)),
    dy: Math.abs(profileShift(rowsA, rowsB)),
  };
}

/** Perceptual full-page diff (anti-aliasing tolerant). Returns mismatch ratio and a diff PNG. */
export function pageDiff(bufferA, bufferB, { width, height }) {
  const a = cropTo(decodeOnWhite(bufferA), width, height);
  const b = cropTo(decodeOnWhite(bufferB), width, height);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.15, includeAA: false });
  return { ratio: mismatched / (width * height), diffPng: PNG.sync.write(diff) };
}
