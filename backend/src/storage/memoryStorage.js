function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMemoryStorage(seed = {}) {
  const state = {
    branding: clone(seed.branding || { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' }),
    students: clone(seed.students || []),
    templates: clone(seed.templates || []),
    users: clone(seed.users || []),
  };

  return {
    async initialize() {},
    async close() {},
    async getMode() { return 'memory'; },
    async getBranding() { return clone(state.branding); },
    async updateBranding(patch) {
      state.branding = { ...state.branding, ...patch };
      return clone(state.branding);
    },
    async updateBrandingAsset(fieldKey, assetPath) {
      state.branding = { ...state.branding, [fieldKey]: assetPath };
      return clone(state.branding);
    },
    async listStudents() { return clone(state.students); },
    async addStudents(students) {
      state.students = [...state.students, ...clone(students)];
      return clone(state.students);
    },
    async updateStudent(student) {
      const index = state.students.findIndex((item) => item.id === student.id);
      if (index < 0) return null;
      state.students[index] = clone(student);
      return clone(state.students[index]);
    },
    async deleteStudent(id) {
      const next = state.students.filter((item) => item.id !== id);
      if (next.length === state.students.length) return false;
      state.students = next;
      return true;
    },
    async listTemplates() { return clone(state.templates); },
    async createTemplate(template) {
      state.templates.push(clone(template));
      return clone(template);
    },
    async updateTemplate(template) {
      const index = state.templates.findIndex((item) => item.id === template.id);
      if (index < 0) return null;
      state.templates[index] = clone(template);
      return clone(template);
    },
    async deleteTemplate(id) {
      const next = state.templates.filter((item) => item.id !== id);
      if (next.length === state.templates.length) return false;
      state.templates = next;
      return true;
    },
    async findUserByCredentials(username, password) {
      const user = state.users.find((item) => item.username === username && item.password === password);
      return user ? clone(user) : null;
    },
  };
}

module.exports = {
  createMemoryStorage,
};