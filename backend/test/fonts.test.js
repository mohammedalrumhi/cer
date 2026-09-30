const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

test('fonts come from the bundled directory and the uploads directory together', () => {
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'cer-fonts-'));
  const bundled = path.resolve(__dirname, '../assets/fonts');
  fs.copyFileSync(path.join(bundled, 'Amiri-Regular.ttf'), path.join(uploads, 'Uploaded-Font.ttf'));

  const script = `
    const { listFontFiles, resolveBackendAssetPath } = require('./src/utils/storagePaths');
    const files = listFontFiles();
    console.log(JSON.stringify({
      names: files.map((f) => f.fileName),
      uploaded: resolveBackendAssetPath('assets/fonts/Uploaded-Font.ttf'),
      bundled: resolveBackendAssetPath('assets/fonts/Cairo-Bold.ttf'),
    }));
  `;
  const output = execFileSync(process.execPath, ['-e', script], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, FONTS_DIR: uploads, PERSISTENT_STORAGE_DIR: '' },
  }).toString();
  const result = JSON.parse(output);

  assert.ok(result.names.includes('Uploaded-Font.ttf'), 'uploaded font is listed');
  assert.ok(result.names.includes('Cairo-Bold.ttf'), 'bundled font is still listed');
  assert.equal(result.uploaded, path.join(uploads, 'Uploaded-Font.ttf'));
  assert.equal(result.bundled, path.join(bundled, 'Cairo-Bold.ttf'));
});
