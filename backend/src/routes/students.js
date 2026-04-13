const fs = require('fs');
const express = require('express');
const XLSX = require('xlsx');
const { excelUpload } = require('../utils/uploads');

const router = express.Router();

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
