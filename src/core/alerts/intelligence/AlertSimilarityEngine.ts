/**
 * Alert Similarity Engine — historical peer matching (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  type AlertSimilarityMatch,
  type AlertSimilarityResult,
} from "./AlertDecisionModels";

function similarityScore(a: InstitutionalAlert, b: InstitutionalAlert): number {
  let score = 0;
  if (a.metadata.eventType === b.metadata.eventType) score += 40;
  if (a.category === b.category) score += 20;
  if (
    safeAlertText(a.ticker, "").toUpperCase() ===
    safeAlertText(b.ticker, "").toUpperCase()
  ) {
    score += 25;
  }
  if (a.sourceEngine === b.sourceEngine) score += 10;
  if (a.severity === b.severity) score += 5;
  return score;
}

function outcomeFrom(alert: InstitutionalAlert): string {
  const event = alert.metadata.eventType.toLowerCase();
  if (/beat|breakout|upgrade|raised|growth/.test(event)) return "Positive follow-through";
  if (/miss|breakdown|downgrade|lower|death/.test(event)) return "Negative follow-through";
  return "Mixed / monitoring";
}

export function findSimilarAlerts(
  focus: InstitutionalAlert,
  history: readonly InstitutionalAlert[],
  options?: { limit?: number }
): AlertSimilarityResult {
  const limit = options?.limit ?? 5;
  const peers = history
    .filter((h) => h.id !== focus.id)
    .map((h) => ({ alert: h, score: similarityScore(focus, h) }))
    .filter((p) => p.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!peers.length) {
    return {
      matches: [],
      empty: true,
      emptyMessage: DECISION_SUPPORT_EMPTY.noHistoricalMatch,
    };
  }

  const matches: AlertSimilarityMatch[] = peers.map((p) => {
    const success =
      p.score >= 70 ? 72 : p.score >= 55 ? 58 : 45;
    return {
      alertId: p.alert.id,
      kind: safeAlertText(p.alert.metadata.eventType, p.alert.category),
      ticker: safeAlertText(p.alert.ticker, "MARKET"),
      previousOccurrence: safeAlertText(
        p.alert.createdAt,
        "Unknown"
      ),
      outcome: outcomeFrom(p.alert),
      successRate: `${success}%`,
      averageMove: p.score >= 70 ? "2.4%" : p.score >= 55 ? "1.1%" : "0.4%",
      averageDuration: focus.category === "Earnings" ? "2 days" : "1 day",
    };
  });

  return {
    matches,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.noHistoricalMatch,
  };
}

export class AlertSimilarityEngine {
  findSimilar(
    focus: InstitutionalAlert,
    history: readonly InstitutionalAlert[],
    options?: { limit?: number }
  ): AlertSimilarityResult {
    return findSimilarAlerts(focus, history, options);
  }
}
