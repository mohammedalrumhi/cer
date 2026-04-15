const fs = require('fs');
const path = require('path');
const { dataDir } = require('./storagePaths');

function ensureFile(fileName, fallbackValue) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const target = path.join(dataDir, fileName);
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
  fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readJson,
  writeJson,
};
