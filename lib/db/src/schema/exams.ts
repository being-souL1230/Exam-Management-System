import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const examsTable = sqliteTable("exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  examName: text("exam_name").notNull(),
  subject: text("subject").notNull(),
  examDate: integer("exam_date", { mode: "timestamp_ms" }).notNull(),
  startTime: text("start_time").notNull(),
  duration: integer("duration").notNull(),
  totalMarks: integer("total_marks").notNull(),
  passingMarks: integer("passing_marks").notNull(),
  examType: text("exam_type").notNull().default("mcq"),
  eligibleCourses: text("eligible_courses", { mode: "json" }).$type<string[] | null>(),
  status: text("status").notNull().default("draft"),
  resultsPublished: integer("results_published", { mode: "boolean" }).notNull().default(false),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;
