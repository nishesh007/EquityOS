/**
 * News Momentum Strategy module — Sprint 11B.3K.
 */

export {
  DEFAULT_NEWS_MOMENTUM_CONFIG,
  NEWS_MOMENTUM_STRATEGY_ID,
  NEWS_MOMENTUM_STRATEGY_NAME,
  resolveNewsMomentumConfig,
  type NewsMomentumConfig,
} from "./NewsMomentumConstants";

export type {
  NewsCatalystEvent,
  NewsCatalystType,
  NewsMomentumCandle,
  NewsMomentumDetection,
  NewsMomentumDetectionContext,
  NewsMomentumDirection,
  NewsMomentumMarketData,
  NewsMomentumStrategyInput,
  NewsMomentumValidationResult,
  NewsQualityGrade,
  NewsSourceKind,
} from "./NewsMomentumTypes";

export {
  isNewsMomentumStrategyInput,
  toNewsMomentumDetectionContext,
} from "./NewsMomentumTypes";

export type {
  NewsMomentumEntryMode,
  NewsMomentumPositionType,
  NewsMomentumQualityGrade,
  NewsMomentumStopMethod,
  NewsMomentumTradeConfig,
  NewsMomentumTradeSetup,
} from "./NewsMomentumTradeTypes";

export {
  DEFAULT_NEWS_MOMENTUM_TRADE_CONFIG,
  resolveNewsMomentumTradeConfig,
} from "./NewsMomentumTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  calculateCatalystStrength,
  classifyNewsCatalyst,
  createEmptyNewsMomentumDetection,
  detectNewsMomentum,
  freshnessMinutes,
  isValidMarketHours,
  newsQualityIndex,
  pickBestEligibleNewsEvent,
  resolveCatalystDirection,
  scoreNewsQuality,
  validateBreadth,
  validateEmaAlignment,
  validateMarket,
  validatePriceConfirmation,
  validateSector,
  validateVolume,
  validateVwapAlignment,
} from "./NewsMomentumUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateSwingStop,
  calculateVwapStop,
  calculateRiskAmount,
  findRecentSwingHigh,
  findRecentSwingLow,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type NewsMomentumStopCandidate,
} from "./NewsMomentumRisk";

export {
  calculateNewsMomentumEntry,
  calculateNewsMomentumTradeQuality,
  calculateRiskReward,
  classifyNewsMomentumQualityGrade,
  createRejectedNewsMomentumTradeSetup,
  generateNewsMomentumTargets,
  validateNewsMomentumTradeSetup,
  type NewsMomentumTargetLadder,
} from "./NewsMomentumTradeUtils";

export {
  NewsMomentumValidator,
  createNewsMomentumValidator,
} from "./NewsMomentumValidator";

export {
  NewsMomentumDetector,
  getNewsMomentumDetector,
  resetNewsMomentumDetector,
} from "./NewsMomentumDetector";

export {
  NewsMomentumTradeBuilder,
  getNewsMomentumTradeBuilder,
  resetNewsMomentumTradeBuilder,
} from "./NewsMomentumTradeBuilder";

export { enrichNewsMomentumTradeSetup } from "./NewsMomentumEnrichment";

export type {
  NewsMomentumExplainability,
  NewsMomentumExplainabilityConfig,
  NewsMomentumExplanationFactor,
  NewsMomentumExplanationImpact,
} from "./NewsMomentumExplainability";

export {
  buildNewsMomentumExplainability,
  buildNewsMomentumExplanationFactors,
  buildNewsMomentumSummary,
  createEmptyNewsMomentumExplainability,
  resolveNewsMomentumExplainabilityConfig,
} from "./NewsMomentumExplainability";

export type {
  NewsMomentumConvictionGrade,
  NewsMomentumConvictionWeights,
  NewsMomentumFactorScores,
  NewsMomentumInstitutionalScore,
  NewsMomentumScoringConfig,
  NewsMomentumSignalGrade,
} from "./NewsMomentumScoring";

export {
  DEFAULT_NEWS_MOMENTUM_CONVICTION_WEIGHTS,
  DEFAULT_NEWS_MOMENTUM_SCORING_CONFIG,
  buildNewsMomentumInstitutionalScore,
  calculateNewsMomentumConviction,
  calculateNewsMomentumSignalGrade,
  classifyNewsMomentumConvictionGrade,
  classifyNewsMomentumSignalGrade,
  resolveNewsMomentumScoringConfig,
  scoreNewsMomentumConvictionFactors,
} from "./NewsMomentumScoring";

export type { NewsMomentumMetricsSnapshot } from "./NewsMomentumMetrics";

export {
  NewsMomentumMetrics,
  createEmptyNewsMomentumMetrics,
  getNewsMomentumMetrics,
  resetNewsMomentumMetrics,
} from "./NewsMomentumMetrics";

export {
  buildNewsMomentumContextFromPipeline,
  ensureNewsMomentumRegistered,
  executeNewsMomentumThroughEngine,
  executeNewsMomentumWithPipeline,
  getNewsMomentumFromFactory,
  getNewsMomentumIntegrationStatus,
  isNewsMomentumExecutableInput,
} from "./NewsMomentumIntegration";

export {
  NewsMomentumStrategy,
  createNewsMomentumStrategyRegistration,
  registerNewsMomentumStrategy,
} from "./NewsMomentumStrategy";
