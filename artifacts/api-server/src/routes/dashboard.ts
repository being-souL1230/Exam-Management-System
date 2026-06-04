import { Router, type IRouter } from "express";
import { eq, sql, count, and, avg, max, min, gt, desc } from "drizzle-orm";
import { db, studentsTable, examsTable, questionsTable, resultsTable, studentExamsTable } from "@workspace/db";
import { authenticateToken } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/admin", authenticateToken, async (req, res): Promise<void> => {
  const [studentCount] = await db.select({ count: count() }).from(studentsTable);
  const [examCount] = await db.select({ count: count() }).from(examsTable);
  const [questionCount] = await db.select({ count: count() }).from(questionsTable);
  const [upcomingCount] = await db
    .select({ count: count() })
    .from(examsTable)
    .where(gt(examsTable.examDate, new Date()));
  const [completedCount] = await db
    .select({ count: count() })
    .from(examsTable)
    .where(eq(examsTable.status, "completed"));

  const recentExams = await db
    .select()
    .from(examsTable)
    .orderBy(desc(examsTable.createdAt))
    .limit(5);

  const examDates = await db.select({ examDate: examsTable.examDate }).from(examsTable);
  const examsByMonthMap = examDates.reduce<Record<string, number>>((acc, row) => {
    const month = row.examDate.toISOString().slice(0, 7);
    acc[month] = (acc[month] ?? 0) + 1;
    return acc;
  }, {});
  const examsByMonth = Object.entries(examsByMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, monthCount]) => ({ month, count: monthCount }));

  const performanceOverview = await db
    .select({
      subject: examsTable.subject,
      averageScore: avg(resultsTable.percentage),
      highestScore: max(resultsTable.percentage),
      lowestScore: min(resultsTable.percentage),
      totalStudents: count(),
      passCount: sql<number>`SUM(CASE WHEN ${resultsTable.percentage} >= 40 THEN 1 ELSE 0 END)`,
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .groupBy(examsTable.subject);

  res.json({
    totalStudents: studentCount.count,
    totalExams: examCount.count,
    upcomingExams: upcomingCount.count,
    completedExams: completedCount.count,
    totalQuestions: questionCount.count,
    recentExams: recentExams.map((e) => ({
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
    examsByMonth: examsByMonth.map((e) => ({
      month: e.month,
      count: Number(e.count),
    })),
    performanceOverview: performanceOverview.map((p) => ({
      subject: p.subject ?? "",
      averageScore: Number(p.averageScore) || 0,
      highestScore: Number(p.highestScore) || 0,
      lowestScore: Number(p.lowestScore) || 0,
      totalStudents: Number(p.totalStudents),
      passRate: p.totalStudents > 0 ? (Number(p.passCount) / Number(p.totalStudents)) * 100 : 0,
    })),
  });
});

router.get("/dashboard/teacher", authenticateToken, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [myExamCount] = await db
    .select({ count: count() })
    .from(examsTable)
    .where(eq(examsTable.createdBy, userId));
  const [upcomingCount] = await db
    .select({ count: count() })
    .from(examsTable)
    .where(and(eq(examsTable.createdBy, userId), gt(examsTable.examDate, new Date())));

  const pendingGrading = await db
    .select({ count: count() })
    .from(studentExamsTable)
    .where(eq(studentExamsTable.status, "submitted"));

  const recentExams = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.createdBy, userId))
    .orderBy(desc(examsTable.createdAt))
    .limit(5);

  const performanceOverview = await db
    .select({
      subject: examsTable.subject,
      averageScore: avg(resultsTable.percentage),
      highestScore: max(resultsTable.percentage),
      lowestScore: min(resultsTable.percentage),
      totalStudents: count(),
      passCount: sql<number>`SUM(CASE WHEN ${resultsTable.percentage} >= 40 THEN 1 ELSE 0 END)`,
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(examsTable.createdBy, userId))
    .groupBy(examsTable.subject);

  res.json({
    myExams: myExamCount.count,
    upcomingExams: upcomingCount.count,
    pendingGrading: pendingGrading[0].count,
    recentExams: recentExams.map((e) => ({
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
    performanceOverview: performanceOverview.map((p) => ({
      subject: p.subject ?? "",
      averageScore: Number(p.averageScore) || 0,
      highestScore: Number(p.highestScore) || 0,
      lowestScore: Number(p.lowestScore) || 0,
      totalStudents: Number(p.totalStudents),
      passRate: p.totalStudents > 0 ? (Number(p.passCount) / Number(p.totalStudents)) * 100 : 0,
    })),
  });
});

router.get("/dashboard/student", authenticateToken, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
  if (students.length === 0) {
    res.json({
      upcomingExams: [],
      recentResults: [],
      overallPercentage: 0,
      totalExamsTaken: 0,
      performanceTrend: [],
    });
    return;
  }

  const studentId = students[0].id;
  const studentCourse = students[0].course;

  const upcomingExams = await db
    .select()
    .from(examsTable)
    .where(gt(examsTable.examDate, new Date()))
    .orderBy(examsTable.examDate)
    .limit(5);

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
      examDate: examsTable.examDate,
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(and(eq(resultsTable.studentId, studentId), eq(resultsTable.published, true)));

  const totalExamsTaken = results.length;
  const overallPercentage =
    totalExamsTaken > 0
      ? results.reduce((sum, r) => sum + r.percentage, 0) / totalExamsTaken
      : 0;

  const performanceTrend = results.map((r) => ({
    examName: r.examName ?? "",
    percentage: r.percentage,
    date: r.examDate?.toISOString() ?? "",
  }));

  res.json({
    upcomingExams: upcomingExams.map((e) => ({
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
    recentResults: results.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      examId: r.examId,
      totalMarks: r.totalMarks,
      marksObtained: r.marksObtained,
      grade: r.grade,
      percentage: r.percentage,
      rank: r.rank,
      published: r.published,
      studentName: students[0].name,
      studentRollNo: students[0].rollNo,
      examName: r.examName ?? "",
      subject: r.subject ?? "",
    })),
    overallPercentage: Math.round(overallPercentage * 100) / 100,
    totalExamsTaken,
    performanceTrend,
  });
});

router.get("/dashboard/subject-performance", authenticateToken, async (req, res): Promise<void> => {
  const performanceData = await db
    .select({
      subject: examsTable.subject,
      averageScore: avg(resultsTable.percentage),
      highestScore: max(resultsTable.percentage),
      lowestScore: min(resultsTable.percentage),
      totalStudents: count(),
      passCount: sql<number>`SUM(CASE WHEN ${resultsTable.percentage} >= 40 THEN 1 ELSE 0 END)`,
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .groupBy(examsTable.subject);

  res.json(
    performanceData.map((p) => ({
      subject: p.subject ?? "",
      averageScore: Number(p.averageScore) || 0,
      highestScore: Number(p.highestScore) || 0,
      lowestScore: Number(p.lowestScore) || 0,
      totalStudents: Number(p.totalStudents),
      passRate: p.totalStudents > 0 ? (Number(p.passCount) / Number(p.totalStudents)) * 100 : 0,
    }))
  );
});

export default router;
