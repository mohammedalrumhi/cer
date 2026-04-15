import axios from 'axios';

const AUTH_TOKEN_KEY = 'auth_token';
const rawApiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const normalizedApiBase = String(rawApiBase).replace(/\/+$/, '');
export const API_BASE = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function buildAssetUrl(assetPath) {
  if (!assetPath) return '';
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
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
