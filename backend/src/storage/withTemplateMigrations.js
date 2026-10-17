const { loadModel } = require('../shared');
const { extractInlineImages } = require('../utils/inlineImages');

/**
 * Wraps any storage implementation so templates are always upgraded to the current schema:
 * on read (old rows keep loading) and on write (new rows are stored upgraded).
 * Stored data is never rewritten just because it was read.
 */
function withTemplateMigrations(storage) {
  if (storage.__withTemplateMigrations) return storage;

  async function migrate(template) {
    const { migrateTemplate } = await loadModel();
    return migrateTemplate(template);
  }

  return {
    ...storage,
    __withTemplateMigrations: true,
    async listTemplates() {
      const templates = await storage.listTemplates();
      return Promise.all(templates.map(migrate));
    },
    async createTemplate(template) {
      return storage.createTemplate(extractInlineImages(await migrate(template)).template);
    },
    async updateTemplate(template) {
      return storage.updateTemplate(extractInlineImages(await migrate(template)).template);
    },
  };
}

module.exports = {
  withTemplateMigrations,
};
