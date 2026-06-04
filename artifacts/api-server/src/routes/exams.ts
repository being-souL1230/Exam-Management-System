import { Router, type IRouter } from "express";
import { eq, and, sql, count, inArray, gt, desc } from "drizzle-orm";
import { db, examsTable, examQuestionsTable, questionsTable, studentsTable, attendanceTable } from "@workspace/db";
import {
  CreateExamBody,
  UpdateExamBody,
  GetExamParams,
  UpdateExamParams,
  DeleteExamParams,
  ListExamsQueryParams,
  AssignQuestionsToExamBody,
  AssignQuestionsToExamParams,
  AutoGenerateQuestionPaperBody,
  AutoGenerateQuestionPaperParams,
  GetExamQuestionsParams,
  GetEligibleStudentsParams,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/exams", authenticateToken, async (req, res): Promise<void> => {
  const params = ListExamsQueryParams.safeParse(req.query);
  const page = params.data?.page ?? 1;
  const limit = params.data?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.data?.status && params.data.status !== "all") {
    if (params.data.status === "upcoming") {
      conditions.push(gt(examsTable.examDate, new Date()));
    } else if (params.data.status === "completed") {
      conditions.push(eq(examsTable.status, "completed"));
    } else if (params.data.status === "ongoing") {
      conditions.push(eq(examsTable.status, "ongoing"));
    }
  }
  if (params.data?.subject) {
    conditions.push(eq(examsTable.subject, params.data.subject));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(examsTable).where(whereClause);
  const total = totalResult.count;

  const exams = await db
    .select()
    .from(examsTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(examsTable.examDate));

  res.json({
    exams: exams.map((e) => ({
      id: e.id,
      examName: e.examName,
      subject: e.subject,
      examDate: e.examDate.toISOString(),
      startTime: e.startTime,
      duration: e.duration,
      totalMarks: e.totalMarks,
      passingMarks: e.passingMarks,
      examType: e.examType,
      eligibleCourses: e.eligibleCourses ?? [],
      status: e.status,
      resultsPublished: e.resultsPublished,
      createdBy: e.createdBy,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/exams/calendar", authenticateToken, async (req, res): Promise<void> => {
  const month = typeof req.query.month === "string" ? req.query.month : undefined; // YYYY-MM
  const exams = await db.select().from(examsTable).orderBy(desc(examsTable.examDate));

  const filtered = month
    ? exams.filter((e) => e.examDate.toISOString().slice(0, 7) === month)
    : exams;

  const byDate: Record<string, Array<{ id: number; examName: string; subject: string; startTime: string; status: string }>> =
    {};

  for (const exam of filtered) {
    const dateKey = exam.examDate.toISOString().slice(0, 10);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({
      id: exam.id,
      examName: exam.examName,
      subject: exam.subject,
      startTime: exam.startTime,
      status: exam.status,
    });
  }

  res.json({
    month: month ?? null,
    days: Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayExams]) => ({
        date,
        count: dayExams.length,
        exams: dayExams,
      })),
  });
});

router.post("/exams", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exam] = await db
    .insert(examsTable)
    .values({
      ...parsed.data,
      status: "scheduled",
      createdBy: req.user!.userId,
    })
    .returning();

  res.status(201).json({
    id: exam.id,
    examName: exam.examName,
    subject: exam.subject,
    examDate: exam.examDate.toISOString(),
    startTime: exam.startTime,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    examType: exam.examType,
    eligibleCourses: exam.eligibleCourses ?? [],
    status: exam.status,
    resultsPublished: exam.resultsPublished,
    createdBy: exam.createdBy,
    createdAt: exam.createdAt.toISOString(),
  });
});

router.get("/exams/:id", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const [qCount] = await db.select({ count: count() }).from(examQuestionsTable).where(eq(examQuestionsTable.examId, exam.id));

  const courses = exam.eligibleCourses ?? [];
  let studentCount = 0;
  if (courses.length > 0) {
    const [sCount] = await db
      .select({ count: count() })
      .from(studentsTable)
      .where(inArray(studentsTable.course, courses));
    studentCount = sCount.count;
  } else {
    const [sCount] = await db.select({ count: count() }).from(studentsTable);
    studentCount = sCount.count;
  }

  const [aCount] = await db.select({ count: count() }).from(attendanceTable).where(eq(attendanceTable.examId, exam.id));

  res.json({
    id: exam.id,
    examName: exam.examName,
    subject: exam.subject,
    examDate: exam.examDate.toISOString(),
    startTime: exam.startTime,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    examType: exam.examType,
    eligibleCourses: exam.eligibleCourses ?? [],
    status: exam.status,
    resultsPublished: exam.resultsPublished,
    createdBy: exam.createdBy,
    createdAt: exam.createdAt.toISOString(),
    questionCount: qCount.count,
    studentCount,
    attendanceCount: aCount.count,
  });
});

