import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, admitCardsTable, studentsTable, examsTable } from "@workspace/db";
import {
  GetExamAdmitCardsParams,
  GenerateAdmitCardsParams,
  GetAdmitCardParams,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";
import crypto from "crypto";

const router: IRouter = Router();

function escapePdfText(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function renderSimplePdf(lines: string[]): Buffer {
  const textCommands = lines
    .map((line, idx) => {
      const safe = escapePdfText(line);
      if (idx === 0) return `1 0 0 1 50 780 Tm (${safe}) Tj`;
      return `0 -18 Td (${safe}) Tj`;
    })
    .join("\n");

  const contentStream = `BT
/F1 12 Tf
${textCommands}
ET`;

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  );
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  objects.push(
    `5 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

router.get("/admit-cards/exam/:examId", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamAdmitCardsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cards = await db
    .select({
      id: admitCardsTable.id,
      studentId: admitCardsTable.studentId,
      examId: admitCardsTable.examId,
      qrCode: admitCardsTable.qrCode,
      generatedAt: admitCardsTable.generatedAt,
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      studentCourse: studentsTable.course,
      studentPhoto: studentsTable.photoUrl,
      examName: examsTable.examName,
      examDate: examsTable.examDate,
      examStartTime: examsTable.startTime,
      examDuration: examsTable.duration,
      subject: examsTable.subject,
    })
    .from(admitCardsTable)
    .leftJoin(studentsTable, eq(admitCardsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(admitCardsTable.examId, examsTable.id))
    .where(eq(admitCardsTable.examId, params.data.examId));

  res.json(
    cards.map((c) => ({
      ...c,
      generatedAt: c.generatedAt.toISOString(),
      studentName: c.studentName ?? "",
      studentRollNo: c.studentRollNo ?? "",
      studentCourse: c.studentCourse ?? "",
      studentPhoto: c.studentPhoto,
      examName: c.examName ?? "",
      examDate: c.examDate?.toISOString() ?? "",
      examStartTime: c.examStartTime ?? "",
      examDuration: c.examDuration ?? 0,
      subject: c.subject ?? "",
    }))
  );
});

router.post("/admit-cards/exam/:examId/generate", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = GenerateAdmitCardsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  let students;
  if (exam.eligibleCourses && exam.eligibleCourses.length > 0) {
    students = await db.select().from(studentsTable).where(inArray(studentsTable.course, exam.eligibleCourses));
  } else {
    students = await db.select().from(studentsTable);
  }

  await db.delete(admitCardsTable).where(eq(admitCardsTable.examId, params.data.examId));

  const values = students.map((s) => ({
    studentId: s.id,
    examId: params.data.examId,
    qrCode: `AC-${params.data.examId}-${s.id}-${crypto.randomBytes(4).toString("hex")}`,
  }));

  if (values.length > 0) {
    await db.insert(admitCardsTable).values(values);
  }

  const cards = await db
    .select({
      id: admitCardsTable.id,
      studentId: admitCardsTable.studentId,
      examId: admitCardsTable.examId,
      qrCode: admitCardsTable.qrCode,
      generatedAt: admitCardsTable.generatedAt,
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      studentCourse: studentsTable.course,
      studentPhoto: studentsTable.photoUrl,
      examName: examsTable.examName,
      examDate: examsTable.examDate,
      examStartTime: examsTable.startTime,
      examDuration: examsTable.duration,
      subject: examsTable.subject,
    })
    .from(admitCardsTable)
    .leftJoin(studentsTable, eq(admitCardsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(admitCardsTable.examId, examsTable.id))
    .where(eq(admitCardsTable.examId, params.data.examId));

  res.json(
    cards.map((c) => ({
      ...c,
      generatedAt: c.generatedAt.toISOString(),
      studentName: c.studentName ?? "",
      studentRollNo: c.studentRollNo ?? "",
      studentCourse: c.studentCourse ?? "",
      studentPhoto: c.studentPhoto,
      examName: c.examName ?? "",
      examDate: c.examDate?.toISOString() ?? "",
      examStartTime: c.examStartTime ?? "",
      examDuration: c.examDuration ?? 0,
      subject: c.subject ?? "",
    }))
  );
});

router.get("/admit-cards/:id", authenticateToken, async (req, res): Promise<void> => {
  const params = GetAdmitCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cards = await db
    .select({
      id: admitCardsTable.id,
      studentId: admitCardsTable.studentId,
      examId: admitCardsTable.examId,
      qrCode: admitCardsTable.qrCode,
      generatedAt: admitCardsTable.generatedAt,
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      studentCourse: studentsTable.course,
      studentPhoto: studentsTable.photoUrl,
      examName: examsTable.examName,
      examDate: examsTable.examDate,
      examStartTime: examsTable.startTime,
      examDuration: examsTable.duration,
      subject: examsTable.subject,
    })
    .from(admitCardsTable)
    .leftJoin(studentsTable, eq(admitCardsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(admitCardsTable.examId, examsTable.id))
    .where(eq(admitCardsTable.id, params.data.id));

  if (cards.length === 0) {
    res.status(404).json({ error: "Admit card not found" });
    return;
  }

  const c = cards[0];
  res.json({
    ...c,
    generatedAt: c.generatedAt.toISOString(),
    studentName: c.studentName ?? "",
    studentRollNo: c.studentRollNo ?? "",
    studentCourse: c.studentCourse ?? "",
    studentPhoto: c.studentPhoto,
    examName: c.examName ?? "",
    examDate: c.examDate?.toISOString() ?? "",
    examStartTime: c.examStartTime ?? "",
    examDuration: c.examDuration ?? 0,
    subject: c.subject ?? "",
  });
});

router.get("/admit-cards/:id/pdf", authenticateToken, async (req, res): Promise<void> => {
  const params = GetAdmitCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const cards = await db
    .select({
      id: admitCardsTable.id,
      studentId: admitCardsTable.studentId,
      examId: admitCardsTable.examId,
      qrCode: admitCardsTable.qrCode,
      generatedAt: admitCardsTable.generatedAt,
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      studentCourse: studentsTable.course,
      examName: examsTable.examName,
      examDate: examsTable.examDate,
      examStartTime: examsTable.startTime,
      examDuration: examsTable.duration,
      subject: examsTable.subject,
    })
    .from(admitCardsTable)
    .leftJoin(studentsTable, eq(admitCardsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(admitCardsTable.examId, examsTable.id))
    .where(eq(admitCardsTable.id, params.data.id));

  if (cards.length === 0) {
    res.status(404).json({ error: "Admit card not found" });
    return;
  }

  const card = cards[0];
  const pdf = renderSimplePdf([
    "Admit Card",
    "",
    `Exam: ${card.examName ?? ""}`,
    `Subject: ${card.subject ?? ""}`,
    `Date: ${card.examDate ? card.examDate.toISOString().slice(0, 10) : ""}`,
    `Start Time: ${card.examStartTime ?? ""}`,
    `Duration: ${card.examDuration ?? 0} minutes`,
    "",
    `Student: ${card.studentName ?? ""}`,
    `Roll No: ${card.studentRollNo ?? ""}`,
    `Course: ${card.studentCourse ?? ""}`,
    "",
    `QR Code: ${card.qrCode}`,
    "",
    "Instructions: Bring this admit card and valid ID to exam hall.",
  ]);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="admit-card-${card.id}.pdf"`);
  res.send(pdf);
});

export default router;
