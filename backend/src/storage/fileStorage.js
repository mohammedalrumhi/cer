const { readJson, writeJson } = require('../utils/fileDb');

const BRANDING_EMPTY = { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFileStorage() {
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