/**
 * Alert Impact Engine — portfolio / market impact estimates (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { ALERT_SEVERITY_RANK } from "../AlertSeverity";
import {
  DECISION_SUPPORT_EMPTY,
  safeLabel,
  safeScore,
  type AlertImpactResult,
} from "./AlertDecisionModels";
import { scoreAlertPriority } from "./AlertPriorityEngine";

function bandLabel(score: number, high: string, mid: string, low: string): string {
  if (score >= 75) return high;
  if (score >= 45) return mid;
  return low;
}

export function estimateAlertImpact(
  alert: InstitutionalAlert
): AlertImpactResult {
  const priority = scoreAlertPriority(alert);
  const f = priority.factors;
  const severityLift = (4 - ALERT_SEVERITY_RANK[alert.severity]) * 8;

  const portfolioScore = safeScore(
    (f.portfolioExposure + f.risk + severityLift) / 2
  );
  const capitalRisk = safeScore((f.risk + f.volatility + severityLift) / 2);
  const opportunity = safeScore(
    (f.technicalStrength + f.fundamentalStrength + f.confidence) / 3
  );
  const sector = safeScore(f.sectorImportance);
  const market = safeScore((f.marketRegime + f.newsImpact) / 2);
  const urgency = safeScore((f.earningsProximity + f.volatility + f.newsImpact) / 3);
  const impactScore = safeScore(
    (portfolioScore + capitalRisk + opportunity + urgency) / 4
  );

  const durationHours =
    urgency >= 80 ? 4 : urgency >= 60 ? 24 : urgency >= 40 ? 72 : 168;

  return {
    portfolioImpact: alert.inPortfolio
      ? bandLabel(portfolioScore, "Material", "Moderate", "Limited")
      : "None — not held",
    capitalRisk: bandLabel(capitalRisk, "Elevated", "Moderate", "Contained"),
    opportunitySize: bandLabel(opportunity, "Large", "Medium", "Small"),
    sectorImpact: bandLabel(sector, "Sector-moving", "Sector-relevant", "Stock-specific"),
    marketImpact: bandLabel(market, "Broad market", "Selective", "Idiosyncratic"),
    expectedDuration:
      durationHours <= 4
        ? "Intraday"
        : durationHours <= 24
          ? "1 trading day"
          : durationHours <= 72
            ? "2–3 days"
            : "1 week+",
    urgency: bandLabel(urgency, "Act now", "Same session", "Monitor"),
    reactionWindow:
      durationHours <= 4
        ? "Next 1–4 hours"
        : durationHours <= 24
          ? "Before next close"
          : "This week",
    score: impactScore,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}

export class AlertImpactEngine {
  estimate(alert: InstitutionalAlert): AlertImpactResult {
    return estimateAlertImpact(alert);
  }
}

export function formatImpactSummary(impact: AlertImpactResult): string {
  return safeLabel(
    `${impact.urgency} · Portfolio ${impact.portfolioImpact} · Risk ${impact.capitalRisk}`,
    DECISION_SUPPORT_EMPTY.awaitingAnalysis
  );
}
