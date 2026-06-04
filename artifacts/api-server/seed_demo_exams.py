"""
Demo seed: 5 exams with 10 MCQ questions each, created by teacher account.
Run: python3 seed_demo_exams.py
"""
import sqlite3, json, sys
from pathlib import Path
import bcrypt

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "exam-manager.sqlite"

EXAMS = [
    {
        "name": "Mathematics — Algebra Basics",
        "subject": "Mathematics",
        "duration": 45,
        "total_marks": 10,
        "passing_marks": 4,
        "questions": [
            ("What is the value of x in 2x + 6 = 14?", ["2","4","6","8"], "4"),
            ("Simplify: 3(a + 2b) - 2(a - b)", ["a + 4b","a + 8b","5a + 4b","a + 5b"], "a + 8b"),
            ("What is the square root of 144?", ["10","11","12","13"], "12"),
            ("If f(x) = 2x² - 3, find f(3)", ["10","12","15","18"], "15"),
            ("Solve: 5x - 3 = 2x + 9", ["3","4","5","6"], "4"),
            ("Which is a prime number?", ["15","21","37","49"], "37"),
            ("What is 7² + 8²?", ["100","113","115","120"], "113"),
            ("Factorise: x² - 9", ["(x-3)(x+3)","(x-9)(x+1)","(x+9)(x-1)","(x-3)²"], "(x-3)(x+3)"),
            ("LCM of 4 and 6 is:", ["12","18","24","36"], "12"),
            ("What is 15% of 200?", ["25","30","35","40"], "30"),
        ],
    },
    {
        "name": "Physics — Laws of Motion",
        "subject": "Physics",
        "duration": 45,
        "total_marks": 10,
        "passing_marks": 4,
        "questions": [
            ("Newton's first law is also called?", ["Law of Inertia","Law of Acceleration","Law of Reaction","Law of Gravity"], "Law of Inertia"),
            ("F = ma is Newton's ___ law", ["First","Second","Third","Fourth"], "Second"),
            ("Unit of force is?", ["Joule","Watt","Newton","Pascal"], "Newton"),
            ("Which has more inertia: 2kg or 5kg block?", ["2kg","5kg","Equal","Cannot say"], "5kg"),
            ("Action and reaction act on?", ["Same body","Different bodies","Ground","Air"], "Different bodies"),
            ("Momentum = ?", ["mass × velocity","force × time","mass × acceleration","force / time"], "mass × velocity"),
            ("A body at rest will remain at rest unless acted upon by?", ["Gravity","Friction","External force","Inertia"], "External force"),
            ("SI unit of momentum?", ["kg·m","kg·m/s","N·m","kg/m²"], "kg·m/s"),
            ("If mass doubles, force needed to keep same acceleration?", ["Halves","Doubles","Stays same","Quadruples"], "Doubles"),
            ("Speed of light is approx?", ["3×10⁸ m/s","9.8 m/s","343 m/s","1.5×10¹¹ m/s"], "3×10⁸ m/s"),
        ],
    },
    {
        "name": "Chemistry — Atomic Structure",
        "subject": "Chemistry",
        "duration": 40,
        "total_marks": 10,
        "passing_marks": 4,
        "questions": [
            ("Atomic number equals number of?", ["Neutrons","Protons","Electrons","Quarks"], "Protons"),
            ("Who proposed the nuclear model of atom?", ["Bohr","Thomson","Rutherford","Dalton"], "Rutherford"),
            ("Mass number = protons + ?", ["Electrons","Neutrons","Quarks","Bosons"], "Neutrons"),
            ("Charge on an electron is?", ["-1","+1","0","+2"], "-1"),
            ("Isotopes differ in number of?", ["Protons","Electrons","Neutrons","Quarks"], "Neutrons"),
            ("Which shell is closest to nucleus?", ["L","M","N","K"], "K"),
            ("Maximum electrons in 2nd shell?", ["2","8","18","32"], "8"),
            ("Atomic mass of Carbon-12?", ["6","10","12","14"], "12"),
            ("Element with atomic number 1?", ["Helium","Hydrogen","Lithium","Carbon"], "Hydrogen"),
            ("Valence electrons of Sodium (Na, Z=11)?", ["1","2","3","4"], "1"),
        ],
    },
    {
        "name": "English — Grammar & Comprehension",
        "subject": "English",
        "duration": 40,
        "total_marks": 10,
        "passing_marks": 4,
        "questions": [
            ("Choose the correct verb: She ___ to school every day.", ["go","goes","going","gone"], "goes"),
            ("Plural of 'child' is?", ["childs","childes","children","childrens"], "children"),
            ("An antonym of 'brave' is?", ["Bold","Coward","Strong","Fearless"], "Coward"),
            ("Which sentence is passive voice?", ["She sings a song","A song is sung by her","She sang","Singing a song"], "A song is sung by her"),
            ("A synonym of 'happy' is?", ["Sad","Angry","Joyful","Tired"], "Joyful"),
            ("Choose the correct article: ___ apple a day.", ["a","an","the","no article"], "an"),
            ("'Running fast' — 'Running' is a?", ["Noun","Verb","Adjective","Gerund"], "Gerund"),
            ("Identify the noun: 'Honesty is the best policy.'", ["Honesty","best","policy","Both A and C"], "Both A and C"),
            ("Correct spelling?", ["Recieve","Receive","Receve","Receeve"], "Receive"),
            ("'She is taller ___ her sister.' Fill in:", ["then","than","that","though"], "than"),
        ],
    },
    {
        "name": "Computer Science — Programming Fundamentals",
        "subject": "Computer Science",
        "duration": 50,
        "total_marks": 10,
        "passing_marks": 4,
        "questions": [
            ("Which is NOT a programming language?", ["Python","Java","HTML","C++"], "HTML"),
            ("Loop that runs at least once?", ["for","while","do-while","foreach"], "do-while"),
            ("Binary of decimal 10?", ["1000","1010","1100","1110"], "1010"),
            ("What does CPU stand for?", ["Central Processing Unit","Core Power Unit","Control Programming Unit","Central Power Unit"], "Central Processing Unit"),
            ("A variable stores?", ["Only numbers","Data in memory","Instructions","Files"], "Data in memory"),
            ("Time complexity of binary search?", ["O(n)","O(n²)","O(log n)","O(1)"], "O(log n)"),
            ("Which is a compiled language?", ["Python","JavaScript","C","Ruby"], "C"),
            ("RAM is ___ memory", ["Permanent","Volatile","Read-only","Magnetic"], "Volatile"),
            ("OOP stands for?", ["Object Oriented Programming","Open Operating Platform","Object Output Processing","None"], "Object Oriented Programming"),
            ("Output of: print(2**10) in Python?", ["20","100","512","1024"], "1024"),
        ],
    },
]


