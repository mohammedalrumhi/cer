// Starts the backend for browser tests: JSON storage on a throwaway copy of backend/data,
// never MySQL and never the developer's real data.
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = mkdtempSync(path.join(tmpdir(), 'cer-e2e-'));
cpSync(path.join(root, 'backend/data'), dataDir, { recursive: true });

for (const key of ['MYSQL_URL', 'DATABASE_URL', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD', 'PERSISTENT_STORAGE_DIR']) {
  process.env[key] = '';
}
Object.assign(process.env, {
  DATA_DIR: dataDir,
  UPLOADS_DIR: path.join(root, 'backend/uploads'),
  FONTS_DIR: path.join(root, 'backend/assets/fonts'),
  PORT: process.env.E2E_BACKEND_PORT || '4310',
  AUTH_TOKEN_SECRET: 'e2e-secret',
});

createRequire(import.meta.url)(path.join(root, 'backend/src/server.js'));
