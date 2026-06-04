import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, count } from "drizzle-orm";
import { db, studentsTable, resultsTable, examsTable } from "@workspace/db";
import {
  CreateStudentBody,
  UpdateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  DeleteStudentParams,
  ListStudentsQueryParams,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

type StudentImportRow = {
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  year: number;
  photoUrl: string | null;
  userId: number | null;
};

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === '"') {
      if (inQuotes && input[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      current.push(value.trim());
      value = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && input[i + 1] === "\n") i += 1;
      current.push(value.trim());
      if (current.some((cell) => cell.length > 0)) {
        rows.push(current);
      }
      current = [];
      value = "";
      continue;
    }

    value += ch;
  }

  current.push(value.trim());
  if (current.some((cell) => cell.length > 0)) {
    rows.push(current);
  }

  return rows;
}

function normalizeImportedStudents(rows: unknown): StudentImportRow[] {
  if (Array.isArray(rows)) {
    return rows
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const year = Number(row.year);
        if (
          typeof row.rollNo !== "string" ||
          typeof row.name !== "string" ||
          typeof row.email !== "string" ||
          typeof row.phone !== "string" ||
          typeof row.course !== "string" ||
          Number.isNaN(year)
        ) {
          return null;
        }
        return {
          rollNo: row.rollNo.trim(),
          name: row.name.trim(),
          email: row.email.trim(),
          phone: row.phone.trim(),
          course: row.course.trim(),
          year,
          photoUrl: typeof row.photoUrl === "string" ? row.photoUrl.trim() : null,
          userId: typeof row.userId === "number" ? row.userId : null,
        } satisfies StudentImportRow;
      })
      .filter((item): item is StudentImportRow => item !== null);
  }

  if (typeof rows === "string") {
    const csvRows = parseCsvRows(rows);
    if (csvRows.length <= 1) return [];
    const headers = csvRows[0].map((h) => h.trim());
    const indexOf = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const iRoll = indexOf("rollNo");
    const iName = indexOf("name");
    const iEmail = indexOf("email");
    const iPhone = indexOf("phone");
    const iCourse = indexOf("course");
    const iYear = indexOf("year");
    const iPhoto = indexOf("photoUrl");
    const iUser = indexOf("userId");
    if ([iRoll, iName, iEmail, iPhone, iCourse, iYear].some((i) => i < 0)) {
      return [];
    }

    return csvRows.slice(1).flatMap((row) => {
      const year = Number(row[iYear]);
      if (Number.isNaN(year)) return [];
      return [
        {
          rollNo: (row[iRoll] ?? "").trim(),
          name: (row[iName] ?? "").trim(),
          email: (row[iEmail] ?? "").trim(),
          phone: (row[iPhone] ?? "").trim(),
          course: (row[iCourse] ?? "").trim(),
          year,
          photoUrl: iPhoto >= 0 && row[iPhoto] ? row[iPhoto].trim() : null,
          userId: iUser >= 0 && row[iUser] ? Number(row[iUser]) : null,
        } satisfies StudentImportRow,
      ];
    });
  }

  return [];
}

router.get("/students", authenticateToken, async (req, res): Promise<void> => {
  const params = ListStudentsQueryParams.safeParse(req.query);
  const page = params.data?.page ?? 1;
  const limit = params.data?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.data?.search) {
    conditions.push(
      sql`(${studentsTable.name} ILIKE ${`%${params.data.search}%`} OR ${studentsTable.rollNo} ILIKE ${`%${params.data.search}%`})`
    );
  }
  if (params.data?.course) {
    conditions.push(eq(studentsTable.course, params.data.course));
  }
  if (params.data?.year) {
    conditions.push(eq(studentsTable.year, params.data.year));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(studentsTable).where(whereClause);
  const total = totalResult.count;

  const students = await db
    .select()
    .from(studentsTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(studentsTable.name);

  res.json({
    students: students.map((s) => ({
      id: s.id,
      rollNo: s.rollNo,
      name: s.name,
      email: s.email,
      phone: s.phone,
      course: s.course,
      year: s.year,
      photoUrl: s.photoUrl,
      userId: s.userId,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/students", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(studentsTable).where(eq(studentsTable.rollNo, parsed.data.rollNo));
  if (existing.length > 0) {
    res.status(400).json({ error: "Roll number already exists" });
    return;
  }

  const [student] = await db.insert(studentsTable).values(parsed.data).returning();

  res.status(201).json({
    id: student.id,
    rollNo: student.rollNo,
    name: student.name,
    email: student.email,
    phone: student.phone,
    course: student.course,
    year: student.year,
    photoUrl: student.photoUrl,
    userId: student.userId,
    createdAt: student.createdAt.toISOString(),
  });
});

router.post("/students/import", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const rows = normalizeImportedStudents(req.body?.rows ?? req.body?.data ?? req.body);
  if (rows.length === 0) {
    res.status(400).json({
      error:
        "No valid rows found. Provide JSON rows or CSV string with headers: rollNo,name,email,phone,course,year,photoUrl,userId",
    });
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.rollNo || !row.name || !row.email || !row.phone || !row.course) {
      skipped += 1;
      continue;
    }
    const existing = await db.select({ id: studentsTable.id }).from(studentsTable).where(eq(studentsTable.rollNo, row.rollNo));
    if (existing.length > 0) {
      skipped += 1;
      continue;
    }
    await db.insert(studentsTable).values({
      rollNo: row.rollNo,
      name: row.name,
      email: row.email,
      phone: row.phone,
      course: row.course,
      year: row.year,
      photoUrl: row.photoUrl ?? null,
      userId: row.userId ?? null,
    });
    inserted += 1;
  }

  res.status(201).json({ inserted, skipped, total: rows.length });
});

router.get("/students/:id", authenticateToken, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const results = await db
    .select({
      id: resultsTable.id,
      studentId: resultsTable.studentId,
      examId: resultsTable.examId,
      totalMarks: resultsTable.totalMarks,
      marksObtained: resultsTable.marksObtained,
      grade: resultsTable.grade,
      percentage: resultsTable.percentage,
      rank: resultsTable.rank,
      published: resultsTable.published,
      examName: examsTable.examName,
      subject: examsTable.subject,
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.studentId, student.id));

  res.json({
    id: student.id,
    rollNo: student.rollNo,
    name: student.name,
    email: student.email,
    phone: student.phone,
    course: student.course,
    year: student.year,
    photoUrl: student.photoUrl,
    userId: student.userId,
    createdAt: student.createdAt.toISOString(),
    examHistory: results.map((r) => ({
      ...r,
      studentName: student.name,
      studentRollNo: student.rollNo,
      examName: r.examName ?? "",
      subject: r.subject ?? "",
    })),
  });
});

router.patch("/students/:id", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({
    id: student.id,
    rollNo: student.rollNo,
    name: student.name,
    email: student.email,
    phone: student.phone,
    course: student.course,
    year: student.year,
    photoUrl: student.photoUrl,
    userId: student.userId,
    createdAt: student.createdAt.toISOString(),
  });
});

router.delete("/students/:id", authenticateToken, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
