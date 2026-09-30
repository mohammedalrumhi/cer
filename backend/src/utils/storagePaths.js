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

// Fonts shipped with the app. When uploads live elsewhere (PERSISTENT_STORAGE_DIR / FONTS_DIR),
// both directories are used; an uploaded file overrides a bundled one with the same name.
const bundledFontsDir = path.join(backendRoot, 'assets/fonts');
const fontDirs = [...new Set([fontsDir, bundledFontsDir])];

/** @returns {{ fileName: string, filePath: string }[]} */
function listFontFiles() {
  const seen = new Map();
  for (const dir of fontDirs) {
    let files = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const fileName of files) {
      if (!/\.(ttf|otf)$/i.test(fileName) || seen.has(fileName)) continue;
      seen.set(fileName, { fileName, filePath: path.join(dir, fileName) });
    }
  }
  return [...seen.values()];
}

function resolveBackendAssetPath(assetPath) {
  const normalizedPath = String(assetPath || '').replace(/^\/+/, '');
  if (!normalizedPath) return null;

  if (normalizedPath === 'uploads' || normalizedPath.startsWith('uploads/')) {
    return path.join(uploadsDir, normalizedPath.replace(/^uploads\/?/, ''));
  }

  if (normalizedPath === 'assets/fonts' || normalizedPath.startsWith('assets/fonts/')) {
    const fileName = normalizedPath.replace(/^assets\/fonts\/?/, '');
    return fontDirs.map((dir) => path.join(dir, fileName)).find((candidate) => fs.existsSync(candidate))
      || path.join(fontsDir, fileName);
  }

  return path.resolve(backendRoot, normalizedPath);
}

module.exports = {
  backendRoot,
  dataDir,
  uploadsDir,
  fontsDir,
  fontDirs,
  bundledFontsDir,
  listFontFiles,
  resolveBackendAssetPath,
};