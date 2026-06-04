import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examsTable } from "./exams";

export const resultsTable = sqliteTable("results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  totalMarks: integer("total_marks").notNull(),
  marksObtained: real("marks_obtained").notNull().default(0),
  grade: text("grade").notNull().default("F"),
  percentage: real("percentage").notNull().default(0),
  rank: integer("rank"),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