def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    teacher = conn.execute("SELECT * FROM users WHERE role='teacher' LIMIT 1").fetchone()
    if teacher is None:
        pw = bcrypt.hashpw("teacher123".encode(), bcrypt.gensalt()).decode()
        conn.execute(
            "INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?,?,?,?)",
            ("Teacher", "teacher@example.com", pw, "teacher")
        )
        conn.commit()
        teacher = conn.execute("SELECT * FROM users WHERE email='teacher@example.com'").fetchone()

    print(f"Using teacher: {teacher['email']} (id={teacher['id']})")

    import time
    base_ts = int(time.time() * 1000) + 7 * 24 * 3600 * 1000

    created = 0
    for i, ex in enumerate(EXAMS):
        exam_date = base_ts + i * 24 * 3600 * 1000

        cur = conn.execute(
            "INSERT INTO exams (exam_name, subject, exam_date, start_time, duration, total_marks, passing_marks, exam_type, status, created_by) "
            "VALUES (?,?,?,?,?,?,?,'mcq','scheduled',?)",
            (ex["name"], ex["subject"], exam_date, "10:00", ex["duration"], ex["total_marks"], ex["passing_marks"], teacher["id"])
        )
        exam_id = cur.lastrowid

        for order, (qtext, opts, correct) in enumerate(ex["questions"], start=1):
            qcur = conn.execute(
                "INSERT INTO questions (question_text, question_type, subject, topic, difficulty, options, correct_answer, marks) "
                "VALUES (?,?,?,?,?,?,?,?)",
                (qtext, "mcq", ex["subject"], ex["subject"], "medium", json.dumps(opts), correct, 1)
            )
            qid = qcur.lastrowid
            conn.execute(
                "INSERT INTO exam_questions (exam_id, question_id, question_order) VALUES (?,?,?)",
                (exam_id, qid, order)
            )

        conn.commit()
        created += 1
        print(f"  Created exam [{exam_id}]: {ex['name']} ({len(ex['questions'])} questions)")

    print(f"\nDone — {created} exams created.")
    print("Teacher login: teacher@example.com / teacher123")
    conn.close()


if __name__ == "__main__":
    seed()
