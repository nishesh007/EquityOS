/**
 * Alert Confidence Breakdown — factor contribution view (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  safeScore,
  type AlertConfidenceBreakdownResult,
} from "./AlertDecisionModels";
import { extractPriorityFactors } from "./AlertPriorityEngine";

export function buildConfidenceBreakdown(
  alert: InstitutionalAlert
): AlertConfidenceBreakdownResult {
  const factors = extractPriorityFactors(alert);
  const contributions = [
    { factor: "AI Confidence", weight: 10, score: factors.confidence },
    { factor: "Portfolio Exposure", weight: 12, score: factors.portfolioExposure },
    { factor: "Watchlist Relevance", weight: 6, score: factors.watchlistRelevance },
    { factor: "Technical Strength", weight: 7, score: factors.technicalStrength },
    { factor: "Fundamental Strength", weight: 7, score: factors.fundamentalStrength },
    { factor: "Trust Score", weight: 6, score: factors.trustScore },
    { factor: "Validation Score", weight: 6, score: factors.validationScore },
    { factor: "Risk", weight: 8, score: factors.risk },
  ].map((c) => ({
    ...c,
    score: safeScore(c.score),
  }));

  const overall = safeScore(alert.confidence.score);
  const level =
    overall >= 85
      ? "Very High"
      : overall >= 70
        ? "High"
        : overall >= 50
          ? "Moderate"
          : overall >= 30
            ? "Low"
            : "Very Low";

  return {
    overall,
    label: `${overall}% (${level})`,
    contributions,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}

export class AlertConfidenceBreakdownEngine {
  build(alert: InstitutionalAlert): AlertConfidenceBreakdownResult {
    return buildConfidenceBreakdown(alert);
  }
}

/** Named export matching prompt file AlertConfidenceBreakdown.ts surface */
export { buildConfidenceBreakdown as getAlertConfidenceBreakdown };
