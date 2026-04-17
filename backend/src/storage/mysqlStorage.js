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
        audience_type VARCHAR(32) NULL
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
          `INSERT INTO templates (id, name, orientation, width, height, background_json, elements_json, created_at, updated_at, detail_level, audience_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ]
        );
      }
    });
  }

  function mapBrandingRow(row) {
    if (!row) return { ...BRANDING_EMPTY };
    return {
      schoolName: row.school_name,
      logoPath: row.logo_path,
      signaturePath: row.signature_path,
      stampPath: row.stamp_path,
    };
  }

  function mapStudentRow(row) {
    return {
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
      await pool.query(
        `INSERT INTO branding (id, school_name, logo_path, signature_path, stamp_path, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE school_name = VALUES(school_name), logo_path = VALUES(logo_path), signature_path = VALUES(signature_path), stamp_path = VALUES(stamp_path), updated_at = VALUES(updated_at)`,
        ['default', next.schoolName, next.logoPath, next.signaturePath, next.stampPath, new Date().toISOString()]
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
          `INSERT INTO students (id, name, issue_date, recital_type, surah_range, program_name, calendar, mistakes_count, teacher_name, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          ]
        );
      }
      return this.listStudents();
    },
    async updateStudent(student) {
      const [result] = await pool.query(
        `UPDATE students
         SET name = ?, issue_date = ?, recital_type = ?, surah_range = ?, program_name = ?, calendar = ?, mistakes_count = ?, teacher_name = ?, updated_at = ?
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
        `INSERT INTO templates (id, name, orientation, width, height, background_json, elements_json, created_at, updated_at, detail_level, audience_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        ]
      );
      return template;
    },
    async updateTemplate(template) {
      const [result] = await pool.query(
        `UPDATE templates
         SET name = ?, orientation = ?, width = ?, height = ?, background_json = ?, elements_json = ?, created_at = ?, updated_at = ?, detail_level = ?, audience_type = ?
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
};