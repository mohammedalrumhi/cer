const fs = require('fs');
const path = require('path');
const express = require('express');
const { fontUpload } = require('../utils/uploads');

const router = express.Router();
const fontsDir = path.resolve(__dirname, '../../assets/fonts');
const supportedExtensions = new Set(['.ttf', '.otf']);

function toFamilyName(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function toFontDto(file) {
  return {
    value: toFamilyName(file),
    label: toFamilyName(file),
    fileName: file,
    url: `/assets/fonts/${encodeURIComponent(file)}`,
    format: path.extname(file).toLowerCase() === '.otf' ? 'opentype' : 'truetype',
  };
}

const uploadOneFont = fontUpload.single('file');

router.post('/', (req, res) => {
  uploadOneFont(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || 'Font upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No font uploaded' });
    }

    return res.status(201).json(toFontDto(req.file.filename));
  });
});

router.get('/', (_req, res) => {
  const files = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : [];
  const fonts = files
    .filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()))
    .map(toFontDto)
    .sort((a, b) => a.label.localeCompare(b.label, 'ar'));

  res.json(fonts);
});

module.exports = router;
