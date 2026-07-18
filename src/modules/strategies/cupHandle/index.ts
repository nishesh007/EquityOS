/**
 * Cup & Handle Strategy module — Sprint 11B.3Q.
 */

export {
  DEFAULT_CUP_HANDLE_CONFIG,
  CUP_HANDLE_STRATEGY_ID,
  CUP_HANDLE_STRATEGY_NAME,
  resolveCupHandleConfig,
  type CupHandleConfig,
} from "./CupHandleConstants";

export type {
  CupGeometry,
  CupHandleCandle,
  CupHandleDetection,
  CupHandleDetectionContext,
  CupHandleDirection,
  CupHandleMarketData,
  CupHandleStrategyInput,
  CupHandleValidationResult,
  HandleGeometry,
} from "./CupHandleTypes";

export {
  isCupHandleStrategyInput,
  toCupHandleDetectionContext,
} from "./CupHandleTypes";

export type {
  CupHandleEntryMode,
  CupHandlePositionType,
  CupHandleQualityGrade,
  CupHandleStopMethod,
  CupHandleTradeConfig,
  CupHandleTradeSetup,
} from "./CupHandleTradeTypes";

export {
  DEFAULT_CUP_HANDLE_TRADE_CONFIG,
  resolveCupHandleTradeConfig,
} from "./CupHandleTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyCupHandleDetection,
  detectCupGeometry,
  detectCupHandle,
  detectHandleGeometry,
  isRoundedCup,
  isValidMarketHours,
  validateBreadth,
  validateSector,
} from "./CupHandleUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateHandleLowStop,
  calculateRiskAmount,
  calculateVwapStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type CupHandleStopCandidate,
} from "./CupHandleRisk";

export {
  calculateCupHandleEntry,
  calculateCupHandleTradeQuality,
  calculateRiskReward,
  classifyCupHandleQualityGrade,
  createRejectedCupHandleTradeSetup,
  generateCupHandleTargets,
  validateCupHandleTradeSetup,
  type CupHandleTargetLadder,
} from "./CupHandleTradeUtils";

export { CupHandleValidator, createCupHandleValidator } from "./CupHandleValidator";

export {
  CupHandleDetector,
  getCupHandleDetector,
  resetCupHandleDetector,
} from "./CupHandleDetector";

export {
  CupHandleTradeBuilder,
  getCupHandleTradeBuilder,
  resetCupHandleTradeBuilder,
} from "./CupHandleTradeBuilder";

export { enrichCupHandleTradeSetup } from "./CupHandleEnrichment";

export type {
  CupHandleExplainability,
  CupHandleExplainabilityConfig,
  CupHandleExplanationFactor,
  CupHandleExplanationImpact,
} from "./CupHandleExplainability";

export {
  buildCupHandleExplainability,
  buildCupHandleExplanationFactors,
  buildCupHandleSummary,
  createEmptyCupHandleExplainability,
  resolveCupHandleExplainabilityConfig,
} from "./CupHandleExplainability";

export type {
  CupHandleConvictionGrade,
  CupHandleConvictionWeights,
  CupHandleFactorScores,
  CupHandleInstitutionalScore,
  CupHandleScoringConfig,
  CupHandleSignalGrade,
} from "./CupHandleScoring";

export {
  DEFAULT_CUP_HANDLE_CONVICTION_WEIGHTS,
  DEFAULT_CUP_HANDLE_SCORING_CONFIG,
  buildCupHandleInstitutionalScore,
  calculateCupHandleConviction,
  calculateCupHandleSignalGrade,
  classifyCupHandleConvictionGrade,
  classifyCupHandleSignalGrade,
  resolveCupHandleScoringConfig,
  scoreCupHandleConvictionFactors,
} from "./CupHandleScoring";

export type { CupHandleMetricsSnapshot } from "./CupHandleMetrics";

export {
  CupHandleMetrics,
  createEmptyCupHandleMetrics,
  getCupHandleMetrics,
  resetCupHandleMetrics,
} from "./CupHandleMetrics";

export {
  buildCupHandleContextFromPipeline,
  ensureCupHandleRegistered,
  executeCupHandleThroughEngine,
  executeCupHandleWithPipeline,
  getCupHandleFromFactory,
  getCupHandleIntegrationStatus,
  isCupHandleExecutableInput,
} from "./CupHandleIntegration";

export {
  CupHandleStrategy,
  createCupHandleStrategyRegistration,
  registerCupHandleStrategy,
} from "./CupHandleStrategy";
