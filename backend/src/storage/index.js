const { createFileStorage } = require('./fileStorage');
const { createMysqlStorage } = require('./mysqlStorage');

let activeStorage = null;

function shouldUseMysql() {
  return Boolean(process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_HOST || process.env.MYSQL_DATABASE);
}

async function initStorage() {
  if (activeStorage) return activeStorage;
  activeStorage = shouldUseMysql() ? createMysqlStorage() : createFileStorage();
  await activeStorage.initialize();
  return activeStorage;
}

function getStorage() {
  if (!activeStorage) {
    throw new Error('Storage has not been initialized');
  }
  return activeStorage;
}

async function closeStorage() {
  if (!activeStorage) return;
  await activeStorage.close();
  activeStorage = null;
}

module.exports = {
  initStorage,
  getStorage,
  closeStorage,
};