/**
 * Flat Base Strategy module — Sprint 11B.3R.
 */

export {
  DEFAULT_FLAT_BASE_CONFIG,
  FLAT_BASE_STRATEGY_ID,
  FLAT_BASE_STRATEGY_NAME,
  resolveFlatBaseConfig,
  type FlatBaseConfig,
} from "./FlatBaseConstants";

export type {
  FlatBaseCandle,
  FlatBaseDetection,
  FlatBaseDetectionContext,
  FlatBaseDirection,
  FlatBaseGeometry,
  FlatBaseMarketData,
  FlatBaseStrategyInput,
  FlatBaseValidationResult,
} from "./FlatBaseTypes";

export {
  isFlatBaseStrategyInput,
  toFlatBaseDetectionContext,
} from "./FlatBaseTypes";

export type {
  FlatBaseEntryMode,
  FlatBasePositionType,
  FlatBaseQualityGrade,
  FlatBaseStopMethod,
  FlatBaseTradeConfig,
  FlatBaseTradeSetup,
} from "./FlatBaseTradeTypes";

export {
  DEFAULT_FLAT_BASE_TRADE_CONFIG,
  resolveFlatBaseTradeConfig,
} from "./FlatBaseTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyFlatBaseDetection,
  detectFlatBase,
  detectFlatBaseGeometry,
  isValidMarketHours,
  validateBreadth,
  validatePriorTrend,
  validateSector,
} from "./FlatBaseUtils";

export {
  calculateAtrStop,
  calculateBaseLowStop,
  calculateEma20Stop,
  calculateRiskAmount,
  calculateVwapStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type FlatBaseStopCandidate,
} from "./FlatBaseRisk";

export {
  calculateFlatBaseEntry,
  calculateFlatBaseTradeQuality,
  calculateRiskReward,
  classifyFlatBaseQualityGrade,
  createRejectedFlatBaseTradeSetup,
  generateFlatBaseTargets,
  validateFlatBaseTradeSetup,
  type FlatBaseTargetLadder,
} from "./FlatBaseTradeUtils";

export { FlatBaseValidator, createFlatBaseValidator } from "./FlatBaseValidator";

export {
  FlatBaseDetector,
  getFlatBaseDetector,
  resetFlatBaseDetector,
} from "./FlatBaseDetector";

export {
  FlatBaseTradeBuilder,
  getFlatBaseTradeBuilder,
  resetFlatBaseTradeBuilder,
} from "./FlatBaseTradeBuilder";

export { enrichFlatBaseTradeSetup } from "./FlatBaseEnrichment";

export type {
  FlatBaseExplainability,
  FlatBaseExplainabilityConfig,
  FlatBaseExplanationFactor,
  FlatBaseExplanationImpact,
} from "./FlatBaseExplainability";

export {
  buildFlatBaseExplainability,
  buildFlatBaseExplanationFactors,
  buildFlatBaseSummary,
  createEmptyFlatBaseExplainability,
  resolveFlatBaseExplainabilityConfig,
} from "./FlatBaseExplainability";

export type {
  FlatBaseConvictionGrade,
  FlatBaseConvictionWeights,
  FlatBaseFactorScores,
  FlatBaseInstitutionalScore,
  FlatBaseScoringConfig,
  FlatBaseSignalGrade,
} from "./FlatBaseScoring";

export {
  DEFAULT_FLAT_BASE_CONVICTION_WEIGHTS,
  DEFAULT_FLAT_BASE_SCORING_CONFIG,
  buildFlatBaseInstitutionalScore,
  calculateFlatBaseConviction,
  calculateFlatBaseSignalGrade,
  classifyFlatBaseConvictionGrade,
  classifyFlatBaseSignalGrade,
  resolveFlatBaseScoringConfig,
  scoreFlatBaseConvictionFactors,
} from "./FlatBaseScoring";

export type { FlatBaseMetricsSnapshot } from "./FlatBaseMetrics";

export {
  FlatBaseMetrics,
  createEmptyFlatBaseMetrics,
  getFlatBaseMetrics,
  resetFlatBaseMetrics,
} from "./FlatBaseMetrics";

export {
  buildFlatBaseContextFromPipeline,
  ensureFlatBaseRegistered,
  executeFlatBaseThroughEngine,
  executeFlatBaseWithPipeline,
  getFlatBaseFromFactory,
  getFlatBaseIntegrationStatus,
  isFlatBaseExecutableInput,
} from "./FlatBaseIntegration";

export {
  FlatBaseStrategy,
  createFlatBaseStrategyRegistration,
  registerFlatBaseStrategy,
} from "./FlatBaseStrategy";
