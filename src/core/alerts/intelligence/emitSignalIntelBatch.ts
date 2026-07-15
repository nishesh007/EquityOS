/**
 * Shared signal batch emitter — EventIntelBatch + SignalAlertCards (Sprint 9C.R4).
 */

import type { AlertDecision } from "./AlertDecisionEngine";
import {
  emptyEventIntelBatch,
  emitDecisionsAsBatch,
  type EventIntelBatch,
} from "./emitEventIntelBatch";
import {
  toSignalAlertCard,
  type SignalAlertCard,
} from "./AlertSignalModels";
import type { IntelligenceEmptyMessage } from "./AlertPresentationModels";
import { scoreAlerts } from "./AlertScoringEngine";

export interface SignalIntelBatch extends EventIntelBatch {
  signalCards: SignalAlertCard[];
}

export function emptySignalIntelBatch(
  message: IntelligenceEmptyMessage
): SignalIntelBatch {
  return { ...emptyEventIntelBatch(message), signalCards: [] };
}

export function emitSignalDecisionsAsBatch(
  decisions: AlertDecision[],
  emptyMessage: IntelligenceEmptyMessage,
  now: Date
): SignalIntelBatch {
  const batch = emitDecisionsAsBatch(decisions, emptyMessage, now);
  if (batch.empty) {
    return { ...batch, signalCards: [] };
  }

  const scored = scoreAlerts(batch.alerts);
  const scoreById = new Map(scored.map((s) => [s.alert.id, s.score]));

  const signalCards = batch.alerts.map((a) =>
    toSignalAlertCard({
      id: a.id,
      signal:
        typeof a.metadata.extras.kindLabel === "string"
          ? a.metadata.extras.kindLabel
          : a.metadata.eventType,
      summary: a.summary,
      reason: a.reason,
      evidence: a.evidence,
      score: scoreById.get(a.id) ?? a.confidence.score,
      confidence: a.confidence.label,
      priority: a.priority,
      severity: a.severity,
      category: a.category,
      affectedSymbol: a.ticker || "MARKET",
      sector:
        typeof a.metadata.extras.sector === "string"
          ? a.metadata.extras.sector
          : "—",
      relatedIndicators:
        typeof a.metadata.extras.relatedIndicators === "string"
          ? a.metadata.extras.relatedIndicators.split("|").filter(Boolean)
          : [],
    })
  );

  return { ...batch, signalCards };
}
