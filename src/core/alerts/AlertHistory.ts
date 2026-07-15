/**
 * Institutional AI Alert Engine — lifecycle history (Sprint 9C.R1).
 */

import {
  canTransitionLifecycle,
  resolveAlertLifecycle,
  type AlertLifecycleStatus,
} from "./AlertLifecycle";

export interface AlertHistoryRecord {
  alertId: string;
  status: AlertLifecycleStatus;
  previousStatus: AlertLifecycleStatus | "";
  updatedAt: string;
  note: string;
}

export class AlertHistoryStore {
  private readonly records = new Map<string, AlertHistoryRecord>();
  private readonly timeline = new Map<string, AlertHistoryRecord[]>();

  clear(): void {
    this.records.clear();
    this.timeline.clear();
  }

  get(alertId: string): AlertHistoryRecord | null {
    const record = this.records.get(alertId);
    return record ? { ...record } : null;
  }

  list(): AlertHistoryRecord[] {
    return [...this.records.values()].map((r) => ({ ...r }));
  }

  getTimeline(alertId: string): AlertHistoryRecord[] {
    return (this.timeline.get(alertId) ?? []).map((r) => ({ ...r }));
  }

  recordTransition(
    alertId: string,
    from: AlertLifecycleStatus,
    to: AlertLifecycleStatus,
    note?: string
  ): AlertHistoryRecord {
    const nextStatus = canTransitionLifecycle(from, to) ? to : from;
    const record: AlertHistoryRecord = {
      alertId,
      status: nextStatus,
      previousStatus: from,
      updatedAt: new Date().toISOString(),
      note: note && note.trim() ? note.trim() : "",
    };
    this.records.set(alertId, record);
    const chain = this.timeline.get(alertId) ?? [];
    chain.push({ ...record });
    this.timeline.set(alertId, chain);
    return { ...record };
  }

  seed(alertId: string, status: AlertLifecycleStatus = "Generated"): AlertHistoryRecord {
    return this.recordTransition(alertId, status, status, "seed");
  }

  applyStatus(
    alertId: string,
    fallback: AlertLifecycleStatus = "Active"
  ): AlertLifecycleStatus {
    const record = this.records.get(alertId);
    if (!record) return resolveAlertLifecycle(fallback);
    return record.status;
  }

  dismiss(alertId: string, from: AlertLifecycleStatus): AlertHistoryRecord {
    return this.recordTransition(alertId, from, "Dismissed", "dismiss");
  }

  archive(alertId: string, from: AlertLifecycleStatus): AlertHistoryRecord {
    return this.recordTransition(alertId, from, "Archived", "archive");
  }

  expire(alertId: string, from: AlertLifecycleStatus): AlertHistoryRecord {
    return this.recordTransition(alertId, from, "Expired", "expire");
  }

  markViewed(alertId: string, from: AlertLifecycleStatus): AlertHistoryRecord {
    return this.recordTransition(alertId, from, "Viewed", "viewed");
  }

  activate(alertId: string, from: AlertLifecycleStatus): AlertHistoryRecord {
    return this.recordTransition(alertId, from, "Active", "activate");
  }
}

let historySingleton: AlertHistoryStore | null = null;

export function getInstitutionalAlertHistoryStore(): AlertHistoryStore {
  if (!historySingleton) historySingleton = new AlertHistoryStore();
  return historySingleton;
}

export function resetInstitutionalAlertHistoryStore(): void {
  historySingleton?.clear();
  historySingleton = null;
}

export function getInstitutionalAlertHistory(): AlertHistoryRecord[] {
  return getInstitutionalAlertHistoryStore().list();
}
