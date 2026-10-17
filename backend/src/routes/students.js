const fs = require('fs');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { excelUpload } = require('../utils/uploads');
const { loadModel } = require('../shared');
const { matchHeader } = require('./studentsHeaderMatch');

/**
 * Students: saved list (CRUD) and spreadsheet parsing. Normalization, header matching and duplicate
 * detection come from shared/model/studentFields.js, the same code the generator wizard uses.
 */

function decodeCsv(buffer) {
  // UTF-8 (with or without BOM) is the norm; Excel on Windows may save Arabic CSV as Windows-1256.
  const utf8 = buffer.toString('utf8').replace(/^﻿/, '');
  if (!utf8.includes('�')) return utf8;
  try {
    return new TextDecoder('windows-1256').decode(buffer);
  } catch {
    return utf8;
  }
}

/** Raw rows of the first sheet: { headers, rows } with string values. */
function readSheet(filePath, originalName) {
  const isCsv = String(originalName || filePath).toLowerCase().endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(decodeCsv(fs.readFileSync(filePath)), { type: 'string', raw: true })
    : XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (!matrix.length) return { headers: [], rows: [] };
  let headers = matrix[0].map((cell, index) => String(cell || '').trim() || `عمود ${index + 1}`);
  let body = matrix.slice(1);
  // A sheet that is only a list of names (no header row) still imports.
  if (headers.length === 1) {
    if (!matchHeader(matrix[0][0])) {
      headers = ['الاسم'];
      body = matrix;
    }
  }
  const unique = headers.map((header, index) => (headers.indexOf(header) === index ? header : `${header} (${index + 1})`));
  const rows = body
    .map((cells) => Object.fromEntries(unique.map((header, index) => [header, String(cells[index] ?? '').trim()])))
    .filter((row) => Object.values(row).some(Boolean));
  return { headers: unique, rows };
}

function createStudentsRouter({ storage }) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    res.json(await storage.listStudents());
  });

  router.post('/', async (req, res) => {
    const { normalizeStudent, studentSignature } = await loadModel();
    const current = await storage.listStudents();
    const signatures = new Set(current.map(studentSignature));
    const toInsert = [];
    for (const raw of Array.isArray(req.body?.students) ? req.body.students : []) {
      const student = normalizeStudent(raw);
      if (!student) continue;
      const signature = studentSignature(student);
      if (signatures.has(signature)) continue;
      signatures.add(signature);
      toInsert.push({ ...student, id: student.id && !current.some((s) => s.id === student.id) ? student.id : uuidv4() });
    }
    const students = toInsert.length ? await storage.addStudents(toInsert) : current;
    res.status(201).json({ students, added: toInsert.length });
  });

  router.put('/:id', async (req, res) => {
    const { normalizeStudent } = await loadModel();
    const current = (await storage.listStudents()).find((item) => item.id === req.params.id);
    if (!current) return res.status(404).json({ message: 'Student not found' });
    const base = { id: current.id };
    const updated = normalizeStudent({ ...req.body, id: current.id }, base);
    if (!updated) return res.status(400).json({ message: 'Student name is required' });
    await storage.updateStudent(updated);
    return res.json(updated);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await storage.deleteStudent(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Student not found' });
    return res.status(204).send();
  });

  /** Raw sheet for the wizard's column-mapping step. */
  router.post('/parse-sheet', excelUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No spreadsheet uploaded' });
    try {
      const { autoMapHeaders } = await loadModel();
      const { headers, rows } = readSheet(req.file.path, req.file.originalname);
      return res.json({ headers, rows, mapping: autoMapHeaders(headers) });
    } catch {
      return res.status(400).json({ message: 'Unreadable spreadsheet' });
    } finally {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  });

  /** Parse with the automatic mapping (Students page import). Custom columns are kept. */
  router.post('/parse-excel', excelUpload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No Excel file uploaded' });
    try {
      const { autoMapHeaders, rowToStudent, dedupeStudents } = await loadModel();
      const { headers, rows } = readSheet(req.file.path, req.file.originalname);
      const mapping = autoMapHeaders(headers);
      return res.json({ students: dedupeStudents(rows.map((row) => rowToStudent(row, mapping)).filter(Boolean)) });
    } catch {
      return res.status(400).json({ message: 'Unreadable spreadsheet' });
    } finally {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
  });

  return router;
}

module.exports = { createStudentsRouter, readSheet };
