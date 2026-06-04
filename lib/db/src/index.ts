import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "file:./data/exam-manager.sqlite";
const sqlitePath = databaseUrl.replace(/^file:/, "");
const sqliteDir = path.dirname(sqlitePath);
if (sqliteDir && sqliteDir !== ".") {
  fs.mkdirSync(sqliteDir, { recursive: true });
}
const sqlite = new Database(sqlitePath);
sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  course TEXT NOT NULL,
  year INTEGER NOT NULL,
  photo_url TEXT,
  user_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_date INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  passing_marks INTEGER NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'mcq',
  eligible_courses TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  results_published INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mcq',
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  options TEXT,
  correct_answer TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  marking_scheme TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  start_time INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  end_time INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  incidents TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_exam_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  marks_obtained INTEGER,
  saved_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (student_exam_id) REFERENCES student_exams(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  total_marks INTEGER NOT NULL,
  marks_obtained REAL NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'F',
  percentage REAL NOT NULL DEFAULT 0,
  rank INTEGER,
  published INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  verification_method TEXT NOT NULL DEFAULT 'manual',
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admit_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  exam_id INTEGER NOT NULL,
  qr_code TEXT NOT NULL,
  generated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  read_status INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);
`);

function hasColumn(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

if (!hasColumn("users", "is_active")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
}

export const db = drizzle(sqlite, { schema });

export * from "./schema";
