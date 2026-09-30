const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStorage } = require('../src/storage/memoryStorage');
const { readJson } = require('../src/utils/fileDb');
const { loadModel } = require('../src/shared');

const USERS = [{ id: 'admin-1', username: 'admin', password: 'admin123', name: 'مدير النظام' }];

async function setup(templates) {
  const storage = createMemoryStorage({ users: USERS, templates });
  const app = createApp({ storage });
  const { body } = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  return { app, storage, auth: { Authorization: `Bearer ${body.token}` } };
}

test('every seeded template migrates to the current schema, validates, and keeps its elements', async () => {
  const { migrateTemplate, validateTemplate, CURRENT_SCHEMA_VERSION } = await loadModel();
  const templates = readJson('templates.json', []);
  assert.ok(templates.length > 0);

  for (const template of templates) {
    const migrated = migrateTemplate(template);
    assert.equal(migrated.schemaVersion, CURRENT_SCHEMA_VERSION, template.id);
    assert.deepEqual(validateTemplate(migrated), [], template.id);
    const originalIds = template.elements.map((el) => el.id);
    for (const id of originalIds) {
      assert.ok(migrated.elements.some((el) => el.id === id || el.id.startsWith(`${id}-`)), `${template.id} lost ${id}`);
    }
  }
});

test('API serves stored v1 templates upgraded, without rewriting storage on read', async () => {
  const legacy = {
    id: 'legacy-1', name: 'قديم', orientation: 'landscape', width: 1123, height: 794,
    background: { type: 'solid', color: '#fff', accentColor: '#0f4a3c' },
    elements: [{ id: 'name', type: 'dynamicText', field: 'studentName', x: 10, y: 20 }],
  };
  const { app, storage, auth } = await setup([legacy]);

  const { body } = await request(app).get('/api/templates/legacy-1').set(auth).expect(200);
  assert.equal(body.schemaVersion, 2);
  assert.equal(body.elements.length, 6, 'legacy background decoration becomes 5 editable elements');
  assert.equal(body.elements[5].id, 'name');
  assert.deepEqual(body.elements[5].autoFit, { mode: 'shrink', minScale: 0.72, minFontSize: 12 });

  const [stored] = await storage.listTemplates();
  assert.equal(stored.schemaVersion, undefined, 'reading must not persist anything');
});

test('saving stores the upgraded template and preserves unknown fields', async () => {
  const { app, storage, auth } = await setup([]);
  const created = await request(app).post('/api/templates').set(auth)
    .send({ name: 'جديد', elements: [{ id: 'r', type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '', vendorFlag: 'keep' }] })
    .expect(201);

  const saved = (await storage.listTemplates())[0];
  assert.equal(saved.schemaVersion, 2);
  const rect = saved.elements.find((el) => el.id === 'r');
  assert.equal(rect.fill, null);
  assert.equal(rect.vendorFlag, 'keep');

  await request(app).put(`/api/templates/${created.body.id}`).set(auth)
    .send({ ...saved, elements: [...saved.elements, { id: 't', type: 'text', text: 'نص', x: 1, y: 2 }] })
    .expect(200);
  const updated = (await storage.listTemplates())[0];
  assert.deepEqual(updated.elements.at(-1), { id: 't', type: 'text', text: 'نص', x: 1, y: 2 }, 'v2 payloads are stored as sent');
  assert.equal(updated.schemaVersion, 2);
});

test('creating a template keeps client metadata such as audienceType and schemaVersion', async () => {
  const { app, auth } = await setup([]);
  const { body } = await request(app).post('/api/templates').set(auth)
    .send({ name: 'x', audienceType: 'adult', schemaVersion: 2, background: { type: 'solid', color: '#fff' }, elements: [] })
    .expect(201);
  assert.equal(body.audienceType, 'adult');
  assert.equal(body.schemaVersion, 2);
  assert.equal(body.elements.length, 0, 'a v2 payload is not re-migrated (no legacy decoration added)');
});

test('MySQL storage round-trips non-column template fields through extra_json', async () => {
  const mysql = require('mysql2/promise');
  const originalCreatePool = mysql.createPool;
  const rows = new Map();
  const queries = [];

  mysql.createPool = () => ({
    async query(sql, params = []) {
      queries.push(sql);
      if (/^\s*INSERT INTO templates/.test(sql)) {
        const [id, name, orientation, width, height, background, elements, created, updated, detail, audience, extra] = params;
        assert.equal(params.length, 12);
        rows.set(id, { id, name, orientation, width, height, background_json: background, elements_json: elements, created_at: created, updated_at: updated, detail_level: detail, audience_type: audience, extra_json: extra });
        return [{ affectedRows: 1 }];
      }
      if (/^\s*SELECT \* FROM templates/.test(sql)) return [[...rows.values()]];
      return [[]];
    },
    async end() {},
  });

  try {
    delete require.cache[require.resolve('../src/storage/mysqlStorage')];
    const { createMysqlStorage } = require('../src/storage/mysqlStorage');
    const storage = createMysqlStorage();
    await storage.createTemplate({
      id: 'm1', name: 'x', orientation: 'landscape', width: 10, height: 10, background: {}, elements: [],
      createdAt: 'a', updatedAt: 'b', schemaVersion: 2, settings: { digits: 'arab' }, availableBackgroundVariants: [{ key: 'x' }],
    });
    const [loaded] = await storage.listTemplates();
    assert.equal(loaded.schemaVersion, 2);
    assert.deepEqual(loaded.settings, { digits: 'arab' });
    assert.equal(loaded.availableBackgroundVariants, undefined, 'computed fields are not persisted');
  } finally {
    mysql.createPool = originalCreatePool;
    delete require.cache[require.resolve('../src/storage/mysqlStorage')];
  }
});
