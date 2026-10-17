const fs = require('fs');
const express = require('express');

function contentDisposition(filename, fallback) {
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function requestOrigin(req) {
  return req.get('origin') || `${req.protocol}://${req.get('host')}`;
}

/** Bulk generation jobs: create, poll progress, cancel, download, history. */
function createJobsRouter({ runner }) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    res.json(await runner.list());
  });

  router.post('/', async (req, res, next) => {
    try {
      res.status(202).json(await runner.create(req.body || {}, { origin: requestOrigin(req) }));
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.get('/:id', async (req, res) => {
    const job = await runner.get(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json(job);
  });

  router.post('/:id/cancel', async (req, res) => {
    const job = await runner.cancel(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    return res.json(job);
  });

  router.delete('/:id', async (req, res) => {
    const removed = await runner.remove(req.params.id);
    return removed ? res.status(204).send() : res.status(404).json({ message: 'Job not found' });
  });

  router.get('/:id/download', async (req, res) => {
    const job = await runner.get(req.params.id);
    const file = runner.filePath(job);
    if (!job || job.status !== 'done' || !file || !fs.existsSync(file)) return res.status(404).json({ message: 'File not available' });
    const ext = job.output === 'zip' ? 'zip' : 'pdf';
    res.setHeader('Content-Type', ext === 'zip' ? 'application/zip' : 'application/pdf');
    res.setHeader('Content-Disposition', contentDisposition(`${job.fileName}.${ext}`, `certificates.${ext}`));
    return fs.createReadStream(file).pipe(res);
  });

  return router;
}

module.exports = { createJobsRouter, requestOrigin };
