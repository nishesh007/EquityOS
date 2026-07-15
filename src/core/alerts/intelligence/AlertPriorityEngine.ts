/**
 * AI Alert Priority Engine — institutional 0–100 priority score (Sprint 9C.R6).
 * Reuses alert metadata / R4 scoring factors — no engine rebuild.
 */

import type { InstitutionalAlert } from "../AlertModels";
import { ALERT_PRIORITY_RANK } from "../AlertPriority";
import { ALERT_SEVERITY_RANK } from "../AlertSeverity";
import { extractAlertScoreFactors } from "./AlertScoringEngine";
import {
  DECISION_SUPPORT_EMPTY,
  safeScore,
  type AlertPriorityFactorBreakdown,
  type AlertPriorityResult,
} from "./AlertDecisionModels";

const WEIGHTS: Record<keyof AlertPriorityFactorBreakdown, number> = {
  confidence: 10,
  portfolioExposure: 12,
  watchlistRelevance: 6,
  marketCap: 4,
  earningsProximity: 8,
  risk: 8,
  volatility: 5,
  technicalStrength: 7,
  fundamentalStrength: 7,
  sectorImportance: 5,
  newsImpact: 6,
  corporateActionSeverity: 6,
  marketRegime: 4,
  trustScore: 6,
  validationScore: 6,
};

function metaNum(alert: InstitutionalAlert, key: string, fallback: number): number {
  const raw = alert.metadata.extras[key];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function priorityBand(
  score: number
): AlertPriorityResult["band"] {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  if (score >= 30) return "Low";
  return "Informational";
}

export function extractPriorityFactors(
  alert: InstitutionalAlert
): AlertPriorityFactorBreakdown {
  const scored = extractAlertScoreFactors(alert);
  const event = alert.metadata.eventType.toLowerCase();
  const earningsBoost =
    alert.category === "Earnings" || event.includes("earnings") ? 75 : 35;
  const newsBoost =
    alert.category === "News" || alert.sourceEngine === "News" ? 70 : 30;
  const caBoost =
    alert.category === "Corporate Action" ||
    alert.sourceEngine === "Corporate Actions"
      ? 70 + (4 - ALERT_SEVERITY_RANK[alert.severity]) * 5
      : 25;
  const risk =
    alert.category === "Risk" ||
    event.includes("miss") ||
    event.includes("breakdown") ||
    event.includes("death")
      ? 80
      : metaNum(alert, "risk", 45);

  return {
    confidence: safeScore(alert.confidence.score),
    portfolioExposure: alert.inPortfolio ? 90 : 20,
    watchlistRelevance: alert.inWatchlist ? 75 : 15,
    marketCap: metaNum(alert, "marketCap", alert.inPortfolio ? 70 : 50),
    earningsProximity: metaNum(alert, "earningsProximity", earningsBoost),
    risk: safeScore(risk),
    volatility: metaNum(alert, "volatility", metaNum(alert, "urgency", 50)),
    technicalStrength: safeScore(scored.technicalStrength),
    fundamentalStrength: safeScore(scored.fundamentalStrength),
    sectorImportance: safeScore(scored.sectorStrength),
    newsImpact: metaNum(alert, "businessImpact", newsBoost),
    corporateActionSeverity: safeScore(caBoost),
    marketRegime: metaNum(alert, "marketStrength", scored.marketStrength),
    trustScore: safeScore(scored.trustScore),
    validationScore: safeScore(scored.validationScore),
  };
}

export function computePriorityScore(
  factors: AlertPriorityFactorBreakdown
): number {
  let total = 0;
  let weightSum = 0;
  for (const key of Object.keys(WEIGHTS) as Array<keyof AlertPriorityFactorBreakdown>) {
    total += safeScore(factors[key]) * WEIGHTS[key];
    weightSum += WEIGHTS[key];
  }
  return safeScore(total / weightSum);
}

export function scoreAlertPriority(
  alert: InstitutionalAlert
): AlertPriorityResult {
  const factors = extractPriorityFactors(alert);
  let score = computePriorityScore(factors);

  // Native priority/severity nudge
  score = safeScore(
    score +
      (4 - ALERT_PRIORITY_RANK[alert.priority]) * 3 +
      (4 - ALERT_SEVERITY_RANK[alert.severity]) * 2
  );

  const band = priorityBand(score);
  return {
    score,
    band,
    factors,
    label: `${score} — ${band}`,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}

export class AlertPriorityEngine {
  score(alert: InstitutionalAlert): AlertPriorityResult {
    return scoreAlertPriority(alert);
  }

  scoreMany(alerts: readonly InstitutionalAlert[]): Array<{
    alert: InstitutionalAlert;
    priority: AlertPriorityResult;
  }> {
    return [...alerts]
      .map((alert) => ({ alert, priority: this.score(alert) }))
      .sort((a, b) => b.priority.score - a.priority.score);
  }
}
