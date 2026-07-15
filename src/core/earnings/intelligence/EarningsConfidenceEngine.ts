/**
 * Earnings confidence engine — 0–100 AI confidence for pre-result previews.
 * Lightweight composition from available evidence (no duplicate research confidence engine).
 */

import type {
  AIExpectationView,
  EarningsConfidenceView,
  EarningsResearchContext,
  ExpectedSurpriseView,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

export function getConfidence(input: {
  context: EarningsResearchContext;
  expectation: AIExpectationView;
  surprise: ExpectedSurpriseView;
}): EarningsConfidenceView {
  const { context, expectation, surprise } = input;

  if (!context.quarters || context.quarters.length < 2) {
    return {
      score: null,
      label: INTELLIGENCE_EMPTY.notEnoughConfidence,
      breakdown: [],
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.notEnoughConfidence,
    };
  }

  let score = 42;
  const breakdown: Array<{ factor: string; contribution: string }> = [];

  const historyBoost = Math.min(18, context.quarters.length * 4);
  score += historyBoost;
  breakdown.push({
    factor: "Historical coverage",
    contribution: `+${historyBoost}`,
  });

  if (expectation.available) {
    score += 10;
    breakdown.push({ factor: "Expectation model", contribution: "+10" });
  }

  if (surprise.available) {
    score += 8;
    breakdown.push({ factor: "Surprise history", contribution: "+8" });
  } else {
    score -= 6;
    breakdown.push({ factor: "Surprise history", contribution: "-6" });
  }

  if (context.hasAnalystCoverage) {
    score += 8;
    breakdown.push({ factor: "Analyst coverage", contribution: "+8" });
  } else {
    score -= 8;
    breakdown.push({
      factor: "Analyst coverage",
      contribution: INTELLIGENCE_EMPTY.noAnalystCoverage,
    });
  }

  if (context.event.highImpact) {
    score += 4;
    breakdown.push({ factor: "High-impact event", contribution: "+4" });
  }

  if (context.valuationStatus != null) {
    score += 4;
    breakdown.push({ factor: "Valuation context", contribution: "+4" });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (score < 35) {
    return {
      score,
      label: INTELLIGENCE_EMPTY.notEnoughConfidence,
      breakdown,
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.notEnoughConfidence,
    };
  }

  return {
    score,
    label: `${score}`,
    breakdown,
    available: true,
    emptyMessage: "",
  };
}
