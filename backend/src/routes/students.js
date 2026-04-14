const fs = require('fs');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { readJson, writeJson } = require('../utils/fileDb');
const { excelUpload } = require('../utils/uploads');

const router = express.Router();
const FILE_NAME = 'students.json';

router.get('/', (_req, res) => {
  const students = readJson(FILE_NAME, []);
  res.json(students);
});

router.post('/', (req, res) => {
  const currentStudents = readJson(FILE_NAME, []);
  const newNames = Array.isArray(req.body.students) ? req.body.students : [];
  const nextStudents = [...currentStudents];

  newNames.forEach((rawName) => {
    const name = String(rawName || '').trim();
    if (!name) {
      return;
    }

    const alreadyExists = nextStudents.some((item) => item.name === name);
    if (!alreadyExists) {
      nextStudents.push({ id: uuidv4(), name });
    }
  });

  writeJson(FILE_NAME, nextStudents, []);
  res.status(201).json({ students: nextStudents });
});

router.put('/:id', (req, res) => {
  const currentStudents = readJson(FILE_NAME, []);
  const idx = currentStudents.findIndex((item) => item.id === req.params.id);
  if (idx < 0) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  currentStudents[idx] = {
    ...currentStudents[idx],
    name,
  };

  writeJson(FILE_NAME, currentStudents, []);
  return res.json(currentStudents[idx]);
});

router.delete('/:id', (req, res) => {
  const currentStudents = readJson(FILE_NAME, []);
  const remaining = currentStudents.filter((item) => item.id !== req.params.id);

  if (remaining.length === currentStudents.length) {
    return res.status(404).json({ message: 'Student not found' });
  }

  writeJson(FILE_NAME, remaining, []);
  return res.status(204).send();
});

router.post('/parse-excel', excelUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No Excel file uploaded' });
  }

  const workbook = XLSX.readFile(req.file.path);
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const students = rows
    .flat()
    .map((cell) => String(cell || '').trim())
    .filter(Boolean);

  fs.unlinkSync(req.file.path);
  return res.json({ students: Array.from(new Set(students)) });
});

module.exports = router;
