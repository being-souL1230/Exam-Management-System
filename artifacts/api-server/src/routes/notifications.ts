import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { MarkNotificationReadParams } from "@workspace/api-zod";
import { authenticateToken } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", authenticateToken, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(notificationsTable.sentAt);

  res.json(
    notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      message: n.message,
      type: n.type,
      readStatus: n.readStatus,
      sentAt: n.sentAt.toISOString(),
    }))
  );
});

router.patch("/notifications/:id/read", authenticateToken, async (req, res): Promise<void> => {
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .update(notificationsTable)
    .set({ readStatus: true })
    .where(eq(notificationsTable.id, params.data.id));

  res.json({ message: "Notification marked as read" });
});

router.post("/notifications/read-all", authenticateToken, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  await db
    .update(notificationsTable)
    .set({ readStatus: true })
    .where(eq(notificationsTable.userId, userId));

  res.json({ message: "All notifications marked as read" });
});

export default router;