router.patch("/exams/:id", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exam] = await db
    .update(examsTable)
    .set(parsed.data)
    .where(eq(examsTable.id, params.data.id))
    .returning();

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  res.json({
    id: exam.id,
    examName: exam.examName,
    subject: exam.subject,
    examDate: exam.examDate.toISOString(),
    startTime: exam.startTime,
    duration: exam.duration,
    totalMarks: exam.totalMarks,
    passingMarks: exam.passingMarks,
    examType: exam.examType,
    eligibleCourses: exam.eligibleCourses ?? [],
    status: exam.status,
    resultsPublished: exam.resultsPublished,
    createdBy: exam.createdBy,
    createdAt: exam.createdAt.toISOString(),
  });
});

router.delete("/exams/:id", authenticateToken, requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db.delete(examsTable).where(eq(examsTable.id, params.data.id)).returning();
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/exams/:id/questions", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const eqs = await db
    .select({
      id: examQuestionsTable.id,
      examId: examQuestionsTable.examId,
      questionId: examQuestionsTable.questionId,
      questionOrder: examQuestionsTable.questionOrder,
      questionText: questionsTable.questionText,
      questionType: questionsTable.questionType,
      subject: questionsTable.subject,
      topic: questionsTable.topic,
      difficulty: questionsTable.difficulty,
      options: questionsTable.options,
      correctAnswer: questionsTable.correctAnswer,
      marks: questionsTable.marks,
      markingScheme: questionsTable.markingScheme,
      questionCreatedAt: questionsTable.createdAt,
    })
    .from(examQuestionsTable)
    .leftJoin(questionsTable, eq(examQuestionsTable.questionId, questionsTable.id))
    .where(eq(examQuestionsTable.examId, params.data.id))
    .orderBy(examQuestionsTable.questionOrder);

  res.json(
    eqs.map((eq) => ({
      id: eq.id,
      examId: eq.examId,
      questionId: eq.questionId,
      questionOrder: eq.questionOrder,
      question: {
        id: eq.questionId,
        questionText: eq.questionText ?? "",
        questionType: eq.questionType ?? "mcq",
        subject: eq.subject ?? "",
        topic: eq.topic ?? "",
        difficulty: eq.difficulty ?? "medium",
        options: eq.options,
        correctAnswer: eq.correctAnswer,
        marks: eq.marks ?? 1,
        markingScheme: eq.markingScheme,
        createdAt: eq.questionCreatedAt?.toISOString() ?? new Date().toISOString(),
      },
    }))
  );
});

router.post("/exams/:id/questions", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = AssignQuestionsToExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AssignQuestionsToExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(examQuestionsTable).where(eq(examQuestionsTable.examId, params.data.id));

  const values = parsed.data.questionIds.map((qId: number, idx: number) => ({
    examId: params.data.id,
    questionId: qId,
    questionOrder: idx + 1,
  }));

  if (values.length > 0) {
    await db.insert(examQuestionsTable).values(values);
  }

  const eqs = await db
    .select({
      id: examQuestionsTable.id,
      examId: examQuestionsTable.examId,
      questionId: examQuestionsTable.questionId,
      questionOrder: examQuestionsTable.questionOrder,
    })
    .from(examQuestionsTable)
    .where(eq(examQuestionsTable.examId, params.data.id))
    .orderBy(examQuestionsTable.questionOrder);

  res.json(eqs.map((eq) => ({ ...eq, question: undefined })));
});

router.post("/exams/:id/auto-generate", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = AutoGenerateQuestionPaperParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AutoGenerateQuestionPaperBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [eq(questionsTable.subject, parsed.data.subject)];
  if (parsed.data.difficulty && parsed.data.difficulty !== "mixed") {
    conditions.push(eq(questionsTable.difficulty, parsed.data.difficulty));
  }

  const questions = await db
    .select()
    .from(questionsTable)
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(parsed.data.count);

  await db.delete(examQuestionsTable).where(eq(examQuestionsTable.examId, params.data.id));

  const values = questions.map((q, idx) => ({
    examId: params.data.id,
    questionId: q.id,
    questionOrder: idx + 1,
  }));

  if (values.length > 0) {
    await db.insert(examQuestionsTable).values(values);
  }

  const eqs = await db
    .select({
      id: examQuestionsTable.id,
      examId: examQuestionsTable.examId,
      questionId: examQuestionsTable.questionId,
      questionOrder: examQuestionsTable.questionOrder,
    })
    .from(examQuestionsTable)
    .where(eq(examQuestionsTable.examId, params.data.id))
    .orderBy(examQuestionsTable.questionOrder);

  res.json(eqs.map((eq) => ({ ...eq, question: undefined })));
});

router.get("/exams/:id/eligible-students", authenticateToken, async (req, res): Promise<void> => {
  const params = GetEligibleStudentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.id));
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

  res.json(
    students.map((s) => ({
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
    }))
  );
});

export default router;
