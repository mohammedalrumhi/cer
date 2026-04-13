const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

const excelUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const isExcel =
      file.mimetype.includes('spreadsheetml') ||
      file.originalname.toLowerCase().endsWith('.xlsx');

    if (!isExcel) {
      return cb(new Error('Only .xlsx files are allowed'));
    }
    cb(null, true);
  },
});

module.exports = {
  imageUpload,
  excelUpload,
  uploadDir,
};
