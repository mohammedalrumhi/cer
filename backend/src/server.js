const express = require('express');
const cors = require('cors');
const path = require('path');

const templatesRouter = require('./routes/templates');
const brandingRouter = require('./routes/branding');
const studentsRouter = require('./routes/students');
const certificatesRouter = require('./routes/certificates');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/templates', templatesRouter);
app.use('/api/branding', brandingRouter);
app.use('/api/students', studentsRouter);
app.use('/api/certificates', certificatesRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
