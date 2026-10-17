const { readJson, writeJson } = require('../utils/fileDb');

const BRANDING_EMPTY = { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const safeName = (value) => String(value).replace(/[^\p{L}\p{N}_-]+/gu, '_');

/** Records live in data/records/<collection>.json, or one file per owner when they have one. */
function recordFile(collection, ownerId) {
  return ownerId ? `records/${safeName(collection)}/${safeName(ownerId)}.json` : `records/${safeName(collection)}.json`;
}

function createFileStorage() {
  // id → ownerId for owned collections, so getRecord/deleteRecord find the right shard.
  const owners = new Map();

  function locate(collection, id) {
    const key = `${collection}:${id}`;
    if (owners.has(key)) return owners.get(key);
    return undefined;
  }

  return {
    async initialize() {},
    async close() {},
    async getMode() { return 'file'; },
    async getBranding() {
      return clone(readJson('branding.json', BRANDING_EMPTY));
    },
    async updateBranding(patch) {
      const next = {
        ...readJson('branding.json', BRANDING_EMPTY),
        ...patch,
      };
      writeJson('branding.json', next, BRANDING_EMPTY);
      return clone(next);
    },
    async updateBrandingAsset(fieldKey, assetPath) {
      const next = {
        ...readJson('branding.json', BRANDING_EMPTY),
        [fieldKey]: assetPath,
      };
      writeJson('branding.json', next, BRANDING_EMPTY);
      return clone(next);
    },
    async listStudents() {
      return clone(readJson('students.json', []));
    },
    async addStudents(students) {
      const current = readJson('students.json', []);
      const next = [...current, ...students];
      writeJson('students.json', next, []);
      return clone(next);
    },
    async updateStudent(student) {
      const current = readJson('students.json', []);
      const index = current.findIndex((item) => item.id === student.id);
      if (index < 0) return null;
      current[index] = student;
      writeJson('students.json', current, []);
      return clone(student);
    },
    async deleteStudent(id) {
      const current = readJson('students.json', []);
      const next = current.filter((item) => item.id !== id);
      if (next.length === current.length) return false;
      writeJson('students.json', next, []);
      return true;
    },
    async listTemplates() {
      return clone(readJson('templates.json', []));
    },
    async createTemplate(template) {
      const current = readJson('templates.json', []);
      current.push(template);
      writeJson('templates.json', current, []);
      return clone(template);
    },
    async updateTemplate(template) {
      const current = readJson('templates.json', []);
      const index = current.findIndex((item) => item.id === template.id);
      if (index < 0) return null;
      current[index] = template;
      writeJson('templates.json', current, []);
      return clone(template);
    },
    async deleteTemplate(id) {
      const current = readJson('templates.json', []);
      const next = current.filter((item) => item.id !== id);
      if (next.length === current.length) return false;
      writeJson('templates.json', next, []);
      return true;
    },
    async listRecords(collection, { ownerId } = {}) {
      const records = readJson(recordFile(collection, ownerId), []);
      for (const record of records) owners.set(`${collection}:${record.id}`, record.ownerId);
      return clone(ownerId === undefined ? records : records.filter((record) => record.ownerId === ownerId));
    },
    async getRecord(collection, id, { ownerId } = {}) {
      const owner = ownerId ?? locate(collection, id);
      const records = readJson(recordFile(collection, owner), []);
      const record = records.find((item) => item.id === id);
      return record ? clone(record) : null;
    },
    async putRecord(collection, record) {
      const file = recordFile(collection, record.ownerId);
      const records = readJson(file, []);
      const index = records.findIndex((item) => item.id === record.id);
      if (index >= 0) records[index] = record;
      else records.push(record);
      writeJson(file, records, []);
      owners.set(`${collection}:${record.id}`, record.ownerId);
      return clone(record);
    },
    /** Many records in one write per file (bulk certificate issuing). */
    async putRecords(collection, records) {
      const byFile = new Map();
      for (const record of records) {
        const file = recordFile(collection, record.ownerId);
        if (!byFile.has(file)) byFile.set(file, []);
        byFile.get(file).push(record);
      }
      for (const [file, list] of byFile) {
        const current = readJson(file, []);
        const index = new Map(current.map((item, i) => [item.id, i]));
        for (const record of list) {
          if (index.has(record.id)) current[index.get(record.id)] = record;
          else current.push(record);
          owners.set(`${collection}:${record.id}`, record.ownerId);
        }
        writeJson(file, current, []);
      }
      return records.length;
    },
    async deleteRecord(collection, id, { ownerId } = {}) {
      const owner = ownerId ?? locate(collection, id);
      const file = recordFile(collection, owner);
      const records = readJson(file, []);
      const next = records.filter((item) => item.id !== id);
      if (next.length === records.length) return false;
      writeJson(file, next, []);
      return true;
    },
    async findUserByCredentials(username, password) {
      const users = readJson('users.json', []);
      const user = users.find((item) => item.username === username && item.password === password);
      return user ? clone(user) : null;
    },
  };
}

module.exports = {
  createFileStorage,
};