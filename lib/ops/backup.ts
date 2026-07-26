/**
 * Backup helpers — Sprint 12C.
 */

import type { BackupRecord } from "./types";
import { createId, nowIso } from "@/lib/saas/utils";

export function createBackupRecord(input: {
  label: string;
  scheduled?: boolean;
  retentionDays?: number;
}): BackupRecord {
  return {
    id: createId("bkp"),
    label: input.label,
    status: "pending",
    sizeBytes: 0,
    retentionDays: input.retentionDays ?? 30,
    createdAt: nowIso(),
    completedAt: null,
    error: null,
    scheduled: Boolean(input.scheduled),
  };
}

export function completeBackup(record: BackupRecord, sizeBytes: number): BackupRecord {
  return {
    ...record,
    status: "completed",
    sizeBytes,
    completedAt: nowIso(),
    error: null,
  };
}

export function failBackup(record: BackupRecord, error: string): BackupRecord {
  return {
    ...record,
    status: "failed",
    completedAt: nowIso(),
    error,
  };
}

export function applyRetention(
  backups: BackupRecord[],
  now = Date.now()
): BackupRecord[] {
  return backups.filter((b) => {
    const ageDays =
      (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= b.retentionDays;
  });
}
