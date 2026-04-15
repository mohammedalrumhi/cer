const express = require('express');
const archiver = require('archiver');
const { readJson } = require('../utils/fileDb');
const { buildCertificatePdf, buildCertificatesPdf } = require('../services/pdfService');

const router = express.Router();

function normalizeStudentName(student) {
  if (typeof student === 'string') return student.trim();
  if (student && typeof student === 'object') {
    return String(student.name || student.studentName || student.fullName || '').trim();
  }
  return '';
}

function normalizeStudentsList(students) {
  if (!Array.isArray(students)) return [];
  return students
    .map(normalizeStudentName)
    .filter(Boolean);
}

function sanitizeFileName(value, fallback) {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || fallback;
}

function buildContentDisposition(filename, fallbackAsciiName) {
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  return `attachment; filename="${fallbackAsciiName}"; filename*=UTF-8''${encoded}`;
}

router.post('/preview', async (req, res, next) => {
  try {
    const { template, branding, students } = req.body || {};
    const normalizedStudents = normalizeStudentsList(students);
    if (!template || normalizedStudents.length === 0) {
      return res.status(400).json({ message: 'template and students are required' });
    }

    const resolvedBranding = branding || readJson('branding.json', { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' });
    const pdfBytes = await buildCertificatesPdf({
      template,
      students: normalizedStudents,
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
    const normalizedStudents = normalizeStudentsList(students);
    if (!templateId || normalizedStudents.length === 0) {
      return res.status(400).json({ message: 'templateId and students are required' });
    }

    const templates = readJson('templates.json', []);
    const branding = readJson('branding.json', { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' });
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (normalizedStudents.length === 1) {
      const pdfBytes = await buildCertificatesPdf({
        template,
        students: normalizedStudents,
        branding,
      });

      const studentName = sanitizeFileName(normalizedStudents[0], 'certificate');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', buildContentDisposition(`${studentName}.pdf`, 'certificate.pdf'));
      return res.send(Buffer.from(pdfBytes));
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', next);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', buildContentDisposition('certificates.zip', 'certificates.zip'));

    archive.pipe(res);

    for (const student of normalizedStudents) {
      const pdfBytes = await buildCertificatePdf({
        template,
        student,
        branding,
      });
      const studentName = sanitizeFileName(student, 'certificate');
      archive.append(pdfBytes, { name: `${studentName}.pdf` });
    }

    await archive.finalize();
    return undefined;
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
