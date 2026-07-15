/**
 * Shared emitter — decisions → R1 generateAlert → presentation batch (Sprint 9C.R3).
 */

import { generateAlert, registerAlertEngine } from "../AlertFacade";
import type { InstitutionalAlert } from "../AlertModels";
import { decisionToSourceEvent, type AlertDecision } from "./AlertDecisionEngine";
import { deduplicateAlerts } from "./AlertDeduplicationEngine";
import {
  emptyIntelligenceBatch,
  toAlertPresentationCard,
  type IntelligenceAlertBatch,
  type IntelligenceEmptyMessage,
} from "./AlertPresentationModels";
import {
  toEventAlertInsightCard,
  type EventAlertInsightCard,
} from "./AlertInsightModels";

export interface EventIntelBatch extends IntelligenceAlertBatch {
  insights: EventAlertInsightCard[];
}

export function emptyEventIntelBatch(
  message: IntelligenceEmptyMessage
): EventIntelBatch {
  return { ...emptyIntelligenceBatch(message), insights: [] };
}

export function emitDecisionsAsBatch(
  decisions: AlertDecision[],
  emptyMessage: IntelligenceEmptyMessage,
  now: Date
): EventIntelBatch {
  registerAlertEngine();
  if (decisions.length === 0) {
    return emptyEventIntelBatch(emptyMessage);
  }

  const collected: InstitutionalAlert[] = [];
  let created = 0;
  let deduplicated = 0;
  let grouped = 0;

  for (const decision of decisions) {
    const result = generateAlert(decisionToSourceEvent(decision), now);
    if (result.alert) collected.push(result.alert);
    if (result.created) created += 1;
    if (result.deduplicated) deduplicated += 1;
    if (result.grouped) grouped += 1;
  }

  const deduped = deduplicateAlerts(collected);
  if (deduped.alerts.length === 0) {
    return emptyEventIntelBatch(emptyMessage);
  }

  return {
    alerts: deduped.alerts,
    cards: deduped.alerts.map((a) =>
      toAlertPresentationCard(
        a,
        typeof a.metadata.extras.kindLabel === "string"
          ? a.metadata.extras.kindLabel
          : undefined
      )
    ),
    insights: deduped.alerts.map((a) =>
      toEventAlertInsightCard({
        id: a.id,
        title: a.title,
        summary: a.summary,
        reason: a.reason,
        evidence: a.evidence,
        category: a.category,
        priority: a.priority,
        severity: a.severity,
        confidenceLabel: a.confidence.label,
        relatedEvent: a.metadata.eventType,
        relatedCompany: a.company,
        relatedReport:
          typeof a.metadata.extras.relatedReport === "string"
            ? a.metadata.extras.relatedReport
            : a.sourceEngine,
        timestamp: a.createdAt,
        sourceEngine: a.sourceEngine,
        ticker: a.ticker,
        inPortfolio: a.inPortfolio,
        inWatchlist: a.inWatchlist,
      })
    ),
    total: deduped.alerts.length,
    created,
    deduplicated: deduplicated + deduped.merged,
    grouped,
    empty: false,
    emptyMessage,
  };
}
