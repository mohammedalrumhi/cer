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

// Images shipped with the app (built-in backgrounds, frames and colour variants) live in
// backend/uploads. When uploads go elsewhere (PERSISTENT_STORAGE_DIR / UPLOADS_DIR) both folders
// are read; a user's file overrides a bundled one with the same name. New uploads go to uploadsDir.
const bundledUploadsDir = path.join(backendRoot, 'uploads');
const uploadDirs = [...new Set([uploadsDir, bundledUploadsDir])];

/** Absolute path of an uploads file (by name), or null when no folder has it. */
function findUploadFile(fileName) {
  const name = String(fileName || '').replace(/^\/+/, '');
  if (!name) return null;
  for (const dir of uploadDirs) {
    const candidate = path.join(dir, name);
    if (candidate.startsWith(dir) && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

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
    const fileName = normalizedPath.replace(/^uploads\/?/, '');
    return findUploadFile(fileName) || path.join(uploadsDir, fileName);
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
  uploadDirs,
  bundledUploadsDir,
  findUploadFile,
  fontsDir,
  fontDirs,
  bundledFontsDir,
  listFontFiles,
  resolveBackendAssetPath,
};