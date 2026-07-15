/**
 * Alert Explainability Engine — why / evidence / drivers (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  safeLabel,
  type AlertExplainabilityResult,
} from "./AlertDecisionModels";
import { scoreAlertPriority } from "./AlertPriorityEngine";

export function explainAlert(
  alert: InstitutionalAlert,
  options?: { relatedAlertIds?: string[]; historicalNote?: string }
): AlertExplainabilityResult {
  const priority = scoreAlertPriority(alert);
  const f = priority.factors;
  const kind = safeAlertText(alert.metadata.eventType, alert.category);

  const positive: string[] = [];
  const negative: string[] = [];
  if (f.confidence >= 70) positive.push(`Confidence ${f.confidence}`);
  else negative.push(`Confidence only ${f.confidence}`);
  if (alert.inPortfolio) positive.push("Portfolio exposure elevates priority");
  if (alert.inWatchlist) positive.push("Watchlist relevance");
  if (f.technicalStrength >= 65) positive.push("Technical strength supportive");
  if (f.fundamentalStrength >= 65) positive.push("Fundamentals supportive");
  if (f.risk >= 70) negative.push("Elevated risk contribution");
  if (f.volatility >= 70) negative.push("High volatility regime");
  if (f.validationScore < 50) negative.push("Validation score weak");
  if (f.trustScore < 50) negative.push("Trust score weak");

  const ruleContribution = [
    `Event rule: ${kind}`,
    `Category weight: ${alert.category}`,
    `Source weight: ${alert.sourceEngine}`,
    `Native priority: ${alert.priority}`,
    `Native severity: ${alert.severity}`,
  ];

  const evidence = alert.evidence.length
    ? alert.evidence.map((e) => safeAlertText(e, "")).filter(Boolean)
    : [safeAlertText(alert.reason, "Rule evaluation")];

  return {
    whyTriggered: safeLabel(
      `${alert.title} — ${alert.reason}`,
      `Triggered by ${kind}`
    ),
    supportingEvidence: evidence,
    ruleContribution,
    confidenceContribution: `AI confidence ${f.confidence} contributes ${Math.round((f.confidence / 100) * 10)} pts to priority`,
    positiveDrivers: positive.length ? positive : ["Baseline institutional monitoring"],
    negativeDrivers: negative.length ? negative : ["No material negative drivers"],
    historicalSimilarity: safeLabel(
      options?.historicalNote,
      DECISION_SUPPORT_EMPTY.noHistoricalMatch
    ),
    relatedAlerts:
      options?.relatedAlertIds?.length
        ? options.relatedAlertIds
        : ["No related alerts"],
    decisionTrace: [
      `Ingested from ${alert.sourceEngine}`,
      `Classified as ${alert.category}`,
      `Priority score ${priority.score} (${priority.band})`,
      `Status ${alert.status}`,
    ],
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}

export class AlertExplainabilityEngine {
  explain(
    alert: InstitutionalAlert,
    options?: { relatedAlertIds?: string[]; historicalNote?: string }
  ): AlertExplainabilityResult {
    return explainAlert(alert, options);
  }
}
