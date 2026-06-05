from __future__ import annotations

import csv
import io
import json
import zipfile
import math
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone, timedelta
import threading
from functools import wraps
from pathlib import Path
from typing import Any, Callable
from zoneinfo import ZoneInfo

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

import bcrypt
import jwt
import requests
from flask import Flask, Response, g, jsonify, request, send_from_directory
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST_DIR = BASE_DIR.parent / "exam-system" / "dist"
DATABASE_URL = os.getenv("DATABASE_URL", "file:./data/exam-manager.sqlite")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me-with-at-least-32-bytes")
JWT_EXPIRES_SECONDS = 7 * 24 * 60 * 60


def resolve_sqlite_path() -> Path:
    url = DATABASE_URL
    if not url.startswith("file:"):
        url = "file:./data/exam-manager.sqlite"
    raw = url.removeprefix("file:")
    path = Path(raw)
    if not path.is_absolute():
        path = BASE_DIR / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


DB_PATH = resolve_sqlite_path()
try:
    APP_TIMEZONE = ZoneInfo(os.environ.get("APP_TIMEZONE", "Asia/Kolkata"))
except Exception:
    APP_TIMEZONE = timezone(timedelta(hours=5, minutes=30), "Asia/Kolkata")
EXAM_START_GRACE_MS = 5 * 60 * 1000


def now_ms() -> int:
    return int(time.time() * 1000)


def iso_from_ms(value: Any) -> str | None:
    if value is None:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError, OSError):
        return str(value)


def ms_from_iso(value: Any) -> int:
    if value is None:
        return now_ms()
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value)
    try:
        normalized = text.replace("Z", "+00:00")
        return int(datetime.fromisoformat(normalized).timestamp() * 1000)
    except ValueError:
        return now_ms()


def json_loads(value: Any, fallback: Any) -> Any:
    if value is None or value == "":
        return fallback
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def json_dumps(value: Any) -> str | None:
    if value is None:
        return None
    return json.dumps(value)


def to_bool(value: Any) -> bool:
    return bool(value)


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-8000")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA temp_store=MEMORY")
        g.db = conn
    return g.db


def query_one(sql: str, args: tuple[Any, ...] = ()) -> sqlite3.Row | None:
    return get_db().execute(sql, args).fetchone()


