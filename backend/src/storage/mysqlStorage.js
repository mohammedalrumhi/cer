const mysql = require('mysql2/promise');
const { readJson } = require('../utils/fileDb');

const BRANDING_EMPTY = { schoolName: 'دار الإتقان العالي', logoPath: '', signaturePath: '', stampPath: '' };

function getPoolConfig() {
  const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (databaseUrl) {
    return {
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      charset: 'utf8mb4',
    };
  }

  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'certificates_app',
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4',
  };
}

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Template fields with their own columns. Everything else (schemaVersion, future settings…)
// round-trips through `extra_json` so newer template fields are never silently dropped.
const TEMPLATE_COLUMN_FIELDS = new Set([
  'id', 'name', 'orientation', 'width', 'height', 'background', 'elements',
  'createdAt', 'updatedAt', 'detailLevel', 'audienceType',
]);
// Derived on read by utils/templateVariants; never persisted.
const TEMPLATE_COMPUTED_FIELDS = new Set(['availableBackgroundVariants']);

function templateExtraJson(template) {
  const extra = {};
  for (const [key, value] of Object.entries(template || {})) {
    if (!TEMPLATE_COLUMN_FIELDS.has(key) && !TEMPLATE_COMPUTED_FIELDS.has(key) && value !== undefined) {
      extra[key] = value;
    }
  }
  return JSON.stringify(extra);
}

async function ensureColumn(pool, tableName, columnName, definition) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [tableName, columnName]
  );
  if (Number(rows[0]?.count) > 0) return;
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

