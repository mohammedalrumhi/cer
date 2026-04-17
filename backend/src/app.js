const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');

const { createTemplatesRouter } = require('./routes/templates');
const { createBrandingRouter } = require('./routes/branding');
const { createStudentsRouter } = require('./routes/students');
const { createCertificatesRouter } = require('./routes/certificates');
const fontsRouter = require('./routes/fonts');
const { createAuthRouter } = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { uploadsDir, fontsDir } = require('./utils/storagePaths');

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
        'المعلم': 'مثال: الأستاذ خالد'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلاب');
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 35 }, { wch: 35 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }
    ];

    const fileBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template-students.xlsx"');
    return res.send(fileBuffer);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
}

function createApp({ storage }) {
  const app = express();
  const frontendDistDir = resolveFrontendDistDir();

  app.use(cors({ exposedHeaders: ['Content-Disposition', 'Content-Type'] }));
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));
  app.use('/assets/fonts', express.static(fontsDir));
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