/**
 * Audit logging — Sprint 12C.
 */

import type { AuditAction, AuditLogEntry } from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

export function createAuditEntry(input: {
  action: AuditAction;
  actorUserId?: string | null;
  actorEmail?: string | null;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, string>;
  ip?: string | null;
}): AuditLogEntry {
  return {
    id: createId("aud"),
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    actorEmail: input.actorEmail ?? null,
    targetId: input.targetId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? {},
    ip: input.ip ?? null,
    createdAt: nowIso(),
  };
}

export function filterAudit(
  entries: AuditLogEntry[],
  query: string
): AuditLogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.action.includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      (e.actorEmail?.toLowerCase().includes(q) ?? false) ||
      (e.targetId?.toLowerCase().includes(q) ?? false)
  );
}
