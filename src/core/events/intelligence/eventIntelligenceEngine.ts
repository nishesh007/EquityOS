/**
 * Event Intelligence Engine orchestrator (Sprint 10D.4).
 * Deterministic pipeline: event → engines → EventIntelligence.
 */

import type { EventIntelligenceEvent } from "@/types/event";
import type {
  EventIntelligence,
  EventVolatilityView,
} from "@/types/eventIntelligence";
import { RISK_RATING_LABELS } from "@/types/eventIntelligence";
import { IMPORTANCE_CRITICALITY, clampScore } from "@/src/core/events/intelligence/constants";
import { computeConfidenceBreakdown } from "@/src/core/events/intelligence/confidenceEngine";
import { computeHistoricalInsight } from "@/src/core/events/intelligence/historicalInsightEngine";
import { computeImpactAnalysis } from "@/src/core/events/intelligence/impactScoreEngine";
import { computeMarketBias } from "@/src/core/events/intelligence/marketBiasEngine";
import { computePreparationChecklist } from "@/src/core/events/intelligence/preparationChecklistEngine";
import { computeRiskAnalysis } from "@/src/core/events/intelligence/riskEngine";
import { computeSectorImpactMatrix } from "@/src/core/events/intelligence/sectorImpactEngine";
import { computeExecutiveSummary } from "@/src/core/events/intelligence/summaryEngine";

function resolveVolatility(event: EventIntelligenceEvent): EventVolatilityView {
  const macroVol = event.macroDetail?.marketImpact.volatility;
  if (macroVol) {
    return {
      level: macroVol,
      rationale: `Macro market-impact volatility tagged ${macroVol}.`,
    };
  }
  if (
    event.importance === "critical" ||
    event.eventType === "quarterly_results" ||
    event.eventType === "msci_review"
  ) {
    return {
      level: "high",
      rationale: "Critical / high-beta event type defaults to elevated volatility.",
    };
  }
  if (event.importance === "low" || event.eventType === "agm") {
    return {
      level: "low",
      rationale: "Low-importance / governance event — contained volatility expected.",
    };
  }
  return {
    level: "medium",
    rationale: "Standard event volatility assumption.",
  };
}

/** Run the full deterministic intelligence pipeline for one event. */
export function analyzeEventIntelligence(
  event: EventIntelligenceEvent,
  generatedAt: string = new Date().toISOString()
): EventIntelligence {
  const impact = computeImpactAnalysis(event);
  const confidence = computeConfidenceBreakdown(event);
  const expectedVolatility = resolveVolatility(event);
  const risk = computeRiskAnalysis(event, impact.score, expectedVolatility.level);
  const marketBias = computeMarketBias(event, confidence.score);
  const sectorMatrix = computeSectorImpactMatrix(event);
  const preparationChecklist = computePreparationChecklist(event);
  const historicalInsight = computeHistoricalInsight(event);
  const executiveSummary = computeExecutiveSummary(
    event,
    sectorMatrix,
    marketBias,
    impact.score,
    RISK_RATING_LABELS[risk.rating]
  );

  const importanceScore = clampScore(
    IMPORTANCE_CRITICALITY[event.importance] * 3.2 +
      impact.score * 0.35 +
      (expectedVolatility.level === "high"
        ? 12
        : expectedVolatility.level === "medium"
          ? 6
          : 2)
  );

  const affectedSectors =
    sectorMatrix.primaryBeneficiaries.length + sectorMatrix.primaryRisks.length > 0
      ? [
          ...new Set([
            ...sectorMatrix.primaryBeneficiaries,
            ...sectorMatrix.primaryRisks,
          ]),
        ]
      : event.affectedSectors;

  return {
    eventId: event.id,
    generatedAt,
    engineVersion: "10D.4",
    executiveSummary,
    impact,
    confidence,
    risk,
    marketBias,
    expectedVolatility,
    sectorMatrix,
    affectedSectors,
    affectedStocks: event.affectedStocks,
    preparationChecklist,
    historicalInsight,
    importanceScore,
  };
}

/** Attach lightweight reserved fields without mutating source engines. */
export function enrichEventWithIntelligence(
  event: EventIntelligenceEvent
): EventIntelligenceEvent {
  const intel = analyzeEventIntelligence(event, event.updatedAt);
  return {
    ...event,
    impactScore: intel.impact.score,
    confidence: intel.confidence.score,
    aiSummary: intel.executiveSummary.narrative,
    historicalAnalysis: intel.historicalInsight?.summary ?? null,
    preparationChecklist: intel.preparationChecklist.items.map((i) => i.label),
  };
}

export const eventIntelligenceEngine = {
  analyze: analyzeEventIntelligence,
  enrich: enrichEventWithIntelligence,
};
