/**
 * Alert Timeline Engine — decision-support event timeline (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import type { CenterAlert } from "../center/AlertCenterModels";
import {
  DECISION_SUPPORT_EMPTY,
  type AlertTimelineEvent,
  type AlertTimelineResult,
} from "./AlertDecisionModels";

export function buildAlertTimeline(
  alert: InstitutionalAlert,
  options?: {
    center?: CenterAlert | null;
    relatedEvents?: Array<{ label: string; at: string; detail?: string }>;
  }
): AlertTimelineResult {
  const events: AlertTimelineEvent[] = [];
  const push = (label: string, at: string, detail: string) => {
    const when = safeAlertText(at, "");
    if (!when) return;
    events.push({
      label: safeAlertText(label, "Event"),
      at: when,
      detail: safeAlertText(detail, "—"),
    });
  };

  push("Created", alert.createdAt, `${alert.category} alert generated`);
  push("Updated", alert.metadata.extras.updatedAt ?? "", "Alert metadata updated");

  if (options?.center) {
    const t = options.center.timestamps;
    push("First Seen", t.firstSeen, "Opened in Alert Center");
    push("Opened", t.opened, "Marked read");
    push("Acknowledged", t.acknowledged, "Acknowledged by operator");
    push("Escalated", options.center.pinned ? t.opened || alert.createdAt : "", "Pinned / escalated");
    push("Snoozed", t.snoozedUntil, "Snoozed until");
    push("Resolved", t.resolved, "Marked resolved");
    push("Archived", t.archived, "Archived");
    push("Expired", t.expired, "Expired");
  }

  if (alert.status === "Expired") {
    push("Expired", alert.expiresAt, "Lifecycle expired");
  }
  if (alert.status === "Archived") {
    push("Archived", alert.createdAt, "Engine archived");
  }

  for (const rel of options?.relatedEvents ?? []) {
    push(rel.label, rel.at, rel.detail ?? "Related event");
  }

  // Sort chronologically when parseable
  events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  if (!events.length) {
    return {
      events: [
        {
          label: "Created",
          at: alert.createdAt,
          detail: "Alert generated",
        },
      ],
      empty: false,
      emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
    };
  }

  return {
    events,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}

export class AlertTimelineEngine {
  build(
    alert: InstitutionalAlert,
    options?: {
      center?: CenterAlert | null;
      relatedEvents?: Array<{ label: string; at: string; detail?: string }>;
    }
  ): AlertTimelineResult {
    return buildAlertTimeline(alert, options);
  }
}
