import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, attendanceTable, studentsTable, admitCardsTable } from "@workspace/db";
import {
  GetExamAttendanceParams,
  MarkAttendanceBody,
  VerifyQrAttendanceBody,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/attendance/exam/:examId", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const records = await db
    .select({
      id: attendanceTable.id,
      studentId: attendanceTable.studentId,
      examId: attendanceTable.examId,
      status: attendanceTable.status,
      verificationMethod: attendanceTable.verificationMethod,
      timestamp: attendanceTable.timestamp,
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
    })
    .from(attendanceTable)
    .leftJoin(studentsTable, eq(attendanceTable.studentId, studentsTable.id))
    .where(eq(attendanceTable.examId, params.data.examId));

  res.json(
    records.map((r) => ({
      ...r,
      timestamp: r.timestamp.toISOString(),
      studentName: r.studentName ?? "",
      studentRollNo: r.studentRollNo ?? "",
    }))
  );
});

router.post("/attendance/mark", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = MarkAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(
      and(eq(attendanceTable.studentId, parsed.data.studentId), eq(attendanceTable.examId, parsed.data.examId))
    );

  if (existing.length > 0) {
    const [record] = await db
      .update(attendanceTable)
      .set({ status: parsed.data.status, verificationMethod: parsed.data.verificationMethod ?? "manual" })
      .where(eq(attendanceTable.id, existing[0].id))
      .returning();

    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, record.studentId));

    res.json({
      id: record.id,
      studentId: record.studentId,
      examId: record.examId,
      status: record.status,
      verificationMethod: record.verificationMethod,
      timestamp: record.timestamp.toISOString(),
      studentName: student?.name ?? "",
      studentRollNo: student?.rollNo ?? "",
    });
    return;
  }

  const [record] = await db
    .insert(attendanceTable)
    .values({
      studentId: parsed.data.studentId,
      examId: parsed.data.examId,
      status: parsed.data.status,
      verificationMethod: parsed.data.verificationMethod ?? "manual",
    })
    .returning();

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, record.studentId));

  res.json({
    id: record.id,
    studentId: record.studentId,
    examId: record.examId,
    status: record.status,
    verificationMethod: record.verificationMethod,
    timestamp: record.timestamp.toISOString(),
    studentName: student?.name ?? "",
    studentRollNo: student?.rollNo ?? "",
  });
});

router.post("/attendance/verify-qr", authenticateToken, async (req, res): Promise<void> => {
  const parsed = VerifyQrAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const admitCards = await db
    .select()
    .from(admitCardsTable)
    .where(and(eq(admitCardsTable.qrCode, parsed.data.qrCode), eq(admitCardsTable.examId, parsed.data.examId)));

  if (admitCards.length === 0) {
    res.status(404).json({ error: "Invalid QR code or exam mismatch" });
    return;
  }

  const admitCard = admitCards[0];

  const existing = await db
    .select()
    .from(attendanceTable)
    .where(
      and(eq(attendanceTable.studentId, admitCard.studentId), eq(attendanceTable.examId, parsed.data.examId))
    );

  if (existing.length > 0) {
    const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, admitCard.studentId));
    res.json({
      id: existing[0].id,
      studentId: existing[0].studentId,
      examId: existing[0].examId,
      status: existing[0].status,
      verificationMethod: existing[0].verificationMethod,
      timestamp: existing[0].timestamp.toISOString(),
      studentName: student?.name ?? "",
      studentRollNo: student?.rollNo ?? "",
    });
    return;
  }

  const [record] = await db
    .insert(attendanceTable)
    .values({
      studentId: admitCard.studentId,
      examId: parsed.data.examId,
      status: "present",
      verificationMethod: "qr_code",
    })
    .returning();

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, record.studentId));

  res.json({
    id: record.id,
    studentId: record.studentId,
    examId: record.examId,
    status: record.status,
    verificationMethod: record.verificationMethod,
    timestamp: record.timestamp.toISOString(),
    studentName: student?.name ?? "",
    studentRollNo: student?.rollNo ?? "",
  });
});

export default router;
