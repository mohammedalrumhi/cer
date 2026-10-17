const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const { dataDir } = require('../utils/storagePaths');
const { resolveTemplateWithBackgroundVariant } = require('../utils/templateVariants');
const { loadModel, loadSharedModule } = require('../shared');
const { prepareTemplate, renderCertificatesDocument } = require('./scenePdfRenderer');

/**
 * Bulk generation jobs. Hostinger has no Redis, so jobs run in-process, one at a time, and are
 * persisted as storage records ('jobs') so progress and history survive page reloads. Output files
 * live in <dataDir>/jobs. A job renders page by page, streams to disk (no huge in-memory buffers),
 * reports progress and checks for cancellation between pages.
 */

const JOB_DIR = path.join(dataDir, 'jobs');
const KEEP_JOBS = 40;
const KEEP_DAYS = 7;
const MAX_STUDENTS = 5000;

function sanitizeFileName(value, fallback) {
  const cleaned = String(value || '').replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  return cleaned || fallback;
}

/** Next serial numbers for this year: 2026-000001, 2026-000002… */
async function allocateSerials(storage, count) {
  const year = new Date().getFullYear();
  const id = `serial-${year}`;
  const counter = (await storage.getRecord('counters', id)) || { id, value: 0 };
  const start = Number(counter.value) || 0;
  await storage.putRecord('counters', { ...counter, value: start + count });
  return Array.from({ length: count }, (_, i) => `${year}-${String(start + i + 1).padStart(6, '0')}`);
}

/**
 * Issue serials for students (verification). Returns { serial, verifyUrl } per student and stores
 * one 'certificates' record per serial for /verify/:serial.
 */
async function issueCertificates(storage, { students, template, branding, origin, jobId = null }) {
  const serials = await allocateSerials(storage, students.length);
  const issuedAt = new Date().toISOString();
  const base = String(origin || '').replace(/\/+$/, '');
  const records = students.map((student, index) => ({
    id: serials[index],
    serial: serials[index],
    studentName: student.name,
    programName: student.programName || '',
    templateId: template.id,
    templateName: template.name || '',
    schoolName: branding?.schoolName || 'دار الإتقان العالي',
    issuedAt,
    jobId,
  }));
  if (storage.putRecords) await storage.putRecords('certificates', records);
  else for (const record of records) await storage.putRecord('certificates', record);
  return serials.map((serial) => ({ serial, verifyUrl: `${base}/verify/${encodeURIComponent(serial)}` }));
}

/** Does the template print a serial or a verification link? */
function usesVerification(template) {
  return (template.elements || []).some((el) => /\{\{\s*(serial|verifyUrl)\s*\}\}/.test(`${el.value || ''}${el.text || ''}${el.dynamicTextTemplate || ''}`) || (el.type === 'dynamicText' && ['serial', 'verifyUrl'].includes(el.field)));
}

