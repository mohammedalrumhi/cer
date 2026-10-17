/**
 * Dynamic field values for one certificate. Used by the editor preview and the PDF renderer so
 * both print exactly the same strings.
 *
 * Gendered wording (recipient title / achievement sentence) lives in each app's
 * templateMetadata module and is injected through `recipient`.
 */

export const DEFAULT_SCHOOL_NAME = 'دار الإتقان العالي';

function str(value) {
  return value === null || value === undefined ? '' : String(value);
}

/** e.g. "١٩ / ربيع الآخر / ١٤٤٨ هـ" (Umm al-Qura calendar, Arabic-Indic digits). */
export function formatHijriDate(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-arab', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    const year = get('year').replace(/\s*هـ?$/, '').trim();
    return `${get('day')} / ${get('month')} / ${year} هـ`;
  } catch {
    return date.toLocaleDateString('ar-SA');
  }
}

/** Date → 'YYYY-MM-DD' (local time). */
export function toIsoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse 'YYYY-MM-DD' (or any Western-digit ISO date) at local noon; null otherwise. */
export function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value || '').trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Date text for a dateField element.
 * @param {Date} date
 * @param {{ calendar?: 'hijri'|'gregorian', style?: 'long'|'numeric' }} format
 */
export function formatDate(date, { calendar = 'hijri', style = 'long' } = {}) {
  try {
    if (calendar === 'gregorian') {
      if (style === 'numeric') {
        const parts = new Intl.DateTimeFormat('ar-EG-u-nu-arab', { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(date);
        const get = (type) => parts.find((part) => part.type === type)?.value || '';
        return `${get('year')}/${get('month')}/${get('day')}م`;
      }
      const parts = new Intl.DateTimeFormat('ar-EG-u-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date);
      const get = (type) => parts.find((part) => part.type === type)?.value || '';
      return `${get('day')} ${get('month')} ${get('year')}م`;
    }
    if (style === 'numeric') {
      const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-arab', { day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(date);
      const get = (type) => parts.find((part) => part.type === type)?.value || '';
      return `${get('year').replace(/\s*هـ?$/, '')}/${get('month')}/${get('day')} هـ`;
    }
    // Same calendar as formatHijriDate, so every Hijri date on a certificate agrees.
    const parts = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return `${get('day')} ${get('month')} ${get('year').replace(/\s*هـ?$/, '').trim()} هـ`;
  } catch {
    return toIsoDate(date);
  }
}

export function withHijriSuffix(value) {
  const text = str(value).trim();
  if (!text) return '';
  return /\s*هـ$/.test(text) ? text : `${text} هـ`;
}

export function resolveStudentName(student) {
  if (typeof student === 'string') return student;
  if (student && typeof student === 'object') return str(student.name ?? student.studentName ?? student.fullName ?? '');
  return '';
}

/**
 * @param {object|string} student
 * @param {{ schoolName?: string }} branding
 * @param {object} template
 * @param {{ title: (template: object, name: string, options?: object) => string, sentence: (template: object, name: string, options?: object) => string }} recipient
 * @param {{ today?: Date, serial?: string, verifyUrl?: string }} [options]
 * @returns {Record<string, string>}
 */
export function buildFieldValues(student, branding, template, recipient, { today = new Date(), serial = '', verifyUrl = '' } = {}) {
  const studentName = resolveStudentName(student);
  const issueDate = withHijriSuffix(student?.issueDate || formatHijriDate(today));
  // A per-student gender overrides the name heuristic (the "ة" rule only pre-fills it).
  const gender = student?.gender === 'female' || student?.gender === 'male' ? student.gender : undefined;
  const issueIso = toIsoDate(parseIsoDate(student?.issueDate) || today);
  const values = {
    studentName,
    recipientTitle: recipient.title(template, studentName, { gender }),
    recipientAchievementSentence: recipient.sentence(template, studentName, {
      institutionName: branding?.schoolName ? `مؤسسة ${str(branding.schoolName)}` : undefined,
      gender,
    }),
    date: issueDate,
    dateLabel: `تاريخ الإصدار: ${issueDate}`,
    issueDate,
    issueDateLabel: `تاريخ الإصدار: ${issueDate}`,
    recitalType: str(student?.recitalType),
    surahRange: str(student?.surahRange),
    programName: str(student?.programName),
    calendar: str(student?.calendar),
    mistakesCount: str(student?.mistakesCount),
    teacherName: str(student?.teacherName),
    schoolName: str(branding?.schoolName || DEFAULT_SCHOOL_NAME),
    serial: str(student?.serial || serial),
    verifyUrl: str(student?.verifyUrl || verifyUrl),
    // Machine-readable issue date for dateField elements (not a placeholder users type).
    __issueDateIso: issueIso,
  };

  if (student && typeof student === 'object') {
    for (const [key, value] of Object.entries(student)) {
      if (value !== null && value !== undefined && typeof value !== 'object' && !(key in values)) values[key] = str(value);
    }
    // Custom spreadsheet columns, kept under `fields`.
    if (student.fields && typeof student.fields === 'object') {
      for (const [key, value] of Object.entries(student.fields)) {
        if (value !== null && value !== undefined && !(key in values)) values[key] = str(value);
      }
    }
  }
  return values;
}
