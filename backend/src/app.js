const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');

const { createTemplatesRouter } = require('./routes/templates');
const { createBrandingRouter } = require('./routes/branding');
const { createStudentsRouter } = require('./routes/students');
const { createCertificatesRouter } = require('./routes/certificates');
const { createAssetsRouter } = require('./routes/assets');
const { createBackgroundsRouter } = require('./routes/backgrounds');
const { createJobsRouter, requestOrigin } = require('./routes/jobs');
const { createVerifyRouter } = require('./routes/verify');
const { createJobRunner, issueCertificates } = require('./services/jobs');
const fontsRouter = require('./routes/fonts');
const { createAuthRouter } = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { uploadsDir, fontDirs } = require('./utils/storagePaths');
const { withTemplateMigrations } = require('./storage/withTemplateMigrations');

function resolveFrontendDistDir() {
  const configuredPath = String(process.env.FRONTEND_DIST_DIR || '').trim();
  const candidatePath = configuredPath
    ? path.resolve(configuredPath)
    : path.resolve(__dirname, '../../frontend/dist');

  return fs.existsSync(path.join(candidatePath, 'index.html')) ? candidatePath : null;
}

function sendStudentsTemplate(res) {
  try {
    const templateData = [
      {
        'اسم الطالب': 'مثال: أحمد محمد بن علي',
        'نوع الاستظهار': 'مثال: نص كامل',
        'نص السور (من إلى)': 'مثال: من سورة النبأ إلى سورة الناس',
        'اسم البرنامج': 'مثال: برنامج الإتقان',
        'التقويم': 'مثال: ممتاز',
        'عدد الأخطاء': 'مثال: 2',
        'المعلم': 'مثال: الأستاذ خالد',
        'الفئة': 'طالب أو دارس (اختياري)',
        'الجنس': 'ذكر أو أنثى (اختياري)'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلاب');
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 35 }, { wch: 35 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 22 }, { wch: 22 }
    ];

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template-students.xlsx"');
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
}

function createApp({ storage: rawStorage }) {
  const storage = withTemplateMigrations(rawStorage);
  const app = express();
  const frontendDistDir = resolveFrontendDistDir();

  app.use(cors({ exposedHeaders: ['Content-Disposition', 'Content-Type'] }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));
  for (const dir of fontDirs) app.use('/assets/fonts', express.static(dir));
  if (frontendDistDir) {
    app.use(express.static(frontendDistDir));
  }

  app.get('/api/health', async (_req, res) => {
    const mode = await storage.getMode();
    res.json({ status: 'ok', storage: mode });
  });

  app.get('/api/students/template', (_req, res) => sendStudentsTemplate(res));
  app.get('/api/template/students', (_req, res) => sendStudentsTemplate(res));

  app.use('/api/auth', createAuthRouter({ storage }));
  app.use('/api/templates', requireAuth, createTemplatesRouter({ storage }));
  app.use('/api/branding', requireAuth, createBrandingRouter({ storage }));
  app.use('/api/students', requireAuth, createStudentsRouter({ storage }));
  app.use('/api/certificates', requireAuth, createCertificatesRouter({ storage }));
  app.use('/api/fonts', requireAuth, fontsRouter);
  app.use('/api/assets', requireAuth, createAssetsRouter({ storage }));
  app.use('/api/backgrounds', requireAuth, createBackgroundsRouter());
  const runner = createJobRunner({ storage });
  app.use('/api/jobs', requireAuth, createJobsRouter({ runner }));
  app.use('/api/verify', createVerifyRouter({ storage }));
  // Serials for certificates rendered in the browser (PNG/JPG output).
  app.post('/api/certificates/serials', requireAuth, async (req, res, next) => {
    try {
      const { templateId, students } = req.body || {};
      const template = (await storage.listTemplates()).find((item) => item.id === templateId) || { id: templateId, name: '' };
      const list = (Array.isArray(students) ? students : []).filter((s) => s && s.name).slice(0, 5000);
      res.json(await issueCertificates(storage, { students: list, template, branding: await storage.getBranding(), origin: process.env.PUBLIC_BASE_URL || requestOrigin(req) }));
    } catch (error) {
      next(error);
    }
  });

  if (frontendDistDir) {
    app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)|\/assets\/fonts(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(frontendDistDir, 'index.html'));
    });
  }

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  });

  return app;
}

module.exports = {
  createApp,
};