function createJobRunner({ storage }) {
  const live = new Map(); // id → { cancelled }
  const queue = [];
  let running = false;

  async function save(job) {
    await storage.putRecord('jobs', job);
    return job;
  }

  async function cleanup() {
    const jobs = (await storage.listRecords('jobs')).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    for (const [index, job] of jobs.entries()) {
      if (index < KEEP_JOBS && new Date(job.createdAt).getTime() > cutoff) continue;
      if (job.file) fs.promises.unlink(path.join(JOB_DIR, job.file)).catch(() => {});
      await storage.deleteRecord('jobs', job.id);
    }
  }

  async function execute(job, spec) {
    const state = live.get(job.id);
    const isCancelled = () => state.cancelled;
    fs.mkdirSync(JOB_DIR, { recursive: true });
    const [model, scene] = await Promise.all([loadModel(), loadSharedModule('render/scene.js')]);
    const templates = await storage.listTemplates();
    const resolved = resolveTemplateWithBackgroundVariant(templates, spec.templateId, spec.backgroundVariantKey);
    if (!resolved) throw new Error('Template not found');
    // The wizard may print a template for the other group (students ↔ adult learners).
    const template = spec.audienceType ? { ...resolved, audienceType: spec.audienceType } : resolved;
    const branding = await storage.getBranding();
    const prepared = await prepareTemplate(template, branding);
    const students = spec.students;

    let extras = null;
    if (spec.verification) {
      extras = await issueCertificates(storage, { students, template, branding, origin: spec.origin, jobId: job.id });
      job.serials = { first: extras[0]?.serial, last: extras[extras.length - 1]?.serial };
    }
    const extraFor = extras ? (_student, index) => extras[index] : undefined;

    let lastSave = 0;
    const progress = async (done) => {
      job.done = done;
      if (Date.now() - lastSave > 700 || done === job.total) {
        lastSave = Date.now();
        await save(job);
      }
    };

    if (spec.output === 'zip') {
      job.file = `${job.id}.zip`;
      const output = fs.createWriteStream(path.join(JOB_DIR, job.file));
      const archive = archiver('zip', { zlib: { level: 6 } });
      const finished = new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
      });
      archive.pipe(output);
      const used = new Map();
      const recipient = { title: model.getRecipientTitleForTemplate, sentence: model.getRecipientAchievementSentenceForTemplate };
      for (let index = 0; index < students.length; index += 1) {
        if (isCancelled()) break;
        const student = students[index];
        const pdf = await renderCertificatesDocument({ prepared, students: [student], extraFor: extras ? () => extras[index] : undefined });
        const values = model.buildFieldValues(student, branding, template, recipient, extras ? extras[index] : undefined);
        let name = sanitizeFileName(scene.renderTextTemplate(spec.fileNamePattern, values, 'studentName'), `شهادة-${index + 1}`);
        const count = (used.get(name) || 0) + 1;
        used.set(name, count);
        if (count > 1) name = `${name} (${count})`;
        archive.append(pdf, { name: `${name}.pdf` });
        await progress(index + 1);
      }
      await archive.finalize();
      await finished;
    } else {
      job.file = `${job.id}.pdf`;
      const output = fs.createWriteStream(path.join(JOB_DIR, job.file));
      await renderCertificatesDocument({
        prepared,
        students,
        layout: spec.layout === '2up' ? '2up' : '1up',
        extraFor,
        output,
        onProgress: (done) => { progress(done); },
        isCancelled,
      });
    }

    if (isCancelled()) {
      fs.promises.unlink(path.join(JOB_DIR, job.file)).catch(() => {});
      return { ...job, status: 'cancelled', file: null, finishedAt: new Date().toISOString() };
    }
    const size = fs.statSync(path.join(JOB_DIR, job.file)).size;
    return { ...job, status: 'done', done: students.length, size, finishedAt: new Date().toISOString() };
  }

  async function pump() {
    if (running) return;
    running = true;
    while (queue.length) {
      const { job, spec } = queue.shift();
      const started = { ...job, status: 'running', startedAt: new Date().toISOString() };
      await save(started);
      try {
        await save(await execute(started, spec));
      } catch (error) {
        console.error('job failed', error);
        await save({ ...started, status: 'failed', error: error.message, finishedAt: new Date().toISOString() });
      } finally {
        live.delete(job.id);
      }
    }
    running = false;
  }

  return {
    /** Validate and queue a job; returns the stored job. */
    async create(input, { origin } = {}) {
      const model = await loadModel();
      const students = (Array.isArray(input.students) ? input.students : []).map((s) => model.normalizeStudent(s)).filter(Boolean);
      if (!input.templateId) throw Object.assign(new Error('templateId is required'), { status: 400 });
      if (!students.length) throw Object.assign(new Error('students are required'), { status: 400 });
      if (students.length > MAX_STUDENTS) throw Object.assign(new Error(`At most ${MAX_STUDENTS} students per job`), { status: 400 });
      const templates = await storage.listTemplates();
      const template = resolveTemplateWithBackgroundVariant(templates, input.templateId, input.backgroundVariantKey);
      if (!template) throw Object.assign(new Error('Template not found'), { status: 404 });
      const spec = {
        templateId: input.templateId,
        backgroundVariantKey: input.backgroundVariantKey || null,
        audienceType: ['student', 'adult'].includes(input.audienceType) ? input.audienceType : null,
        students,
        output: input.output === 'zip' ? 'zip' : 'pdf',
        layout: input.layout === '2up' ? '2up' : '1up',
        fileNamePattern: String(input.fileNamePattern || '{{studentName}}').slice(0, 200),
        verification: input.verification === undefined ? usesVerification(template) : Boolean(input.verification),
        origin: process.env.PUBLIC_BASE_URL || origin || '',
      };
      const job = {
        id: uuidv4(),
        status: 'queued',
        templateId: spec.templateId,
        templateName: template.name || '',
        output: spec.output,
        layout: spec.layout,
        verification: spec.verification,
        total: students.length,
        done: 0,
        fileName: sanitizeFileName(input.fileName, spec.output === 'zip' ? 'شهادات' : 'شهادات-مدمجة'),
        createdAt: new Date().toISOString(),
      };
      await save(job);
      live.set(job.id, { cancelled: false });
      queue.push({ job, spec });
      cleanup().catch(() => {});
      setImmediate(pump);
      return job;
    },
    get: (id) => storage.getRecord('jobs', id),
    async list() {
      return (await storage.listRecords('jobs')).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },
    async cancel(id) {
      const state = live.get(id);
      if (state) state.cancelled = true;
      const index = queue.findIndex((item) => item.job.id === id);
      if (index >= 0) {
        const [{ job }] = queue.splice(index, 1);
        live.delete(id);
        return save({ ...job, status: 'cancelled', finishedAt: new Date().toISOString() });
      }
      return storage.getRecord('jobs', id);
    },
    filePath(job) {
      return job?.file ? path.join(JOB_DIR, job.file) : null;
    },
    async remove(id) {
      const job = await storage.getRecord('jobs', id);
      if (!job) return false;
      if (live.has(id)) live.get(id).cancelled = true;
      if (job.file) fs.promises.unlink(path.join(JOB_DIR, job.file)).catch(() => {});
      return storage.deleteRecord('jobs', id);
    },
  };
}

module.exports = { createJobRunner, issueCertificates, usesVerification };
