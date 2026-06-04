import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, studentExamsTable, examQuestionsTable, questionsTable, answersTable, studentsTable } from "@workspace/db";
import {
  StartExamParams,
  SaveAnswerParams,
  SaveAnswerBody,
  SubmitExamParams,
  GetExamSessionQuestionsParams,
  GetExamSessionStatusParams,
  LogIncidentParams,
  LogIncidentBody,
} from "@workspace/api-zod";
import { authenticateToken } from "../middlewares/auth";

const router: IRouter = Router();

function deterministicOrderValue(sessionId: number, questionId: number): number {
  // Stable pseudo-random order per session and question.
  return Math.abs((sessionId * 1103515245 + questionId * 12345) % 2147483647);
}

router.post("/exam-sessions/:examId/start", authenticateToken, async (req, res): Promise<void> => {
  const params = StartExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }
  const studentId = students[0].id;

  const existing = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, studentId), eq(studentExamsTable.examId, params.data.examId)));

  if (existing.length > 0) {
    const session = existing[0];
    res.json({
      id: session.id,
      studentId: session.studentId,
      examId: session.examId,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
      status: session.status,
      tabSwitchCount: session.tabSwitchCount,
      incidents: session.incidents ?? [],
    });
    return;
  }

  const [session] = await db
    .insert(studentExamsTable)
    .values({
      studentId,
      examId: params.data.examId,
      status: "in_progress",
    })
    .returning();

  res.json({
    id: session.id,
    studentId: session.studentId,
    examId: session.examId,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    status: session.status,
    tabSwitchCount: session.tabSwitchCount,
    incidents: session.incidents ?? [],
  });
});

router.get("/exam-sessions/:examId/questions", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamSessionQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }
  const studentId = students[0].id;

  const sessions = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, studentId), eq(studentExamsTable.examId, params.data.examId)));

  if (sessions.length === 0) {
    res.status(400).json({ error: "Exam session not started" });
    return;
  }

  const sessionId = sessions[0].id;

  const eqs = await db
    .select({
      questionId: examQuestionsTable.questionId,
      questionText: questionsTable.questionText,
      questionType: questionsTable.questionType,
      options: questionsTable.options,
      marks: questionsTable.marks,
    })
    .from(examQuestionsTable)
    .leftJoin(questionsTable, eq(examQuestionsTable.questionId, questionsTable.id))
    .where(eq(examQuestionsTable.examId, params.data.examId))
    .orderBy(examQuestionsTable.questionOrder);

  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.studentExamId, sessionId));

  const answerMap = new Map(answers.map((a) => [a.questionId, a.answerText]));
  const ordered = [...eqs].sort(
    (a, b) =>
      deterministicOrderValue(sessionId, a.questionId) -
      deterministicOrderValue(sessionId, b.questionId),
  );

  res.json(
    ordered.map((q) => ({
      id: q.questionId,
      questionText: q.questionText ?? "",
      questionType: q.questionType ?? "mcq",
      options: q.options,
      marks: q.marks ?? 1,
      savedAnswer: answerMap.get(q.questionId) ?? null,
    }))
  );
});

router.post("/exam-sessions/:examId/save-answer", authenticateToken, async (req, res): Promise<void> => {
  const params = SaveAnswerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SaveAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }

  const sessions = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, students[0].id), eq(studentExamsTable.examId, params.data.examId)));

  if (sessions.length === 0 || sessions[0].status !== "in_progress") {
    res.status(400).json({ error: "No active exam session" });
    return;
  }

  const sessionId = sessions[0].id;

  const existing = await db
    .select()
    .from(answersTable)
    .where(and(eq(answersTable.studentExamId, sessionId), eq(answersTable.questionId, parsed.data.questionId)));

  if (existing.length > 0) {
    const [answer] = await db
      .update(answersTable)
      .set({ answerText: parsed.data.answerText, savedAt: new Date() })
      .where(eq(answersTable.id, existing[0].id))
      .returning();

    res.json({
      id: answer.id,
      questionId: answer.questionId,
      answerText: answer.answerText,
      savedAt: answer.savedAt.toISOString(),
    });
  } else {
    const [answer] = await db
      .insert(answersTable)
      .values({
        studentExamId: sessionId,
        questionId: parsed.data.questionId,
        answerText: parsed.data.answerText,
      })
      .returning();

    res.json({
      id: answer.id,
      questionId: answer.questionId,
      answerText: answer.answerText,
      savedAt: answer.savedAt.toISOString(),
    });
  }
});

router.post("/exam-sessions/:examId/submit", authenticateToken, async (req, res): Promise<void> => {
  const params = SubmitExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }

  const [session] = await db
    .update(studentExamsTable)
    .set({ status: "submitted", endTime: new Date() })
    .where(and(eq(studentExamsTable.studentId, students[0].id), eq(studentExamsTable.examId, params.data.examId)))
    .returning();

  if (!session) {
    res.status(400).json({ error: "No active exam session" });
    return;
  }

  res.json({
    id: session.id,
    studentId: session.studentId,
    examId: session.examId,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    status: session.status,
    tabSwitchCount: session.tabSwitchCount,
    incidents: session.incidents ?? [],
  });
});

router.get("/exam-sessions/:examId/status", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamSessionStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }

  const sessions = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, students[0].id), eq(studentExamsTable.examId, params.data.examId)));

  if (sessions.length === 0) {
    res.status(404).json({ error: "No exam session found" });
    return;
  }

  const session = sessions[0];
  res.json({
    id: session.id,
    studentId: session.studentId,
    examId: session.examId,
    startTime: session.startTime.toISOString(),
    endTime: session.endTime?.toISOString() ?? null,
    status: session.status,
    tabSwitchCount: session.tabSwitchCount,
    incidents: session.incidents ?? [],
  });
});

router.post("/exam-sessions/:examId/log-incident", authenticateToken, async (req, res): Promise<void> => {
  const params = LogIncidentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = LogIncidentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.status(400).json({ error: "Student profile not found" });
    return;
  }

  const sessions = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, students[0].id), eq(studentExamsTable.examId, params.data.examId)));

  if (sessions.length > 0) {
    const session = sessions[0];
    const currentIncidents = session.incidents ?? [];
    const incident = `${parsed.data.type}: ${parsed.data.description ?? ""}`;

    let updates: any = { incidents: [...currentIncidents, incident] };
    if (parsed.data.type === "tab_switch") {
      updates.tabSwitchCount = session.tabSwitchCount + 1;
    }

    await db.update(studentExamsTable).set(updates).where(eq(studentExamsTable.id, session.id));
  }

  res.json({ message: "Incident logged" });
});

export default router;
