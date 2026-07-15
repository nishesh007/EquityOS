/**
 * Alert Deduplication Engine — merge similar events (Sprint 9C.R2).
 * Complements R1 AlertEngine dedupe; reusable for batch presentation.
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import { higherPriority, moreSevere } from "../AlertRules";
import { resolveAlertConfidence } from "../AlertConfidence";

export interface DeduplicationResult {
  alerts: InstitutionalAlert[];
  removed: number;
  merged: number;
  kept: number;
}

export function resolveDedupeKey(alert: InstitutionalAlert): string {
  const explicit = safeAlertText(alert.metadata.dedupeKey, "");
  if (explicit && explicit !== "none") return explicit;

  const ticker = safeAlertText(alert.ticker, "PLATFORM").toUpperCase();
  const eventType = safeAlertText(alert.metadata.eventType, "event");
  const title = safeAlertText(alert.title, eventType);
  return `${alert.sourceEngine}::${ticker}::${eventType}::${title}`;
}

export function deduplicateAlerts(
  alerts: readonly InstitutionalAlert[]
): DeduplicationResult {
  const byKey = new Map<string, InstitutionalAlert>();
  let merged = 0;
  let removed = 0;

  for (const alert of alerts) {
    const key = resolveDedupeKey(alert);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...alert,
        evidence: [...alert.evidence],
        metadata: {
          ...alert.metadata,
          tags: [...alert.metadata.tags],
          extras: { ...alert.metadata.extras },
        },
      });
      continue;
    }
    byKey.set(key, mergeSimilar(existing, alert));
    merged += 1;
    removed += 1;
  }

  const result = [...byKey.values()];
  return {
    alerts: result,
    removed,
    merged,
    kept: result.length,
  };
}

function mergeSimilar(
  a: InstitutionalAlert,
  b: InstitutionalAlert
): InstitutionalAlert {
  return {
    ...a,
    priority: higherPriority(a.priority, b.priority),
    severity: moreSevere(a.severity, b.severity),
    confidence: resolveAlertConfidence(
      Math.max(a.confidence.score, b.confidence.score)
    ),
    summary:
      b.summary.length > a.summary.length ? b.summary : a.summary,
    description:
      b.description.length > a.description.length
        ? b.description
        : a.description,
    evidence: Array.from(new Set([...a.evidence, ...b.evidence])),
    inPortfolio: a.inPortfolio || b.inPortfolio,
    inWatchlist: a.inWatchlist || b.inWatchlist,
    expiresAt:
      Date.parse(b.expiresAt) > Date.parse(a.expiresAt)
        ? b.expiresAt
        : a.expiresAt,
    metadata: {
      ...a.metadata,
      groupedCount: Math.max(a.metadata.groupedCount, b.metadata.groupedCount),
      tags: Array.from(new Set([...a.metadata.tags, ...b.metadata.tags])),
      extras: { ...a.metadata.extras, ...b.metadata.extras, deduped: "true" },
    },
  };
}
