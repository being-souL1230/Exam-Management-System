import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, like, ne } from "drizzle-orm";
import {
  auditLogsTable,
  db,
  examsTable,
  resultsTable,
  studentsTable,
  systemSettingsTable,
  usersTable,
} from "@workspace/db";
import { authenticateToken, requirePermission, requireRole } from "../middlewares/auth";
import { getRolePermissions } from "../lib/permissions";
import { logAuditEvent } from "../lib/audit";

const router: IRouter = Router();

const defaultSettings: Record<string, string> = {
  gradingScale: JSON.stringify({ A: 90, B: 80, C: 70, D: 60, F: 0 }),
  maxSessionMinutes: "180",
  examTabSwitchLimit: "5",
  requireStrongPasswords: "true",
  resultPublishApprovalRequired: "true",
};

type Role = "admin" | "teacher" | "student";
const validRoles = new Set<Role>(["admin", "teacher", "student"]);

function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && validRoles.has(value as Role);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

router.get(
  "/admin/permissions",
  authenticateToken,
  requireRole("admin"),
  requirePermission("access.manage"),
  async (req, res): Promise<void> => {
    res.json({
      role: req.user!.role,
      permissions: getRolePermissions(req.user!.role),
    });
  },
);

router.get(
  "/admin/users",
  authenticateToken,
  requireRole("admin"),
  requirePermission("users.manage"),
  async (req, res): Promise<void> => {
    const role = req.query.role;
    const active = req.query.active;
    const search = req.query.search;

    if (role != null && !isValidRole(role)) {
      res.status(400).json({ error: "Invalid role filter" });
      return;
    }
    if (active != null && active !== "true" && active !== "false") {
      res.status(400).json({ error: "Invalid active filter" });
      return;
    }
    if (search != null && typeof search !== "string") {
      res.status(400).json({ error: "Invalid search filter" });
      return;
    }

    const filters = [];
    if (role) {
      filters.push(eq(usersTable.role, role));
    }
    if (active) {
      filters.push(eq(usersTable.isActive, active === "true"));
    }
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      filters.push(like(usersTable.username, term));
    }

    const whereClause = filters.length === 0 ? undefined : and(...filters);
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(whereClause)
      .orderBy(asc(usersTable.username));

    res.json(
      users.map((user) => ({
        ...user,
        permissions: getRolePermissions(user.role),
        createdAt: user.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/admin/users",
  authenticateToken,
  requireRole("admin"),
  requirePermission("users.manage", "roles.manage"),
  async (req, res): Promise<void> => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const role = req.body?.role;

    if (username.length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters" });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    if (!isValidRole(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(usersTable)
      .values({
        username,
        email,
        passwordHash,
        role,
        isActive: true,
      })
      .returning();

    if (created.role === "student") {
      const rollNo = `STU${String(created.id).padStart(6, "0")}`;
      await db.insert(studentsTable).values({
        rollNo,
        name: created.username,
        email: created.email,
        phone: "0000000000",
        course: "General",
        year: 1,
        userId: created.id,
      });
    }

    await logAuditEvent({
      actorId: req.user!.userId,
      action: "admin.user.create",
      entity: "user",
      entityId: created.id,
      details: { role: created.role, email: created.email },
    });

    res.status(201).json({
      id: created.id,
      username: created.username,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
      permissions: getRolePermissions(created.role),
      createdAt: created.createdAt.toISOString(),
    });
  },
);

router.patch(
  "/admin/users/:id/role",
  authenticateToken,
  requireRole("admin"),
  requirePermission("roles.manage"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    const role = req.body?.role;
    if (!isValidRole(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ role })
      .where(eq(usersTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await logAuditEvent({
      actorId: req.user!.userId,
      action: "admin.user.role.update",
      entity: "user",
      entityId: id,
      details: { role },
    });

    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      permissions: getRolePermissions(updated.role),
      createdAt: updated.createdAt.toISOString(),
    });
  },
);

router.patch(
  "/admin/users/:id/status",
  authenticateToken,
  requireRole("admin"),
  requirePermission("users.deactivate"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);
    if (Number.isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid user id" });
      return;
    }

    if (typeof req.body?.isActive !== "boolean") {
      res.status(400).json({ error: "isActive must be boolean" });
      return;
    }
    const isActive = req.body.isActive;

    if (id === req.user!.userId && !isActive) {
      res.status(400).json({ error: "You cannot deactivate your own account" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ isActive })
      .where(eq(usersTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await logAuditEvent({
      actorId: req.user!.userId,
      action: isActive ? "admin.user.activate" : "admin.user.deactivate",
      entity: "user",
      entityId: id,
      details: { isActive },
    });

    res.json({
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
      permissions: getRolePermissions(updated.role),
      createdAt: updated.createdAt.toISOString(),
    });
  },
);

router.get(
  "/admin/settings",
  authenticateToken,
  requireRole("admin"),
  requirePermission("system.settings.manage"),
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(systemSettingsTable);
    const settings = { ...defaultSettings } as Record<string, string>;
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  },
);

router.put(
  "/admin/settings",
  authenticateToken,
  requireRole("admin"),
  requirePermission("system.settings.manage"),
  async (req, res): Promise<void> => {
    const key = typeof req.body?.key === "string" ? req.body.key.trim() : "";
    const value = typeof req.body?.value === "string" ? req.body.value : "";
    if (key.length < 2) {
      res.status(400).json({ error: "Invalid setting key" });
      return;
    }
    if (!value.length) {
      res.status(400).json({ error: "Invalid setting value" });
      return;
    }

    await db
      .insert(systemSettingsTable)
      .values({
        key,
        value,
        updatedBy: req.user!.userId,
      })
      .onConflictDoUpdate({
        target: systemSettingsTable.key,
        set: {
          value,
          updatedBy: req.user!.userId,
          updatedAt: new Date(),
        },
      });

    await logAuditEvent({
      actorId: req.user!.userId,
      action: "admin.settings.update",
      entity: "system_settings",
      entityId: key,
      details: { value },
    });

    res.json({ key, value });
  },
);

router.get(
  "/admin/audit-logs",
  authenticateToken,
  requireRole("admin"),
  requirePermission("audit.view"),
  async (req, res): Promise<void> => {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const rows = await db
      .select({
        id: auditLogsTable.id,
        actorId: auditLogsTable.actorId,
        action: auditLogsTable.action,
        entity: auditLogsTable.entity,
        entityId: auditLogsTable.entityId,
        details: auditLogsTable.details,
        createdAt: auditLogsTable.createdAt,
        actorEmail: usersTable.email,
      })
      .from(auditLogsTable)
      .leftJoin(usersTable, eq(auditLogsTable.actorId, usersTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    res.json(rows.map((row) => {
      let parsedDetails: unknown = null;
      if (row.details) {
        try {
          parsedDetails = JSON.parse(row.details);
        } catch {
          parsedDetails = row.details;
        }
      }
      return {
        id: row.id,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        details: parsedDetails,
        createdAt: row.createdAt.toISOString(),
      };
    }));
  },
);

router.get(
  "/admin/reports/overview",
  authenticateToken,
  requireRole("admin"),
  requirePermission("reports.view"),
  async (_req, res): Promise<void> => {
    const [activeUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, true));
    const [inactiveUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, false));
    const [adminUsers] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(and(eq(usersTable.role, "admin"), eq(usersTable.isActive, true)));
    const [teacherUsers] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(and(eq(usersTable.role, "teacher"), eq(usersTable.isActive, true)));
    const [studentUsers] = await db
      .select({ count: count() })
      .from(usersTable)
      .where(and(eq(usersTable.role, "student"), eq(usersTable.isActive, true)));

    const [draftExams] = await db.select({ count: count() }).from(examsTable).where(eq(examsTable.status, "draft"));
    const [publishedResults] = await db.select({ count: count() }).from(resultsTable).where(eq(resultsTable.published, true));
    const [pendingResults] = await db.select({ count: count() }).from(resultsTable).where(ne(resultsTable.published, true));

    res.json({
      users: {
        active: activeUsers.count,
        inactive: inactiveUsers.count,
        byRole: {
          admin: adminUsers.count,
          teacher: teacherUsers.count,
          student: studentUsers.count,
        },
      },
      exams: {
        draft: draftExams.count,
      },
      results: {
        published: publishedResults.count,
        pending: pendingResults.count,
      },
    });
  },
);

export default router;
