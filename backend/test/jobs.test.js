const os = require('os');
const path = require('path');
const fs = require('fs');

// Job output and records go to a throwaway data directory, never backend/data.
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cer-jobs-'));

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { PDFDocument } = require('pdf-lib');
const { createApp } = require('../src/app');
const { createMemoryStorage } = require('../src/storage/memoryStorage');

const TEMPLATE = {
  id: 'bulk',
  name: 'قالب الإصدار الجماعي',
  schemaVersion: 3,
  width: 1123,
  height: 794,
  background: { type: 'solid', color: '#ffffff', customLayout: true },
  elements: [
    { id: 'title', type: 'text', text: 'شهادة شكر وتقدير', x: 200, y: 100, width: 723, fontSize: 56, fontFamily: 'Cairo-Bold', fill: '#0f6b52', align: 'center' },
    { id: 'name', type: 'dynamicText', field: 'studentName', x: 150, y: 300, width: 823, fontSize: 48, fontFamily: 'Amiri-Regular', fill: '#9a6a2f', align: 'center', autoFit: { mode: 'shrink', minScale: 0.6 } },
    { id: 'title-word', type: 'dynamicText', field: 'recipientTitle', x: 150, y: 400, width: 823, fontSize: 28, fontFamily: 'Amiri-Regular', fill: '#1b2a23', align: 'center' },
    { id: 'serial', type: 'dynamicText', field: 'serial', x: 150, y: 700, width: 300, fontSize: 16, fontFamily: 'Cairo-Regular', fill: '#666666', align: 'right' },
    { id: 'qr', type: 'qrcode', value: '{{verifyUrl}}', x: 950, y: 600, width: 120, height: 120, color: '#000000', background: '#ffffff' },
  ],
};

async function setup() {
  const storage = createMemoryStorage({ users: [{ id: 'u', username: 'admin', password: 'admin123', name: 'مدير' }], templates: [TEMPLATE] });
  const app = createApp({ storage });
  const { body } = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  return { app, storage, auth: { Authorization: `Bearer ${body.token}` } };
}

async function waitFor(app, auth, id, timeoutMs = 120000) {
  const started = Date.now();
  const progress = [];
  for (;;) {
    const { body } = await request(app).get(`/api/jobs/${id}`).set(auth);
    progress.push(body.done);
    if (['done', 'failed', 'cancelled'].includes(body.status)) return { job: body, progress };
    if (Date.now() - started > timeoutMs) throw new Error(`job ${id} timed out at ${body.done}/${body.total}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

const names = (n) => Array.from({ length: n }, (_, i) => ({ name: `${i % 2 ? 'فاطمة' : 'عبدالله'} بن محمد بن سالم ${i + 1}`, gender: i % 3 === 0 ? 'female' : undefined }));

test('500 students render into one merged PDF with progress and bounded memory', async () => {
  const { app, auth } = await setup();
  const rssBefore = process.memoryUsage().rss;
  const started = Date.now();
  const { body: created } = await request(app).post('/api/jobs').set(auth).send({ templateId: 'bulk', students: names(500), output: 'pdf' }).expect(202);
  assert.equal(created.total, 500);
  const { job, progress } = await waitFor(app, auth, created.id);
  assert.equal(job.status, 'done', job.error);
  assert.equal(job.done, 500);
  assert.ok(progress.some((done) => done > 0 && done < 500), 'intermediate progress is reported');
  assert.ok(job.verification, 'a template printing {{verifyUrl}} turns verification on');
  const rssGrowth = (process.memoryUsage().rss - rssBefore) / 1024 / 1024;
  assert.ok(rssGrowth < 600, `memory grew by ${rssGrowth.toFixed(0)} MB`);
  console.log(`500 certificates in ${((Date.now() - started) / 1000).toFixed(1)} s, ${(job.size / 1024 / 1024).toFixed(1)} MB, rss +${rssGrowth.toFixed(0)} MB`);

  const download = await request(app).get(`/api/jobs/${job.id}/download`).set(auth).buffer(true).parse((res, cb) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  }).expect(200);
  const pdf = await PDFDocument.load(download.body);
  assert.equal(pdf.getPageCount(), 500);

  // Every certificate got a verifiable serial.
  const { body: verified } = await request(app).get(`/api/verify/${job.serials.last}`).expect(200);
  assert.equal(verified.valid, true);
  assert.match(verified.studentName, /500$/);
  await request(app).get('/api/verify/0000-000000').expect(404);
});

test('a ZIP job names files from the pattern and 2-up merges onto A4 sheets', async () => {
  const { app, auth } = await setup();
  const { body: zip } = await request(app).post('/api/jobs').set(auth).send({ templateId: 'bulk', students: names(3), output: 'zip', fileNamePattern: 'شهادة {{studentName}}', verification: false }).expect(202);
  const { job } = await waitFor(app, auth, zip.id);
  assert.equal(job.status, 'done', job.error);
  const { body: twoUp } = await request(app).post('/api/jobs').set(auth).send({ templateId: 'bulk', students: names(5), output: 'pdf', layout: '2up', verification: false }).expect(202);
  const done = (await waitFor(app, auth, twoUp.id)).job;
  const file = path.join(process.env.DATA_DIR, 'jobs', done.file);
  const pdf = await PDFDocument.load(fs.readFileSync(file));
  assert.equal(pdf.getPageCount(), 3, '5 certificates on 3 sheets');
  const { body: history } = await request(app).get('/api/jobs').set(auth).expect(200);
  assert.ok(history.length >= 2);
});

test('a running job can be cancelled', async () => {
  const { app, auth } = await setup();
  const { body: created } = await request(app).post('/api/jobs').set(auth).send({ templateId: 'bulk', students: names(400), output: 'pdf', verification: false }).expect(202);
  await new Promise((resolve) => setTimeout(resolve, 300));
  await request(app).post(`/api/jobs/${created.id}/cancel`).set(auth).expect(200);
  const { job } = await waitFor(app, auth, created.id);
  assert.equal(job.status, 'cancelled');
  assert.ok(job.done < 400);
});

test('PDF pages are real paper sizes, so printing at actual size never crops', async () => {
  const { renderCertificatesDocument } = require('../src/services/scenePdfRenderer');
  const mediaBox = (pdf) => pdf.toString('latin1').match(/\/MediaBox \[([^\]]+)\]/)[1].trim().split(/\s+/).map(Number).slice(2);
  const make = (width, height) => ({ id: 'p', width, height, background: { type: 'solid', color: '#fff' }, elements: [] });
  const near = ([w, h], [ew, eh]) => Math.abs(w - ew) < 1.5 && Math.abs(h - eh) < 1.5;
  assert.ok(near(mediaBox(await renderCertificatesDocument({ template: make(1123, 794), students: ['أ'] })), [842, 595]), 'A4 landscape');
  assert.ok(near(mediaBox(await renderCertificatesDocument({ template: make(1414, 2000), students: ['أ'] })), [595, 842]), 'high-res portrait → A4');
  assert.ok(near(mediaBox(await renderCertificatesDocument({ template: make(794, 559), students: ['أ'] })), [595.5, 419]), 'A5 stays A5');
  assert.ok(near(mediaBox(await renderCertificatesDocument({ template: make(1123, 794), students: ['أ', 'ب'], layout: '2up' })), [595.5, 842]), '2-up on A4');
});