def query_all(sql: str, args: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    return list(get_db().execute(sql, args).fetchall())


def execute(sql: str, args: tuple[Any, ...] = ()) -> sqlite3.Cursor:
    cur = get_db().execute(sql, args)
    get_db().commit()
    return cur


def insert_and_get(table: str, fields: dict[str, Any]) -> sqlite3.Row:
    columns = list(fields.keys())
    placeholders = ", ".join(["?"] * len(columns))
    sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
    cur = execute(sql, tuple(fields[col] for col in columns))
    row = query_one(f"SELECT * FROM {table} WHERE id = ?", (cur.lastrowid,))
    assert row is not None
    return row


def update_and_get(table: str, row_id: int, fields: dict[str, Any]) -> sqlite3.Row | None:
    if not fields:
        return query_one(f"SELECT * FROM {table} WHERE id = ?", (row_id,))
    assignments = ", ".join([f"{key} = ?" for key in fields])
    execute(f"UPDATE {table} SET {assignments} WHERE id = ?", (*fields.values(), row_id))
    return query_one(f"SELECT * FROM {table} WHERE id = ?", (row_id,))


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
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
CREATE TABLE IF NOT EXISTS student_fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  due_date INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS exam_halls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  hall_name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  floor_no TEXT,
  building TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS hall_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hall_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  seat_no TEXT NOT NULL,
  FOREIGN KEY (hall_id) REFERENCES exam_halls(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(hall_id, student_id),
  UNIQUE(hall_id, seat_no)
);
"""
    )
    cols = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
    if "is_active" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1")
    if "assigned_subjects" not in cols:
        conn.execute("ALTER TABLE users ADD COLUMN assigned_subjects TEXT")
    conn.execute("UPDATE exams SET exam_type = 'mcq' WHERE exam_type IS NULL OR exam_type != 'mcq'")
    conn.execute("UPDATE questions SET question_type = 'mcq' WHERE question_type IS NULL OR question_type != 'mcq'")
    conn.execute("UPDATE questions SET marking_scheme = NULL")
    conn.executescript("""
PRAGMA journal_mode=WAL;
CREATE INDEX IF NOT EXISTS idx_student_exams_student ON student_exams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_exam ON student_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_lookup ON student_exams(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(student_exam_id);
CREATE INDEX IF NOT EXISTS idx_answers_lookup ON answers(student_exam_id, question_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_exams_unique ON student_exams(student_id, exam_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_unique ON answers(student_exam_id, question_id);
CREATE INDEX IF NOT EXISTS idx_fees_student ON student_fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_status ON student_fees(status);
CREATE INDEX IF NOT EXISTS idx_halls_exam ON exam_halls(exam_id);
CREATE INDEX IF NOT EXISTS idx_assignments_hall ON hall_assignments(hall_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON hall_assignments(student_id);
""")
    conn.commit()
    conn.close()


app = Flask(__name__)
CORS(app)
init_db()


@app.teardown_appcontext
def close_db(_: BaseException | None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def get_exam_window_ms(exam: Any) -> tuple[int, int]:
    """Returns (start_ms, end_ms) for the exam window."""
    exam_date_ms = exam["exam_date"]
    start_time_str = exam["start_time"] or "00:00"
    duration_min = exam["duration"] or 0
    exam_date_dt = datetime.fromtimestamp(exam_date_ms / 1000, tz=timezone.utc).astimezone(APP_TIMEZONE)
    try:
        parts = start_time_str.split(":")
        h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
        exam_start = exam_date_dt.replace(hour=h, minute=m, second=0, microsecond=0)
    except (ValueError, IndexError):
        exam_start = exam_date_dt
    exam_end = exam_start + timedelta(minutes=duration_min)
    return int(exam_start.timestamp() * 1000), int(exam_end.timestamp() * 1000)


def _auto_publish_worker() -> None:
    """Background job: auto-calculate and publish results for ended exams."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        now = int(time.time() * 1000)
        exams = list(conn.execute(
            "SELECT * FROM exams WHERE results_published = 0 AND status != 'draft'"
        ).fetchall())
        for exam in exams:
            try:
                _, end_ms = get_exam_window_ms(exam)
                if now <= end_ms:
                    continue
                exam_id = exam["id"]
                conn.execute("UPDATE exams SET status = 'completed' WHERE id = ? AND status = 'scheduled'", (exam_id,))
                has_results = conn.execute("SELECT COUNT(*) as c FROM results WHERE exam_id = ?", (exam_id,)).fetchone()["c"]
                if has_results == 0:
                    total_marks = conn.execute(
                        "SELECT COALESCE(SUM(q.marks), 0) AS total FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = ?",
                        (exam_id,)
                    ).fetchone()["total"] or exam["total_marks"] or 1
                    sessions = conn.execute("SELECT * FROM student_exams WHERE exam_id = ?", (exam_id,)).fetchall()
                    result_data = []
                    for session in sessions:
                        answers = conn.execute(
                            "SELECT a.answer_text, q.correct_answer, q.marks FROM answers a "
                            "JOIN exam_questions eq ON eq.question_id = a.question_id AND eq.exam_id = ? "
                            "JOIN questions q ON a.question_id = q.id WHERE a.student_exam_id = ?",
                            (exam_id, session["id"])
                        ).fetchall()
                        obtained = sum((float(a["marks"]) if a["marks"] else 1.0) if a["answer_text"] == a["correct_answer"] else 0 for a in answers)
                        pct = (obtained / float(total_marks)) * 100 if total_marks else 0
                        result_data.append({"student_id": session["student_id"], "marks_obtained": obtained, "percentage": pct})
                    result_data.sort(key=lambda r: r["marks_obtained"], reverse=True)
                    for idx, rd in enumerate(result_data, start=1):
                        grade = calculate_grade(rd["percentage"])
                        conn.execute(
                            "INSERT OR IGNORE INTO results (student_id, exam_id, total_marks, marks_obtained, grade, percentage, rank, published) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
                            (rd["student_id"], exam_id, total_marks, rd["marks_obtained"], grade, round(rd["percentage"], 2), idx)
                        )
                else:
                    conn.execute("UPDATE results SET published = 1 WHERE exam_id = ?", (exam_id,))
                conn.execute("UPDATE exams SET results_published = 1 WHERE id = ?", (exam_id,))
                conn.commit()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass
        conn.close()
    except Exception:
        pass
    finally:
        t = threading.Timer(60.0, _auto_publish_worker)
        t.daemon = True
        t.start()


_auto_pub_timer = threading.Timer(30.0, _auto_publish_worker)
_auto_pub_timer.daemon = True
_auto_pub_timer.start()


def error(message: str, status: int = 400):
    return jsonify({"error": message}), status


def int_param(name: str, value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def body() -> dict[str, Any]:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def generate_token(user_id: int, role: str) -> str:
    payload = {"userId": user_id, "role": role, "exp": int(time.time()) + JWT_EXPIRES_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def permissions_for(role: str) -> list[str]:
    base = ["dashboard.view", "profile.view"]
    teacher = base + ["students.view", "students.manage", "exams.manage", "questions.manage", "results.manage", "attendance.manage", "admit_cards.manage", "reports.view"]
    admin = teacher + ["users.manage", "roles.manage", "users.deactivate", "system.settings.manage", "audit.view", "access.manage"]
    if role == "admin":
        return admin
    if role == "teacher":
        return teacher
    return base + ["exams.take", "results.view", "notifications.view"]


def current_user_from_header() -> dict[str, Any] | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        token = header[7:]
    elif request.args.get("token"):
        token = request.args.get("token")
    else:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    user_id = payload.get("userId")
    row = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if row is None or not row["is_active"]:
        return None
    return {"userId": row["id"], "role": row["role"], "email": row["email"]}


def auth_required(fn: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any):
        user = current_user_from_header()
        if user is None:
            return error("Not authenticated", 401)
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def require_role(*roles: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any):
            if g.user["role"] not in roles:
                return error("Forbidden", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(*perms: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any):
            allowed = set(permissions_for(g.user["role"]))
            if not all(perm in allowed for perm in perms):
                return error("Forbidden", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def user_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "isActive": to_bool(row["is_active"]),
        "permissions": permissions_for(row["role"]),
        "createdAt": iso_from_ms(row["created_at"]),
        "assignedSubjects": json_loads(row["assigned_subjects"] if "assigned_subjects" in row.keys() else None, []),
    }


def student_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "rollNo": row["roll_no"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "course": row["course"],
        "year": row["year"],
        "photoUrl": row["photo_url"],
        "userId": row["user_id"],
        "createdAt": iso_from_ms(row["created_at"]),
    }


def exam_json(row: sqlite3.Row) -> dict[str, Any]:
    start_ms, end_ms = get_exam_window_ms(row)
    return {
        "id": row["id"],
        "examName": row["exam_name"],
        "subject": row["subject"],
        "examDate": iso_from_ms(row["exam_date"]),
        "startTime": row["start_time"],
        "duration": row["duration"],
        "totalMarks": row["total_marks"],
        "passingMarks": row["passing_marks"],
        "examType": "mcq",
        "eligibleCourses": json_loads(row["eligible_courses"], []),
        "status": row["status"],
        "resultsPublished": to_bool(row["results_published"]),
        "createdBy": row["created_by"],
        "createdAt": iso_from_ms(row["created_at"]),
        "examWindowStart": iso_from_ms(start_ms),
        "examWindowEnd": iso_from_ms(end_ms),
    }


def question_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "questionText": row["question_text"],
        "questionType": "mcq",
        "subject": row["subject"],
        "topic": row["topic"],
        "difficulty": row["difficulty"],
        "options": json_loads(row["options"], None),
        "correctAnswer": row["correct_answer"],
        "marks": row["marks"],
        "markingScheme": None,
        "createdAt": iso_from_ms(row["created_at"]),
    }


def session_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "examId": row["exam_id"],
        "startTime": iso_from_ms(row["start_time"]),
        "endTime": iso_from_ms(row["end_time"]),
        "status": row["status"],
        "tabSwitchCount": row["tab_switch_count"],
        "incidents": json_loads(row["incidents"], []),
    }


def result_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "examId": row["exam_id"],
        "totalMarks": row["total_marks"],
        "marksObtained": row["marks_obtained"],
        "grade": row["grade"],
        "percentage": row["percentage"],
        "rank": row["rank"],
        "published": to_bool(row["published"]),
        "studentName": row["student_name"] if "student_name" in row.keys() and row["student_name"] else "",
        "studentRollNo": row["student_roll_no"] if "student_roll_no" in row.keys() and row["student_roll_no"] else "",
        "examName": row["exam_name"] if "exam_name" in row.keys() and row["exam_name"] else "",
        "subject": row["subject"] if "subject" in row.keys() and row["subject"] else "",
    }


def log_audit(action: str, entity: str, entity_id: Any = None, details: dict[str, Any] | None = None, actor_id: int | None = None) -> None:
    insert_and_get(
        "audit_logs",
        {
            "actor_id": actor_id if actor_id is not None else getattr(g, "user", {}).get("userId"),
            "action": action,
            "entity": entity,
            "entity_id": None if entity_id is None else str(entity_id),
            "details": json_dumps(details),
        },
    )


def validate_required(data: dict[str, Any], required: list[str]) -> str | None:
    missing = [key for key in required if data.get(key) in (None, "")]
    return f"Missing required fields: {', '.join(missing)}" if missing else None


@app.get("/api/healthz")
def health_check():
    return jsonify({"status": "ok"})


@app.get("/")
@app.get("/<path:path>")
def serve_frontend(path: str = ""):
    if path.startswith("api/"):
        return error("Not found", 404)
    if FRONTEND_DIST_DIR.exists():
        candidate = FRONTEND_DIST_DIR / path
        if path and candidate.is_file():
            return send_from_directory(FRONTEND_DIST_DIR, path)
        return send_from_directory(FRONTEND_DIST_DIR, "index.html")
    return error("Frontend build not found. Run the Vite build before starting the server.", 404)


@app.post("/api/auth/register")
def register():
    return error("Self-registration is disabled. Please contact your administrator to create an account.", 403)


@app.post("/api/auth/login")
def login():
    data = body()
    message = validate_required(data, ["email", "password"])
    if message:
        return error(message)
    user = query_one("SELECT * FROM users WHERE email = ?", (data["email"],))
    if user is None or not bcrypt.checkpw(data["password"].encode(), user["password_hash"].encode()):
        return error("Invalid credentials", 401)
    if not user["is_active"]:
        return error("Account is deactivated. Please contact administrator.", 403)
    log_audit("auth.login", "user", user["id"], {"role": user["role"]}, actor_id=user["id"])
    return jsonify({"token": generate_token(user["id"], user["role"]), "user": user_json(user)})


@app.get("/api/auth/me")
@auth_required
def get_me():
    user = query_one("SELECT * FROM users WHERE id = ?", (g.user["userId"],))
    if user is None:
        return error("User not found", 404)
    payload = user_json(user)
    payload["student"] = None
    if user["role"] == "student":
        student = query_one("SELECT * FROM students WHERE user_id = ?", (user["id"],))
        if student:
            payload["student"] = student_json(student)
    return jsonify(payload)


@app.post("/api/auth/logout")
def logout():
    return jsonify({"message": "Logged out"})


def paginate() -> tuple[int, int, int]:
    page = max(int(request.args.get("page", 1) or 1), 1)
    limit = max(min(int(request.args.get("limit", 20) or 20), 200), 1)
    return page, limit, (page - 1) * limit


@app.get("/api/students")
@auth_required
def list_students():
    page, limit, offset = paginate()
    where, args = [], []
    search = request.args.get("search")
    if search:
        where.append("(LOWER(name) LIKE ? OR LOWER(roll_no) LIKE ?)")
        term = f"%{search.lower()}%"
        args += [term, term]
    if request.args.get("course"):
        where.append("course = ?")
        args.append(request.args["course"])
    if request.args.get("year"):
        where.append("year = ?")
        args.append(int(request.args["year"]))
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = query_one(f"SELECT COUNT(*) AS count FROM students {clause}", tuple(args))["count"]
    rows = query_all(f"SELECT * FROM students {clause} ORDER BY name LIMIT ? OFFSET ?", (*args, limit, offset))
    return jsonify({"students": [student_json(r) for r in rows], "total": total, "page": page, "totalPages": math.ceil(total / limit)})


@app.post("/api/students")
@auth_required
@require_role("admin", "teacher")
def create_student():
    data = body()
    message = validate_required(data, ["rollNo", "name", "email", "phone", "course", "year"])
    if message:
        return error(message)
    if query_one("SELECT id FROM students WHERE roll_no = ?", (data["rollNo"],)):
        return error("Roll number already exists")
    row = insert_and_get("students", {"roll_no": data["rollNo"], "name": data["name"], "email": data["email"], "phone": data["phone"], "course": data["course"], "year": int(data["year"]), "photo_url": data.get("photoUrl"), "user_id": data.get("userId")})
    return jsonify(student_json(row)), 201


def parse_import_rows(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [r for r in raw if isinstance(r, dict)]
    if isinstance(raw, str):
        return list(csv.DictReader(io.StringIO(raw)))
    return []


@app.post("/api/students/import")
@auth_required
@require_role("admin", "teacher")
def import_students():
    data = request.get_json(silent=True)
    raw = data.get("rows", data.get("data", data)) if isinstance(data, dict) else data
    rows = parse_import_rows(raw)
    if not rows:
        return error("No valid rows found. Provide JSON rows or CSV string with headers: rollNo,name,email,phone,course,year,photoUrl,userId")
    inserted = skipped = 0
    for row in rows:
        try:
            roll_no = str(row.get("rollNo", "")).strip()
            if not roll_no or query_one("SELECT id FROM students WHERE roll_no = ?", (roll_no,)):
                skipped += 1
                continue
            insert_and_get("students", {"roll_no": roll_no, "name": str(row.get("name", "")).strip(), "email": str(row.get("email", "")).strip(), "phone": str(row.get("phone", "")).strip(), "course": str(row.get("course", "")).strip(), "year": int(row.get("year", 1)), "photo_url": row.get("photoUrl") or None, "user_id": int(row["userId"]) if row.get("userId") else None})
            inserted += 1
        except (TypeError, ValueError, sqlite3.IntegrityError):
            skipped += 1
    return jsonify({"inserted": inserted, "skipped": skipped, "total": len(rows)}), 201


@app.get("/api/students/<int:student_id>")
@auth_required
def get_student(student_id: int):
    student = query_one("SELECT * FROM students WHERE id = ?", (student_id,))
    if student is None:
        return error("Student not found", 404)
    results = query_all(
        """SELECT r.*, s.name AS student_name, s.roll_no AS student_roll_no, e.exam_name, e.subject
           FROM results r LEFT JOIN students s ON r.student_id = s.id LEFT JOIN exams e ON r.exam_id = e.id
           WHERE r.student_id = ?""",
        (student_id,),
    )
    payload = student_json(student)
    payload["examHistory"] = [result_json(r) for r in results]
    return jsonify(payload)


@app.patch("/api/students/<int:student_id>")
@auth_required
@require_role("admin", "teacher")
def update_student(student_id: int):
    data = body()
    fields = {}
    mapping = {"name": "name", "email": "email", "phone": "phone", "course": "course", "year": "year", "photoUrl": "photo_url"}
    for src, dst in mapping.items():
        if src in data:
            fields[dst] = int(data[src]) if src == "year" else data[src]
    row = update_and_get("students", student_id, fields)
    if row is None:
        return error("Student not found", 404)
    return jsonify(student_json(row))


@app.delete("/api/students/<int:student_id>")
@auth_required
@require_role("admin")
def delete_student(student_id: int):
    cur = execute("DELETE FROM students WHERE id = ?", (student_id,))
    if cur.rowcount == 0:
        return error("Student not found", 404)
    return "", 204


@app.get("/api/exams")
@auth_required
def list_exams():
    page, limit, offset = paginate()
    where, args = [], []
    status = request.args.get("status")
    if request.args.get("subject"):
        where.append("subject = ?")
        args.append(request.args["subject"])
    role = g.user["role"]
    if role == "student":
        student = current_student()
        if student and student["course"]:
            course = student["course"]
            where.append("(eligible_courses IS NULL OR eligible_courses = '[]' OR eligible_courses LIKE ?)")
            args.append(f'%"{course}"%')
    elif role == "teacher":
        teacher_user = query_one("SELECT assigned_subjects FROM users WHERE id = ?", (g.user["userId"],))
        if teacher_user and teacher_user["assigned_subjects"]:
            subjects = json_loads(teacher_user["assigned_subjects"], [])
            if subjects:
                placeholders = ",".join(["?"] * len(subjects))
                where.append(f"subject IN ({placeholders})")
                args.extend(subjects)
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    rows = query_all(f"SELECT * FROM exams {clause} ORDER BY exam_date DESC", tuple(args))
    if status and status != "all":
        current_ms = now_ms()

        def matches_status(row: sqlite3.Row) -> bool:
            start_ms, end_ms = get_exam_window_ms(row)
            if status == "upcoming":
                return row["status"] != "completed" and end_ms >= current_ms
            if status == "ongoing":
                return row["status"] != "completed" and start_ms - EXAM_START_GRACE_MS <= current_ms <= end_ms
            if status == "completed":
                return row["status"] == "completed" or end_ms < current_ms
            return True

        rows = [row for row in rows if matches_status(row)]
    total = len(rows)
    rows = rows[offset:offset + limit]
    return jsonify({"exams": [exam_json(r) for r in rows], "total": total, "page": page, "totalPages": math.ceil(total / limit)})


@app.get("/api/exams/calendar")
@auth_required
def exams_calendar():
    month = request.args.get("month")
    rows = query_all("SELECT * FROM exams ORDER BY exam_date DESC")
    days: dict[str, list[dict[str, Any]]] = {}
    for exam in rows:
        iso = iso_from_ms(exam["exam_date"]) or ""
        if month and iso[:7] != month:
            continue
        days.setdefault(iso[:10], []).append({"id": exam["id"], "examName": exam["exam_name"], "subject": exam["subject"], "startTime": exam["start_time"], "status": exam["status"]})
    return jsonify({"month": month, "days": [{"date": date, "count": len(exams), "exams": exams} for date, exams in sorted(days.items())]})


@app.post("/api/exams")
@auth_required
@require_role("admin", "teacher")
def create_exam():
    data = body()
    message = validate_required(data, ["examName", "subject", "examDate", "startTime", "duration", "totalMarks", "passingMarks"])
    if message:
        return error(message)
    if g.user["role"] == "teacher":
        teacher_user = query_one("SELECT assigned_subjects FROM users WHERE id = ?", (g.user["userId"],))
        if teacher_user and teacher_user["assigned_subjects"]:
            allowed = json_loads(teacher_user["assigned_subjects"], [])
            if allowed and data["subject"] not in allowed:
                return error(f"You are only authorized to create exams for: {', '.join(allowed)}", 403)
    row = insert_and_get("exams", {"exam_name": data["examName"], "subject": data["subject"], "exam_date": ms_from_iso(data["examDate"]), "start_time": data["startTime"], "duration": int(data["duration"]), "total_marks": int(data["totalMarks"]), "passing_marks": int(data["passingMarks"]), "exam_type": "mcq", "eligible_courses": json_dumps(data.get("eligibleCourses", [])), "status": "scheduled", "created_by": g.user["userId"]})
    return jsonify(exam_json(row)), 201


@app.get("/api/exams/<int:exam_id>")
@auth_required
def get_exam(exam_id: int):
    row = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if row is None:
        return error("Exam not found", 404)
    payload = exam_json(row)
    courses = payload["eligibleCourses"]
    payload["questionCount"] = query_one("SELECT COUNT(*) AS count FROM exam_questions WHERE exam_id = ?", (exam_id,))["count"]
    if courses:
        placeholders = ",".join(["?"] * len(courses))
        payload["studentCount"] = query_one(f"SELECT COUNT(*) AS count FROM students WHERE course IN ({placeholders})", tuple(courses))["count"]
    else:
        payload["studentCount"] = query_one("SELECT COUNT(*) AS count FROM students")["count"]
    payload["attendanceCount"] = query_one("SELECT COUNT(*) AS count FROM attendance WHERE exam_id = ?", (exam_id,))["count"]
    return jsonify(payload)


@app.patch("/api/exams/<int:exam_id>")
@auth_required
@require_role("admin", "teacher")
def update_exam(exam_id: int):
    data = body()
    mapping = {"examName": "exam_name", "subject": "subject", "examDate": "exam_date", "startTime": "start_time", "duration": "duration", "totalMarks": "total_marks", "passingMarks": "passing_marks", "eligibleCourses": "eligible_courses", "status": "status"}
    fields = {}
    for src, dst in mapping.items():
        if src in data:
            if src == "examDate":
                fields[dst] = ms_from_iso(data[src])
            elif src == "eligibleCourses":
                fields[dst] = json_dumps(data[src])
            else:
                fields[dst] = data[src]
    fields["exam_type"] = "mcq"
    row = update_and_get("exams", exam_id, fields)
    if row is None:
        return error("Exam not found", 404)
    return jsonify(exam_json(row))


@app.post("/api/exams/<int:exam_id>/duplicate")
@auth_required
@require_role("admin", "teacher")
def duplicate_exam(exam_id: int):
    src = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if src is None:
        return error("Exam not found", 404)
    new_row = insert_and_get("exams", {
        "exam_name": src["exam_name"] + " (Copy)",
        "subject": src["subject"],
        "exam_date": src["exam_date"],
        "start_time": src["start_time"],
        "duration": src["duration"],
        "total_marks": src["total_marks"],
        "passing_marks": src["passing_marks"],
        "exam_type": src["exam_type"] or "mcq",
        "eligible_courses": src["eligible_courses"],
        "status": "scheduled",
        "created_by": g.user["userId"],
    })
    src_qs = query_all("SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY question_order", (exam_id,))
    for q in src_qs:
        insert_and_get("exam_questions", {"exam_id": new_row["id"], "question_id": q["question_id"], "question_order": q["question_order"]})
    return jsonify(exam_json(new_row)), 201


@app.delete("/api/exams/<int:exam_id>")
@auth_required
@require_role("admin")
def delete_exam(exam_id: int):
    cur = execute("DELETE FROM exams WHERE id = ?", (exam_id,))
    if cur.rowcount == 0:
        return error("Exam not found", 404)
    return "", 204


@app.get("/api/exams/<int:exam_id>/questions")
@auth_required
def get_exam_questions(exam_id: int):
    rows = query_all(
        """SELECT
             eq.id AS exam_question_id, eq.exam_id, eq.question_id, eq.question_order,
             q.id AS q_id, q.question_text, q.question_type, q.subject, q.topic, q.difficulty,
             q.options, q.correct_answer, q.marks, q.marking_scheme, q.created_at
           FROM exam_questions eq LEFT JOIN questions q ON eq.question_id = q.id
           WHERE eq.exam_id = ? ORDER BY eq.question_order""",
        (exam_id,),
    )
    return jsonify([
        {
            "id": r["exam_question_id"],
            "examId": r["exam_id"],
            "questionId": r["question_id"],
            "questionOrder": r["question_order"],
            "question": {
                "id": r["q_id"],
                "questionText": r["question_text"] or "",
                "questionType": "mcq",
                "subject": r["subject"] or "",
                "topic": r["topic"] or "",
                "difficulty": r["difficulty"] or "medium",
                "options": json_loads(r["options"], None),
                "correctAnswer": r["correct_answer"],
                "marks": r["marks"] or 1,
                "markingScheme": None,
                "createdAt": iso_from_ms(r["created_at"]) or iso_from_ms(now_ms()),
            },
        }
        for r in rows
    ])


@app.post("/api/exams/<int:exam_id>/questions")
@auth_required
@require_role("admin", "teacher")
def assign_exam_questions(exam_id: int):
    ids = body().get("questionIds", [])
    execute("DELETE FROM exam_questions WHERE exam_id = ?", (exam_id,))
    for idx, qid in enumerate(ids, start=1):
        insert_and_get("exam_questions", {"exam_id": exam_id, "question_id": int(qid), "question_order": idx})
    rows = query_all("SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY question_order", (exam_id,))
    return jsonify([{"id": r["id"], "examId": r["exam_id"], "questionId": r["question_id"], "questionOrder": r["question_order"]} for r in rows])


@app.post("/api/exams/<int:exam_id>/auto-generate")
@auth_required
@require_role("admin", "teacher")
def auto_generate(exam_id: int):
    data = body()
    where, args = ["subject = ?"], [data.get("subject", "")]
    if data.get("difficulty") and data.get("difficulty") != "mixed":
        where.append("difficulty = ?")
        args.append(data["difficulty"])
    rows = query_all(f"SELECT * FROM questions WHERE {' AND '.join(where)} ORDER BY RANDOM() LIMIT ?", (*args, int(data.get("count", 0))))
    execute("DELETE FROM exam_questions WHERE exam_id = ?", (exam_id,))
    for idx, q in enumerate(rows, start=1):
        insert_and_get("exam_questions", {"exam_id": exam_id, "question_id": q["id"], "question_order": idx})
    eqs = query_all("SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY question_order", (exam_id,))
    return jsonify([{"id": r["id"], "examId": r["exam_id"], "questionId": r["question_id"], "questionOrder": r["question_order"]} for r in eqs])


@app.get("/api/exams/<int:exam_id>/eligible-students")
@auth_required
def eligible_students(exam_id: int):
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    courses = json_loads(exam["eligible_courses"], [])
    if courses:
        placeholders = ",".join(["?"] * len(courses))
        rows = query_all(f"SELECT * FROM students WHERE course IN ({placeholders})", tuple(courses))
    else:
        rows = query_all("SELECT * FROM students")
    return jsonify([student_json(r) for r in rows])


@app.get("/api/questions")
@auth_required
def list_questions():
    page, limit, offset = paginate()
    where, args = [], []
    for query_name, column in [("subject", "subject"), ("difficulty", "difficulty"), ("type", "question_type"), ("topic", "topic")]:
        if request.args.get(query_name):
            where.append(f"{column} = ?")
            args.append(request.args[query_name])
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    total = query_one(f"SELECT COUNT(*) AS count FROM questions {clause}", tuple(args))["count"]
    rows = query_all(f"SELECT * FROM questions {clause} ORDER BY created_at LIMIT ? OFFSET ?", (*args, limit, offset))
    return jsonify({"questions": [question_json(r) for r in rows], "total": total, "page": page, "totalPages": math.ceil(total / limit)})


@app.post("/api/questions")
@auth_required
@require_role("admin", "teacher")
def create_question():
    data = body()
    message = validate_required(data, ["questionText", "subject", "topic", "difficulty", "marks", "correctAnswer"])
    if message:
        return error(message)
    options = data.get("options")
    if not isinstance(options, list) or len(options) < 2:
        return error("MCQ questions require at least two options")
    row = insert_and_get("questions", {"question_text": data["questionText"], "question_type": "mcq", "subject": data["subject"], "topic": data["topic"], "difficulty": data["difficulty"], "options": json_dumps(options), "correct_answer": data.get("correctAnswer"), "marks": int(data["marks"]), "marking_scheme": None})
    return jsonify(question_json(row)), 201


@app.post("/api/questions/import")
@auth_required
@require_role("admin", "teacher")
def import_questions():
    data = request.get_json(silent=True)
    raw = data.get("rows", data.get("data", data)) if isinstance(data, dict) else data
    rows = parse_import_rows(raw)
    if not rows:
        return error("No valid rows found. Provide JSON rows or CSV string with headers: questionText,subject,topic,difficulty,options,correctAnswer,marks")
    inserted = 0
    for row in rows:
        if not row.get("questionText") or not row.get("subject") or not row.get("topic"):
            continue
        options = row.get("options")
        if isinstance(options, str):
            options = [x.strip() for x in options.split("|") if x.strip()]
        if not options or len(options) < 2 or not row.get("correctAnswer"):
            continue
        insert_and_get("questions", {"question_text": row["questionText"], "question_type": "mcq", "subject": row["subject"], "topic": row["topic"], "difficulty": row.get("difficulty") or "medium", "options": json_dumps(options), "correct_answer": row.get("correctAnswer") or None, "marks": int(row.get("marks") or 1), "marking_scheme": None})
        inserted += 1
    return jsonify({"inserted": inserted, "total": len(rows)}), 201


@app.get("/api/questions/<int:question_id>")
@auth_required
def get_question(question_id: int):
    row = query_one("SELECT * FROM questions WHERE id = ?", (question_id,))
    if row is None:
        return error("Question not found", 404)
    return jsonify(question_json(row))


@app.patch("/api/questions/<int:question_id>")
@auth_required
@require_role("admin", "teacher")
def update_question(question_id: int):
    data = body()
    mapping = {"questionText": "question_text", "subject": "subject", "topic": "topic", "difficulty": "difficulty", "options": "options", "correctAnswer": "correct_answer", "marks": "marks"}
    fields = {}
    for src, dst in mapping.items():
        if src in data:
            fields[dst] = json_dumps(data[src]) if src == "options" else data[src]
    if "options" in data:
        options = data.get("options")
        if not isinstance(options, list) or len(options) < 2:
            return error("MCQ questions require at least two options")
    if "correctAnswer" in data and not data.get("correctAnswer"):
        return error("MCQ questions require a correct answer")
    fields["question_type"] = "mcq"
    fields["marking_scheme"] = None
    row = update_and_get("questions", question_id, fields)
    if row is None:
        return error("Question not found", 404)
    return jsonify(question_json(row))


@app.delete("/api/questions/<int:question_id>")
@auth_required
@require_role("admin", "teacher")
def delete_question(question_id: int):
    cur = execute("DELETE FROM questions WHERE id = ?", (question_id,))
    if cur.rowcount == 0:
        return error("Question not found", 404)
    return "", 204


def current_student() -> sqlite3.Row | None:
    return query_one("SELECT * FROM students WHERE user_id = ?", (g.user["userId"],))


@app.post("/api/exam-sessions/<int:exam_id>/start")
@auth_required
def start_exam(exam_id: int):
    student = current_student()
    if student is None:
        return error("Student profile not found")
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    start_ms, end_ms = get_exam_window_ms(exam)
    current_ms = now_ms()
    if current_ms < start_ms - EXAM_START_GRACE_MS:
        start_dt = datetime.fromtimestamp(start_ms / 1000, tz=timezone.utc).astimezone(APP_TIMEZONE)
        return error(f"Exam has not started yet. It begins at {exam['start_time']} on {start_dt.strftime('%Y-%m-%d')}.", 403)
    if current_ms > end_ms:
        return error("Exam time has expired. The exam window has closed.", 403)
    if exam["eligible_courses"]:
        courses = json_loads(exam["eligible_courses"], [])
        if courses and student["course"] not in courses:
            return error(f"You are not eligible for this exam. Eligible courses: {', '.join(courses)}", 403)
    pending = query_one("SELECT COALESCE(SUM(amount),0) AS total FROM student_fees WHERE student_id = ? AND status = 'pending'", (student["id"],))
    if pending and pending["total"] and float(pending["total"]) > 0:
        return error(f"Cannot start exam. You have pending dues of \u20b9{float(pending['total']):.0f}. Please clear dues with the administration.", 403)
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None:
        session = insert_and_get("student_exams", {"student_id": student["id"], "exam_id": exam_id, "status": "in_progress"})
    elif session["status"] == "submitted":
        return jsonify({**session_json(session), "alreadySubmitted": True}), 200
    return jsonify(session_json(session))


def deterministic_order_value(session_id: int, question_id: int) -> int:
    return abs((session_id * 1103515245 + question_id * 12345) % 2147483647)


@app.get("/api/exam-sessions/<int:exam_id>/questions")
@auth_required
def exam_session_questions(exam_id: int):
    student = current_student()
    if student is None:
        return error("Student profile not found")
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None:
        return error("Exam session not started")
    rows = query_all("""SELECT q.* FROM exam_questions eq LEFT JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = ? ORDER BY eq.question_order""", (exam_id,))
    answers = {r["question_id"]: r["answer_text"] for r in query_all("SELECT * FROM answers WHERE student_exam_id = ?", (session["id"],))}
    rows.sort(key=lambda r: deterministic_order_value(session["id"], r["id"]))
    return jsonify([{"id": r["id"], "questionText": r["question_text"], "questionType": "mcq", "options": json_loads(r["options"], None), "marks": r["marks"], "savedAnswer": answers.get(r["id"])} for r in rows])


@app.post("/api/exam-sessions/<int:exam_id>/save-answer")
@auth_required
def save_answer(exam_id: int):
    data = body()
    student = current_student()
    if student is None:
        return error("Student profile not found")
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None or session["status"] != "in_progress":
        return error("No active exam session")
    db = get_db()
    db.execute(
        "INSERT INTO answers (student_exam_id, question_id, answer_text, saved_at) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(student_exam_id, question_id) DO UPDATE SET answer_text=excluded.answer_text, saved_at=excluded.saved_at",
        (session["id"], int(data["questionId"]), data.get("answerText", ""), now_ms())
    )
    db.commit()
    return jsonify({"questionId": data["questionId"], "savedAt": iso_from_ms(now_ms())})


@app.post("/api/exam-sessions/<int:exam_id>/save-answers")
@auth_required
def save_answers_batch(exam_id: int):
    data = body()
    student = current_student()
    if student is None:
        return error("Student profile not found")
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None or session["status"] != "in_progress":
        return error("No active exam session")
    answers_list = data.get("answers", [])
    if not isinstance(answers_list, list):
        return error("answers must be a list")
    db = get_db()
    ts = now_ms()
    saved = 0
    valid_qids = {
        row["question_id"]
        for row in query_all("SELECT question_id FROM exam_questions WHERE exam_id = ?", (exam_id,))
    }
    for item in answers_list:
        qid = item.get("questionId")
        answer_text = item.get("answerText", "")
        if qid is None or int(qid) not in valid_qids:
            continue
        try:
            db.execute(
                "INSERT INTO answers (student_exam_id, question_id, answer_text, saved_at) VALUES (?, ?, ?, ?) "
                "ON CONFLICT(student_exam_id, question_id) DO UPDATE SET answer_text=excluded.answer_text, saved_at=excluded.saved_at",
                (session["id"], int(qid), answer_text, ts)
            )
            saved += 1
        except Exception:
            continue
    db.commit()
    return jsonify({"saved": saved, "savedAt": iso_from_ms(ts)})


def _auto_evaluate(session_id: int, student_id: int, exam_id: int) -> dict:
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return {}
    total_row = query_one(
        "SELECT COALESCE(SUM(q.marks), 0) AS total FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = ?",
        (exam_id,)
    )
    answers = query_all(
        "SELECT a.answer_text, q.correct_answer, q.marks FROM answers a "
        "JOIN exam_questions eq ON eq.question_id = a.question_id AND eq.exam_id = ? "
        "JOIN questions q ON a.question_id = q.id WHERE a.student_exam_id = ?",
        (exam_id, session_id)
    )
    obtained = sum((a["marks"] or 1) for a in answers if a["answer_text"] and a["answer_text"] == a["correct_answer"])
    total = (total_row["total"] if total_row else 0) or exam["total_marks"] or 1
    pct = round((obtained / total) * 100, 2)
    grade = calculate_grade(pct)
    existing = query_one("SELECT id FROM results WHERE student_id = ? AND exam_id = ?", (student_id, exam_id))
    if existing:
        update_and_get("results", existing["id"], {"marks_obtained": obtained, "grade": grade, "percentage": pct, "total_marks": total})
        result_id = existing["id"]
    else:
        r = insert_and_get("results", {"student_id": student_id, "exam_id": exam_id, "total_marks": total, "marks_obtained": obtained, "grade": grade, "percentage": pct, "rank": None, "published": 0})
        result_id = r["id"]
    return {"marksObtained": obtained, "totalMarks": total, "percentage": pct, "grade": grade, "resultId": result_id}


@app.post("/api/exam-sessions/<int:exam_id>/submit")
@auth_required
def submit_exam(exam_id: int):
    student = current_student()
    if student is None:
        return error("Student profile not found")
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None:
        return error("No active exam session")
    row = update_and_get("student_exams", session["id"], {"status": "submitted", "end_time": now_ms()})
    result = _auto_evaluate(session["id"], student["id"], exam_id)
    resp = session_json(row)
    resp["result"] = result
    return jsonify(resp)


@app.get("/api/exam-sessions/<int:exam_id>/my-result")
@auth_required
def my_exam_result(exam_id: int):
    student = current_student()
    if student is None:
        return error("Student profile not found")
    row = query_one(
        f"{RESULT_JOIN} WHERE r.student_id = ? AND r.exam_id = ?",
        (student["id"], exam_id)
    )
    if row is None:
        return error("Result not found", 404)
    return jsonify(result_json(row))


@app.get("/api/exam-sessions/<int:exam_id>/status")
@auth_required
def exam_session_status(exam_id: int):
    student = current_student()
    if student is None:
        return error("Student profile not found")
    session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
    if session is None:
        return error("No exam session found", 404)
    return jsonify(session_json(session))


@app.post("/api/exam-sessions/<int:exam_id>/log-incident")
@auth_required
def log_incident(exam_id: int):
    data = body()
    student = current_student()
    if student:
        session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (student["id"], exam_id))
        if session:
            incidents = json_loads(session["incidents"], [])
            incidents.append(f"{data.get('type')}: {data.get('description', '')}")
            fields = {"incidents": json_dumps(incidents)}
            if data.get("type") == "tab_switch":
                fields["tab_switch_count"] = session["tab_switch_count"] + 1
            update_and_get("student_exams", session["id"], fields)
    return jsonify({"message": "Incident logged"})


def calculate_grade(percentage: float) -> str:
    if percentage >= 90:
        return "A+"
    if percentage >= 80:
        return "A"
    if percentage >= 70:
        return "B+"
    if percentage >= 60:
        return "B"
    if percentage >= 50:
        return "C"
    if percentage >= 40:
        return "D"
    return "F"


RESULT_JOIN = """SELECT r.*, s.name AS student_name, s.roll_no AS student_roll_no, e.exam_name, e.subject
FROM results r LEFT JOIN students s ON r.student_id = s.id LEFT JOIN exams e ON r.exam_id = e.id"""


@app.get("/api/results/exam/<int:exam_id>")
@auth_required
def get_exam_results(exam_id: int):
    if g.user["role"] == "student":
        student = current_student()
        if student is None:
            return jsonify([])
        rows = query_all(f"{RESULT_JOIN} WHERE r.exam_id = ? AND r.student_id = ? AND r.published = 1 ORDER BY r.marks_obtained DESC", (exam_id, student["id"]))
    else:
        rows = query_all(f"{RESULT_JOIN} WHERE r.exam_id = ? ORDER BY r.marks_obtained DESC", (exam_id,))
    return jsonify([result_json(r) for r in rows])


@app.post("/api/results/exam/<int:exam_id>/calculate")
@auth_required
@require_role("admin", "teacher")
def calculate_results(exam_id: int):
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    execute("DELETE FROM results WHERE exam_id = ?", (exam_id,))
    sessions = query_all("SELECT * FROM student_exams WHERE exam_id = ?", (exam_id,))
    result_data = []
    total_row = query_one(
        "SELECT COALESCE(SUM(q.marks), 0) AS total FROM exam_questions eq JOIN questions q ON eq.question_id = q.id WHERE eq.exam_id = ?",
        (exam_id,)
    )
    total_marks = (total_row["total"] if total_row else 0) or exam["total_marks"] or 1
    for session in sessions:
        answers = query_all(
            """SELECT a.*, q.correct_answer, q.question_type, q.marks FROM answers a
               JOIN exam_questions eq ON eq.question_id = a.question_id AND eq.exam_id = ?
               JOIN questions q ON a.question_id = q.id WHERE a.student_exam_id = ?""",
            (exam_id, session["id"])
        )
        obtained = 0.0
        for ans in answers:
            obtained += ans["marks"] or 1 if ans["answer_text"] == ans["correct_answer"] else 0
        percentage = (obtained / total_marks) * 100 if total_marks else 0
        result_data.append({"student_id": session["student_id"], "exam_id": exam_id, "total_marks": total_marks, "marks_obtained": obtained, "grade": calculate_grade(percentage), "percentage": round(percentage, 2)})
    result_data.sort(key=lambda r: r["marks_obtained"], reverse=True)
    for idx, data in enumerate(result_data, start=1):
        data["rank"] = idx
        data["published"] = 0
        insert_and_get("results", data)
    rows = query_all(f"{RESULT_JOIN} WHERE r.exam_id = ? ORDER BY r.marks_obtained DESC", (exam_id,))
    return jsonify([result_json(r) for r in rows])


def _generate_ai_feedback(exam_id: int, student_id: int) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return ""
    session = query_one("SELECT id FROM student_exams WHERE exam_id = ? AND student_id = ?", (exam_id, student_id))
    if not session:
        return ""
    rows = query_all(
        "SELECT a.answer_text, q.question_text, q.correct_answer, q.subject, q.topic "
        "FROM answers a JOIN questions q ON a.question_id = q.id WHERE a.student_exam_id = ?",
        (session["id"],)
    )
    if not rows:
        return ""
    wrong = [r for r in rows if r["answer_text"] != r["correct_answer"]]
    total = len(rows)
    wrong_count = len(wrong)
    if wrong_count == 0:
        return f"Perfect score! You answered all {total} questions correctly. Outstanding performance!"
    wrong_summary = "\n".join(
        f"- Q: {r['question_text'][:80]} | Your answer: {r['answer_text']} | Correct: {r['correct_answer']}"
        for r in wrong[:8]
    )
    prompt = f"""A student got {total - wrong_count}/{total} questions correct in a {rows[0]['subject']} exam.

Wrong answers:
{wrong_summary}

Write a SHORT (3-4 sentences max), encouraging, personalized feedback:
1. Acknowledge what they got right
2. Briefly note which topics/concepts to review based on wrong answers
3. End with a motivating tip

Be concise and supportive. No bullet points, just flowing text."""
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"), "temperature": 0.6, "max_tokens": 200,
                  "messages": [{"role": "system", "content": "You are a supportive academic coach giving brief exam feedback."}, {"role": "user", "content": prompt}]},
            timeout=20,
        )
        if resp.ok:
            return resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    except Exception:
        pass
    return ""


@app.post("/api/results/exam/<int:exam_id>/publish")
@auth_required
@require_role("admin", "teacher")
def publish_results(exam_id: int):
    execute("UPDATE results SET published = 1 WHERE exam_id = ?", (exam_id,))
    execute("UPDATE exams SET results_published = 1 WHERE id = ?", (exam_id,))
    exam = query_one("SELECT exam_name FROM exams WHERE id = ?", (exam_id,))
    exam_name = exam["exam_name"] if exam else "your exam"
    sessions = query_all(
        "SELECT se.student_id, s.user_id FROM student_exams se "
        "JOIN students s ON se.student_id = s.id "
        "WHERE se.exam_id = ? AND se.status = 'submitted'", (exam_id,)
    )
    ts = int(time.time() * 1000)
    for sess in sessions:
        ai_note = _generate_ai_feedback(exam_id, sess["student_id"])
        base_msg = f"Results for '{exam_name}' have been published! Check your score in Results."
        full_msg = f"{base_msg} | AI Feedback: {ai_note}" if ai_note else base_msg
        insert_and_get("notifications", {"user_id": sess["user_id"], "message": full_msg, "type": "result", "read_status": 0, "sent_at": ts})
    return jsonify({"message": "Results published", "notified": len(sessions)})


@app.get("/api/results/student/<int:student_id>")
@auth_required
def get_student_results(student_id: int):
    rows = query_all(f"{RESULT_JOIN} WHERE r.student_id = ?", (student_id,))
    return jsonify([result_json(r) for r in rows])


@app.patch("/api/results/<int:result_id>/grade")
@auth_required
@require_role("admin", "teacher")
def grade_subjective(result_id: int):
    _ = result_id
    return error("Subjective grading is disabled. This system is MCQ-only.")


def render_simple_pdf(lines: list[str]) -> bytes:
    def esc(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    commands = "\n".join([f"1 0 0 1 50 780 Tm ({esc(line)}) Tj" if i == 0 else f"0 -18 Td ({esc(line)}) Tj" for i, line in enumerate(lines)])
    content = f"BT\n/F1 12 Tf\n{commands}\nET"
    objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        f"5 0 obj\n<< /Length {len(content.encode())} >>\nstream\n{content}\nendstream\nendobj\n",
    ]
    pdf = "%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf.encode()))
        pdf += obj
    xref_start = len(pdf.encode())
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    pdf += "".join(f"{offsets[i]:010d} 00000 n \n" for i in range(1, len(objects) + 1))
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF"
    return pdf.encode()


@app.get("/api/results/<int:result_id>/pdf")
@auth_required
def result_pdf(result_id: int):
    row = query_one(f"{RESULT_JOIN}, exams ex WHERE r.id = ? AND r.exam_id = ex.id", (result_id,))
    if row is None:
        return error("Result not found", 404)
    pdf = render_simple_pdf(["Marksheet", "", f"Student: {row['student_name'] or ''}", f"Roll No: {row['student_roll_no'] or ''}", f"Exam: {row['exam_name'] or ''}", f"Subject: {row['subject'] or ''}", "", f"Total Marks: {row['total_marks']}", f"Marks Obtained: {row['marks_obtained']}", f"Percentage: {row['percentage']}%", f"Grade: {row['grade']}", f"Rank: {row['rank'] or '-'}", f"Published: {'Yes' if row['published'] else 'No'}"])
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="marksheet-{row["id"]}.pdf"'})


@app.get("/api/attendance/exam/<int:exam_id>")
@auth_required
def exam_attendance(exam_id: int):
    rows = query_all("""SELECT a.*, s.name AS student_name, s.roll_no AS student_roll_no FROM attendance a LEFT JOIN students s ON a.student_id = s.id WHERE a.exam_id = ?""", (exam_id,))
    return jsonify([{"id": r["id"], "studentId": r["student_id"], "examId": r["exam_id"], "status": r["status"], "verificationMethod": r["verification_method"], "timestamp": iso_from_ms(r["timestamp"]), "studentName": r["student_name"] or "", "studentRollNo": r["student_roll_no"] or ""} for r in rows])


@app.post("/api/attendance/mark")
@auth_required
@require_role("admin", "teacher")
def mark_attendance():
    data = body()
    existing = query_one("SELECT * FROM attendance WHERE student_id = ? AND exam_id = ?", (data.get("studentId"), data.get("examId")))
    fields = {"student_id": data.get("studentId"), "exam_id": data.get("examId"), "status": data.get("status"), "verification_method": data.get("verificationMethod") or "manual"}
    row = update_and_get("attendance", existing["id"], {"status": fields["status"], "verification_method": fields["verification_method"]}) if existing else insert_and_get("attendance", fields)
    student = query_one("SELECT * FROM students WHERE id = ?", (row["student_id"],))
    return jsonify({"id": row["id"], "studentId": row["student_id"], "examId": row["exam_id"], "status": row["status"], "verificationMethod": row["verification_method"], "timestamp": iso_from_ms(row["timestamp"]), "studentName": student["name"] if student else "", "studentRollNo": student["roll_no"] if student else ""})


@app.post("/api/attendance/verify-qr")
@auth_required
def verify_qr():
    data = body()
    card = query_one("SELECT * FROM admit_cards WHERE qr_code = ? AND exam_id = ?", (data.get("qrCode"), data.get("examId")))
    if card is None:
        return error("Invalid QR code or exam mismatch", 404)
    existing = query_one("SELECT * FROM attendance WHERE student_id = ? AND exam_id = ?", (card["student_id"], data.get("examId")))
    row = existing or insert_and_get("attendance", {"student_id": card["student_id"], "exam_id": data.get("examId"), "status": "present", "verification_method": "qr_code"})
    student = query_one("SELECT * FROM students WHERE id = ?", (row["student_id"],))
    return jsonify({"id": row["id"], "studentId": row["student_id"], "examId": row["exam_id"], "status": row["status"], "verificationMethod": row["verification_method"], "timestamp": iso_from_ms(row["timestamp"]), "studentName": student["name"] if student else "", "studentRollNo": student["roll_no"] if student else ""})


def admit_card_json(row: sqlite3.Row) -> dict[str, Any]:
    return {"id": row["id"], "studentId": row["student_id"], "examId": row["exam_id"], "qrCode": row["qr_code"], "generatedAt": iso_from_ms(row["generated_at"]), "studentName": row["student_name"] or "", "studentRollNo": row["student_roll_no"] or "", "studentCourse": row["student_course"] or "", "studentPhoto": row["student_photo"], "examName": row["exam_name"] or "", "examDate": iso_from_ms(row["exam_date"]) or "", "examStartTime": row["exam_start_time"] or "", "examDuration": row["exam_duration"] or 0, "subject": row["subject"] or ""}


ADMIT_JOIN = """SELECT ac.*, s.name AS student_name, s.roll_no AS student_roll_no, s.course AS student_course, s.photo_url AS student_photo,
e.exam_name, e.exam_date, e.start_time AS exam_start_time, e.duration AS exam_duration, e.subject
FROM admit_cards ac LEFT JOIN students s ON ac.student_id = s.id LEFT JOIN exams e ON ac.exam_id = e.id"""


@app.get("/api/admit-cards/exam/<int:exam_id>")
@auth_required
def exam_admit_cards(exam_id: int):
    return jsonify([admit_card_json(r) for r in query_all(f"{ADMIT_JOIN} WHERE ac.exam_id = ?", (exam_id,))])


@app.post("/api/admit-cards/exam/<int:exam_id>/generate")
@auth_required
@require_role("admin", "teacher")
def generate_admit_cards(exam_id: int):
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    execute("DELETE FROM admit_cards WHERE exam_id = ?", (exam_id,))
    courses = json_loads(exam["eligible_courses"], [])
    if courses:
        placeholders = ",".join(["?"] * len(courses))
        students = query_all(f"SELECT * FROM students WHERE course IN ({placeholders})", tuple(courses))
    else:
        students = query_all("SELECT * FROM students")
    for student in students:
        insert_and_get("admit_cards", {"student_id": student["id"], "exam_id": exam_id, "qr_code": f"AC-{exam_id}-{student['id']}-{secrets.token_hex(4)}"})
    return jsonify([admit_card_json(r) for r in query_all(f"{ADMIT_JOIN} WHERE ac.exam_id = ?", (exam_id,))])


@app.get("/api/admit-cards/<int:card_id>")
@auth_required
def get_admit_card(card_id: int):
    row = query_one(f"{ADMIT_JOIN} WHERE ac.id = ?", (card_id,))
    if row is None:
        return error("Admit card not found", 404)
    return jsonify(admit_card_json(row))


@app.get("/api/admit-cards/<int:card_id>/pdf")
@auth_required
def admit_card_pdf(card_id: int):
    row = query_one(f"{ADMIT_JOIN} WHERE ac.id = ?", (card_id,))
    if row is None:
        return error("Admit card not found", 404)
    pdf = render_simple_pdf(["Admit Card", "", f"Exam: {row['exam_name'] or ''}", f"Subject: {row['subject'] or ''}", f"Date: {(iso_from_ms(row['exam_date']) or '')[:10]}", f"Start Time: {row['exam_start_time'] or ''}", f"Duration: {row['exam_duration'] or 0} minutes", "", f"Student: {row['student_name'] or ''}", f"Roll No: {row['student_roll_no'] or ''}", f"Course: {row['student_course'] or ''}", "", f"QR Code: {row['qr_code']}", "", "Instructions: Bring this admit card and valid ID to exam hall."])
    return Response(pdf, mimetype="application/pdf", headers={"Content-Disposition": f'inline; filename="admit-card-{row["id"]}.pdf"'})


@app.get("/api/admit-cards/exam/<int:exam_id>/bulk-zip")
@auth_required
@require_role("admin", "teacher")
def bulk_admit_cards_zip(exam_id: int):
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    cards = query_all(f"{ADMIT_JOIN} WHERE ac.exam_id = ?", (exam_id,))
    if not cards:
        return error("No admit cards found. Generate admit cards first.", 404)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for row in cards:
            pdf = render_simple_pdf(["Admit Card", "", f"Exam: {row['exam_name'] or ''}", f"Subject: {row['subject'] or ''}", f"Date: {(iso_from_ms(row['exam_date']) or '')[:10]}", f"Start Time: {row['exam_start_time'] or ''}", f"Duration: {row['exam_duration'] or 0} minutes", "", f"Student: {row['student_name'] or ''}", f"Roll No: {row['student_roll_no'] or ''}", f"Course: {row['student_course'] or ''}", "", f"QR Code: {row['qr_code']}", "", "Instructions: Bring this admit card and valid ID to exam hall."])
            fname = f"admit-card-{row['student_roll_no'] or row['id']}.pdf"
            zf.writestr(fname, pdf)
    buf.seek(0)
    exam_name = (exam["exam_name"] or "exam").replace(" ", "_")
    return Response(buf.read(), mimetype="application/zip", headers={"Content-Disposition": f'attachment; filename="admit-cards-{exam_name}.zip"'})


@app.get("/api/admit-cards/my")
@auth_required
def my_admit_cards():
    student = current_student()
    if student is None:
        return jsonify([])
    rows = query_all(f"{ADMIT_JOIN} WHERE ac.student_id = ? ORDER BY ac.id DESC", (student["id"],))
    return jsonify([admit_card_json(r) for r in rows])


@app.get("/api/exams/<int:exam_id>/live-monitor")
@auth_required
@require_role("admin", "teacher")
def exam_live_monitor(exam_id: int):
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    if exam is None:
        return error("Exam not found", 404)
    courses = json_loads(exam["eligible_courses"], [])
    if courses:
        placeholders = ",".join(["?"] * len(courses))
        students = query_all(f"SELECT * FROM students WHERE course IN ({placeholders})", tuple(courses))
    else:
        students = query_all("SELECT * FROM students")
    result = []
    for s in students:
        session = query_one("SELECT * FROM student_exams WHERE student_id = ? AND exam_id = ?", (s["id"], exam_id))
        result.append({
            "studentId": s["id"],
            "name": s["name"],
            "rollNo": s["roll_no"],
            "course": s["course"],
            "status": session["status"] if session else "not_started",
            "startTime": iso_from_ms(session["start_time"]) if session and session["start_time"] else None,
            "endTime": iso_from_ms(session["end_time"]) if session and session["end_time"] else None,
            "tabSwitches": session["tab_switch_count"] if session else 0,
            "incidents": json_loads(session["incidents"], []) if session else [],
        })
    counts = {
        "notStarted": sum(1 for r in result if r["status"] == "not_started"),
        "inProgress": sum(1 for r in result if r["status"] == "in_progress"),
        "submitted": sum(1 for r in result if r["status"] == "submitted"),
    }
    return jsonify({"exam": exam_json(exam), "students": result, "counts": counts})


def subject_performance(where: str = "", args: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    rows = query_all(f"""SELECT e.subject, AVG(r.percentage) AS average_score, MAX(r.percentage) AS highest_score, MIN(r.percentage) AS lowest_score, COUNT(*) AS total_students, SUM(CASE WHEN r.percentage >= 40 THEN 1 ELSE 0 END) AS pass_count FROM results r LEFT JOIN exams e ON r.exam_id = e.id {where} GROUP BY e.subject""", args)
    return [{"subject": r["subject"] or "", "averageScore": r["average_score"] or 0, "highestScore": r["highest_score"] or 0, "lowestScore": r["lowest_score"] or 0, "totalStudents": r["total_students"], "passRate": ((r["pass_count"] or 0) / r["total_students"] * 100) if r["total_students"] else 0} for r in rows]


@app.get("/api/dashboard/admin")
@auth_required
def admin_dashboard():
    recent = query_all("SELECT * FROM exams ORDER BY created_at DESC LIMIT 5")
    months: dict[str, int] = {}
    for row in query_all("SELECT exam_date FROM exams"):
        key = (iso_from_ms(row["exam_date"]) or "")[:7]
        months[key] = months.get(key, 0) + 1
    return jsonify({"totalStudents": query_one("SELECT COUNT(*) AS c FROM students")["c"], "totalExams": query_one("SELECT COUNT(*) AS c FROM exams")["c"], "upcomingExams": query_one("SELECT COUNT(*) AS c FROM exams WHERE status = 'scheduled'")["c"], "completedExams": query_one("SELECT COUNT(*) AS c FROM exams WHERE status = 'completed'")["c"], "totalQuestions": query_one("SELECT COUNT(*) AS c FROM questions")["c"], "recentExams": [exam_json(r) for r in recent], "examsByMonth": [{"month": k, "count": v} for k, v in sorted(months.items())[-12:]], "performanceOverview": subject_performance()})


@app.get("/api/dashboard/teacher")
@auth_required
def teacher_dashboard():
    uid = g.user["userId"]
    recent = query_all("SELECT * FROM exams WHERE created_by = ? ORDER BY created_at DESC LIMIT 5", (uid,))
    return jsonify({"myExams": query_one("SELECT COUNT(*) AS c FROM exams WHERE created_by = ?", (uid,))["c"], "upcomingExams": query_one("SELECT COUNT(*) AS c FROM exams WHERE created_by = ? AND status = 'scheduled'", (uid,))["c"], "pendingGrading": query_one("SELECT COUNT(*) AS c FROM student_exams WHERE status = 'submitted'")["c"], "recentExams": [exam_json(r) for r in recent], "performanceOverview": subject_performance("WHERE e.created_by = ?", (uid,))})


@app.get("/api/dashboard/student")
@auth_required
def student_dashboard():
    student = current_student()
    if student is None:
        return jsonify({"upcomingExams": [], "recentResults": [], "overallPercentage": 0, "totalExamsTaken": 0, "performanceTrend": []})
    course = student["course"] if student["course"] else None
    if course:
        upcoming = query_all(
            "SELECT * FROM exams WHERE status = 'scheduled' AND (eligible_courses IS NULL OR eligible_courses = '[]' OR eligible_courses LIKE ?) ORDER BY exam_date LIMIT 10",
            (f'%"{course}"%',)
        )
    else:
        upcoming = query_all("SELECT * FROM exams WHERE status = 'scheduled' ORDER BY exam_date LIMIT 10", ())
    results = query_all(f"{RESULT_JOIN}, exams ex WHERE r.student_id = ? AND r.published = 1 AND r.exam_id = ex.id", (student["id"],))
    overall = sum(r["percentage"] for r in results) / len(results) if results else 0
    trend = [{"examName": r["exam_name"] or "", "percentage": r["percentage"], "date": iso_from_ms(r["exam_date"]) if "exam_date" in r.keys() else ""} for r in results]

    submitted_rows = query_all(
        "SELECT se.exam_id, se.status, r.marks_obtained, r.total_marks, r.grade, r.percentage "
        "FROM student_exams se LEFT JOIN results r ON r.student_id = se.student_id AND r.exam_id = se.exam_id "
        "WHERE se.student_id = ?",
        (student["id"],)
    )
    submitted_map = {row["exam_id"]: row for row in submitted_rows}

    upcoming_json = []
    for exam in upcoming:
        ej = exam_json(exam)
        sub = submitted_map.get(exam["id"])
        if sub and sub["status"] == "submitted":
            ej["myStatus"] = "submitted"
            ej["myMarksObtained"] = sub["marks_obtained"]
            ej["myTotalMarks"] = sub["total_marks"]
            ej["myGrade"] = sub["grade"]
            ej["myPercentage"] = sub["percentage"]
        else:
            ej["myStatus"] = "available"
        upcoming_json.append(ej)

    return jsonify({"upcomingExams": upcoming_json, "recentResults": [result_json(r) for r in results], "overallPercentage": round(overall, 2), "totalExamsTaken": len(results), "performanceTrend": trend})


@app.get("/api/dashboard/subject-performance")
@auth_required
def dashboard_subject_performance():
    return jsonify(subject_performance())


@app.get("/api/notifications")
@auth_required
def list_notifications():
    rows = query_all("SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at", (g.user["userId"],))
    return jsonify([{"id": r["id"], "userId": r["user_id"], "message": r["message"], "type": r["type"], "readStatus": to_bool(r["read_status"]), "sentAt": iso_from_ms(r["sent_at"])} for r in rows])


@app.patch("/api/notifications/<int:notif_id>/read")
@auth_required
def read_notification(notif_id: int):
    execute("UPDATE notifications SET read_status = 1 WHERE id = ?", (notif_id,))
    return jsonify({"message": "Notification marked as read"})


@app.post("/api/notifications/read-all")
@auth_required
def read_all_notifications():
    execute("UPDATE notifications SET read_status = 1 WHERE user_id = ?", (g.user["userId"],))
    return jsonify({"message": "All notifications marked as read"})


DEFAULT_SETTINGS = {"gradingScale": json.dumps({"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}), "maxSessionMinutes": "180", "examTabSwitchLimit": "5", "requireStrongPasswords": "true", "resultPublishApprovalRequired": "true"}


@app.patch("/api/admin/users/<int:user_id>/subjects")
@auth_required
@require_role("admin")
def set_teacher_subjects(user_id: int):
    data = body()
    subjects = data.get("subjects", [])
    if not isinstance(subjects, list):
        return error("subjects must be a list")
    execute("UPDATE users SET assigned_subjects = ? WHERE id = ?", (json_dumps(subjects), user_id))
    row = query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    if row is None:
        return error("User not found", 404)
    return jsonify({**user_json(row), "assignedSubjects": json_loads(row["assigned_subjects"], [])})


@app.get("/api/admin/permissions")
@auth_required
@require_role("admin")
@require_permission("access.manage")
def admin_permissions():
    return jsonify({"role": g.user["role"], "permissions": permissions_for(g.user["role"])})


@app.get("/api/admin/users")
@auth_required
@require_role("admin")
@require_permission("users.manage")
def admin_users():
    where, args = [], []
    if request.args.get("role"):
        where.append("role = ?")
        args.append(request.args["role"])
    if request.args.get("active"):
        where.append("is_active = ?")
        args.append(1 if request.args["active"] == "true" else 0)
    if request.args.get("search"):
        where.append("LOWER(username) LIKE ?")
        args.append(f"%{request.args['search'].lower()}%")
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    return jsonify([user_json(r) for r in query_all(f"SELECT * FROM users {clause} ORDER BY username", tuple(args))])


@app.post("/api/admin/users")
@auth_required
@require_role("admin")
@require_permission("users.manage", "roles.manage")
def admin_create_user():
    data = body()
    role = data.get("role")
    if role not in ("admin", "teacher", "student"):
        return error("Invalid role")
    if query_one("SELECT id FROM users WHERE email = ?", (data.get("email"),)):
        return error("Email already exists")
    password_hash = bcrypt.hashpw(data.get("password", "").encode(), bcrypt.gensalt()).decode()
    user = insert_and_get("users", {"username": data.get("username"), "email": data.get("email"), "password_hash": password_hash, "role": role, "is_active": 1})
    if role == "student":
        insert_and_get("students", {"roll_no": f"STU{str(user['id']).zfill(6)}", "name": user["username"], "email": user["email"], "phone": "0000000000", "course": "General", "year": 1, "user_id": user["id"]})
    log_audit("admin.user.create", "user", user["id"], {"role": role, "email": user["email"]})
    return jsonify(user_json(user)), 201


@app.patch("/api/admin/users/<int:user_id>/role")
@auth_required
@require_role("admin")
@require_permission("roles.manage")
def admin_update_role(user_id: int):
    role = body().get("role")
    if role not in ("admin", "teacher", "student"):
        return error("Invalid role")
    user = update_and_get("users", user_id, {"role": role})
    if user is None:
        return error("User not found", 404)
    log_audit("admin.user.role.update", "user", user_id, {"role": role})
    return jsonify(user_json(user))


@app.patch("/api/admin/users/<int:user_id>/status")
@auth_required
@require_role("admin")
@require_permission("users.deactivate")
def admin_update_status(user_id: int):
    is_active = body().get("isActive")
    if not isinstance(is_active, bool):
        return error("isActive must be boolean")
    if user_id == g.user["userId"] and not is_active:
        return error("You cannot deactivate your own account")
    user = update_and_get("users", user_id, {"is_active": 1 if is_active else 0})
    if user is None:
        return error("User not found", 404)
    log_audit("admin.user.activate" if is_active else "admin.user.deactivate", "user", user_id, {"isActive": is_active})
    return jsonify(user_json(user))


@app.get("/api/admin/settings")
@auth_required
@require_role("admin")
@require_permission("system.settings.manage")
def admin_settings():
    settings = dict(DEFAULT_SETTINGS)
    for row in query_all("SELECT * FROM system_settings"):
        settings[row["key"]] = row["value"]
    return jsonify(settings)


@app.put("/api/admin/settings")
@auth_required
@require_role("admin")
@require_permission("system.settings.manage")
def admin_update_settings():
    data = body()
    key, value = data.get("key", ""), data.get("value", "")
    if not key or not value:
        return error("Invalid setting key" if not key else "Invalid setting value")
    execute("""INSERT INTO system_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at""", (key, value, g.user["userId"], now_ms()))
    log_audit("admin.settings.update", "system_settings", key, {"value": value})
    return jsonify({"key": key, "value": value})


@app.get("/api/admin/audit-logs")
@auth_required
@require_role("admin")
@require_permission("audit.view")
def audit_logs():
    limit = min(max(int(request.args.get("limit", 50)), 1), 200)
    rows = query_all("""SELECT a.*, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON a.actor_id = u.id ORDER BY a.created_at DESC LIMIT ?""", (limit,))
    payload = []
    for row in rows:
        payload.append({"id": row["id"], "actorId": row["actor_id"], "actorEmail": row["actor_email"], "action": row["action"], "entity": row["entity"], "entityId": row["entity_id"], "details": json_loads(row["details"], row["details"]), "createdAt": iso_from_ms(row["created_at"])})
    return jsonify(payload)


@app.get("/api/admin/reports/overview")
@auth_required
@require_role("admin")
@require_permission("reports.view")
def reports_overview():
    count = lambda sql, args=(): query_one(sql, args)["c"]
    return jsonify({"users": {"active": count("SELECT COUNT(*) AS c FROM users WHERE is_active = 1"), "inactive": count("SELECT COUNT(*) AS c FROM users WHERE is_active = 0"), "byRole": {"admin": count("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND is_active = 1"), "teacher": count("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher' AND is_active = 1"), "student": count("SELECT COUNT(*) AS c FROM users WHERE role = 'student' AND is_active = 1")}}, "exams": {"draft": count("SELECT COUNT(*) AS c FROM exams WHERE status = 'draft'")}, "results": {"published": count("SELECT COUNT(*) AS c FROM results WHERE published = 1"), "pending": count("SELECT COUNT(*) AS c FROM results WHERE published != 1")}})


ACADEMIC_WORDS = ["exam", "student", "result", "marks", "grade", "subject", "question", "attendance", "admit", "course", "schedule", "test", "paper", "teacher", "faculty", "admin", "dashboard", "academic", "class", "syllabus", "performance", "tab", "switch", "cheat", "integrity", "incident", "name", "list", "email", "who", "which", "roll", "report", "summary", "score", "pass", "fail", "rank", "percentage", "publish"]


@app.post("/api/ai/chat")
@auth_required
def ai_chat():
    message = str(body().get("message", "")).strip()
    if not message:
        return jsonify({"reply": "Please ask an academic question related to exams, students, results, attendance, or schedules."}), 400
    role = g.user["role"]
    GREETINGS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "namaste", "hola", "greetings"]
    is_greeting = any(word in message.lower() for word in GREETINGS)
    if not is_greeting and not any(word in message.lower() for word in ACADEMIC_WORDS):
        return jsonify({"reply": "I can only help with academic and exam-management questions. Please ask about exams, schedules, subjects, results, attendance, question banks, or student/course summaries."})
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({"reply": "AI chat is ready, but the Groq API key is not configured yet. Add GROQ_API_KEY to enable live AI answers."}), 503
    context = {
        "totals": {
            "students": query_one("SELECT COUNT(*) AS c FROM students")["c"],
            "exams": query_one("SELECT COUNT(*) AS c FROM exams")["c"],
            "questions": query_one("SELECT COUNT(*) AS c FROM questions")["c"],
            "publishedResults": query_one("SELECT COUNT(*) AS c FROM results WHERE published = 1")["c"],
        },
        "statusSummary": [dict(r) for r in query_all("SELECT status, COUNT(*) AS total FROM exams GROUP BY status")],
    }
    if role in ("admin", "teacher"):
        context["studentList"] = [
            {"name": r["name"], "email": r["email"], "rollNo": r["roll_no"], "course": r["course"], "year": r["year"]}
            for r in query_all("SELECT name, email, roll_no, course, year FROM students ORDER BY name LIMIT 100")
        ]
        context["tabSwitchReport"] = [
            {
                "studentName": r["student_name"],
                "studentEmail": r["student_email"],
                "examName": r["exam_name"],
                "tabSwitches": r["tab_switch_count"],
                "status": r["status"],
            }
            for r in query_all(
                "SELECT s.name AS student_name, s.email AS student_email, e.exam_name, "
                "se.tab_switch_count, se.status "
                "FROM student_exams se "
                "JOIN students s ON se.student_id = s.id "
                "JOIN exams e ON se.exam_id = e.id "
                "WHERE se.tab_switch_count > 0 "
                "ORDER BY se.tab_switch_count DESC LIMIT 50"
            )
        ]
        context["resultSummary"] = [
            {
                "studentName": r["student_name"],
                "examName": r["exam_name"],
                "percentage": r["percentage"],
                "grade": r["grade"],
                "published": bool(r["published"]),
            }
            for r in query_all(
                "SELECT s.name AS student_name, e.exam_name, r.percentage, r.grade, r.published "
                "FROM results r "
                "JOIN students s ON r.student_id = s.id "
                "JOIN exams e ON r.exam_id = e.id "
                "ORDER BY r.id DESC LIMIT 80"
            )
        ]
        system_prompt = (
            "You are an academic AI assistant inside an exam management system for admin and faculty. "
            "You have access to the full student database including names, emails, roll numbers, courses, "
            "exam results, and tab-switch/integrity data. "
            "Answer questions about specific students by name, email, or roll number. "
            "Report tab switches (cheating signals) accurately when asked. "
            "Only answer academic and exam-management questions. Use only the provided database context."
        )
    else:
        system_prompt = (
            "You are an academic assistant inside an exam management system. "
            "Answer only academic, exam, result, attendance, schedule, subject, question-bank, "
            "or course summary questions. Do NOT reveal any other student's personal data, names, or emails. "
            "Use only the provided aggregate database context."
        )
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"), "temperature": 0.2, "max_tokens": 700, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": f"Database context:\n{json.dumps(context)}\n\nUser role: {role}\nQuestion: {message}"}]},
            timeout=20,
        )
        if not response.ok:
            return jsonify({"reply": "AI service is temporarily unavailable. Please try again later."}), 502
        reply = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return jsonify({"reply": reply or "I could not prepare an answer from the available academic data."})
    except requests.RequestException:
        return jsonify({"reply": "AI chat failed safely. Please try again."}), 500


@app.post("/api/ai/exam-feedback")
@auth_required
def ai_exam_feedback():
    data = body()
    exam_id = int(data.get("examId", 0))
    if not exam_id:
        return error("examId required")
    student = query_one("SELECT id FROM students WHERE user_id = ?", (g.user["userId"],))
    if not student:
        return error("Student profile not found", 404)
    session = query_one("SELECT id FROM student_exams WHERE exam_id = ? AND student_id = ?", (exam_id, student["id"]))
    if not session:
        return error("Session not found", 404)
    rows = query_all(
        "SELECT a.answer_text, q.question_text, q.correct_answer, q.subject, q.topic "
        "FROM answers a JOIN questions q ON a.question_id = q.id WHERE a.student_exam_id = ?",
        (session["id"],)
    )
    if not rows:
        return jsonify({"feedback": "No answers found for this session.", "wrongAnswers": [], "wrongCount": 0, "totalAnswered": 0})
    wrong = [r for r in rows if (r["answer_text"] or "") != (r["correct_answer"] or "")]
    total = len(rows)
    wrong_count = len(wrong)
    wrong_list = [{"question": r["question_text"], "yourAnswer": r["answer_text"], "correctAnswer": r["correct_answer"], "topic": r["topic"]} for r in wrong]
    if wrong_count == 0:
        return jsonify({"feedback": f"Outstanding! You answered all {total} questions correctly. Perfect score — keep up this excellent work!", "wrongAnswers": [], "wrongCount": 0, "totalAnswered": total})
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return jsonify({"feedback": "AI feedback unavailable (API key not configured).", "wrongAnswers": wrong_list, "wrongCount": wrong_count, "totalAnswered": total})
    wrong_summary = "\n".join(
        f"- Q: {r['question_text'][:90]} | Your answer: {r['answer_text']} | Correct: {r['correct_answer']} | Topic: {r['topic']}"
        for r in wrong[:8]
    )
    prompt = f"""A student scored {total - wrong_count}/{total} in a {rows[0]['subject']} exam.

Wrong answers ({wrong_count} mistakes):
{wrong_summary}

Write a SHORT (3-4 sentences), warm, encouraging feedback:
- Praise what they got right ({total - wrong_count} correct)
- Briefly mention which specific topics/concepts to review
- End with one concrete study tip

Keep it personal and motivating. Plain text only, no bullet points."""
    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"), "temperature": 0.65, "max_tokens": 220,
                  "messages": [{"role": "system", "content": "You are a warm, supportive academic coach. Give concise, personalized exam feedback."}, {"role": "user", "content": prompt}]},
            timeout=25,
        )
        feedback_text = ""
        if resp.ok:
            feedback_text = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return jsonify({"feedback": feedback_text or "Keep reviewing the topics you missed — you'll do better next time!", "wrongAnswers": wrong_list, "wrongCount": wrong_count, "totalAnswered": total})
    except Exception:
        return jsonify({"feedback": "Good effort! Review the topics you missed and try again.", "wrongAnswers": wrong_list, "wrongCount": wrong_count, "totalAnswered": total})


