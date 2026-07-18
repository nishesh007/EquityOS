/**
 * VWAP Continuation module exports — Sprint 11B.3C.1 / 11B.3C.2 / 11B.3C.3.
 */

export type { VWAPContinuationConfig } from "./VWAPContinuationConstants";
export {
  DEFAULT_VWAP_CONTINUATION_CONFIG,
  VWAP_CONTINUATION_STRATEGY_ID,
  VWAP_CONTINUATION_STRATEGY_NAME,
  resolveVWAPContinuationConfig,
} from "./VWAPContinuationConstants";

export type {
  VWAPCandle,
  VWAPContinuationDetection,
  VWAPContinuationDetectionContext,
  VWAPContinuationDirection,
  VWAPContinuationMarketData,
  VWAPContinuationStrategyInput,
  VWAPContinuationValidationResult,
} from "./VWAPContinuationTypes";

export {
  isVWAPContinuationStrategyInput,
  toVWAPContinuationDetectionContext,
} from "./VWAPContinuationTypes";

export type {
  VWAPContinuationEntryMode,
  VWAPContinuationPositionType,
  VWAPContinuationQualityGrade,
  VWAPContinuationStopMethod,
  VWAPContinuationTradeConfig,
  VWAPContinuationTradeSetup,
} from "./VWAPContinuationTradeTypes";

export {
  DEFAULT_VWAP_CONTINUATION_TRADE_CONFIG,
  resolveVWAPContinuationTradeConfig,
} from "./VWAPContinuationTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  calculateVWAPSlope,
  createEmptyVWAPContinuationDetection,
  detectBounce,
  detectPullback,
  detectVWAPContinuation,
  isValidMarketHours,
  measureVWAPDistance,
  parseSessionMinutes,
  sessionMinutesOf,
  validateBreadth,
  validateMarket,
  validateSector,
  validateTrend,
  validateVolume,
} from "./VWAPContinuationUtils";

export {
  calculateAtrStop,
  calculateRiskAmount,
  calculateSwingStop,
  calculateVwapBufferStop,
  findRecentSwingHigh,
  findRecentSwingLow,
  isRiskWithinLimit,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type VWAPContinuationStopCandidate,
} from "./VWAPContinuationRisk";

export {
  areValidTargets,
  calculateRiskReward,
  calculateVWAPContinuationEntry,
  calculateVWAPContinuationTradeQuality,
  classifyVWAPContinuationQualityGrade,
  createRejectedVWAPContinuationTradeSetup,
  generateVWAPContinuationTargets,
  validateVWAPContinuationTradeSetup,
  type VWAPContinuationTargetLadder,
} from "./VWAPContinuationTradeUtils";

export {
  VWAPContinuationValidator,
  createVWAPContinuationValidator,
} from "./VWAPContinuationValidator";

export {
  VWAPContinuationDetector,
  getVWAPContinuationDetector,
  resetVWAPContinuationDetector,
} from "./VWAPContinuationDetector";

export {
  VWAPContinuationTradeBuilder,
  getVWAPContinuationTradeBuilder,
  resetVWAPContinuationTradeBuilder,
} from "./VWAPContinuationTradeBuilder";

export { enrichVWAPContinuationTradeSetup } from "./VWAPContinuationEnrichment";

export type {
  VWAPContinuationExplainability,
  VWAPContinuationExplainabilityConfig,
  VWAPContinuationExplanationFactor,
  VWAPContinuationExplanationImpact,
} from "./VWAPContinuationExplainability";

export {
  buildVWAPContinuationExplainability,
  buildVWAPContinuationExplanationFactors,
  buildVWAPContinuationSummary,
  createEmptyVWAPContinuationExplainability,
  resolveVWAPContinuationExplainabilityConfig,
  DEFAULT_VWAP_CONTINUATION_EXPLAINABILITY_CONFIG,
} from "./VWAPContinuationExplainability";

export type {
  VWAPContinuationConvictionGrade,
  VWAPContinuationConvictionWeights,
  VWAPContinuationFactorScores,
  VWAPContinuationInstitutionalScore,
  VWAPContinuationScoringConfig,
  VWAPContinuationSignalGrade,
} from "./VWAPContinuationScoring";

export {
  DEFAULT_VWAP_CONTINUATION_CONVICTION_WEIGHTS,
  DEFAULT_VWAP_CONTINUATION_SCORING_CONFIG,
  buildVWAPContinuationInstitutionalScore,
  calculateVWAPContinuationConviction,
  calculateVWAPContinuationSignalGrade,
  classifyVWAPContinuationConvictionGrade,
  classifyVWAPContinuationSignalGrade,
  resolveVWAPContinuationScoringConfig,
  scoreVWAPContinuationConvictionFactors,
} from "./VWAPContinuationScoring";

export type { VWAPContinuationMetricsSnapshot } from "./VWAPContinuationMetrics";

export {
  VWAPContinuationMetrics,
  VWAP_CONTINUATION_HOLD_TIME_MINUTES,
  createEmptyVWAPContinuationMetrics,
  getVWAPContinuationMetrics,
  resetVWAPContinuationMetrics,
} from "./VWAPContinuationMetrics";

export {
  buildVWAPContinuationContextFromPipeline,
  ensureVWAPContinuationRegistered,
  executeVWAPContinuationThroughEngine,
  executeVWAPContinuationWithPipeline,
  getVWAPContinuationFromFactory,
  getVWAPContinuationIntegrationStatus,
  isVWAPContinuationExecutableInput,
} from "./VWAPContinuationIntegration";

export {
  VWAPContinuationStrategy,
  createVWAPContinuationStrategyRegistration,
  registerVWAPContinuationStrategy,
} from "./VWAPContinuationStrategy";
