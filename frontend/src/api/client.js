import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:4000/api',
});

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
  return response.data;
}

export async function previewTemplate(payload) {
  const response = await api.post('/certificates/preview', payload, {
    responseType: 'blob',
  });
  return response.data;
}
