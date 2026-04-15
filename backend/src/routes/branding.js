const path = require('path');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileDb');
const { imageUpload } = require('../utils/uploads');

const router = express.Router();
const FILE_NAME = 'branding.json';
const EMPTY = { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' };

function buildUploadHandler(fieldKey, emptyMessage) {
  return (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: emptyMessage });
    }

    const branding = readJson(FILE_NAME, EMPTY);
    branding[fieldKey] = path.join('uploads', req.file.filename).replace(/\\/g, '/');
    writeJson(FILE_NAME, branding, EMPTY);

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

router.get('/', (_req, res) => {
  const branding = readJson(FILE_NAME, EMPTY);
  res.json(branding);
});

router.put('/', (req, res) => {
  const current = readJson(FILE_NAME, EMPTY);
  const next = {
    ...current,
    ...req.body,
  };
  writeJson(FILE_NAME, next, EMPTY);
  res.json(next);
});

router.post('/logo', ...imageUploadRoute('logoPath', 'No logo uploaded'));

router.post('/signature', ...imageUploadRoute('signaturePath', 'No signature uploaded'));

module.exports = router;
