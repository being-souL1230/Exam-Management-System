import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  resultsTable,
  studentExamsTable,
  answersTable,
  questionsTable,
  examsTable,
  studentsTable,
  examQuestionsTable,
} from "@workspace/db";
import {
  GetExamResultsParams,
  CalculateResultsParams,
  PublishResultsParams,
  GetStudentResultsParams,
  GradeSubjectiveParams,
  GradeSubjectiveBody,
} from "@workspace/api-zod";
import { authenticateToken, requireRole } from "../middlewares/auth";

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

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

router.get("/results/exam/:examId", authenticateToken, async (req, res): Promise<void> => {
  const params = GetExamResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      examName: examsTable.examName,
      subject: examsTable.subject,
    })
    .from(resultsTable)
    .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.examId, params.data.examId))
    .orderBy(sql`${resultsTable.marksObtained} DESC`);

  res.json(
    results.map((r) => ({
      ...r,
      studentName: r.studentName ?? "",
      studentRollNo: r.studentRollNo ?? "",
      examName: r.examName ?? "",
      subject: r.subject ?? "",
    }))
  );
});

router.post("/results/exam/:examId/calculate", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = CalculateResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const examId = params.data.examId;

  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  const sessions = await db
    .select()
    .from(studentExamsTable)
    .where(eq(studentExamsTable.examId, examId));

  await db.delete(resultsTable).where(eq(resultsTable.examId, examId));

  const resultData = [];

  for (const session of sessions) {
    const answers = await db
      .select({
        answerText: answersTable.answerText,
        questionId: answersTable.questionId,
        correctAnswer: questionsTable.correctAnswer,
        questionType: questionsTable.questionType,
        marks: questionsTable.marks,
        marksObtained: answersTable.marksObtained,
      })
      .from(answersTable)
      .leftJoin(questionsTable, eq(answersTable.questionId, questionsTable.id))
      .where(eq(answersTable.studentExamId, session.id));

    let totalObtained = 0;
    for (const ans of answers) {
      if (ans.questionType === "mcq") {
        if (ans.answerText === ans.correctAnswer) {
          totalObtained += ans.marks ?? 1;
        }
      } else {
        totalObtained += ans.marksObtained ?? 0;
      }
    }

    const percentage = exam.totalMarks > 0 ? (totalObtained / exam.totalMarks) * 100 : 0;
    const grade = calculateGrade(percentage);

    resultData.push({
      studentId: session.studentId,
      examId,
      totalMarks: exam.totalMarks,
      marksObtained: totalObtained,
      grade,
      percentage: Math.round(percentage * 100) / 100,
      published: false,
    });
  }

  resultData.sort((a, b) => b.marksObtained - a.marksObtained);
  resultData.forEach((r, idx) => {
    (r as any).rank = idx + 1;
  });

  if (resultData.length > 0) {
    await db.insert(resultsTable).values(resultData);
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
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      examName: examsTable.examName,
      subject: examsTable.subject,
    })
    .from(resultsTable)
    .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.examId, examId))
    .orderBy(sql`${resultsTable.marksObtained} DESC`);

  res.json(
    results.map((r) => ({
      ...r,
      studentName: r.studentName ?? "",
      studentRollNo: r.studentRollNo ?? "",
      examName: r.examName ?? "",
      subject: r.subject ?? "",
    }))
  );
});

router.post("/results/exam/:examId/publish", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = PublishResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .update(resultsTable)
    .set({ published: true })
    .where(eq(resultsTable.examId, params.data.examId));

  await db
    .update(examsTable)
    .set({ resultsPublished: true })
    .where(eq(examsTable.id, params.data.examId));

  res.json({ message: "Results published" });
});

router.get("/results/student/:studentId", authenticateToken, async (req, res): Promise<void> => {
  const params = GetStudentResultsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
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
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      examName: examsTable.examName,
      subject: examsTable.subject,
    })
    .from(resultsTable)
    .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.studentId, params.data.studentId));

  res.json(
    results.map((r) => ({
      ...r,
      studentName: r.studentName ?? "",
      studentRollNo: r.studentRollNo ?? "",
      examName: r.examName ?? "",
      subject: r.subject ?? "",
    }))
  );
});

router.patch("/results/:resultId/grade", authenticateToken, requireRole("admin", "teacher"), async (req, res): Promise<void> => {
  const params = GradeSubjectiveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = GradeSubjectiveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [result] = await db.select().from(resultsTable).where(eq(resultsTable.id, params.data.resultId));
  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }

  const session = await db
    .select()
    .from(studentExamsTable)
    .where(and(eq(studentExamsTable.studentId, result.studentId), eq(studentExamsTable.examId, result.examId)));

  if (session.length > 0) {
    for (const grade of parsed.data.grades) {
      await db
        .update(answersTable)
        .set({ marksObtained: grade.marksObtained })
        .where(
          and(eq(answersTable.studentExamId, session[0].id), eq(answersTable.questionId, grade.questionId))
        );
    }
  }

  const [updated] = await db
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
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      examName: examsTable.examName,
      subject: examsTable.subject,
    })
    .from(resultsTable)
    .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.id, params.data.resultId));

  res.json({
    ...updated,
    studentName: updated.studentName ?? "",
    studentRollNo: updated.studentRollNo ?? "",
    examName: updated.examName ?? "",
    subject: updated.subject ?? "",
  });
});

router.get("/results/:resultId/pdf", authenticateToken, async (req, res): Promise<void> => {
  const resultId = Number(req.params.resultId);
  if (Number.isNaN(resultId) || resultId <= 0) {
    res.status(400).json({ error: "Invalid result id" });
    return;
  }

  const [row] = await db
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
      studentName: studentsTable.name,
      studentRollNo: studentsTable.rollNo,
      examName: examsTable.examName,
      subject: examsTable.subject,
      examDate: examsTable.examDate,
    })
    .from(resultsTable)
    .leftJoin(studentsTable, eq(resultsTable.studentId, studentsTable.id))
    .leftJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .where(eq(resultsTable.id, resultId));

  if (!row) {
    res.status(404).json({ error: "Result not found" });
    return;
  }

  const pdf = renderSimplePdf([
    "Marksheet",
    "",
    `Student: ${row.studentName ?? ""}`,
    `Roll No: ${row.studentRollNo ?? ""}`,
    `Exam: ${row.examName ?? ""}`,
    `Subject: ${row.subject ?? ""}`,
    `Exam Date: ${row.examDate ? row.examDate.toISOString().slice(0, 10) : ""}`,
    "",
    `Total Marks: ${row.totalMarks}`,
    `Marks Obtained: ${row.marksObtained}`,
    `Percentage: ${row.percentage}%`,
    `Grade: ${row.grade}`,
    `Rank: ${row.rank ?? "-"}`,
    `Published: ${row.published ? "Yes" : "No"}`,
  ]);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="marksheet-${row.id}.pdf"`);
  res.send(pdf);
});

export default router;
