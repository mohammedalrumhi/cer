const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStorage } = require('../src/storage/memoryStorage');

const USERS = [{ id: 'admin-1', username: 'admin', password: 'admin123', name: 'مدير' }];
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function setup() {
  const storage = createMemoryStorage({
    users: USERS,
    templates: [{ id: 't1', name: 'قالبي', width: 1123, height: 794, background: { type: 'solid', color: '#fff', customLayout: true }, elements: [] }],
  });
  const app = createApp({ storage });
  const { body } = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  return { app, storage, auth: { Authorization: `Bearer ${body.token}` } };
}

test('saving with a stale baseVersion is a 409 conflict; a fresh one bumps the version', async () => {
  const { app, auth } = await setup();
  const { body: current } = await request(app).get('/api/templates/t1').set(auth).expect(200);
  assert.equal(current.version, 1);
  const { body: saved } = await request(app).put('/api/templates/t1').set(auth).send({ ...current, name: 'اسم جديد', baseVersion: 1 }).expect(200);
  assert.equal(saved.version, 2);
  assert.equal(saved.name, 'اسم جديد', 'user names are kept');
  const conflict = await request(app).put('/api/templates/t1').set(auth).send({ ...current, baseVersion: 1 }).expect(409);
  assert.equal(conflict.body.currentVersion, 2);
});

test('named versions can be listed, previewed and restored', async () => {
  const { app, auth } = await setup();
  const { body: v } = await request(app).post('/api/templates/t1/versions').set(auth).send({ name: 'قبل التعديل' }).expect(201);
  assert.equal(v.name, 'قبل التعديل');
  const { body: original } = await request(app).get('/api/templates/t1').set(auth);
  await request(app).put('/api/templates/t1').set(auth).send({ ...original, elements: [{ id: 'a', type: 'rect', x: 0, y: 0, width: 10, height: 10 }] }).expect(200);
  const { body: list } = await request(app).get('/api/templates/t1/versions').set(auth).expect(200);
  assert.ok(list.some((item) => item.id === v.id && item.kind === 'named'));
  assert.ok(list.every((item) => item.template === undefined), 'list has summaries only');
  const { body: detail } = await request(app).get(`/api/templates/t1/versions/${v.id}`).set(auth).expect(200);
  assert.equal(detail.template.elements.length, 0);
  const { body: restored } = await request(app).post(`/api/templates/t1/versions/${v.id}/restore`).set(auth).expect(200);
  assert.equal(restored.elements.length, 0);
  const { body: after } = await request(app).get('/api/templates/t1/versions').set(auth);
  assert.ok(after.some((item) => item.kind === 'beforeRestore'));
});

test('uploads library stores images as files with their size, and deletes them', async () => {
  const { app, auth } = await setup();
  const { body: asset } = await request(app).post('/api/assets').set(auth).attach('file', PNG_1X1, 'صورة.png').expect(201);
  assert.match(asset.path, /^uploads\//);
  assert.equal(asset.width, 1);
  assert.equal(asset.name, 'صورة.png');
  const { body: list } = await request(app).get('/api/assets').set(auth).expect(200);
  assert.equal(list.length, 1);
  await request(app).delete(`/api/assets/${asset.id}`).set(auth).expect(204);
  const { body: empty } = await request(app).get('/api/assets').set(auth);
  assert.equal(empty.length, 0);
});
