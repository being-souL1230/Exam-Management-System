import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examsTable } from "./exams";

export const studentExamsTable = sqliteTable("student_exams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  startTime: integer("start_time", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  endTime: integer("end_time", { mode: "timestamp_ms" }),
  status: text("status").notNull().default("in_progress"),
  tabSwitchCount: integer("tab_switch_count").notNull().default(0),
  incidents: text("incidents", { mode: "json" }).$type<string[] | null>(),
});

export const insertStudentExamSchema = createInsertSchema(studentExamsTable).omit({ id: true });
export type InsertStudentExam = z.infer<typeof insertStudentExamSchema>;
export type StudentExam = typeof studentExamsTable.$inferSelect;
