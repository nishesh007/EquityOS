/**
 * Alert history store — dismiss / read / snooze state (in-memory; UI may persist).
 */

import type { AlertHistoryRecord, AlertStatus } from "./EarningsAlertModels";

export class AlertHistoryStore {
  private readonly records = new Map<string, AlertHistoryRecord>();

  clear(): void {
    this.records.clear();
  }

  get(alertId: string): AlertHistoryRecord | null {
    return this.records.get(alertId) ?? null;
  }

  list(): AlertHistoryRecord[] {
    return [...this.records.values()];
  }

  markRead(alertId: string): AlertHistoryRecord {
    return this.upsert(alertId, { read: true });
  }

  dismiss(alertId: string): AlertHistoryRecord {
    return this.upsert(alertId, {
      status: "dismissed",
      read: true,
      snoozeUntil: null,
    });
  }

  snooze(alertId: string, until: Date): AlertHistoryRecord {
    return this.upsert(alertId, {
      status: "snoozed",
      snoozeUntil: until.toISOString(),
    });
  }

  complete(alertId: string): AlertHistoryRecord {
    return this.upsert(alertId, { status: "completed", read: true });
  }

  isSuppressed(alertId: string, now = new Date()): boolean {
    const record = this.records.get(alertId);
    if (!record) return false;
    if (record.status === "dismissed" || record.status === "completed") {
      return true;
    }
    if (record.status === "snoozed" && record.snoozeUntil) {
      const until = new Date(record.snoozeUntil).getTime();
      if (Number.isFinite(until) && until > now.getTime()) return true;
    }
    return false;
  }

  isRead(alertId: string): boolean {
    return this.records.get(alertId)?.read === true;
  }

  applyStatus(alertId: string, fallback: AlertStatus = "active"): AlertStatus {
    const record = this.records.get(alertId);
    if (!record) return fallback;
    if (record.status === "snoozed" && record.snoozeUntil) {
      const until = new Date(record.snoozeUntil).getTime();
      if (!Number.isFinite(until) || until <= Date.now()) return "active";
    }
    return record.status;
  }

  private upsert(
    alertId: string,
    patch: Partial<AlertHistoryRecord>
  ): AlertHistoryRecord {
    const prev = this.records.get(alertId);
    const next: AlertHistoryRecord = {
      alertId,
      status: patch.status ?? prev?.status ?? "active",
      read: patch.read ?? prev?.read ?? false,
      snoozeUntil:
        patch.snoozeUntil !== undefined
          ? patch.snoozeUntil
          : prev?.snoozeUntil ?? null,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(alertId, next);
    return next;
  }
}

let historySingleton: AlertHistoryStore | null = null;

export function getAlertHistoryStore(): AlertHistoryStore {
  if (!historySingleton) historySingleton = new AlertHistoryStore();
  return historySingleton;
}

export function resetAlertHistoryStore(): void {
  historySingleton?.clear();
  historySingleton = null;
}

/** Public API — getAlertHistory() */
export function getAlertHistory(): AlertHistoryRecord[] {
  return getAlertHistoryStore().list();
}