@app.post("/api/ai/generate-questions")
@auth_required
def ai_generate_questions():
    if g.user["role"] not in ("admin", "teacher"):
        return error("Only teachers and admins can generate questions", 403)
    data = body()
    subject = str(data.get("subject", "")).strip()
    topic = str(data.get("topic", "")).strip()
    difficulty = str(data.get("difficulty", "medium")).strip()
    count = min(max(int(data.get("count", 5)), 1), 15)
    if not subject or not topic:
        return error("subject and topic are required")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return error("GROQ_API_KEY not configured", 503)
    prompt = f"""Generate exactly {count} multiple-choice questions for an academic exam.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}

Return ONLY a valid JSON array. No explanation. No markdown. No extra text.
Each object must have these exact keys:
- "questionText": string (the question)
- "options": array of exactly 4 strings
- "correctAnswer": string (must exactly match one of the options)
- "marks": integer (1 for easy, 2 for medium, 3 for hard)

Example format:
[
  {{
    "questionText": "What is the powerhouse of the cell?",
    "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"],
    "correctAnswer": "Mitochondria",
    "marks": 1
  }}
]"""
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                "temperature": 0.7,
                "max_tokens": 2500,
                "messages": [
                    {"role": "system", "content": "You are an expert exam question writer. Always return only valid JSON arrays with no extra text or markdown."},
                    {"role": "user", "content": prompt}
                ]
            },
            timeout=30,
        )
        if not response.ok:
            return error("AI service unavailable", 502)
        raw = response.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return error("AI returned unexpected format", 502)
        questions = json.loads(raw[start:end])
        result = []
        for q in questions:
            result.append({
                "questionText": str(q.get("questionText", "")),
                "questionType": "mcq",
                "subject": subject,
                "topic": topic,
                "difficulty": difficulty,
                "options": q.get("options", []),
                "correctAnswer": str(q.get("correctAnswer", "")),
                "marks": int(q.get("marks", 1)),
            })
        return jsonify({"questions": result, "count": len(result)})
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as e:
        return error(f"AI generation failed: {str(e)}", 500)


