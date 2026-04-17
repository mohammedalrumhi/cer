const path = require('path');
const express = require('express');
const { imageUpload } = require('../utils/uploads');

function createBrandingRouter({ storage }) {
  const router = express.Router();

  function buildUploadHandler(fieldKey, emptyMessage) {
    return async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: emptyMessage });
      }

      const assetPath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
      const branding = await storage.updateBrandingAsset(fieldKey, assetPath);
      return res.json(branding);
    };
  }

  const uploadOneImage = imageUpload.single('file');
  function imageUploadRoute(fieldKey, emptyMessage) {
    return [
      (req, res, next) => {
        uploadOneImage(req, res, (error) => {
          if (!error) return next();
          return res.status(400).json({
            message: error.message || 'Image upload failed',
          });
        });
      },
      buildUploadHandler(fieldKey, emptyMessage),
    ];
  }

  router.post('/stamp', ...imageUploadRoute('stampPath', 'No stamp uploaded'));

  router.get('/', async (_req, res) => {
    const branding = await storage.getBranding();
    res.json(branding);
  });

  router.put('/', async (req, res) => {
    const next = await storage.updateBranding(req.body || {});
    res.json(next);
  });

  router.post('/logo', ...imageUploadRoute('logoPath', 'No logo uploaded'));

  router.post('/signature', ...imageUploadRoute('signaturePath', 'No signature uploaded'));

  return router;
}

module.exports = {
  createBrandingRouter,
};
