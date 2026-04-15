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
