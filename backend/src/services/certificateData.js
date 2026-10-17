const fs = require('fs');
const path = require('path');
const { resolveBackendAssetPath } = require('../utils/storagePaths');

// Image sources shared by the PDF renderers. Field values come from shared/model/fields.js.

function normalizeUtf8(value) {
  if (value === null || value === undefined) return '';
  return Buffer.from(String(value), 'utf8').toString('utf8');
}

function resolveImagePath(imagePath, fallbackAsset) {
  if (!imagePath && fallbackAsset) {
    // Bundled defaults in frontend/public/assets; accept any of the listed file names.
    const candidates = Array.isArray(fallbackAsset) ? fallbackAsset : [fallbackAsset];
    return candidates
      .map((name) => path.resolve(__dirname, '../../../frontend/public/assets', name))
      .find((candidate) => fs.existsSync(candidate)) || null;
  }
  if (!imagePath) return null;
  const resolved = resolveBackendAssetPath(imagePath);
  return fs.existsSync(resolved) ? resolved : null;
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;

  try {
    return Buffer.from(match[1], 'base64');
  } catch {
    return null;
  }
}

function resolveElementImageSource(element, imageAssets) {
  if (element.type === 'dynamicImage') {
    if (element.field === 'logo') return imageAssets.logo;
    if (element.field === 'signature') return imageAssets.signature;
    if (element.field === 'stamp') return imageAssets.stamp;
    return null;
  }

  if (element.type === 'image') {
    if (typeof element.src !== 'string' || !element.src) return null;
    if (element.src.startsWith('data:image/')) return decodeDataUrl(element.src);
    const resolved = resolveBackendAssetPath(element.src);
    return fs.existsSync(resolved) ? resolved : null;
  }

  return null;
}

function loadImageAssets(branding = {}) {
  // Default assets when branding fields are missing.
  return {
    logo: resolveImagePath(branding.logoPath, 'logo.png'),
    signature: resolveImagePath(branding.signaturePath, ['signture.png', 'signture.jpeg']),
    stamp: resolveImagePath(branding.stampPath, ['stamp.png', 'stamp.jpeg']),
  };
}

module.exports = {
  loadImageAssets,
  normalizeUtf8,
  resolveElementImageSource,
  resolveImagePath,
};
