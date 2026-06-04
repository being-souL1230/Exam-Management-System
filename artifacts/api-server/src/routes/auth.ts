import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, studentsTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { authenticateToken, generateToken } from "../middlewares/auth";
import { getRolePermissions } from "../lib/permissions";
import { logAuditEvent } from "../lib/audit";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, email, password } = parsed.data;
  const role = "student";

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ username, email, passwordHash, role }).returning();

  // Keep users and students in sync: student signup should create student profile.
  if (user.role === "student") {
    const rollNo = `STU${String(user.id).padStart(6, "0")}`;
    await db.insert(studentsTable).values({
      rollNo,
      name: username,
      email,
      phone: "0000000000",
      course: "General",
      year: 1,
      userId: user.id,
    });
  }

  const token = generateToken({ userId: user.id, role: user.role });
  await logAuditEvent({
    actorId: user.id,
    action: "auth.register",
    entity: "user",
    entityId: user.id,
    details: { role: user.role, email: user.email },
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      permissions: getRolePermissions(user.role),
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is deactivated. Please contact administrator." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateToken({ userId: user.id, role: user.role });
  await logAuditEvent({
    actorId: user.id,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
    details: { role: user.role },
  });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      permissions: getRolePermissions(user.role),
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", authenticateToken, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is deactivated. Please contact administrator." });
    return;
  }

  let student = null;
  if (user.role === "student") {
    const students = await db.select().from(studentsTable).where(eq(studentsTable.userId, userId));
    if (students.length > 0) {
      const s = students[0];
      student = {
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
        email: s.email,
        phone: s.phone,
        course: s.course,
        year: s.year,
        photoUrl: s.photoUrl,
        userId: s.userId,
        createdAt: s.createdAt.toISOString(),
      };
    }
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    permissions: getRolePermissions(user.role),
    createdAt: user.createdAt.toISOString(),
    student,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

export default router;