# ── Fee / Dues Tracker ────────────────────────────────────────────────────────

def fee_json(row: sqlite3.Row) -> dict[str, Any]:
    keys = row.keys()
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "amount": row["amount"],
        "description": row["description"],
        "dueDate": iso_from_ms(row["due_date"]) if row["due_date"] else None,
        "status": row["status"],
        "createdBy": row["created_by"],
        "createdAt": iso_from_ms(row["created_at"]),
        "studentName": row["student_name"] if "student_name" in keys else "",
        "studentRollNo": row["student_roll_no"] if "student_roll_no" in keys else "",
    }


FEE_JOIN = ("SELECT f.*, s.name AS student_name, s.roll_no AS student_roll_no "
            "FROM student_fees f LEFT JOIN students s ON f.student_id = s.id")


@app.get("/api/fees")
@auth_required
@require_role("admin", "teacher")
def list_fees():
    where, args = [], []
    if request.args.get("status") and request.args["status"] != "all":
        where.append("f.status = ?")
        args.append(request.args["status"])
    if request.args.get("studentId"):
        where.append("f.student_id = ?")
        args.append(int(request.args["studentId"]))
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    rows = query_all(f"{FEE_JOIN} {clause} ORDER BY f.created_at DESC", tuple(args))
    return jsonify([fee_json(r) for r in rows])


