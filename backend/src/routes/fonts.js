const fs = require('fs');
const path = require('path');
const express = require('express');
const fontkit = require('fontkit');
const { fontUpload } = require('../utils/uploads');
const { listFontFiles } = require('../utils/storagePaths');
const { loadSharedModule } = require('../shared');

const router = express.Router();

// Arabic coverage per file, keyed by path + mtime so replaced uploads are re-read.
const coverageCache = new Map();

function hasArabic(filePath) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }
  const cacheKey = `${filePath}:${stat.mtimeMs}`;
  if (!coverageCache.has(cacheKey)) {
    let arabic = false;
    try {
      const font = fontkit.openSync(filePath);
      arabic = font.hasGlyphForCodePoint(0x0628) && font.hasGlyphForCodePoint(0x0645);
    } catch {
      arabic = false;
    }
    coverageCache.set(cacheKey, arabic);
  }
  return coverageCache.get(cacheKey);
}

async function toFontDto(fileName, filePath) {
  const { fontLabel, fontFamilyLabel } = await loadSharedModule('render/fontCatalog.js');
  const value = path.basename(fileName, path.extname(fileName));
  return {
    value,
    label: fontLabel(fileName),
    familyLabel: fontFamilyLabel(fileName),
    fileName,
    url: `/assets/fonts/${encodeURIComponent(fileName)}`,
    format: path.extname(fileName).toLowerCase() === '.otf' ? 'opentype' : 'truetype',
    arabic: hasArabic(filePath),
  };
}

const uploadOneFont = fontUpload.single('file');

router.post('/', (req, res, next) => {
  uploadOneFont(req, res, async (error) => {
    if (error) return res.status(400).json({ message: error.message || 'Font upload failed' });
    if (!req.file) return res.status(400).json({ message: 'No font uploaded' });
    try {
      return res.status(201).json(await toFontDto(req.file.filename, req.file.path));
    } catch (dtoError) {
      return next(dtoError);
    }
  });
});

router.get('/', async (_req, res, next) => {
  try {
    const fonts = await Promise.all(listFontFiles().map(({ fileName, filePath }) => toFontDto(fileName, filePath)));
    fonts.sort((a, b) => a.label.localeCompare(b.label, 'ar'));
    res.json(fonts);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
