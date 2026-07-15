/**
 * Alert Recommendation Engine — structured AI actions (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  safeLabel,
  type AlertDecisionBadge,
  type AlertRecommendationAction,
  type AlertRecommendationResult,
} from "./AlertDecisionModels";
import { estimateAlertImpact } from "./AlertImpactEngine";
import { scoreAlertPriority } from "./AlertPriorityEngine";

export function recommendAlertAction(
  alert: InstitutionalAlert,
  options?: { hasConflict?: boolean }
): AlertRecommendationResult {
  const priority = scoreAlertPriority(alert);
  const impact = estimateAlertImpact(alert);
  const event = alert.metadata.eventType.toLowerCase();
  const bullish =
    /beat|breakout|upgrade|raised|growth|strong|golden|bullish|buy/.test(event);
  const bearish =
    /miss|breakdown|downgrade|lower|death|bearish|weak|risk|fail|reject/.test(
      event
    );

  let action: AlertRecommendationAction = "Monitor";
  let reasoning = "Signal warrants monitoring until confirmation.";

  if (options?.hasConflict) {
    action = "Research Required";
    reasoning =
      "Conflicting signals detected — verify dominant thesis before acting.";
  } else if (priority.score >= 85 && alert.inPortfolio && bearish) {
    action = "Reduce Position";
    reasoning =
      "Critical bearish alert on a portfolio holding with elevated capital risk.";
  } else if (priority.score >= 80 && bullish && (alert.inWatchlist || !alert.inPortfolio)) {
    action = "Increase Position";
    reasoning =
      "High-conviction bullish setup with favorable opportunity size.";
  } else if (priority.score >= 75 && impact.urgency === "Act now") {
    action = "Immediate Action";
    reasoning =
      "Urgency and priority scores indicate an actionable institutional event.";
  } else if (priority.score < 35) {
    action = "Ignore";
    reasoning = "Low institutional priority — noise relative to book risk.";
  } else if (
    alert.category === "Platform" ||
    event.includes("info") ||
    priority.band === "Informational"
  ) {
    action = "Archive";
    reasoning = "Informational alert — archive after review.";
  } else if (priority.score < 55) {
    action = "Wait";
    reasoning = "Incomplete confirmation — wait for follow-through.";
  } else if (
    alert.category === "Validation" ||
    alert.category === "Trust" ||
    alert.sourceEngine === "AI Research"
  ) {
    action = "Research Required";
    reasoning = "Evidence quality needs research review before sizing.";
  }

  const badges: AlertDecisionBadge[] = [];
  if (priority.band === "Critical" || alert.priority === "Critical") {
    badges.push("Critical");
  }
  if (priority.score >= 85) badges.push("Highest Priority");
  if (alert.inPortfolio) badges.push("Portfolio");
  if (alert.inWatchlist) badges.push("Watchlist");
  if (
    action === "Immediate Action" ||
    action === "Increase Position" ||
    action === "Reduce Position"
  ) {
    badges.push("AI Recommended");
  }
  if (priority.factors.confidence >= 75) badges.push("High Conviction");
  if (priority.factors.risk >= 70 || impact.capitalRisk === "Elevated") {
    badges.push("High Risk");
  }
  if (options?.hasConflict) badges.push("Conflict");

  const alternates: AlertRecommendationAction[] = [
    "Monitor",
    "Research Required",
    "Wait",
  ].filter((a) => a !== action) as AlertRecommendationAction[];

  return {
    action,
    reasoning: safeLabel(reasoning, DECISION_SUPPORT_EMPTY.noRecommendation),
    alternateActions: alternates,
    badges,
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.noRecommendation,
  };
}

export class AlertRecommendationEngine {
  recommend(
    alert: InstitutionalAlert,
    options?: { hasConflict?: boolean }
  ): AlertRecommendationResult {
    return recommendAlertAction(alert, options);
  }
}
