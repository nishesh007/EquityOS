/**
 * Sprint 8D — AI Research & Valuation Engine.
 * Public API for intrinsic valuation, recommendations, narratives, and targets.
 */

export { computeIntrinsicValuation, buildValuationSummary } from "@/lib/valuation/intrinsic-engine";
export {
  deriveRecommendation,
  recommendationRationale,
  recommendationCompositeScore,
} from "@/lib/valuation/recommendation-engine";
export { buildResearchNarrative } from "@/lib/valuation/narrative-engine";
export { calculateValuationConfidence } from "@/lib/valuation/confidence-engine";
export { computePriceTargets } from "@/lib/valuation/price-target-engine";
export { buildDecisionTimeline } from "@/lib/valuation/timeline-engine";
export { buildResearchSummary } from "@/lib/valuation/summary-engine";
export {
  extractValuationInputs,
  fairPeFromGrowth,
  fairPbFromRoe,
  fairPeg,
  verdictFromRatio,
  verdictFromPrice,
  marginOfSafety,
  upsidePercent,
  downsidePercent,
  sectorPe,
  sectorPb,
  sectorEvEbitda,
  historicalPercentile,
  toIntrinsicSnapshot,
} from "@/lib/valuation/utils";

export type {
  ValuationInputs,
  ValuationModelResult,
  IntrinsicValuationResult,
  RecommendationInput,
  ResearchNarrative,
  ResearchNarrativeInput,
  ConfidenceInput,
  ConfidenceResult,
  PriceTargetInput,
  PriceTargetResult,
  DecisionTimelineItem,
  ResearchSummary,
  ResearchSummaryInput,
} from "@/lib/valuation/types";

export { computeDcfValuation } from "@/lib/valuation/dcf";
export { computeGrahamValuation } from "@/lib/valuation/graham";
export { computeEpvValuation } from "@/lib/valuation/epv";
export { computeRelativePeValuation } from "@/lib/valuation/relative-pe";
export { computeRelativePbValuation } from "@/lib/valuation/relative-pb";
export { computeEvEbitdaValuation } from "@/lib/valuation/ev-ebitda";
export { computeSectorComparisonValuation } from "@/lib/valuation/sector-comparison";
