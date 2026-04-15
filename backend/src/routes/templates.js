const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJson, writeJson } = require('../utils/fileDb');
const { imageUpload } = require('../utils/uploads');

const router = express.Router();
const FILE_NAME = 'templates.json';
const EMPTY = [];

const uploadOneImage = imageUpload.single('file');

router.post('/design-upload', (req, res) => {
  uploadOneImage(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message || 'Image upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No design image uploaded' });
    }

    return res.json({
      path: `uploads/${req.file.filename}`,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`,
      fileName: req.file.originalname,
    });
  });
});

router.get('/', (_req, res) => {
  const templates = readJson(FILE_NAME, EMPTY);
  res.json(templates);
});

router.get('/:id', (req, res) => {
  const templates = readJson(FILE_NAME, EMPTY);
  const template = templates.find((item) => item.id === req.params.id);
  if (!template) {
    return res.status(404).json({ message: 'Template not found' });
  }
  return res.json(template);
});

router.post('/', (req, res) => {
  const templates = readJson(FILE_NAME, EMPTY);
  const payload = req.body || {};

  const template = {
    id: uuidv4(),
    name: payload.name || 'قالب جديد',
    orientation: payload.orientation || 'landscape',
    width: payload.width || 1123,
    height: payload.height || 794,
    background: payload.background || { type: 'solid', color: '#f8f4ea', accentColor: '#0f4a3c' },
    elements: payload.elements || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates.push(template);
  writeJson(FILE_NAME, templates, EMPTY);
  res.status(201).json(template);
});

router.put('/:id', (req, res) => {
  const templates = readJson(FILE_NAME, EMPTY);
  const idx = templates.findIndex((item) => item.id === req.params.id);
  if (idx < 0) {
    return res.status(404).json({ message: 'Template not found' });
  }

  templates[idx] = {
    ...templates[idx],
    ...req.body,
    id: templates[idx].id,
    createdAt: templates[idx].createdAt,
    updatedAt: new Date().toISOString(),
  };

  writeJson(FILE_NAME, templates, EMPTY);
  return res.json(templates[idx]);
});

router.delete('/:id', (req, res) => {
  const templates = readJson(FILE_NAME, EMPTY);
  const next = templates.filter((item) => item.id !== req.params.id);

  if (next.length === templates.length) {
    return res.status(404).json({ message: 'Template not found' });
  }

  writeJson(FILE_NAME, next, EMPTY);
  return res.status(204).send();
});

module.exports = router;
