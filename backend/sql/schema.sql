CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at VARCHAR(40) NULL,
  updated_at VARCHAR(40) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS branding (
  id VARCHAR(32) PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL,
  logo_path VARCHAR(255) NOT NULL,
  signature_path VARCHAR(255) NOT NULL,
  stamp_path VARCHAR(255) NOT NULL,
  updated_at VARCHAR(40) NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;