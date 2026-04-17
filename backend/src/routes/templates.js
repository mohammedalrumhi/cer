const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { normalizeTemplateMetadata } = require('../utils/templateMetadata');
const { expandTemplatesWithBackgroundVariants } = require('../utils/templateVariants');
const { imageUpload } = require('../utils/uploads');

function createTemplatesRouter({ storage }) {
  const router = express.Router();
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

  router.get('/', async (_req, res) => {
    const templates = expandTemplatesWithBackgroundVariants(await storage.listTemplates());
    res.json(templates.map((template) => normalizeTemplateMetadata(template)));
  });

  router.get('/:id', async (req, res) => {
    const templates = expandTemplatesWithBackgroundVariants(await storage.listTemplates());
    const template = templates.find((item) => item.id === req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(normalizeTemplateMetadata(template));
  });

  router.post('/', async (req, res) => {
    const payload = req.body || {};

    const template = normalizeTemplateMetadata({
      id: uuidv4(),
      name: payload.name || 'قالب جديد',
      orientation: payload.orientation || 'landscape',
      width: payload.width || 1123,
      height: payload.height || 794,
      background: payload.background || { type: 'solid', color: '#f8f4ea', accentColor: '#0f4a3c' },
      elements: payload.elements || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await storage.createTemplate(template);
    res.status(201).json(template);
  });

  router.put('/:id', async (req, res) => {
    const templates = await storage.listTemplates();
    const existing = templates.find((item) => item.id === req.params.id);
    if (!existing) {
      const generatedTemplate = expandTemplatesWithBackgroundVariants(templates)
        .find((item) => item.id === req.params.id);

      if (!generatedTemplate) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const createdTemplate = normalizeTemplateMetadata({
        ...generatedTemplate,
        ...req.body,
        id: generatedTemplate.id,
        createdAt: generatedTemplate.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.createTemplate(createdTemplate);
      return res.json(createdTemplate);
    }

    const nextTemplate = normalizeTemplateMetadata({
      ...existing,
      ...req.body,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    await storage.updateTemplate(nextTemplate);
    return res.json(nextTemplate);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await storage.deleteTemplate(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Template not found' });
    }

    return res.status(204).send();
  });

  return router;
}

module.exports = {
  createTemplatesRouter,
};
