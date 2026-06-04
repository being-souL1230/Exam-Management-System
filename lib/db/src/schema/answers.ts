import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentExamsTable } from "./student-exams";
import { questionsTable } from "./questions";

export const answersTable = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentExamId: integer("student_exam_id").notNull().references(() => studentExamsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  answerText: text("answer_text").notNull(),
  marksObtained: integer("marks_obtained"),
  savedAt: integer("saved_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertAnswerSchema = createInsertSchema(answersTable).omit({ id: true, savedAt: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
