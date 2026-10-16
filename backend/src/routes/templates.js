const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { normalizeTemplateMetadata } = require('../utils/templateMetadata');
const {
  collapseTemplatesWithBackgroundVariants,
  deleteTemplateFamily,
  parseManagedVariantTemplateId,
} = require('../utils/templateVariants');
const { imageUpload } = require('../utils/uploads');

const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000;
const MAX_AUTO_VERSIONS = 30;

async function saveVersion(storage, template, { kind, name }) {
  const { availableBackgroundVariants: _computed, ...content } = template;
  const record = {
    id: uuidv4(),
    ownerId: template.id,
    kind, // 'named' | 'auto' | 'beforeRestore'
    name,
    templateVersion: Number(template.version) || 1,
    createdAt: new Date().toISOString(),
    template: content,
  };
  await storage.putRecord('templateVersions', record);
  return record;
}

/** Keep an automatic snapshot of the previous state at most every 10 minutes (last 30 kept). */
async function snapshotIfDue(storage, previous) {
  const versions = await storage.listRecords('templateVersions', { ownerId: previous.id });
  const autos = versions.filter((version) => version.kind === 'auto').sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const last = autos[autos.length - 1];
  if (last && Date.now() - new Date(last.createdAt).getTime() < AUTO_VERSION_INTERVAL_MS) return;
  await saveVersion(storage, previous, { kind: 'auto', name: null });
  for (const old of autos.slice(0, Math.max(0, autos.length + 1 - MAX_AUTO_VERSIONS))) {
    await storage.deleteRecord('templateVersions', old.id, { ownerId: previous.id });
  }
}

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
    const templates = collapseTemplatesWithBackgroundVariants(await storage.listTemplates());
    res.json(templates.map((template) => normalizeTemplateMetadata(template)));
  });

  router.get('/:id', async (req, res) => {
    const templates = collapseTemplatesWithBackgroundVariants(await storage.listTemplates());
    const managedVariant = parseManagedVariantTemplateId(req.params.id);
    const targetId = managedVariant?.baseId || req.params.id;
    const template = templates.find((item) => item.id === targetId);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(normalizeTemplateMetadata(template));
  });

  router.post('/', async (req, res) => {
    const payload = req.body || {};

    // Keep every client field (detailLevel, audienceType, schemaVersion…); the storage layer
    // migrates and the server owns id and timestamps.
    const template = normalizeTemplateMetadata({
      ...payload,
      id: uuidv4(),
      version: 1,
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
    const { baseVersion, ...body } = req.body || {};
    if (!existing) {
      const managedVariant = parseManagedVariantTemplateId(req.params.id);
      const targetId = managedVariant?.baseId || req.params.id;
      const generatedTemplate = collapseTemplatesWithBackgroundVariants(templates)
        .find((item) => item.id === targetId);

      if (!generatedTemplate) {
        return res.status(404).json({ message: 'Template not found' });
      }

      const createdTemplate = normalizeTemplateMetadata({
        ...generatedTemplate,
        ...body,
        id: generatedTemplate.id,
        version: 1,
        createdAt: generatedTemplate.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await storage.createTemplate(createdTemplate);
      return res.json(createdTemplate);
    }

    // Optimistic concurrency: a save based on an older version than the stored one is a conflict
    // (another tab or teacher saved in between). Clients without baseVersion overwrite as before.
    const currentVersion = Number(existing.version) || 1;
    if (baseVersion !== undefined && baseVersion !== null && Number(baseVersion) !== currentVersion) {
      return res.status(409).json({ message: 'Template was changed elsewhere', currentVersion, updatedAt: existing.updatedAt });
    }

    const nextTemplate = normalizeTemplateMetadata({
      ...existing,
      ...body,
      id: existing.id,
      version: currentVersion + 1,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    await storage.updateTemplate(nextTemplate);
    await snapshotIfDue(storage, existing);
    return res.json(nextTemplate);
  });

  /* ── Version history ─────────────────────────────────────────────────────────── */

  router.get('/:id/versions', async (req, res) => {
    const versions = await storage.listRecords('templateVersions', { ownerId: req.params.id });
    versions.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json(versions.map(({ template, ...summary }) => ({ ...summary, elementCount: template?.elements?.length || 0 })));
  });

  router.post('/:id/versions', async (req, res) => {
    const template = (await storage.listTemplates()).find((item) => item.id === req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    const version = await saveVersion(storage, template, { kind: 'named', name: String(req.body?.name || '').trim().slice(0, 120) || null });
    const { template: _omit, ...summary } = version;
    return res.status(201).json(summary);
  });

  router.get('/:id/versions/:versionId', async (req, res) => {
    const version = await storage.getRecord('templateVersions', req.params.versionId, { ownerId: req.params.id });
    if (!version || version.ownerId !== req.params.id) return res.status(404).json({ message: 'Version not found' });
    return res.json(version);
  });

  router.post('/:id/versions/:versionId/restore', async (req, res) => {
    const templates = await storage.listTemplates();
    const current = templates.find((item) => item.id === req.params.id);
    const version = await storage.getRecord('templateVersions', req.params.versionId, { ownerId: req.params.id });
    if (!current || !version || version.ownerId !== req.params.id) return res.status(404).json({ message: 'Version not found' });
    await saveVersion(storage, current, { kind: 'beforeRestore', name: null });
    const restored = normalizeTemplateMetadata({
      ...version.template,
      id: current.id,
      name: current.name,
      version: (Number(current.version) || 1) + 1,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    });
    await storage.updateTemplate(restored);
    return res.json(restored);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await deleteTemplateFamily(storage, req.params.id);

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
