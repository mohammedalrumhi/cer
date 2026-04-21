const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStorage } = require('../src/storage/memoryStorage');
const { readJson } = require('../src/utils/fileDb');

function createSeededApp() {
  const templates = readJson('templates.json', []).filter((template) => [
    'itqan-template-5-students',
    'itqan-template-5-adults',
  ].includes(template.id) || template.detailLevel === 'simple' || template.audienceType === 'student');

  const storage = createMemoryStorage({
    users: [
      { id: 'admin-1', username: 'admin', password: 'admin123', name: 'مدير النظام' },
    ],
    branding: {
      schoolName: 'دار الإتقان العالي',
      logoPath: 'uploads/itqan-logo.png',
      signaturePath: 'uploads/itqan-signature.png',
      stampPath: 'uploads/itqan-stamp.png',
    },
    students: [],
    templates,
  });

  return { app: createApp({ storage }), storage };
}

async function loginAndGetToken(app) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
    .expect(200);

  assert.ok(response.body.token);
  return response.body.token;
}

test('health route reports active storage mode', async () => {
  const { app } = createSeededApp();
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.storage, 'memory');
});

test('auth login returns token for valid credentials', async () => {
  const { app } = createSeededApp();
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' })
    .expect(200);

  assert.equal(response.body.user.username, 'admin');
  assert.ok(response.body.token);
});

test('templates endpoint exposes one detailed template with selectable color variants', async () => {
  const { app } = createSeededApp();
  const token = await loginAndGetToken(app);

  const response = await request(app)
    .get('/api/templates')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  const detailedStudentTemplate = response.body.find((template) => template.id === 'itqan-template-5-students');
  assert.ok(detailedStudentTemplate);
  assert.equal(detailedStudentTemplate.name, 'مفصل - الطلاب');
  assert.ok(Array.isArray(detailedStudentTemplate.availableBackgroundVariants));
  assert.ok(detailedStudentTemplate.availableBackgroundVariants.some((variant) => variant.label === 'أخضر زمردي'));
  assert.ok(detailedStudentTemplate.availableBackgroundVariants.some((variant) => variant.label === 'كهرماني'));
  assert.equal(response.body.some((template) => template.id === 'itqan-template-5-emerald-students'), false);
});

test('branding can be fetched and updated', async () => {
  const { app } = createSeededApp();
  const token = await loginAndGetToken(app);

  const getResponse = await request(app)
    .get('/api/branding')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  assert.equal(getResponse.body.schoolName, 'دار الإتقان العالي');

  const updateResponse = await request(app)
    .put('/api/branding')
    .set('Authorization', `Bearer ${token}`)
    .send({ schoolName: 'دار اختبار الإتقان' })
    .expect(200);

  assert.equal(updateResponse.body.schoolName, 'دار اختبار الإتقان');
});

test('students CRUD keeps deduplicated saved data', async () => {
  const { app } = createSeededApp();
  const token = await loginAndGetToken(app);

  const createResponse = await request(app)
    .post('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .send({
      students: [
        { name: 'محمد أحمد', recitalType: 'نص كامل' },
        { name: 'محمد أحمد', recitalType: 'نص كامل' },
      ],
    })
    .expect(201);

  assert.equal(createResponse.body.students.length, 1);
  const studentId = createResponse.body.students[0].id;

  const updateResponse = await request(app)
    .put(`/api/students/${studentId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ teacherName: 'الأستاذ خالد', name: 'محمد أحمد' })
    .expect(200);

  assert.equal(updateResponse.body.teacherName, 'الأستاذ خالد');

  await request(app)
    .delete(`/api/students/${studentId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204);

  const listResponse = await request(app)
    .get('/api/students')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  assert.equal(listResponse.body.length, 0);
});

test('certificate generation returns a PDF for one student', async () => {
  const { app, storage } = createSeededApp();
  const token = await loginAndGetToken(app);
  const templates = await storage.listTemplates();
  const template = templates.find((item) => item.id === 'itqan-template-5-students') || templates[0];

  const response = await request(app)
    .post('/api/certificates/generate')
    .set('Authorization', `Bearer ${token}`)
    .send({
      templateId: template.id,
      backgroundVariantKey: 'emerald',
      students: [{ name: 'طالب تجريبي' }],
    })
    .expect(200);

  assert.match(String(response.headers['content-type'] || ''), /pdf/i);
  assert.ok(response.body.length > 100);
});