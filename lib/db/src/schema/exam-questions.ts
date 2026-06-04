import { integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examsTable } from "./exams";
import { questionsTable } from "./questions";

export const examQuestionsTable = sqliteTable("exam_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  questionOrder: integer("question_order").notNull().default(0),
});

export const insertExamQuestionSchema = createInsertSchema(examQuestionsTable).omit({ id: true });
export type InsertExamQuestion = z.infer<typeof insertExamQuestionSchema>;
export type ExamQuestion = typeof examQuestionsTable.$inferSelect;
