const fs = require('fs');
const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { excelUpload } = require('../utils/uploads');

const STUDENT_FIELD_ALIASES = {
  name: ['name', 'studentname', 'student_name', 'fullname', 'full_name', 'الاسم', 'اسم الطالب', 'الطالب'],
  issueDate: ['issuedate', 'issue_date', 'date', 'تاريخ الاصدار', 'تاريخ الإصدار', 'تاريخ الشهادة'],
  recitalType: ['recitaltype', 'recital_type', 'typeofrecital', 'نوع الاستظهار', 'الاستظهار'],
  surahRange: ['surahrange', 'surah_range', 'surahtext', 'surah_text', 'نص السور', 'نص السور من إلى', 'نص السور من الى', 'السور', 'من الى', 'من إلى'],
  programName: ['programname', 'program_name', 'اسم البرنامج', 'البرنامج'],
  calendar: ['calendar', 'التقويم'],
  mistakesCount: ['mistakescount', 'mistakes_count', 'errorscount', 'عدد الاخطاء', 'عدد الأخطاء'],
  teacherName: ['teachername', 'teacher_name', 'teacher', 'المعلم', 'اسم المعلم'],
};

const NORMALIZED_ALIAS_MAP = Object.entries(STUDENT_FIELD_ALIASES).reduce((acc, [field, aliases]) => {
  aliases.forEach((alias) => {
    acc.set(normalizeKey(alias), field);
  });
  return acc;
}, new Map());

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

function findCanonicalField(key) {
  return NORMALIZED_ALIAS_MAP.get(normalizeKey(key)) || null;
}

function cleanValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeStudentRecord(input, existing = {}) {
  if (typeof input === 'string') {
    const name = cleanValue(input);
    if (!name) return null;
    return {
      id: existing.id || uuidv4(),
      name,
      issueDate: cleanValue(existing.issueDate),
      recitalType: cleanValue(existing.recitalType),
      surahRange: cleanValue(existing.surahRange),
      programName: cleanValue(existing.programName),
      calendar: cleanValue(existing.calendar),
      mistakesCount: cleanValue(existing.mistakesCount),
      teacherName: cleanValue(existing.teacherName),
    };
  }

  if (!input || typeof input !== 'object') return null;

  const mapped = {};
  Object.entries(input).forEach(([rawKey, rawValue]) => {
    const canonical = findCanonicalField(rawKey) || rawKey;
    mapped[canonical] = rawValue;
  });

  const name = cleanValue(mapped.name ?? mapped.studentName ?? mapped.fullName ?? existing.name);
  if (!name) return null;

  return {
    id: cleanValue(mapped.id || existing.id) || uuidv4(),
    name,
    issueDate: cleanValue(mapped.issueDate ?? existing.issueDate),
    recitalType: cleanValue(mapped.recitalType ?? existing.recitalType),
    surahRange: cleanValue(mapped.surahRange ?? existing.surahRange),
    programName: cleanValue(mapped.programName ?? existing.programName),
    calendar: cleanValue(mapped.calendar ?? existing.calendar),
    mistakesCount: cleanValue(mapped.mistakesCount ?? existing.mistakesCount),
    teacherName: cleanValue(mapped.teacherName ?? existing.teacherName),
  };
}

function getStudentSignature(student) {
  return [
    student.name,
    student.issueDate,
    student.recitalType,
    student.surahRange,
    student.programName,
    student.calendar,
    student.mistakesCount,
    student.teacherName,
  ].map((value) => cleanValue(value).toLowerCase()).join('|');
}

function parseSpreadsheetRows(rows) {
  if (!rows || !rows.sheet || !Array.isArray(rows.values) || rows.values.length === 0) return [];

  const objectRows = XLSX.utils.sheet_to_json(rows.sheet, { defval: '', raw: false });
  const normalizedObjects = objectRows
    .map((row) => normalizeStudentRecord(row))
    .filter(Boolean);

  if (normalizedObjects.length > 0) {
    return normalizedObjects;
  }

  return rows.values
    .flat()
    .map((cell) => normalizeStudentRecord(String(cell || '').trim()))
    .filter(Boolean);
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.replace(/^\uFEFF/, '').trim());
}

function parseCsvStudents(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const students = lines.slice(1)
    .map((line) => {
      const cells = parseCsvLine(line);
      const row = headers.reduce((acc, header, index) => {
        acc[header] = cells[index] || '';
        return acc;
      }, {});
      return normalizeStudentRecord(row);
    })
    .filter(Boolean);

  return students;
}

function parseUploadedStudents(filePath, originalName) {
  const extension = String(originalName || path.extname(filePath)).toLowerCase();

  if (extension.endsWith('.csv')) {
    return parseCsvStudents(filePath);
  }

  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return parseSpreadsheetRows({ sheet, values: rows });
}

function createStudentsRouter({ storage }) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    const students = await storage.listStudents();
    res.json(students);
  });

  router.post('/', async (req, res) => {
    const currentStudents = await storage.listStudents();
    const newStudents = Array.isArray(req.body.students) ? req.body.students : [];
    const signatures = new Set(currentStudents.map(getStudentSignature));
    const toInsert = [];

    newStudents.forEach((rawStudent) => {
      const student = normalizeStudentRecord(rawStudent);
      if (!student) return;
      const signature = getStudentSignature(student);
      if (!signatures.has(signature)) {
        signatures.add(signature);
        toInsert.push(student);
      }
    });

    const students = toInsert.length > 0
      ? await storage.addStudents(toInsert)
      : currentStudents;

    res.status(201).json({ students });
  });

  router.put('/:id', async (req, res) => {
    const currentStudents = await storage.listStudents();
    const currentStudent = currentStudents.find((item) => item.id === req.params.id);
    if (!currentStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const updatedStudent = normalizeStudentRecord(req.body, currentStudent);
    if (!updatedStudent) {
      return res.status(400).json({ message: 'Student name is required' });
    }

    await storage.updateStudent(updatedStudent);
    return res.json(updatedStudent);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await storage.deleteStudent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(204).send();
  });

  router.post('/parse-excel', excelUpload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    const students = parseUploadedStudents(req.file.path, req.file.originalname);

    fs.unlinkSync(req.file.path);
    const uniqueStudents = [];
    const signatures = new Set();

    students.forEach((student) => {
      const signature = getStudentSignature(student);
      if (!signatures.has(signature)) {
        signatures.add(signature);
        uniqueStudents.push(student);
      }
    });

    return res.json({ students: uniqueStudents });
  });

  return router;
}

module.exports = {
  createStudentsRouter,
};
