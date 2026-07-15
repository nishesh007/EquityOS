/**
 * Alert Grouping Engine — groups related institutional alerts (Sprint 9C.R2).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import { higherPriority } from "../AlertRules";
import { moreSevere } from "../AlertRules";
import { resolveAlertConfidence } from "../AlertConfidence";

export type AlertGroupKeyStrategy =
  | "auto"
  | "company"
  | "category"
  | "event"
  | "portfolio"
  | "watchlist"
  | "groupKey";

export interface AlertGroup {
  groupId: string;
  strategy: AlertGroupKeyStrategy;
  label: string;
  alerts: InstitutionalAlert[];
  count: number;
  representative: InstitutionalAlert;
}

export function resolveGroupKey(
  alert: InstitutionalAlert,
  strategy: AlertGroupKeyStrategy = "auto"
): string {
  const ticker = safeAlertText(alert.ticker, "").toUpperCase();
  const company = safeAlertText(alert.company, ticker || "platform");
  const eventType = safeAlertText(alert.metadata.eventType, "event");

  switch (strategy) {
    case "company":
      return `company::${ticker || company}`;
    case "category":
      return `category::${alert.category}`;
    case "event":
      return `event::${eventType}`;
    case "portfolio":
      return `portfolio::${ticker || "book"}`;
    case "watchlist":
      return `watchlist::${ticker || "list"}`;
    case "groupKey":
      return safeAlertText(alert.metadata.groupKey, `ungrouped::${alert.id}`);
    case "auto":
    default: {
      if (alert.metadata.groupKey && alert.metadata.groupKey !== "ungrouped") {
        return alert.metadata.groupKey;
      }
      if (ticker) return `company::${ticker}`;
      return `category::${alert.category}`;
    }
  }
}

export function groupAlerts(
  alerts: readonly InstitutionalAlert[],
  strategy: AlertGroupKeyStrategy = "auto"
): AlertGroup[] {
  const buckets = new Map<string, InstitutionalAlert[]>();

  for (const alert of alerts) {
    const key = resolveGroupKey(alert, strategy);
    const list = buckets.get(key) ?? [];
    list.push(alert);
    buckets.set(key, list);
  }

  const groups: AlertGroup[] = [];
  for (const [groupId, members] of buckets) {
    const representative = pickRepresentative(members);
    groups.push({
      groupId,
      strategy,
      label: buildGroupLabel(groupId, members),
      alerts: members,
      count: members.length,
      representative: {
        ...representative,
        metadata: {
          ...representative.metadata,
          groupedCount: members.length,
        },
      },
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}

/** Collapse groups into merged representative alerts (for presentation). */
export function flattenGroupedAlerts(
  groups: readonly AlertGroup[]
): InstitutionalAlert[] {
  return groups.map((g) => mergeGroupMembers(g.alerts));
}

export function mergeGroupMembers(
  members: readonly InstitutionalAlert[]
): InstitutionalAlert {
  if (members.length === 0) {
    throw new Error("Cannot merge empty alert group");
  }
  let merged = { ...members[0]!, evidence: [...members[0]!.evidence] };
  for (let i = 1; i < members.length; i += 1) {
    const next = members[i]!;
    merged = {
      ...merged,
      priority: higherPriority(merged.priority, next.priority),
      severity: moreSevere(merged.severity, next.severity),
      confidence: resolveAlertConfidence(
        Math.max(merged.confidence.score, next.confidence.score)
      ),
      evidence: Array.from(new Set([...merged.evidence, ...next.evidence])),
      inPortfolio: merged.inPortfolio || next.inPortfolio,
      inWatchlist: merged.inWatchlist || next.inWatchlist,
      expiresAt:
        Date.parse(next.expiresAt) > Date.parse(merged.expiresAt)
          ? next.expiresAt
          : merged.expiresAt,
      metadata: {
        ...merged.metadata,
        groupedCount: (merged.metadata.groupedCount ?? 1) + 1,
        tags: Array.from(
          new Set([...merged.metadata.tags, ...next.metadata.tags])
        ),
      },
    };
  }
  return merged;
}

function pickRepresentative(
  members: readonly InstitutionalAlert[]
): InstitutionalAlert {
  return [...members].sort((a, b) => {
    const pr =
      ["Critical", "High", "Medium", "Low", "Informational"].indexOf(a.priority) -
      ["Critical", "High", "Medium", "Low", "Informational"].indexOf(b.priority);
    if (pr !== 0) return pr;
    return b.confidence.score - a.confidence.score;
  })[0]!;
}

function buildGroupLabel(
  groupId: string,
  members: readonly InstitutionalAlert[]
): string {
  const sample = members[0]!;
  const ticker = safeAlertText(sample.ticker, "");
  if (ticker) return `${ticker} (${members.length})`;
  if (groupId.startsWith("category::")) {
    return `${sample.category} (${members.length})`;
  }
  return `${safeAlertText(sample.company, sample.category)} (${members.length})`;
}