@app.post("/api/fees")
@auth_required
@require_role("admin", "teacher")
def create_fee():
    data = body()
    msg = validate_required(data, ["studentId", "amount", "description"])
    if msg:
        return error(msg)
    row = insert_and_get("student_fees", {
        "student_id": int(data["studentId"]),
        "amount": float(data["amount"]),
        "description": data["description"],
        "due_date": ms_from_iso(data["dueDate"]) if data.get("dueDate") else None,
        "status": "pending",
        "created_by": g.user["userId"],
    })
    full = query_one(f"{FEE_JOIN} WHERE f.id = ?", (row["id"],))
    return jsonify(fee_json(full)), 201


@app.patch("/api/fees/<int:fee_id>")
@auth_required
@require_role("admin", "teacher")
def update_fee(fee_id: int):
    data = body()
    fields: dict[str, Any] = {}
    if "status" in data and data["status"] in ("pending", "paid", "waived"):
        fields["status"] = data["status"]
    if "amount" in data:
        fields["amount"] = float(data["amount"])
    if "description" in data:
        fields["description"] = data["description"]
    if "dueDate" in data:
        fields["due_date"] = ms_from_iso(data["dueDate"]) if data["dueDate"] else None
    if not fields:
        return error("No valid fields to update")
    update_and_get("student_fees", fee_id, fields)
    full = query_one(f"{FEE_JOIN} WHERE f.id = ?", (fee_id,))
    if full is None:
        return error("Fee not found", 404)
    return jsonify(fee_json(full))


