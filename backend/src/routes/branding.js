const path = require('path');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileDb');
const { imageUpload } = require('../utils/uploads');

const router = express.Router();
const FILE_NAME = 'branding.json';
const EMPTY = { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '' };

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

router.post('/logo', imageUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No logo uploaded' });
  }

  const branding = readJson(FILE_NAME, EMPTY);
  branding.logoPath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
  writeJson(FILE_NAME, branding, EMPTY);

  return res.json(branding);
});

router.post('/signature', imageUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No signature uploaded' });
  }

  const branding = readJson(FILE_NAME, EMPTY);
  branding.signaturePath = path.join('uploads', req.file.filename).replace(/\\/g, '/');
  writeJson(FILE_NAME, branding, EMPTY);

  return res.json(branding);
});

module.exports = router;
