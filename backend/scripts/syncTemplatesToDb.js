const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

const { initStorage, closeStorage } = require('../src/storage');

function shouldUseMysql() {
  return Boolean(
    process.env.MYSQL_URL ||
    process.env.DATABASE_URL ||
    process.env.MYSQL_HOST ||
    process.env.MYSQL_DATABASE
  );
}

async function main() {
  if (!shouldUseMysql()) {
    throw new Error('MySQL environment variables are not configured. Aborting template sync.');
  }

  const templatesPath = path.resolve(__dirname, '../data/templates.json');
  const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  const storage = await initStorage();
  const existingTemplates = await storage.listTemplates();
  const existingById = new Map(existingTemplates.map((template) => [template.id, template]));

  let created = 0;
  let updated = 0;

  for (const template of templates) {
    if (existingById.has(template.id)) {
      await storage.updateTemplate(template);
      updated += 1;
      continue;
    }

    await storage.createTemplate(template);
    created += 1;
  }

  console.log(JSON.stringify({
    synced: templates.length,
    updated,
    created,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeStorage();
  });