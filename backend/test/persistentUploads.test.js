// Production (Hostinger) keeps uploads in PERSISTENT_STORAGE_DIR; the images shipped in
// backend/uploads (built-in backgrounds and frames) must still be served and rendered.
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.PERSISTENT_STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cer-persist-'));

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStorage } = require('../src/storage/memoryStorage');
const { findUploadFile, resolveBackendAssetPath, uploadsDir } = require('../src/utils/storagePaths');

const BUILT_IN = 'itqan-bg-gold-arabesque.png';

test('built-in images are found when uploads live in a persistent folder', async () => {
  assert.ok(uploadsDir.startsWith(process.env.PERSISTENT_STORAGE_DIR));
  assert.ok(findUploadFile(BUILT_IN), 'bundled file found');
  assert.ok(fs.existsSync(resolveBackendAssetPath(`uploads/${BUILT_IN}`)));

  const storage = createMemoryStorage({ users: [{ id: 'u', username: 'admin', password: 'admin123' }], templates: [] });
  const app = createApp({ storage });
  await request(app).get(`/uploads/${BUILT_IN}`).expect(200).expect('Content-Type', /png/);

  // A user's own upload in the persistent folder wins over a bundled file with the same name.
  fs.writeFileSync(path.join(uploadsDir, 'mine.txt'), 'x');
  assert.equal(findUploadFile('mine.txt'), path.join(uploadsDir, 'mine.txt'));
  assert.equal(findUploadFile('../package.json'), null, 'no path escapes');
});
