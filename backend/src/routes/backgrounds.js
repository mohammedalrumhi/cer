const fs = require('fs');
const path = require('path');
const express = require('express');
const { uploadsDir } = require('../utils/storagePaths');
const { COLOR_VARIANTS } = require('../utils/templateVariants');

/**
 * Background library: decorative Islamic frames (content-free, so any template's elements sit on
 * top) and the colour variants of the Itqan template family. Files that are missing are skipped.
 */
const FRAMES = [
  { key: 'gold-arabesque', label: 'أرابيسك ذهبي', file: 'itqan-bg-gold-arabesque.png' },
  { key: 'frame-1', label: 'إطار بيج كلاسيكي', file: 'itqan-frame-1.jpg' },
  { key: 'frame-2', label: 'إطار ذهبي فاخر', file: 'itqan-frame-2.jpg' },
  { key: 'frame-3', label: 'إطار زخرفي', file: 'itqan-frame-3.jpg' },
  { key: 'frame-4', label: 'إطار هادئ', file: 'itqan-frame-4.jpg' },
  { key: 'frame-5', label: 'إطار ملكي', file: 'itqan-frame-5.jpg' },
];

function exists(file) {
  return fs.existsSync(path.join(uploadsDir, file));
}

function createBackgroundsRouter() {
  const router = express.Router();
  router.get('/', (_req, res) => {
    const frames = FRAMES.filter((item) => exists(item.file)).map((item) => ({
      key: item.key, label: item.label, category: 'frames', path: `uploads/${item.file}`,
    }));
    const itqan = COLOR_VARIANTS.filter((variant) => exists(`itqan-template-5-${variant.key}.png`)).map((variant) => ({
      key: `itqan-${variant.key}`,
      label: variant.label,
      category: 'itqan',
      path: `uploads/itqan-template-5-${variant.key}.png`,
      color: variant.color,
      accentColor: variant.accentColor,
    }));
    res.json([...frames, ...itqan]);
  });
  return router;
}

module.exports = { createBackgroundsRouter, FRAMES };
