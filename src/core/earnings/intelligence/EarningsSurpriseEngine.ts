/**
 * Earnings surprise engine — historical beat rate and expected surprise.
 * Reuses enrichQuarterlyResults surprise detection (no duplicated surprise math).
 */

import { enrichQuarterlyResults } from "@/lib/fundamentals/quarterly-engine";
import type {
  ConsensusDirection,
  EarningsResearchContext,
  ExpectationOutcome,
  ExpectedSurpriseView,
} from "./EarningsIntelligenceModels";
import { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

export function computeHistoricalBeatRate(
  context: EarningsResearchContext
): { rate: number | null; label: string; beats: number; samples: number } {
  if (!context.quarters || context.quarters.length < 2) {
    return {
      rate: null,
      label: INTELLIGENCE_EMPTY.insufficientHistory,
      beats: 0,
      samples: 0,
    };
  }

  const enriched = enrichQuarterlyResults(context.quarters);
  const samples = enriched.filter((q) => q.surprise != null);
  if (samples.length === 0) {
    return {
      rate: null,
      label: INTELLIGENCE_EMPTY.insufficientHistory,
      beats: 0,
      samples: 0,
    };
  }

  const beats = samples.filter((q) => q.surprise === "positive").length;
  const rate = Math.round((beats / samples.length) * 100);
  return {
    rate,
    label: `${rate}% Beat Rate`,
    beats,
    samples: samples.length,
  };
}

function consensusFromContext(
  context: EarningsResearchContext,
  beatRate: number | null
): ConsensusDirection | typeof INTELLIGENCE_EMPTY.consensusNotAvailable {
  if (!context.hasAnalystCoverage) {
    return INTELLIGENCE_EMPTY.consensusNotAvailable;
  }
  if (beatRate == null) return INTELLIGENCE_EMPTY.consensusNotAvailable;
  if (beatRate >= 60) return "Positive";
  if (beatRate <= 35) return "Negative";
  return "Neutral";
}

export function getExpectedSurprise(
  context: EarningsResearchContext
): ExpectedSurpriseView {
  const beat = computeHistoricalBeatRate(context);
  if (beat.rate == null) {
    return {
      direction: "Inline",
      beatProbabilityLabel: INTELLIGENCE_EMPTY.insufficientHistory,
      historicalBeatRateLabel: INTELLIGENCE_EMPTY.insufficientHistory,
      consensusDirection: INTELLIGENCE_EMPTY.consensusNotAvailable,
      available: false,
      emptyMessage: INTELLIGENCE_EMPTY.insufficientHistory,
    };
  }

  let direction: ExpectationOutcome = "Inline";
  if (beat.rate >= 60) direction = "Expected Beat";
  else if (beat.rate <= 35) direction = "Miss";

  const consensus = consensusFromContext(context, beat.rate);

  return {
    direction,
    beatProbabilityLabel:
      beat.rate >= 55 ? "Elevated Beat Probability" : "Balanced Beat Probability",
    historicalBeatRateLabel: beat.label,
    consensusDirection: consensus,
    available: true,
    emptyMessage: "",
  };
}
