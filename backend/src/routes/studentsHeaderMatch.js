// Synchronous header check for readSheet (the ESM shared module loads asynchronously). Mirrors the
// "name" aliases of shared/model/studentFields.js closely enough to detect a header row.
const NAME_HEADERS = ['الاسم', 'اسم الطالب', 'اسم الطالبة', 'الطالب', 'الطالبة', 'اسم الدارس', 'الاسم الكامل', 'name', 'studentname', 'student name', 'full name'];

function matchHeader(cell) {
  const value = String(cell || '').trim().toLowerCase();
  return NAME_HEADERS.includes(value) ? 'name' : null;
}

module.exports = { matchHeader };
