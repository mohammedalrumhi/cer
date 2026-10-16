const fs = require('fs');
const path = require('path');
const { dataDir } = require('./storagePaths');

function ensureFile(fileName, fallbackValue) {
  const target = path.join(dataDir, fileName);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, JSON.stringify(fallbackValue, null, 2), 'utf8');
  }

  return target;
}

function readJson(fileName, fallbackValue) {
  const target = ensureFile(fileName, fallbackValue);
  const raw = fs.readFileSync(target, 'utf8');
  return JSON.parse(raw);
}

function writeJson(fileName, data, fallbackValue) {
  const target = ensureFile(fileName, fallbackValue);
  // Write-then-rename so a crash mid-write never leaves a truncated JSON file.
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

module.exports = {
  readJson,
  writeJson,
};
