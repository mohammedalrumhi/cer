const express = require('express');
const { readJson } = require('../utils/fileDb');
const { buildCertificatesPdf } = require('../services/pdfService');

const router = express.Router();

router.post('/preview', async (req, res, next) => {
  try {
    const { template, branding, students } = req.body || {};
    if (!template || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'template and students are required' });
    }

    const resolvedBranding = branding || readJson('branding.json', { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '' });
    const pdfBytes = await buildCertificatesPdf({
      template,
      students,
      branding: resolvedBranding,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="certificate-preview.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    return next(error);
  }
});

router.post('/generate', async (req, res, next) => {
  try {
    const { templateId, students } = req.body || {};
    if (!templateId || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'templateId and students are required' });
    }

    const templates = readJson('templates.json', []);
    const branding = readJson('branding.json', { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '' });
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const pdfBytes = await buildCertificatesPdf({
      template,
      students,
      branding,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="certificates.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
