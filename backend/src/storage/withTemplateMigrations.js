const { loadModel } = require('../shared');

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
      return storage.createTemplate(await migrate(template));
    },
    async updateTemplate(template) {
      return storage.updateTemplate(await migrate(template));
    },
  };
}

module.exports = {
  withTemplateMigrations,
};
