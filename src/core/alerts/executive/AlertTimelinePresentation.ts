/**
 * Executive timeline presentation — Center history + decision traces (9C.R8).
 */

import type { AlertCenterHistoryEntry } from "../center/AlertHistoryEngine";
import type { CenterAlert } from "../center/AlertCenterModels";
import { buildAlertTimeline } from "../intelligence/AlertTimelineEngine";
import {
  EXECUTIVE_EMPTY,
  safeExecutiveText,
  type ExecutiveTimelineEvent,
  type ExecutiveTimelineView,
} from "./AlertExecutiveModels";

const TYPE_LABELS: Record<string, string> = {
  generated: "Generated",
  created: "Generated",
  updated: "Updated",
  escalated: "Escalated",
  pinned: "Pinned",
  resolved: "Resolved",
  archived: "Archived",
  expired: "Expired",
  decision: "Decision Trace",
  audit: "Audit Events",
};

export class AlertTimelinePresentation {
  build(
    items: readonly CenterAlert[],
    history: readonly AlertCenterHistoryEntry[],
    options?: { limit?: number }
  ): ExecutiveTimelineView {
    const limit = options?.limit ?? 50;
    const events: ExecutiveTimelineEvent[] = [];
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");

    for (const entry of history) {
      const action = safeExecutiveText(entry.action, "audit").toLowerCase();
      let type = "audit";
      if (action.includes("pin")) type = "pinned";
      else if (action.includes("resolve")) type = "resolved";
      else if (action.includes("archive")) type = "archived";
      else if (action.includes("expire")) type = "expired";
      else if (action.includes("ingest") || action.includes("generat"))
        type = "generated";
      else if (action.includes("escalat")) type = "escalated";
      else if (action.includes("update") || action.includes("read"))
        type = "updated";

      events.push({
        id: `hist::${entry.id}`,
        type,
        label: TYPE_LABELS[type] ?? "Audit Events",
        at: safeExecutiveText(entry.at, ""),
        detail: safeExecutiveText(entry.note || entry.action, "—"),
        alertId: safeExecutiveText(entry.alertId, ""),
      });
    }

    for (const item of visible.slice(0, 20)) {
      const timeline = buildAlertTimeline(item.alert, { center: item });
      for (const ev of timeline.events) {
        const label = safeExecutiveText(ev.label, "Event");
        let type = "updated";
        const low = label.toLowerCase();
        if (low.includes("creat") || low.includes("generat")) type = "generated";
        else if (low.includes("escalat") || low.includes("pin")) type = "escalated";
        else if (low.includes("resolv")) type = "resolved";
        else if (low.includes("archiv")) type = "archived";
        else if (low.includes("expir")) type = "expired";

        events.push({
          id: `tl::${item.id}::${label}::${ev.at}`,
          type,
          label: TYPE_LABELS[type] ?? label,
          at: safeExecutiveText(ev.at, ""),
          detail: safeExecutiveText(ev.detail, "—"),
          alertId: item.id,
        });
      }

      for (const trace of item.decisionTrace ?? []) {
        events.push({
          id: `dec::${item.id}::${trace}`,
          type: "decision",
          label: "Decision Trace",
          at: item.alert.createdAt,
          detail: safeExecutiveText(trace, "—"),
          alertId: item.id,
        });
      }
    }

    const filtered = events
      .filter((e) => e.at)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, limit);

    if (filtered.length === 0) {
      return {
        events: [],
        empty: true,
        emptyMessage: EXECUTIVE_EMPTY.awaitingAlertGeneration,
      };
    }

    return {
      events: filtered,
      empty: false,
      emptyMessage: EXECUTIVE_EMPTY.noAlerts,
    };
  }
}
