import { elementToOp, placeholderTokens, requiredFontKeys } from '@shared/render/index.js';
import { migrateTemplate, nameKey } from '@shared/model/index.js';
import { buildPreviewValues } from '../editor/model/sampleData';
import { ensureFonts, loadRenderKit } from '../editor/render/renderKit';

/** Fields the system fills itself (never "missing"). */
const AUTOMATIC = new Set(['recipientTitle', 'recipientAchievementSentence', 'date', 'dateLabel', 'issueDate', 'issueDateLabel', 'schoolName', 'serial', 'verifyUrl', 'value']);

/** Student fields a template prints: bound fields and {{tokens}} in texts, codes and file names. */
export function templateFields(template) {
  const fields = new Set();
  for (const el of template.elements || []) {
    if (el.visible === false) continue;
    if (el.type === 'dynamicText') {
      if (el.dynamicTextTemplate) placeholderTokens(el.dynamicTextTemplate).forEach((t) => fields.add(t));
      else if (el.field) fields.add(el.field);
    }
    for (const key of ['text', 'value', 'dynamicTextTemplate']) if (el.type !== 'dynamicText' && el[key]) placeholderTokens(el[key]).forEach((t) => fields.add(t));
  }
  return [...fields].filter((field) => !AUTOMATIC.has(field));
}

/** The value a student has for a field (core key, custom column, or the name). */
export function studentValue(student, field) {
  if (field === 'studentName' || field === 'name') return student.name || '';
  if (student[field] !== undefined && student[field] !== null) return String(student[field]);
  return student.fields?.[field] ?? '';
}

/** Text elements whose content depends on the student (checked for overflow). */
function boundTexts(template) {
  return (template.elements || []).filter((el) => el.visible !== false && (el.type === 'dynamicText' || (el.type === 'text' && String(el.text || '').includes('{{'))));
}

/**
 * Pre-flight checks with the real layout engine (same as the PDF):
 *  - missing: a field the template prints is empty;
 *  - overflow: text no longer fits even after shrinking;
 *  - shrunk: text was made smaller to fit (informational);
 *  - wrapped: text took more lines than with the sample data (may overlap what's below);
 *  - duplicate: the same name appears more than once.
 * Runs in chunks so 500 rows don't freeze the page. `onProgress(done, total)`.
 */
export async function runPreflight(rawTemplate, students, branding, { onProgress, signal } = {}) {
  const template = migrateTemplate(rawTemplate);
  const kit = await loadRenderKit();
  await ensureFonts(kit, requiredFontKeys(template, kit.registry));
  const fields = templateFields(template);
  const texts = boundTexts(template);
  const ctx = (values) => ({ engine: kit.engine, registry: kit.registry, values, qrcode: kit.qrcode, digits: template.digits || 'keep' });
  const sampleValues = buildPreviewValues(template, branding);
  const sampleLines = new Map(texts.map((el) => [el.id, elementToOp(el, ctx(sampleValues))?.layout?.lines.length || 1]));

  const names = new Map();
  for (const student of students) {
    const key = nameKey(student);
    names.set(key, (names.get(key) || 0) + 1);
  }

  const results = [];
  for (let start = 0; start < students.length; start += 40) {
    if (signal?.aborted) return results;
    for (const student of students.slice(start, start + 40)) {
      const issues = [];
      for (const field of fields) if (!String(studentValue(student, field)).trim()) issues.push({ kind: 'missing', field });
      const values = buildPreviewValues(template, branding, student);
      for (const el of texts) {
        const layout = elementToOp(el, ctx(values))?.layout;
        if (!layout) continue;
        if (layout.overflow) issues.push({ kind: 'overflow', elementId: el.id, field: el.field });
        else if (layout.fontSize < (Number(el.fontSize) || 28) - 0.5) issues.push({ kind: 'shrunk', elementId: el.id, field: el.field, scale: layout.fontSize / (Number(el.fontSize) || 28) });
        if (layout.lines.length > (sampleLines.get(el.id) || 1)) issues.push({ kind: 'wrapped', elementId: el.id, field: el.field, lines: layout.lines.length });
      }
      if ((names.get(nameKey(student)) || 0) > 1) issues.push({ kind: 'duplicate' });
      results.push(issues);
    }
    onProgress?.(Math.min(students.length, start + 40), students.length);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return results;
}

export const ISSUE_LABELS = {
  missing: 'حقل فارغ',
  overflow: 'النص أطول من مساحته',
  shrunk: 'صُغّر الخط ليتسع',
  wrapped: 'انقسم إلى أسطر أكثر',
  duplicate: 'اسم مكرر',
};

/** Severity: errors block nothing but are highlighted in red; warnings in amber; info in blue. */
export const ISSUE_SEVERITY = { missing: 'error', overflow: 'error', duplicate: 'warning', wrapped: 'warning', shrunk: 'info' };
