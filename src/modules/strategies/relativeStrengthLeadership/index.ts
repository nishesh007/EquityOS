/**
 * Relative Strength Leadership Strategy module — Sprint 11B.3O.
 */

export {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONFIG,
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_ID,
  RELATIVE_STRENGTH_LEADERSHIP_STRATEGY_NAME,
  resolveRelativeStrengthLeadershipConfig,
  type RelativeStrengthLeadershipConfig,
} from "./RelativeStrengthLeadershipConstants";

export type {
  RelativeStrengthLeadershipCandle,
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipDetectionContext,
  RelativeStrengthLeadershipDirection,
  RelativeStrengthLeadershipMarketData,
  RelativeStrengthLeadershipStrategyInput,
  RelativeStrengthLeadershipValidationResult,
  RelativeStrengthMetrics,
  RelativeStrengthSeriesPoint,
} from "./RelativeStrengthLeadershipTypes";

export {
  isRelativeStrengthLeadershipStrategyInput,
  toRelativeStrengthLeadershipDetectionContext,
} from "./RelativeStrengthLeadershipTypes";

export type {
  RelativeStrengthLeadershipEntryMode,
  RelativeStrengthLeadershipPositionType,
  RelativeStrengthLeadershipQualityGrade,
  RelativeStrengthLeadershipStopMethod,
  RelativeStrengthLeadershipTradeConfig,
  RelativeStrengthLeadershipTradeSetup,
} from "./RelativeStrengthLeadershipTradeTypes";

export {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_TRADE_CONFIG,
  resolveRelativeStrengthLeadershipTradeConfig,
} from "./RelativeStrengthLeadershipTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  calculateRelativeStrengthMetrics,
  createEmptyRelativeStrengthLeadershipDetection,
  detectRelativeStrengthLeadership,
  isValidMarketHours,
  validateBreadth,
  validateSector,
} from "./RelativeStrengthLeadershipUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateRiskAmount,
  calculateSwingLowStop,
  calculateVwapStop,
  findRecentSwingLow,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type RelativeStrengthLeadershipStopCandidate,
} from "./RelativeStrengthLeadershipRisk";

export {
  calculateRelativeStrengthLeadershipEntry,
  calculateRelativeStrengthLeadershipTradeQuality,
  calculateRiskReward,
  classifyRelativeStrengthLeadershipQualityGrade,
  createRejectedRelativeStrengthLeadershipTradeSetup,
  generateRelativeStrengthLeadershipTargets,
  validateRelativeStrengthLeadershipTradeSetup,
  type RelativeStrengthLeadershipTargetLadder,
} from "./RelativeStrengthLeadershipTradeUtils";

export {
  RelativeStrengthLeadershipValidator,
  createRelativeStrengthLeadershipValidator,
} from "./RelativeStrengthLeadershipValidator";

export {
  RelativeStrengthLeadershipDetector,
  getRelativeStrengthLeadershipDetector,
  resetRelativeStrengthLeadershipDetector,
} from "./RelativeStrengthLeadershipDetector";

export {
  RelativeStrengthLeadershipTradeBuilder,
  getRelativeStrengthLeadershipTradeBuilder,
  resetRelativeStrengthLeadershipTradeBuilder,
} from "./RelativeStrengthLeadershipTradeBuilder";

export { enrichRelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipEnrichment";

export type {
  RelativeStrengthLeadershipExplainability,
  RelativeStrengthLeadershipExplainabilityConfig,
  RelativeStrengthLeadershipExplanationFactor,
  RelativeStrengthLeadershipExplanationImpact,
} from "./RelativeStrengthLeadershipExplainability";

export {
  buildRelativeStrengthLeadershipExplainability,
  buildRelativeStrengthLeadershipExplanationFactors,
  buildRelativeStrengthLeadershipSummary,
  createEmptyRelativeStrengthLeadershipExplainability,
  resolveRelativeStrengthLeadershipExplainabilityConfig,
} from "./RelativeStrengthLeadershipExplainability";

export type {
  RelativeStrengthLeadershipConvictionGrade,
  RelativeStrengthLeadershipConvictionWeights,
  RelativeStrengthLeadershipFactorScores,
  RelativeStrengthLeadershipInstitutionalScore,
  RelativeStrengthLeadershipScoringConfig,
  RelativeStrengthLeadershipSignalGrade,
} from "./RelativeStrengthLeadershipScoring";

export {
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_CONVICTION_WEIGHTS,
  DEFAULT_RELATIVE_STRENGTH_LEADERSHIP_SCORING_CONFIG,
  buildRelativeStrengthLeadershipInstitutionalScore,
  calculateRelativeStrengthLeadershipConviction,
  calculateRelativeStrengthLeadershipSignalGrade,
  classifyRelativeStrengthLeadershipConvictionGrade,
  classifyRelativeStrengthLeadershipSignalGrade,
  resolveRelativeStrengthLeadershipScoringConfig,
  scoreRelativeStrengthLeadershipConvictionFactors,
} from "./RelativeStrengthLeadershipScoring";

export type { RelativeStrengthLeadershipMetricsSnapshot } from "./RelativeStrengthLeadershipMetrics";

export {
  RelativeStrengthLeadershipMetrics,
  createEmptyRelativeStrengthLeadershipMetrics,
  getRelativeStrengthLeadershipMetrics,
  resetRelativeStrengthLeadershipMetrics,
} from "./RelativeStrengthLeadershipMetrics";

export {
  buildRelativeStrengthLeadershipContextFromPipeline,
  ensureRelativeStrengthLeadershipRegistered,
  executeRelativeStrengthLeadershipThroughEngine,
  executeRelativeStrengthLeadershipWithPipeline,
  getRelativeStrengthLeadershipFromFactory,
  getRelativeStrengthLeadershipIntegrationStatus,
  isRelativeStrengthLeadershipExecutableInput,
} from "./RelativeStrengthLeadershipIntegration";

export {
  RelativeStrengthLeadershipStrategy,
  createRelativeStrengthLeadershipStrategyRegistration,
  registerRelativeStrengthLeadershipStrategy,
} from "./RelativeStrengthLeadershipStrategy";
