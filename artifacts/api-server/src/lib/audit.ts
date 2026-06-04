import { db, auditLogsTable } from "@workspace/db";

interface AuditEvent {
  actorId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: unknown;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const payload = {
    actorId: event.actorId ?? null,
    action: event.action,
    entity: event.entity,
    entityId: event.entityId == null ? null : String(event.entityId),
    details: event.details == null ? null : JSON.stringify(event.details),
  };
  await db.insert(auditLogsTable).values(payload);
}
