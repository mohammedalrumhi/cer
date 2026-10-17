import axios from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';
const fallbackApiBase = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:4000';
const rawApiBase = import.meta.env.VITE_API_BASE || fallbackApiBase;
const normalizedApiBase = String(rawApiBase).replace(/\/+$/, '');
export const API_BASE = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function buildAssetUrl(assetPath) {
  if (!assetPath) return '';
  if (/^(https?:|data:|blob:)/i.test(assetPath)) return assetPath;
  const cleanPath = String(assetPath).replace(/^\/+/, '');
  return `${API_ORIGIN}/${cleanPath}`;
}

function getFilenameFromDisposition(contentDisposition, fallbackName) {
  if (!contentDisposition) return fallbackName;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return simpleMatch?.[1] || fallbackName;
}

export const api = axios.create({
  baseURL: API_BASE,
});

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export async function loginRequest({ username, password }) {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function fetchTemplates() {
  const { data } = await api.get('/templates');
  return data;
}

export async function fetchTemplate(id) {
  const { data } = await api.get(`/templates/${id}`);
  return data;
}

export async function createTemplate(payload) {
  const { data } = await api.post('/templates', payload);
  return data;
}

export async function updateTemplate(id, payload) {
  const { data } = await api.put(`/templates/${id}`, payload);
  return data;
}

export async function removeTemplate(id) {
  await api.delete(`/templates/${id}`);
}

export async function fetchBranding() {
  const { data } = await api.get('/branding');
  return data;
}

export async function updateBranding(payload) {
  const { data } = await api.put('/branding', payload);
  return data;
}

export async function uploadLogo(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/branding/logo', formData);
  return data;
}

export async function uploadSignature(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/branding/signature', formData);
  return data;
}

export async function uploadStamp(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/branding/stamp', formData);
  return data;
}

export async function parseExcel(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/students/parse-excel', formData);
  return data.students || [];
}

export async function downloadTemplate() {
  const response = await api.get('/template/students', {
    responseType: 'blob',
  });
  const filename = 'students-template.xlsx';
  return { blob: response.data, filename };
}

export async function fetchStudents() {
  const { data } = await api.get('/students');
  return data;
}

export async function fetchFonts() {
  const { data } = await api.get('/fonts');
  return Array.isArray(data) ? data : [];
}

export async function uploadFontFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/fonts', formData);
  return data;
}

export async function uploadTemplateDesign(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/templates/design-upload', formData);
  return data;
}

export async function saveStudents(students) {
  const { data } = await api.post('/students', { students });
  return data.students || [];
}

export async function updateStudent(id, payload) {
  const { data } = await api.put(`/students/${id}`, payload);
  return data;
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}`);
}

export async function generateCertificates(payload) {
  const response = await api.post('/certificates/generate', payload, {
    responseType: 'blob',
  });

  const studentCount = Array.isArray(payload?.students) ? payload.students.length : 0;
  const defaultFileName = studentCount > 1 ? 'certificates.zip' : 'certificate.pdf';
  const contentType = response.headers['content-type'] || response.data?.type || '';
  const fallbackByType = contentType.includes('zip') ? 'certificates.zip' : defaultFileName;

  return {
    blob: response.data,
    filename: getFilenameFromDisposition(response.headers['content-disposition'], fallbackByType),
    contentType,
  };
}

export async function previewTemplate(payload) {
  const response = await api.post('/certificates/preview', payload, {
    responseType: 'blob',
  });
  return response.data;
}

/* ── Studio: assets, versions, conflict-aware saves ─────────────────────────── */

export async function fetchAssets() {
  const { data } = await api.get('/assets');
  return Array.isArray(data) ? data : [];
}

export async function uploadAsset(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/assets', formData);
  return data;
}

export async function deleteAsset(id) {
  await api.delete(`/assets/${encodeURIComponent(id)}`);
}

/** Save with optimistic concurrency: rejects with `{ conflict: true, currentVersion }` on 409. */
export async function saveTemplate(id, template, baseVersion) {
  try {
    const { data } = await api.put(`/templates/${id}`, { ...template, baseVersion });
    return data;
  } catch (error) {
    if (error?.response?.status === 409) {
      const conflict = new Error('conflict');
      conflict.conflict = true;
      conflict.currentVersion = error.response.data?.currentVersion;
      throw conflict;
    }
    throw error;
  }
}

export async function fetchVersions(templateId) {
  const { data } = await api.get(`/templates/${templateId}/versions`);
  return data;
}

export async function createVersion(templateId, name) {
  const { data } = await api.post(`/templates/${templateId}/versions`, { name });
  return data;
}

export async function fetchVersion(templateId, versionId) {
  const { data } = await api.get(`/templates/${templateId}/versions/${versionId}`);
  return data;
}

export async function restoreVersion(templateId, versionId) {
  const { data } = await api.post(`/templates/${templateId}/versions/${versionId}/restore`);
  return data;
}

export async function fetchBackgrounds() {
  const { data } = await api.get('/backgrounds');
  return Array.isArray(data) ? data : [];
}

/* ── Bulk generation ─────────────────────────────────────────────────────── */

export async function parseSheet(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/students/parse-sheet', formData);
  return data;
}

export async function createJob(payload) {
  const { data } = await api.post('/jobs', payload);
  return data;
}

export async function fetchJob(id) {
  const { data } = await api.get(`/jobs/${id}`);
  return data;
}

export async function fetchJobs() {
  const { data } = await api.get('/jobs');
  return Array.isArray(data) ? data : [];
}

export async function cancelJob(id) {
  const { data } = await api.post(`/jobs/${id}/cancel`);
  return data;
}

export async function deleteJob(id) {
  await api.delete(`/jobs/${id}`);
}

export async function downloadJob(job) {
  const response = await api.get(`/jobs/${job.id}/download`, { responseType: 'blob' });
  const ext = job.output === 'zip' ? 'zip' : 'pdf';
  return { blob: response.data, filename: getFilenameFromDisposition(response.headers['content-disposition'], `${job.fileName || 'certificates'}.${ext}`) };
}

export async function issueSerials(templateId, students) {
  const { data } = await api.post('/certificates/serials', { templateId, students });
  return data;
}

/** Public: no auth token needed (and a 401 must not redirect to the login page). */
export async function verifyCertificate(serial) {
  const response = await fetch(`${API_BASE}/verify/${encodeURIComponent(serial)}`);
  if (response.status === 404) return { valid: false };
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
