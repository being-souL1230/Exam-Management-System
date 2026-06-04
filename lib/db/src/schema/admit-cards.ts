import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { examsTable } from "./exams";

export const admitCardsTable = sqliteTable("admit_cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  qrCode: text("qr_code").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertAdmitCardSchema = createInsertSchema(admitCardsTable).omit({ id: true, generatedAt: true });
export type InsertAdmitCard = z.infer<typeof insertAdmitCardSchema>;
export type AdmitCard = typeof admitCardsTable.$inferSelect;
