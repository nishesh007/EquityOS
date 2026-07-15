/**
 * Institutional AI Earnings Intelligence — public exports (Sprint 9B.R2).
 */

export type {
  AIOutlook,
  ExpectationOutcome,
  MarginTrendExpectation,
  VolatilityLevel,
  InterestLevel,
  ConsensusDirection,
  IntelligenceBadgeId,
  EarningsQuarterPoint,
  EarningsResearchContext,
  AIExpectationView,
  ExpectedSurpriseView,
  EarningsRiskView,
  EarningsSignalView,
  EarningsConfidenceView,
  EarningsPreviewSnapshot,
  EarningsResearchSummary,
  EarningsCardPreviewView,
  EarningsDrawerView,
} from "./EarningsIntelligenceModels";

export { INTELLIGENCE_EMPTY } from "./EarningsIntelligenceModels";

export { getAIExpectation as computeAIExpectation } from "./EarningsExpectationEngine";
export { getExpectedSurprise as computeExpectedSurprise, computeHistoricalBeatRate } from "./EarningsSurpriseEngine";
export { buildEarningsRiskView } from "./EarningsRiskEngine";
export { getConfidence as computeConfidence } from "./EarningsConfidenceEngine";
export {
  deriveAIOutlook,
  buildIntelligenceBadges,
  buildImportantWatchItem,
  buildEarningsSignalView,
} from "./EarningsSignalEngine";
export { getResearchSummary as composeResearchSummary } from "./EarningsAISummary";
export {
  toEarningsCardPreviewView,
  toEarningsDrawerView,
  badgeVariant,
} from "./EarningsPreviewPresenter";

export {
  EarningsPreviewEngine,
  buildEarningsResearchContext,
  getEarningsPreviewEngine,
  resetEarningsPreviewEngine,
  getEarningsPreview,
  getAIExpectation,
  getExpectedSurprise,
  getConfidence,
  getResearchSummary,
} from "./EarningsPreviewEngine";
