const fs = require('fs');
const path = require('path');
const express = require('express');
const { imageUpload } = require('../utils/uploads');
const { imageSize } = require('../utils/imageSize');
const { uploadsDir } = require('../utils/storagePaths');

/**
 * The uploads library: images users add to designs. Files live in the uploads directory and
 * templates reference them by path (never inline base64).
 */
function createAssetsRouter({ storage }) {
  const router = express.Router();
  const uploadOne = imageUpload.single('file');

  router.get('/', async (_req, res) => {
    const assets = await storage.listRecords('assets');
    assets.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json(assets);
  });

  router.post('/', (req, res, next) => {
    uploadOne(req, res, async (error) => {
      if (error) return res.status(400).json({ message: error.message || 'Image upload failed' });
      if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
      try {
        const size = imageSize(fs.readFileSync(req.file.path)) || { width: 0, height: 0 };
        const asset = {
          id: path.basename(req.file.filename, path.extname(req.file.filename)),
          name: Buffer.from(req.file.originalname || '', 'latin1').toString('utf8') || req.file.filename,
          path: `uploads/${req.file.filename}`,
          url: `/uploads/${encodeURIComponent(req.file.filename)}`,
          width: size.width,
          height: size.height,
          size: req.file.size,
          mimeType: req.file.mimetype,
          createdAt: new Date().toISOString(),
        };
        await storage.putRecord('assets', asset);
        return res.status(201).json(asset);
      } catch (saveError) {
        return next(saveError);
      }
    });
  });

  router.delete('/:id', async (req, res) => {
    const asset = await storage.getRecord('assets', req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    await storage.deleteRecord('assets', asset.id);
    // Remove the file only if it is inside the uploads directory.
    const file = path.join(uploadsDir, path.basename(asset.path));
    if (file.startsWith(uploadsDir)) fs.promises.unlink(file).catch(() => {});
    return res.status(204).send();
  });

  return router;
}

module.exports = { createAssetsRouter };