@app.delete("/api/fees/<int:fee_id>")
@auth_required
@require_role("admin", "teacher")
def delete_fee(fee_id: int):
    cur = execute("DELETE FROM student_fees WHERE id = ?", (fee_id,))
    if cur.rowcount == 0:
        return error("Fee not found", 404)
    return "", 204


@app.get("/api/fees/student/<int:student_id>")
@auth_required
def get_student_fees(student_id: int):
    rows = query_all(f"{FEE_JOIN} WHERE f.student_id = ? ORDER BY f.created_at DESC", (student_id,))
    return jsonify([fee_json(r) for r in rows])


# ── Exam Hall Assignment ───────────────────────────────────────────────────────

def hall_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "examId": row["exam_id"],
        "hallName": row["hall_name"],
        "capacity": row["capacity"],
        "floorNo": row["floor_no"],
        "building": row["building"],
        "createdAt": iso_from_ms(row["created_at"]),
    }


def assignment_json(row: sqlite3.Row) -> dict[str, Any]:
    keys = row.keys()
    return {
        "id": row["id"],
        "hallId": row["hall_id"],
        "studentId": row["student_id"],
        "seatNo": row["seat_no"],
        "studentName": row["student_name"] if "student_name" in keys else "",
        "studentRollNo": row["student_roll_no"] if "student_roll_no" in keys else "",
        "hallName": row["hall_name"] if "hall_name" in keys else "",
    }


