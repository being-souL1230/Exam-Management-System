import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, questionsTable } from "@workspace/db";
import {
  CreateQuestionBody,
  UpdateQuestionBody,
  GetQuestionParams,
  UpdateQuestionParams,
  DeleteQuestionParams,
  ListQuestionsQueryParams,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

type QuestionImportRow = {
  questionText: string;
  questionType: "mcq" | "subjective";
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  options: string[] | null;
  correctAnswer: string | null;
  marks: number;
  markingScheme: string | null;
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
      if (current.some((cell) => cell.length > 0)) rows.push(current);
      current = [];
      value = "";
      continue;
    }

    value += ch;
  }

  current.push(value.trim());
  if (current.some((cell) => cell.length > 0)) rows.push(current);
  return rows;
}

function normalizeImportedQuestions(rows: unknown): QuestionImportRow[] {
  if (Array.isArray(rows)) {
    return rows
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const marks = Number(row.marks ?? 1);
        const questionType = row.questionType === "subjective" ? "subjective" : "mcq";
        const difficulty =
          row.difficulty === "easy" || row.difficulty === "hard" ? row.difficulty : "medium";
        if (
          typeof row.questionText !== "string" ||
          typeof row.subject !== "string" ||
          typeof row.topic !== "string" ||
          Number.isNaN(marks)
        ) {
          return null;
        }
        const options =
          Array.isArray(row.options) ? row.options.filter((x): x is string => typeof x === "string") : null;
        return {
          questionText: row.questionText.trim(),
          questionType,
          subject: row.subject.trim(),
          topic: row.topic.trim(),
          difficulty,
          options,
          correctAnswer: typeof row.correctAnswer === "string" ? row.correctAnswer.trim() : null,
          marks,
          markingScheme: typeof row.markingScheme === "string" ? row.markingScheme.trim() : null,
        } satisfies QuestionImportRow;
      })
      .filter((item): item is QuestionImportRow => item !== null);
  }

  if (typeof rows === "string") {
    const csvRows = parseCsvRows(rows);
    if (csvRows.length <= 1) return [];
    const headers = csvRows[0].map((h) => h.trim());
    const indexOf = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    const iText = indexOf("questionText");
    const iType = indexOf("questionType");
    const iSubject = indexOf("subject");
    const iTopic = indexOf("topic");
    const iDifficulty = indexOf("difficulty");
    const iOptions = indexOf("options");
    const iCorrect = indexOf("correctAnswer");
    const iMarks = indexOf("marks");
    const iScheme = indexOf("markingScheme");
    if ([iText, iSubject, iTopic].some((i) => i < 0)) return [];

    return csvRows.slice(1).flatMap((row) => {
      const marks = iMarks >= 0 ? Number(row[iMarks]) : 1;
      if (Number.isNaN(marks)) return [];
      const type = row[iType] === "subjective" ? "subjective" : "mcq";
      const difficulty = row[iDifficulty] === "easy" || row[iDifficulty] === "hard" ? row[iDifficulty] : "medium";
      const options = iOptions >= 0 && row[iOptions] ? row[iOptions].split("|").map((x) => x.trim()) : null;
      return [
        {
          questionText: (row[iText] ?? "").trim(),
          questionType: type,
          subject: (row[iSubject] ?? "").trim(),
          topic: (row[iTopic] ?? "").trim(),
          difficulty,
          options,
          correctAnswer: iCorrect >= 0 && row[iCorrect] ? row[iCorrect].trim() : null,
          marks,
          markingScheme: iScheme >= 0 && row[iScheme] ? row[iScheme].trim() : null,
        } satisfies QuestionImportRow,
      ];
    });
  }

  return [];
}

router.get("/questions", authenticateToken, async (req, res): Promise<void> => {
  const params = ListQuestionsQueryParams.safeParse(req.query);
  const page = params.data?.page ?? 1;
  const limit = params.data?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (params.data?.subject) {
    conditions.push(eq(questionsTable.subject, params.data.subject));
  }
  if (params.data?.difficulty) {
    conditions.push(eq(questionsTable.difficulty, params.data.difficulty));
  }
  if (params.data?.type) {
    conditions.push(eq(questionsTable.questionType, params.data.type));
  }
  if (params.data?.topic) {
    conditions.push(eq(questionsTable.topic, params.data.topic));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult] = await db.select({ count: count() }).from(questionsTable).where(whereClause);
  const total = totalResult.count;

  const questions = await db
    .select()
    .from(questionsTable)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(questionsTable.createdAt);

  res.json({
    questions: questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      markingScheme: q.markingScheme,
      createdAt: q.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/questions/import", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const rows = normalizeImportedQuestions(req.body?.rows ?? req.body?.data ?? req.body);
  if (rows.length === 0) {
    res.status(400).json({
      error:
        "No valid rows found. Provide JSON rows or CSV string with headers: questionText,questionType,subject,topic,difficulty,options,correctAnswer,marks,markingScheme",
    });
    return;
  }

  let inserted = 0;
  for (const row of rows) {
    if (!row.questionText || !row.subject || !row.topic) continue;
    await db.insert(questionsTable).values({
      questionText: row.questionText,
      questionType: row.questionType,
      subject: row.subject,
      topic: row.topic,
      difficulty: row.difficulty,
      options: row.options ?? null,
      correctAnswer: row.correctAnswer ?? null,
      marks: row.marks,
      markingScheme: row.markingScheme ?? null,
    });
    inserted += 1;
  }

  res.status(201).json({ inserted, total: rows.length });
});

router.post("/questions", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [question] = await db.insert(questionsTable).values(parsed.data).returning();

  res.status(201).json({
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    markingScheme: question.markingScheme,
    createdAt: question.createdAt.toISOString(),
  });
});

router.get("/questions/:id", authenticateToken, async (req, res): Promise<void> => {
  const params = GetQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, params.data.id));
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json({
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    markingScheme: question.markingScheme,
    createdAt: question.createdAt.toISOString(),
  });
});

router.patch("/questions/:id", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [question] = await db
    .update(questionsTable)
    .set(parsed.data)
    .where(eq(questionsTable.id, params.data.id))
    .returning();

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json({
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
    options: question.options,
    correctAnswer: question.correctAnswer,
    marks: question.marks,
    markingScheme: question.markingScheme,
    createdAt: question.createdAt.toISOString(),
  });
});

router.delete("/questions/:id", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [question] = await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id)).returning();
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
