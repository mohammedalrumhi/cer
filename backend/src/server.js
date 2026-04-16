const express = require('express');
const cors = require('cors');
const path = require('path');

const templatesRouter = require('./routes/templates');
const brandingRouter = require('./routes/branding');
const studentsRouter = require('./routes/students');
const certificatesRouter = require('./routes/certificates');
const fontsRouter = require('./routes/fonts');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { uploadsDir, fontsDir } = require('./utils/storagePaths');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  exposedHeaders: ['Content-Disposition', 'Content-Type'],
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/assets/fonts', express.static(fontsDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const XLSX = require('xlsx');

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

app.get('/api/students/template', (_req, res) => {
  return sendStudentsTemplate(res);
});

// Public routes (no auth required)
app.get('/api/template/students', (_req, res) => {
  return sendStudentsTemplate(res);
});

app.use('/api/auth', authRouter);

app.use('/api/templates', requireAuth, templatesRouter);
app.use('/api/branding', requireAuth, brandingRouter);
app.use('/api/students', requireAuth, studentsRouter);
app.use('/api/certificates', requireAuth, certificatesRouter);
app.use('/api/fonts', requireAuth, fontsRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
