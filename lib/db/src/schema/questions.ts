import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questionsTable = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull().default("mcq"),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  options: text("options", { mode: "json" }).$type<string[] | null>(),
  correctAnswer: text("correct_answer"),
  marks: integer("marks").notNull().default(1),
  markingScheme: text("marking_scheme"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
