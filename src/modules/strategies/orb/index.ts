/**
 * ORB module exports — Sprint 11B.3B.1 / 11B.3B.2 / 11B.3B.3.
 */

export type { ORBConfig } from "./ORBConstants";
export {
  DEFAULT_ORB_CONFIG,
  DEFAULT_ORB_RANGE_END,
  DEFAULT_ORB_RANGE_START,
  ORB_STRATEGY_ID,
  ORB_STRATEGY_NAME,
} from "./ORBConstants";

export type {
  OpeningRange,
  ORBBreakoutCandidate,
  ORBCandle,
  ORBDetection,
  ORBDetectionContext,
  ORBDirection,
  ORBMarketData,
  ORBStrategyInput,
  ORBValidationResult,
} from "./ORBTypes";

export {
  isORBStrategyInput,
  toORBDetectionContext,
} from "./ORBTypes";

export type {
  ORBEntryMode,
  ORBPositionType,
  ORBQualityGrade,
  ORBStopMethod,
  ORBTradeConfig,
  ORBTradeSetup,
} from "./ORBTradeTypes";

export {
  DEFAULT_ORB_TRADE_CONFIG,
  resolveORBTradeConfig,
} from "./ORBTradeTypes";

export {
  averageSectorScore,
  calculateOpeningRange,
  calculateORBConfidence,
  createEmptyORBDetection,
  detectBreakout,
  detectORB,
  isValidMarketHours,
  isWithinSessionWindow,
  parseSessionMinutes,
  resolveORBConfig,
  sessionMinutesOf,
  validateBreadth,
  validateLiquidity,
  validateMarket,
  validateSector,
  validateVolume,
} from "./ORBUtils";

export {
  calculateAtrStop,
  calculateCandleStop,
  calculateOpeningRangeStop,
  calculateRiskAmount,
  findBreakoutCandle,
  isRiskWithinLimit,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type ORBStopCandidate,
} from "./ORBRisk";

export {
  areValidTargets,
  calculateORBEntry,
  calculateORBTradeQuality,
  calculateRiskReward,
  classifyORBQualityGrade,
  createRejectedTradeSetup,
  generateORBTargets,
  validateORBTradeSetup,
  type ORBTargetLadder,
} from "./ORBTradeUtils";

export {
  ORBTradeBuilder,
  getORBTradeBuilder,
  resetORBTradeBuilder,
  type ORBTradeBuildInput,
} from "./ORBTradeBuilder";

export { enrichORBTradeSetup } from "./ORBEnrichment";

export type {
  ORBConvictionGrade,
  ORBConvictionWeights,
  ORBFactorScores,
  ORBInstitutionalScore,
  ORBScoringConfig,
  ORBSignalGrade,
} from "./ORBScoring";

export {
  DEFAULT_ORB_CONVICTION_WEIGHTS,
  DEFAULT_ORB_SCORING_CONFIG,
  buildORBInstitutionalScore,
  calculateORBConviction,
  calculateORBSignalGrade,
  classifyORBConvictionGrade,
  classifyORBSignalGrade,
  resolveORBScoringConfig,
  scoreORBConvictionFactors,
} from "./ORBScoring";

export type {
  ORBExplainability,
  ORBExplainabilityConfig,
  ORBExplanationFactor,
  ORBExplanationImpact,
} from "./ORBExplainability";

export {
  DEFAULT_ORB_EXPLAINABILITY_CONFIG,
  buildORBExplainability,
  buildORBExplanationFactors,
  buildORBSummary,
  createEmptyORBExplainability,
  resolveORBExplainabilityConfig,
} from "./ORBExplainability";

export type { ORBMetricsSnapshot } from "./ORBMetrics";
export {
  ORBMetrics,
  createEmptyORBMetrics,
  getORBMetrics,
  resetORBMetrics,
} from "./ORBMetrics";

export {
  buildORBContextFromPipeline,
  ensureORBRegistered,
  executeORBThroughEngine,
  executeORBWithPipeline,
  getORBFromFactory,
  getORBIntegrationStatus,
  isORBExecutableInput,
} from "./ORBIntegration";

export { ORBValidator, createORBValidator } from "./ORBValidator";
export {
  ORBDetector,
  getORBDetector,
  resetORBDetector,
} from "./ORBDetector";
export {
  ORBStrategy,
  createORBStrategyRegistration,
  registerORBStrategy,
} from "./ORBStrategy";
