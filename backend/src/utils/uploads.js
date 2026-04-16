const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadsDir: uploadDir, fontsDir } = require('./storagePaths');

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(fontsDir, { recursive: true });

function sanitizeBaseName(name) {
  return String(name || 'file')
    .normalize('NFKC')
  .replace(/[^\p{Letter}\p{Number}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    || 'file';
}

function createStorage(destinationDir, naming = 'uuid') {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destinationDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();

      if (naming === 'original') {
        const originalBase = sanitizeBaseName(path.basename(file.originalname || 'font', ext));
        let candidate = `${originalBase}${ext}`;
        let counter = 1;

        while (fs.existsSync(path.join(destinationDir, candidate))) {
          candidate = `${originalBase}-${counter}${ext}`;
          counter += 1;
        }

        cb(null, candidate);
        return;
      }

      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const storage = createStorage(uploadDir);
const fontStorage = createStorage(fontsDir, 'original');

const allowedImageMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const allowedImageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);
const allowedFontMimeTypes = new Set([
  'font/ttf',
  'font/otf',
  'font/sfnt',
  'application/x-font-ttf',
  'application/x-font-opentype',
  'application/font-sfnt',
  'application/octet-stream',
]);
const allowedFontExtensions = new Set(['.ttf', '.otf']);

function isAllowedImage(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const ext = path.extname(String(file?.originalname || '')).toLowerCase();

  // Accept common image MIME types directly.
  if (allowedImageMimeTypes.has(mime)) {
    return true;
  }

  // Some clients send generic MIME types; fall back to extension check.
  if ((mime === 'application/octet-stream' || mime === '') && allowedImageExtensions.has(ext)) {
    return true;
  }

  return false;
}

function isAllowedFont(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  const ext = path.extname(String(file?.originalname || '')).toLowerCase();
  return allowedFontExtensions.has(ext) && (allowedFontMimeTypes.has(mime) || mime === '');
}

const imageUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!isAllowedImage(file)) {
      return cb(new Error('Only image files are allowed (.png, .jpg, .jpeg, .webp, .gif, .svg)'));
    }
    cb(null, true);
  },
});

const excelUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const originalName = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const isSpreadsheet =
      mime.includes('spreadsheetml') ||
      mime.includes('ms-excel') ||
      mime.includes('csv') ||
      originalName.endsWith('.xlsx') ||
      originalName.endsWith('.xls') ||
      originalName.endsWith('.csv');

    if (!isSpreadsheet) {
      return cb(new Error('Only spreadsheet files are allowed (.xlsx, .xls, .csv)'));
    }
    cb(null, true);
  },
});

const fontUpload = multer({
  storage: fontStorage,
  fileFilter: (_req, file, cb) => {
    if (!isAllowedFont(file)) {
      return cb(new Error('Only font files are allowed (.ttf, .otf)'));
    }
    cb(null, true);
  },
});

module.exports = {
  imageUpload,
  excelUpload,
  fontUpload,
  uploadDir,
  fontsDir,
};