async function seedTableIfEmpty(pool, tableName, loader, inserter) {
  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM ${tableName}`);
  if (count > 0) return;
  const seedData = loader();
  await inserter(seedData);
}

function createMysqlStorage() {
  const config = getPoolConfig();
  const pool = config.uri ? mysql.createPool(config.uri) : mysql.createPool(config);

  async function ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at VARCHAR(40) NULL,
        updated_at VARCHAR(40) NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS branding (
        id VARCHAR(32) PRIMARY KEY,
        school_name VARCHAR(255) NOT NULL,
        logo_path VARCHAR(255) NOT NULL,
        signature_path VARCHAR(255) NOT NULL,
        stamp_path VARCHAR(255) NOT NULL,
        updated_at VARCHAR(40) NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        issue_date VARCHAR(255) NOT NULL,
        recital_type TEXT NOT NULL,
        surah_range TEXT NOT NULL,
        program_name VARCHAR(255) NOT NULL,
        calendar VARCHAR(255) NOT NULL,
        mistakes_count VARCHAR(255) NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        updated_at VARCHAR(40) NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        orientation VARCHAR(32) NOT NULL,
        width INT NOT NULL,
        height INT NOT NULL,
        background_json LONGTEXT NOT NULL,
        elements_json LONGTEXT NOT NULL,
        created_at VARCHAR(40) NOT NULL,
        updated_at VARCHAR(40) NOT NULL,
        detail_level VARCHAR(32) NULL,
        audience_type VARCHAR(32) NULL,
        extra_json LONGTEXT NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Databases created before extra_json existed.
    await ensureColumn(pool, 'templates', 'extra_json', 'LONGTEXT NULL');
    await ensureColumn(pool, 'students', 'extra_json', 'LONGTEXT NULL');
    await ensureColumn(pool, 'branding', 'extra_json', 'LONGTEXT NULL');

    // Generic records: template versions, assets, generation jobs, issued certificates.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS records (
        collection VARCHAR(64) NOT NULL,
        id VARCHAR(128) NOT NULL,
        owner_id VARCHAR(128) NULL,
        created_at VARCHAR(40) NULL,
        data_json LONGTEXT NOT NULL,
        PRIMARY KEY (collection, id),
        KEY records_owner (collection, owner_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  async function seedFromFiles() {
    await seedTableIfEmpty(pool, 'users', () => readJson('users.json', []), async (users) => {
      for (const user of users) {
        await pool.query(
          'INSERT INTO users (id, username, password, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [user.id, user.username, user.password, user.name || user.username, null, null]
        );
      }
    });

    await seedTableIfEmpty(pool, 'branding', () => readJson('branding.json', BRANDING_EMPTY), async (branding) => {
      await pool.query(
        'INSERT INTO branding (id, school_name, logo_path, signature_path, stamp_path, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        ['default', branding.schoolName || BRANDING_EMPTY.schoolName, branding.logoPath || '', branding.signaturePath || '', branding.stampPath || '', new Date().toISOString()]
      );
    });

    await seedTableIfEmpty(pool, 'students', () => readJson('students.json', []), async (students) => {
      for (const student of students) {
        await pool.query(
          `INSERT INTO students (id, name, issue_date, recital_type, surah_range, program_name, calendar, mistakes_count, teacher_name, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            student.id,
            student.name || '',
            student.issueDate || '',
            student.recitalType || '',
            student.surahRange || '',
            student.programName || '',
            student.calendar || '',
            student.mistakesCount || '',
            student.teacherName || '',
            new Date().toISOString(),
          ]
        );
      }
    });

    await seedTableIfEmpty(pool, 'templates', () => readJson('templates.json', []), async (templates) => {
      for (const template of templates) {
        await pool.query(
          `INSERT INTO templates (id, name, orientation, width, height, background_json, elements_json, created_at, updated_at, detail_level, audience_type, extra_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            template.id,
            template.name,
            template.orientation,
            template.width,
            template.height,
            JSON.stringify(template.background || {}),
            JSON.stringify(template.elements || []),
            template.createdAt || new Date().toISOString(),
            template.updatedAt || new Date().toISOString(),
            template.detailLevel || null,
            template.audienceType || null,
            templateExtraJson(template),
          ]
        );
      }
    });
  }

  function mapBrandingRow(row) {
    if (!row) return { ...BRANDING_EMPTY };
    return {
      // Brand colours, saved text styles and other newer settings.
      ...parseJsonColumn(row.extra_json, {}),
      schoolName: row.school_name,
      logoPath: row.logo_path,
      signaturePath: row.signature_path,
      stampPath: row.stamp_path,
    };
  }

  function studentExtraJson(student) {
    const extra = {};
    if (student.gender) extra.gender = student.gender;
    if (student.audienceType) extra.audienceType = student.audienceType;
    if (student.fields && Object.keys(student.fields).length) extra.fields = student.fields;
    return JSON.stringify(extra);
  }

  function mapStudentRow(row) {
    return {
      ...parseJsonColumn(row.extra_json, {}),
      id: row.id,
      name: row.name,
      issueDate: row.issue_date,
      recitalType: row.recital_type,
      surahRange: row.surah_range,
      programName: row.program_name,
      calendar: row.calendar,
      mistakesCount: row.mistakes_count,
      teacherName: row.teacher_name,
    };
  }

  function mapTemplateRow(row) {
    return {
      ...parseJsonColumn(row.extra_json, {}),
      id: row.id,
      name: row.name,
      orientation: row.orientation,
      width: Number(row.width),
      height: Number(row.height),
      background: parseJsonColumn(row.background_json, {}),
      elements: parseJsonColumn(row.elements_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      detailLevel: row.detail_level || undefined,
      audienceType: row.audience_type || undefined,
    };
  }

  return {
    async initialize() {
      await ensureSchema();
      await seedFromFiles();
    },
    async close() {
      await pool.end();
    },
    async getMode() { return 'mysql'; },
    async getBranding() {
      const [rows] = await pool.query('SELECT * FROM branding WHERE id = ? LIMIT 1', ['default']);
      return mapBrandingRow(rows[0]);
    },
    async updateBranding(patch) {
      const current = await this.getBranding();
      const next = { ...current, ...patch };
      const { schoolName, logoPath, signaturePath, stampPath, ...extra } = next;
      await pool.query(
        `INSERT INTO branding (id, school_name, logo_path, signature_path, stamp_path, updated_at, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE school_name = VALUES(school_name), logo_path = VALUES(logo_path), signature_path = VALUES(signature_path), stamp_path = VALUES(stamp_path), updated_at = VALUES(updated_at), extra_json = VALUES(extra_json)`,
        ['default', schoolName, logoPath, signaturePath, stampPath, new Date().toISOString(), JSON.stringify(extra)]
      );
      return next;
    },
    async updateBrandingAsset(fieldKey, assetPath) {
      return this.updateBranding({ [fieldKey]: assetPath });
    },
    async listStudents() {
      const [rows] = await pool.query('SELECT * FROM students ORDER BY name ASC');
      return rows.map(mapStudentRow);
    },
    async addStudents(students) {
      for (const student of students) {
        await pool.query(
          `INSERT INTO students (id, name, issue_date, recital_type, surah_range, program_name, calendar, mistakes_count, teacher_name, updated_at, extra_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            student.id,
            student.name,
            student.issueDate || '',
            student.recitalType || '',
            student.surahRange || '',
            student.programName || '',
            student.calendar || '',
            student.mistakesCount || '',
            student.teacherName || '',
            new Date().toISOString(),
            studentExtraJson(student),
          ]
        );
      }
      return this.listStudents();
    },
    async updateStudent(student) {
      const [result] = await pool.query(
        `UPDATE students
         SET name = ?, issue_date = ?, recital_type = ?, surah_range = ?, program_name = ?, calendar = ?, mistakes_count = ?, teacher_name = ?, updated_at = ?, extra_json = ?
         WHERE id = ?`,
        [
          student.name,
          student.issueDate || '',
          student.recitalType || '',
          student.surahRange || '',
          student.programName || '',
          student.calendar || '',
          student.mistakesCount || '',
          student.teacherName || '',
          new Date().toISOString(),
          studentExtraJson(student),
          student.id,
        ]
      );
      if (result.affectedRows === 0) return null;
      return student;
    },
    async deleteStudent(id) {
      const [result] = await pool.query('DELETE FROM students WHERE id = ?', [id]);
      return result.affectedRows > 0;
    },
    async listTemplates() {
      const [rows] = await pool.query('SELECT * FROM templates ORDER BY updated_at DESC, name ASC');
      return rows.map(mapTemplateRow);
    },
    async createTemplate(template) {
      await pool.query(
        `INSERT INTO templates (id, name, orientation, width, height, background_json, elements_json, created_at, updated_at, detail_level, audience_type, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          template.id,
          template.name,
          template.orientation,
          template.width,
          template.height,
          JSON.stringify(template.background || {}),
          JSON.stringify(template.elements || []),
          template.createdAt,
          template.updatedAt,
          template.detailLevel || null,
          template.audienceType || null,
          templateExtraJson(template),
        ]
      );
      return template;
    },
    async updateTemplate(template) {
      const [result] = await pool.query(
        `UPDATE templates
         SET name = ?, orientation = ?, width = ?, height = ?, background_json = ?, elements_json = ?, created_at = ?, updated_at = ?, detail_level = ?, audience_type = ?, extra_json = ?
         WHERE id = ?`,
        [
          template.name,
          template.orientation,
          template.width,
          template.height,
          JSON.stringify(template.background || {}),
          JSON.stringify(template.elements || []),
          template.createdAt,
          template.updatedAt,
          template.detailLevel || null,
          template.audienceType || null,
          templateExtraJson(template),
          template.id,
        ]
      );
      if (result.affectedRows === 0) return null;
      return template;
    },
    async deleteTemplate(id) {
      const [result] = await pool.query('DELETE FROM templates WHERE id = ?', [id]);
      return result.affectedRows > 0;
    },
    async listRecords(collection, { ownerId } = {}) {
      const [rows] = ownerId === undefined
        ? await pool.query('SELECT data_json FROM records WHERE collection = ? ORDER BY created_at ASC', [collection])
        : await pool.query('SELECT data_json FROM records WHERE collection = ? AND owner_id = ? ORDER BY created_at ASC', [collection, ownerId]);
      return rows.map((row) => parseJsonColumn(row.data_json, null)).filter(Boolean);
    },
    async getRecord(collection, id) {
      const [rows] = await pool.query('SELECT data_json FROM records WHERE collection = ? AND id = ? LIMIT 1', [collection, id]);
      return rows[0] ? parseJsonColumn(rows[0].data_json, null) : null;
    },
    async putRecord(collection, record) {
      await pool.query(
        `INSERT INTO records (collection, id, owner_id, created_at, data_json) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE owner_id = VALUES(owner_id), data_json = VALUES(data_json)`,
        [collection, record.id, record.ownerId ?? null, record.createdAt || new Date().toISOString(), JSON.stringify(record)]
      );
      return record;
    },
    async putRecords(collection, records) {
      for (const record of records) await this.putRecord(collection, record);
      return records.length;
    },
    async deleteRecord(collection, id) {
      const [result] = await pool.query('DELETE FROM records WHERE collection = ? AND id = ?', [collection, id]);
      return result.affectedRows > 0;
    },
    async findUserByCredentials(username, password) {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ? AND password = ? LIMIT 1',
        [username, password]
      );
      const user = rows[0];
      return user ? { id: user.id, username: user.username, password: user.password, name: user.name } : null;
    },
  };
}

module.exports = {
  createMysqlStorage,
  templateExtraJson,
};