@app.get("/api/exams/<int:exam_id>/halls")
@auth_required
@require_role("admin", "teacher")
def exam_halls(exam_id: int):
    halls = query_all("SELECT * FROM exam_halls WHERE exam_id = ? ORDER BY hall_name", (exam_id,))
    result = []
    for h in halls:
        assigned = query_one("SELECT COUNT(*) AS c FROM hall_assignments WHERE hall_id = ?", (h["id"],))["c"]
        d = hall_json(h)
        d["assignedCount"] = assigned
        result.append(d)
    return jsonify(result)


@app.post("/api/exams/<int:exam_id>/halls")
@auth_required
@require_role("admin", "teacher")
def create_hall(exam_id: int):
    data = body()
    msg = validate_required(data, ["hallName", "capacity"])
    if msg:
        return error(msg)
    row = insert_and_get("exam_halls", {
        "exam_id": exam_id,
        "hall_name": data["hallName"],
        "capacity": int(data["capacity"]),
        "floor_no": data.get("floorNo") or None,
        "building": data.get("building") or None,
    })
    d = hall_json(row)
    d["assignedCount"] = 0
    return jsonify(d), 201


@app.delete("/api/halls/<int:hall_id>")
@auth_required
@require_role("admin", "teacher")
def delete_hall(hall_id: int):
    cur = execute("DELETE FROM exam_halls WHERE id = ?", (hall_id,))
    if cur.rowcount == 0:
        return error("Hall not found", 404)
    return "", 204


