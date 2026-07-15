/**
 * Compose full AI decision-support panel for an alert (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import type { CenterAlert } from "../center/AlertCenterModels";
import {
  DECISION_SUPPORT_EMPTY,
  type AlertDecisionBadge,
  type AlertDecisionSupportPanel,
} from "./AlertDecisionModels";
import { detectAlertConflicts } from "./AlertConflictEngine";
import { buildConfidenceBreakdown } from "./AlertConfidenceBreakdown";
import { collectAlertEvidence } from "./AlertEvidenceEngine";
import { explainAlert } from "./AlertExplainabilityEngine";
import { estimateAlertImpact } from "./AlertImpactEngine";
import { scoreAlertPriority } from "./AlertPriorityEngine";
import { recommendAlertAction } from "./AlertRecommendationEngine";
import { findSimilarAlerts } from "./AlertSimilarityEngine";
import { buildAlertTimeline } from "./AlertTimelineEngine";

export function buildAlertDecisionSupport(
  alert: InstitutionalAlert,
  options?: {
    peers?: readonly InstitutionalAlert[];
    history?: readonly InstitutionalAlert[];
    center?: CenterAlert | null;
  }
): AlertDecisionSupportPanel {
  const peers = options?.peers ?? [alert];
  const history = options?.history ?? peers;
  const conflict = detectAlertConflicts(peers, alert);
  const priority = scoreAlertPriority(alert);
  if (conflict.hasConflict) {
    priority.score = Math.max(0, priority.score - conflict.confidencePenalty);
    priority.label = `${priority.score} — ${priority.band} (conflict −${conflict.confidencePenalty})`;
  }
  const similarity = findSimilarAlerts(alert, history);
  const recommendation = recommendAlertAction(alert, {
    hasConflict: conflict.hasConflict,
  });
  const badges: AlertDecisionBadge[] = [...recommendation.badges];
  if (!similarity.empty) badges.push("Historical Match");

  return {
    priority,
    impact: estimateAlertImpact(alert),
    recommendation,
    explainability: explainAlert(alert, {
      relatedAlertIds: similarity.matches.map((m) => m.alertId),
      historicalNote: similarity.empty
        ? DECISION_SUPPORT_EMPTY.noHistoricalMatch
        : `${similarity.matches.length} similar historical alert(s)`,
    }),
    evidence: collectAlertEvidence(alert),
    conflict,
    similarity,
    timeline: buildAlertTimeline(alert, { center: options?.center }),
    confidenceBreakdown: buildConfidenceBreakdown(alert),
    badges: Array.from(new Set(badges)),
    empty: false,
    emptyMessage: DECISION_SUPPORT_EMPTY.awaitingAnalysis,
  };
}
