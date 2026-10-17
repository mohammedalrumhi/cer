// One-off migration: move base64 images out of stored templates into upload files.
//   node scripts/extractInlineImages.js
// Uses the configured storage (MySQL or JSON files). Templates without inline images are untouched.
const path = require('path');
const dotenv = require('dotenv');

for (const file of [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '../.env')]) dotenv.config({ path: file, override: false });

const { initStorage, closeStorage } = require('../src/storage');
const { extractInlineImages } = require('../src/utils/inlineImages');

(async () => {
  const storage = await initStorage();
  let changed = 0;
  for (const template of await storage.listTemplates()) {
    const { template: next, extracted } = extractInlineImages(template);
    if (!extracted) continue;
    await storage.updateTemplate(next);
    changed += 1;
    console.log(`${template.id}: ${extracted} image(s) moved to uploads/`);
  }
  console.log(changed ? `Done: ${changed} template(s) updated.` : 'No inline images found.');
  await closeStorage();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
