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
 * @param {{ title: (template: object, name: string) => string, sentence: (template: object, name: string, options?: object) => string }} recipient
 * @param {{ today?: Date }} [options]
 * @returns {Record<string, string>}
 */
export function buildFieldValues(student, branding, template, recipient, { today = new Date() } = {}) {
  const studentName = resolveStudentName(student);
  const issueDate = withHijriSuffix(student?.issueDate || formatHijriDate(today));
  const values = {
    studentName,
    recipientTitle: recipient.title(template, studentName),
    recipientAchievementSentence: recipient.sentence(template, studentName, {
      institutionName: branding?.schoolName ? `مؤسسة ${str(branding.schoolName)}` : undefined,
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
  };

  if (student && typeof student === 'object') {
    for (const [key, value] of Object.entries(student)) {
      if (value !== null && value !== undefined && !(key in values)) values[key] = str(value);
    }
  }
  return values;
}
