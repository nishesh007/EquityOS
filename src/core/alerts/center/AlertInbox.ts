/**
 * Alert Inbox — in-memory institutional inbox store (Sprint 9C.R5).
 */

import type { InstitutionalAlert } from "../AlertModels";
import {
  wrapInstitutionalAlert,
  type CenterAlert,
} from "./AlertCenterModels";
import { AlertLifecycleManager } from "./AlertLifecycleManager";
import { AlertHistoryEngine } from "./AlertHistoryEngine";
import { AlertArchiveEngine } from "./AlertArchiveEngine";

export class AlertInbox {
  private readonly items = new Map<string, CenterAlert>();
  private readonly lifecycle = new AlertLifecycleManager();
  private readonly history: AlertHistoryEngine;
  private readonly archiveEngine = new AlertArchiveEngine();

  constructor(history?: AlertHistoryEngine) {
    this.history = history ?? new AlertHistoryEngine();
  }

  clear(): void {
    this.items.clear();
    this.history.clear();
  }

  ingest(alerts: readonly InstitutionalAlert[]): CenterAlert[] {
    const out: CenterAlert[] = [];
    for (const alert of alerts) {
      const existing = this.items.get(alert.id);
      if (existing) {
        const updated: CenterAlert = {
          ...existing,
          alert,
        };
        this.items.set(alert.id, updated);
        out.push(updated);
        continue;
      }
      const wrapped = wrapInstitutionalAlert(alert, { inboxStatus: "New" });
      this.items.set(alert.id, wrapped);
      this.history.record({
        alertId: alert.id,
        action: "ingest",
        fromStatus: "Generated",
        toStatus: "New",
        note: "Ingested into Alert Center",
      });
      out.push(wrapped);
    }
    return out;
  }

  list(includeDeleted = false): CenterAlert[] {
    return [...this.items.values()].filter(
      (i) => includeDeleted || i.inboxStatus !== "Deleted"
    );
  }

  get(id: string): CenterAlert | null {
    return this.items.get(id) ?? null;
  }

  private put(item: CenterAlert, action: string, from: CenterAlert): CenterAlert {
    this.items.set(item.id, item);
    this.history.record({
      alertId: item.id,
      action,
      fromStatus: from.inboxStatus,
      toStatus: item.inboxStatus,
    });
    return item;
  }

  markRead(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.markRead(cur, now), "mark_read", cur);
  }

  markUnread(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.markUnread(cur, now), "mark_unread", cur);
  }

  pin(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.pin(cur, now), "pin", cur);
  }

  unpin(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.unpin(cur, now), "unpin", cur);
  }

  snooze(id: string, until: Date, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.snooze(cur, until, now), "snooze", cur);
  }

  resolve(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.lifecycle.resolve(cur, now), "resolve", cur);
  }

  archive(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.archiveEngine.archive(cur, now), "archive", cur);
  }

  restore(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.archiveEngine.restore(cur, now), "restore", cur);
  }

  dismiss(id: string, now?: Date): CenterAlert | null {
    const cur = this.items.get(id);
    if (!cur) return null;
    return this.put(this.archiveEngine.softDelete(cur, now), "dismiss", cur);
  }

  getHistory() {
    return this.history;
  }
}
