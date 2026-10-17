/**
 * Student records and spreadsheet columns, shared by the generator wizard and the backend.
 *
 * A student is { id?, name, issueDate?, recitalType?, surahRange?, programName?, calendar?,
 * mistakesCount?, teacherName?, gender?: 'male'|'female', fields?: { [column]: value } }.
 * `fields` keeps every custom spreadsheet column, so templates can use them as {{column}}.
 */

export const CORE_STUDENT_FIELDS = ['name', 'issueDate', 'recitalType', 'surahRange', 'programName', 'calendar', 'mistakesCount', 'teacherName'];

/** Header aliases (Arabic first; English kept silently so old sheets still import). */
export const STUDENT_FIELD_ALIASES = {
  name: ['الاسم', 'اسم الطالب', 'اسم الطالبة', 'الطالب', 'الطالبة', 'اسم الدارس', 'اسم الدارسة', 'الاسم الكامل', 'الاسم الرباعي', 'اسم المستفيد', 'name', 'studentname', 'student_name', 'fullname', 'full_name'],
  issueDate: ['تاريخ الاصدار', 'تاريخ الإصدار', 'تاريخ الشهادة', 'التاريخ', 'issuedate', 'issue_date', 'date'],
  recitalType: ['نوع الاستظهار', 'الاستظهار', 'نوع التسميع', 'التسميع', 'recitaltype', 'recital_type', 'typeofrecital'],
  surahRange: ['نص السور', 'نص السور من إلى', 'نص السور من الى', 'نص السور (من إلى)', 'السور', 'من الى', 'من إلى', 'المقرر', 'الحفظ', 'surahrange', 'surah_range', 'surahtext', 'surah_text'],
  programName: ['اسم البرنامج', 'البرنامج', 'اسم المسار', 'المسار', 'الحلقة', 'programname', 'program_name'],
  calendar: ['التقويم', 'التقدير', 'الدرجة', 'المستوى', 'calendar', 'grade'],
  mistakesCount: ['عدد الاخطاء', 'عدد الأخطاء', 'الأخطاء', 'الاخطاء', 'mistakescount', 'mistakes_count', 'errorscount'],
  teacherName: ['المعلم', 'المعلمة', 'اسم المعلم', 'اسم المعلمة', 'المعلم/ة', 'teachername', 'teacher_name', 'teacher'],
  gender: ['الجنس', 'النوع', 'ذكر/أنثى', 'gender', 'sex'],
};

export function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

const ALIAS_MAP = new Map();
for (const [field, aliases] of Object.entries(STUDENT_FIELD_ALIASES)) {
  for (const alias of aliases) ALIAS_MAP.set(normalizeKey(alias), field);
}

/** Canonical field for a header, or null. */
export function matchHeader(header) {
  return ALIAS_MAP.get(normalizeKey(header)) || null;
}

/** A custom column's key, usable as {{key}} in templates (letters, digits and _). */
export function customFieldKey(header) {
  return String(header ?? '').trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '') || 'عمود';
}

/**
 * Suggested mapping for a sheet's headers: header → canonical field | 'custom' | 'ignore'.
 * Each canonical field is used once; empty headers are ignored.
 */
export function autoMapHeaders(headers) {
  const used = new Set();
  const mapping = {};
  for (const header of headers) {
    const field = matchHeader(header);
    if (!String(header ?? '').trim()) mapping[header] = 'ignore';
    else if (field && !used.has(field)) {
      mapping[header] = field;
      used.add(field);
    } else mapping[header] = 'custom';
  }
  // A one-column sheet without a recognised header is a list of names.
  if (!used.has('name') && headers.length === 1) mapping[headers[0]] = 'name';
  return mapping;
}

function clean(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

export function normalizeGender(value) {
  const v = normalizeKey(value);
  if (!v) return undefined;
  if (['انثي', 'انثى', 'بنت', 'طالبه', 'f', 'female', 'girl', 'ن'].includes(v)) return 'female';
  if (['ذكر', 'ولد', 'طالب', 'm', 'male', 'boy', 'ذ'].includes(v)) return 'male';
  return undefined;
}

/** One sheet row → student, using a header mapping (see autoMapHeaders). */
export function rowToStudent(row, mapping) {
  const student = {};
  const fields = {};
  for (const [header, target] of Object.entries(mapping)) {
    const value = clean(row[header]);
    if (target === 'ignore' || value === '') continue;
    if (target === 'custom') fields[customFieldKey(header)] = value;
    else if (target === 'gender') {
      const gender = normalizeGender(value);
      if (gender) student.gender = gender;
    } else student[target] = value;
  }
  if (!student.name) return null;
  if (Object.keys(fields).length) student.fields = fields;
  return student;
}

/**
 * Normalize any incoming student object (API body, old records): canonical keys by alias, unknown
 * keys kept as custom fields (they used to be dropped), gender validated.
 */
export function normalizeStudent(input, existing = {}) {
  if (typeof input === 'string') {
    const name = clean(input);
    return name ? { ...existing, name } : null;
  }
  if (!input || typeof input !== 'object') return null;
  const student = { ...existing };
  const fields = { ...(existing.fields || {}), ...(input.fields && typeof input.fields === 'object' ? input.fields : {}) };
  for (const [key, raw] of Object.entries(input)) {
    if (key === 'fields' || key === 'id') continue;
    const canonical = CORE_STUDENT_FIELDS.includes(key) || key === 'gender' ? key : matchHeader(key);
    if (canonical === 'gender' || key === 'gender') {
      const gender = normalizeGender(raw) ?? (raw === 'male' || raw === 'female' ? raw : undefined);
      if (gender) student.gender = gender;
      else delete student.gender;
    } else if (canonical) student[canonical] = clean(raw);
    else if (raw !== null && raw !== undefined && typeof raw !== 'object' && !['createdAt', 'updatedAt', 'studentName', 'fullName', 'serial', 'verifyUrl'].includes(key)) fields[customFieldKey(key)] = clean(raw);
  }
  if (!student.name) student.name = clean(input.studentName ?? input.fullName ?? '');
  if (!student.name) return null;
  if (input.id || existing.id) student.id = String(input.id || existing.id);
  for (const [key, value] of Object.entries(fields)) if (value === '') delete fields[key];
  if (Object.keys(fields).length) student.fields = fields;
  else delete student.fields;
  return student;
}

/** Identity used to find duplicates (normalized name + core fields + custom fields). */
export function studentSignature(student) {
  const core = CORE_STUDENT_FIELDS.map((key) => normalizeKey(student?.[key]));
  const custom = Object.entries(student?.fields || {}).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${normalizeKey(v)}`);
  return [...core, ...custom].join('|');
}

/** Same person (by name only) — used to flag likely duplicates in review. */
export function nameKey(student) {
  return normalizeKey(student?.name);
}

/** Remove exact duplicates, keeping the first occurrence. */
export function dedupeStudents(students) {
  const seen = new Set();
  return students.filter((student) => {
    const signature = studentSignature(student);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

/** A pasted list: one name per line. Commas are part of names ("محمد بن علي، الحافظ") — never split. */
export function parsePastedList(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[\d٠-٩]+[.)\-–]\s*/, '').trim())
    .filter(Boolean)
    .map((name) => ({ name }));
}
