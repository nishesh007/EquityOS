/**
 * Alert History Engine — audit timeline for center actions (Sprint 9C.R5).
 */

import type { CenterLifecycleStatus } from "./AlertCenterModels";
import { safeAlertText } from "../AlertModels";

export interface AlertCenterHistoryEntry {
  id: string;
  alertId: string;
  action: string;
  fromStatus: CenterLifecycleStatus | "";
  toStatus: CenterLifecycleStatus | "";
  at: string;
  note: string;
}

export class AlertHistoryEngine {
  private readonly entries: AlertCenterHistoryEntry[] = [];
  private seq = 0;

  clear(): void {
    this.entries.length = 0;
    this.seq = 0;
  }

  record(input: {
    alertId: string;
    action: string;
    fromStatus?: CenterLifecycleStatus | "";
    toStatus?: CenterLifecycleStatus | "";
    at?: Date;
    note?: string;
  }): AlertCenterHistoryEntry {
    this.seq += 1;
    const entry: AlertCenterHistoryEntry = {
      id: `hist::${this.seq}`,
      alertId: safeAlertText(input.alertId, ""),
      action: safeAlertText(input.action, "action"),
      fromStatus: input.fromStatus ?? "",
      toStatus: input.toStatus ?? "",
      at: (input.at ?? new Date()).toISOString(),
      note: safeAlertText(input.note, ""),
    };
    this.entries.push(entry);
    return { ...entry };
  }

  forAlert(alertId: string): AlertCenterHistoryEntry[] {
    return this.entries
      .filter((e) => e.alertId === alertId)
      .map((e) => ({ ...e }));
  }

  list(): AlertCenterHistoryEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }
}
