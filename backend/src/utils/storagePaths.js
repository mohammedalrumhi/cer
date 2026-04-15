const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '../..');

function normalizeDirPath(input, fallbackPath) {
  const value = String(input || '').trim();
  if (!value) return fallbackPath;
  return path.resolve(value);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

const persistentBaseDir = normalizeDirPath(process.env.PERSISTENT_STORAGE_DIR, '');

const dataDir = ensureDir(normalizeDirPath(
  process.env.DATA_DIR,
  persistentBaseDir ? path.join(persistentBaseDir, 'data') : path.join(backendRoot, 'data')
));

const uploadsDir = ensureDir(normalizeDirPath(
  process.env.UPLOADS_DIR,
  persistentBaseDir ? path.join(persistentBaseDir, 'uploads') : path.join(backendRoot, 'uploads')
));

const fontsDir = ensureDir(normalizeDirPath(
  process.env.FONTS_DIR,
  persistentBaseDir ? path.join(persistentBaseDir, 'fonts') : path.join(backendRoot, 'assets/fonts')
));

function resolveBackendAssetPath(assetPath) {
  const normalizedPath = String(assetPath || '').replace(/^\/+/, '');
  if (!normalizedPath) return null;

  if (normalizedPath === 'uploads' || normalizedPath.startsWith('uploads/')) {
    return path.join(uploadsDir, normalizedPath.replace(/^uploads\/?/, ''));
  }

  if (normalizedPath === 'assets/fonts' || normalizedPath.startsWith('assets/fonts/')) {
    return path.join(fontsDir, normalizedPath.replace(/^assets\/fonts\/?/, ''));
  }

  return path.resolve(backendRoot, normalizedPath);
}

module.exports = {
  backendRoot,
  dataDir,
  uploadsDir,
  fontsDir,
  resolveBackendAssetPath,
};