import { Router, type IRouter } from "express";
import { eq, sql, count, avg, desc } from "drizzle-orm";
import { db, examsTable, questionsTable, resultsTable, studentsTable } from "@workspace/db";
import { authenticateToken } from "../middlewares/auth";

const router: IRouter = Router();

const academicWords = [
  "exam",
  "student",
  "result",
  "marks",
  "grade",
  "subject",
  "question",
  "attendance",
  "admit",
  "course",
  "schedule",
  "test",
  "paper",
  "teacher",
  "faculty",
  "admin",
  "dashboard",
  "academic",
  "class",
  "syllabus",
  "performance",
];

function isAcademicQuestion(message: string) {
  const text = message.toLowerCase();
  return academicWords.some((word) => text.includes(word));
}

async function getAcademicContext() {
  const [studentCount] = await db.select({ count: count() }).from(studentsTable);
  const [examCount] = await db.select({ count: count() }).from(examsTable);
  const [questionCount] = await db.select({ count: count() }).from(questionsTable);

  const upcomingExams = await db
    .select({
      examName: examsTable.examName,
      subject: examsTable.subject,
      examDate: examsTable.examDate,
      startTime: examsTable.startTime,
      duration: examsTable.duration,
      totalMarks: examsTable.totalMarks,
      passingMarks: examsTable.passingMarks,
      status: examsTable.status,
      resultsPublished: examsTable.resultsPublished,
    })
    .from(examsTable)
    .orderBy(desc(examsTable.examDate))
    .limit(8);

  const courseSummary = await db
    .select({
      course: studentsTable.course,
      year: studentsTable.year,
      total: count(),
    })
    .from(studentsTable)
    .groupBy(studentsTable.course, studentsTable.year);

  const questionSummary = await db
    .select({
      subject: questionsTable.subject,
      difficulty: questionsTable.difficulty,
      total: count(),
    })
    .from(questionsTable)
    .groupBy(questionsTable.subject, questionsTable.difficulty);

  const performanceSummary = await db
    .select({
      subject: examsTable.subject,
      averagePercentage: avg(resultsTable.percentage),
      publishedResults: count(),
    })
    .from(resultsTable)
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.published, true))
    .groupBy(examsTable.subject);

  const gradeSummary = await db
    .select({
      grade: resultsTable.grade,
      total: count(),
    })
    .from(resultsTable)
    .where(eq(resultsTable.published, true))
    .groupBy(resultsTable.grade);

  const statusSummary = await db
    .select({
      status: examsTable.status,
      total: count(),
    })
    .from(examsTable)
    .groupBy(examsTable.status);

  const resultCount = await db
    .select({ total: sql<number>`count(*)` })
    .from(resultsTable)
    .where(eq(resultsTable.published, true));

  return {
    totals: {
      students: Number(studentCount.count),
      exams: Number(examCount.count),
      questions: Number(questionCount.count),
      publishedResults: Number(resultCount[0]?.total ?? 0),
    },
    upcomingExams: upcomingExams.map((exam) => ({
      ...exam,
      examDate: exam.examDate.toISOString(),
    })),
    courseSummary,
    questionSummary,
    performanceSummary: performanceSummary.map((item) => ({
      subject: item.subject,
      averagePercentage: Number(item.averagePercentage ?? 0),
      publishedResults: Number(item.publishedResults),
    })),
    gradeSummary,
    statusSummary,
  };
}

router.post("/ai/chat", authenticateToken, async (req, res): Promise<void> => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    res.status(400).json({ reply: "Please ask an academic question related to exams, students, results, attendance, or schedules." });
    return;
  }

  if (!isAcademicQuestion(message)) {
    res.json({
      reply:
        "I can only help with academic and exam-management questions. Please ask about exams, schedules, subjects, results, attendance, question banks, or student/course summaries.",
    });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      reply:
        "AI chat is ready, but the Groq API key is not configured yet. Add GROQ_API_KEY to enable live AI answers.",
    });
    return;
  }

  try {
    const context = await getAcademicContext();
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        temperature: 0.2,
        max_tokens: 550,
        messages: [
          {
            role: "system",
            content:
              "You are an academic assistant inside an exam management system. Answer only academic, exam, result, attendance, schedule, subject, question-bank, student/course summary, teacher/faculty, or admin dashboard questions. Use only the provided safe database context. Never reveal passwords, emails, phone numbers, raw personal identities, private records, correct answers, secrets, or implementation details. If the user asks unrelated or private questions, politely refuse and redirect to academic topics. Keep answers concise and useful.",
          },
          {
            role: "user",
            content: `Safe database context:\n${JSON.stringify(context)}\n\nUser role: ${req.user?.role}\nQuestion: ${message}`,
          },
        ],
      }),
    });

    if (!groqResponse.ok) {
      req.log.warn({ status: groqResponse.status }, "Groq request failed");
      res.status(502).json({ reply: "AI service is temporarily unavailable. Please try again later." });
      return;
    }

    const data = (await groqResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();

    res.json({
      reply: reply || "I could not prepare an answer from the available academic data.",
    });
  } catch (err) {
    req.log.error({ err }, "AI chat failed");
    res.status(500).json({ reply: "AI chat failed safely. Please try again." });
  }
});

export default router;