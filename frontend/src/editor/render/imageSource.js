import { applyFilters, filtersKey, hasFilters } from '@shared/render/index.js';
import { buildAssetUrl } from '../../api/client';

// Same defaults the PDF renderer uses when branding assets are missing.
const DEFAULT_BRANDING_ASSETS = {
  logo: '/assets/logo.png',
  signature: '/assets/signture.png',
  stamp: '/assets/stamp.png',
};

export function imageSourceUrl(source, branding) {
  if (!source?.value) return '';
  if (source.type === 'field') {
    const key = `${source.value}Path`;
    return branding?.[key] ? buildAssetUrl(branding[key]) : DEFAULT_BRANDING_ASSETS[source.value] || '';
  }
  return buildAssetUrl(source.value);
}

/* ── Loading (shared cache for the editor, thumbnails and exports) ─────────────── */

const images = new Map(); // url → { promise, image }

export function peekImage(url) {
  return images.get(url)?.image || null;
}

export function loadImage(url) {
  if (!url) return Promise.resolve(null);
  let entry = images.get(url);
  if (!entry) {
    entry = { image: null };
    entry.promise = new Promise((resolve) => {
      const img = new window.Image();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) img.crossOrigin = 'anonymous';
      img.onload = () => {
        entry.image = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    images.set(url, entry);
  }
  return entry.promise;
}

/* ── Filters: the same pixel code as the PDF renderer (shared/render/filters.js) ── */

const filtered = new Map(); // url|filters → canvas

export function filteredImage(image, url, filters) {
  if (!image || !hasFilters(filters)) return image;
  const key = `${url}|${filtersKey(filters)}`;
  let canvas = filtered.get(key);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyFilters(data.data, canvas.width, canvas.height, filters);
      ctx.putImageData(data, 0, 0);
    } catch {
      // Tainted canvas (cross-origin without CORS): show unfiltered.
    }
    if (filtered.size > 24) filtered.delete(filtered.keys().next().value);
    filtered.set(key, canvas);
  }
  return canvas;
}