@app.get("/api/halls/<int:hall_id>/assignments")
@auth_required
@require_role("admin", "teacher")
def hall_assignments_list(hall_id: int):
    rows = query_all(
        "SELECT ha.*, s.name AS student_name, s.roll_no AS student_roll_no, h.hall_name "
        "FROM hall_assignments ha "
        "LEFT JOIN students s ON ha.student_id = s.id "
        "LEFT JOIN exam_halls h ON ha.hall_id = h.id "
        "WHERE ha.hall_id = ? ORDER BY ha.seat_no",
        (hall_id,),
    )
    return jsonify([assignment_json(r) for r in rows])


@app.post("/api/exams/<int:exam_id>/halls/auto-assign")
@auth_required
@require_role("admin", "teacher")
def auto_assign_halls(exam_id: int):
    halls = query_all("SELECT * FROM exam_halls WHERE exam_id = ? ORDER BY hall_name", (exam_id,))
    if not halls:
        return error("No halls exist for this exam. Create halls first.")
    exam = query_one("SELECT * FROM exams WHERE id = ?", (exam_id,))
    courses = json_loads(exam["eligible_courses"] if exam else None, [])
    if courses:
        placeholders = ",".join(["?"] * len(courses))
        students = query_all(f"SELECT * FROM students WHERE course IN ({placeholders}) ORDER BY roll_no", tuple(courses))
    else:
        students = query_all("SELECT * FROM students ORDER BY roll_no")
    for h in halls:
        execute("DELETE FROM hall_assignments WHERE hall_id = ?", (h["id"],))
    student_idx = 0
    assigned = 0
    for hall in halls:
        seat_num = 1
        prefix = hall["hall_name"][0].upper() if hall["hall_name"] else "S"
        while seat_num <= hall["capacity"] and student_idx < len(students):
            try:
                insert_and_get("hall_assignments", {
                    "hall_id": hall["id"],
                    "student_id": students[student_idx]["id"],
                    "seat_no": f"{prefix}{seat_num:02d}",
                })
                assigned += 1
            except Exception:
                pass
            student_idx += 1
            seat_num += 1
    return jsonify({"assigned": assigned, "total": len(students), "unassigned": len(students) - assigned})


# ── Grade Book ────────────────────────────────────────────────────────────────

@app.get("/api/gradebook")
@auth_required
@require_role("admin", "teacher")
def gradebook():
    exams = query_all("SELECT id, exam_name, subject, exam_date FROM exams ORDER BY exam_date")
    students = query_all("SELECT * FROM students ORDER BY name")
    results = query_all("SELECT student_id, exam_id, marks_obtained, total_marks, grade, percentage, rank FROM results")
    result_map: dict[tuple[int, int], dict[str, Any]] = {}
    for r in results:
        result_map[(r["student_id"], r["exam_id"])] = {
            "marksObtained": r["marks_obtained"],
            "totalMarks": r["total_marks"],
            "grade": r["grade"],
            "percentage": round(r["percentage"], 1),
            "rank": r["rank"],
        }
    student_rows = []
    for s in students:
        row: dict[str, Any] = {
            "studentId": s["id"],
            "name": s["name"],
            "rollNo": s["roll_no"],
            "course": s["course"],
            "year": s["year"],
            "results": {},
            "average": None,
        }
        pcts = []
        for e in exams:
            res = result_map.get((s["id"], e["id"]))
            row["results"][str(e["id"])] = res
            if res:
                pcts.append(res["percentage"])
        if pcts:
            row["average"] = round(sum(pcts) / len(pcts), 1)
        student_rows.append(row)
    return jsonify({
        "exams": [{"id": e["id"], "examName": e["exam_name"], "subject": e["subject"], "examDate": iso_from_ms(e["exam_date"])} for e in exams],
        "students": student_rows,
    })


# ── Plagiarism Detection ──────────────────────────────────────────────────────

@app.get("/api/exams/<int:exam_id>/plagiarism")
@auth_required
@require_role("admin", "teacher")
def plagiarism_check(exam_id: int):
    sessions = query_all("SELECT * FROM student_exams WHERE exam_id = ? AND status = 'submitted'", (exam_id,))
    if len(sessions) < 2:
        return jsonify({"suspicious": [], "totalPairs": 0, "flaggedPairs": 0, "message": "Need at least 2 submitted sessions to compare."})
    q_ids = [q["question_id"] for q in query_all("SELECT question_id FROM exam_questions WHERE exam_id = ? ORDER BY question_order", (exam_id,))]
    if not q_ids:
        return jsonify({"suspicious": [], "totalPairs": 0, "flaggedPairs": 0, "message": "No questions found for this exam."})
    session_data: dict[int, dict[str, Any]] = {}
    for sess in sessions:
        student = query_one("SELECT name, roll_no FROM students WHERE id = ?", (sess["student_id"],))
        answers = {a["question_id"]: a["answer_text"] for a in query_all("SELECT question_id, answer_text FROM answers WHERE student_exam_id = ?", (sess["id"],))}
        session_data[sess["student_id"]] = {
            "name": student["name"] if student else "Unknown",
            "rollNo": student["roll_no"] if student else "",
            "answers": answers,
            "tabSwitches": sess["tab_switch_count"],
        }
    sids = list(session_data.keys())
    THRESHOLD = 0.80
    suspicious = []
    for i in range(len(sids)):
        for j in range(i + 1, len(sids)):
            s1, s2 = sids[i], sids[j]
            a1, a2 = session_data[s1]["answers"], session_data[s2]["answers"]
            comparable = [qid for qid in q_ids if a1.get(qid) and a2.get(qid)]
            if len(comparable) < 3:
                continue
            matches = sum(1 for qid in comparable if a1[qid] == a2[qid])
            sim = matches / len(comparable)
            if sim >= THRESHOLD:
                suspicious.append({
                    "student1": {"id": s1, "name": session_data[s1]["name"], "rollNo": session_data[s1]["rollNo"], "tabSwitches": session_data[s1]["tabSwitches"]},
                    "student2": {"id": s2, "name": session_data[s2]["name"], "rollNo": session_data[s2]["rollNo"], "tabSwitches": session_data[s2]["tabSwitches"]},
                    "similarity": round(sim * 100, 1),
                    "matchedQuestions": matches,
                    "totalCompared": len(comparable),
                })
    suspicious.sort(key=lambda x: x["similarity"], reverse=True)
    total_pairs = len(sids) * (len(sids) - 1) // 2
    return jsonify({"suspicious": suspicious, "totalPairs": total_pairs, "flaggedPairs": len(suspicious)})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
