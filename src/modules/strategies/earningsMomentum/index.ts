/**
 * Earnings Momentum Strategy module — Sprint 11B.3T.
 */

export {
  DEFAULT_EARNINGS_MOMENTUM_CONFIG,
  EARNINGS_MOMENTUM_STRATEGY_ID,
  EARNINGS_MOMENTUM_STRATEGY_NAME,
  resolveEarningsMomentumConfig,
  type EarningsMomentumConfig,
} from "./EarningsMomentumConstants";

export type {
  EarningsAnalysis,
  EarningsFundamentals,
  EarningsGuidanceTone,
  EarningsMomentumCandle,
  EarningsMomentumDetection,
  EarningsMomentumDetectionContext,
  EarningsMomentumDirection,
  EarningsMomentumMarketData,
  EarningsMomentumStrategyInput,
  EarningsMomentumValidationResult,
} from "./EarningsMomentumTypes";

export {
  isEarningsMomentumStrategyInput,
  toEarningsMomentumDetectionContext,
} from "./EarningsMomentumTypes";

export type {
  EarningsMomentumEntryMode,
  EarningsMomentumPositionType,
  EarningsMomentumQualityGrade,
  EarningsMomentumStopMethod,
  EarningsMomentumTradeConfig,
  EarningsMomentumTradeSetup,
} from "./EarningsMomentumTradeTypes";

export {
  DEFAULT_EARNINGS_MOMENTUM_TRADE_CONFIG,
  resolveEarningsMomentumTradeConfig,
} from "./EarningsMomentumTradeTypes";

export {
  analyzeEarnings,
  averageSectorScore,
  calculateConfidence,
  createEmptyEarningsMomentumDetection,
  detectEarningsMomentum,
  isValidMarketHours,
  validateBreadthBearish,
  validateBreadthBullish,
  validateSectorBearish,
  validateSectorBullish,
} from "./EarningsMomentumUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateRiskAmount,
  calculateSwingStop,
  calculateVwapStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type EarningsMomentumStopCandidate,
} from "./EarningsMomentumRisk";

export {
  calculateEarningsMomentumEntry,
  calculateEarningsMomentumTradeQuality,
  calculateRiskReward,
  classifyEarningsMomentumQualityGrade,
  createRejectedEarningsMomentumTradeSetup,
  generateEarningsMomentumTargets,
  validateEarningsMomentumTradeSetup,
  type EarningsMomentumTargetLadder,
} from "./EarningsMomentumTradeUtils";

export {
  EarningsMomentumValidator,
  createEarningsMomentumValidator,
} from "./EarningsMomentumValidator";

export {
  EarningsMomentumDetector,
  getEarningsMomentumDetector,
  resetEarningsMomentumDetector,
} from "./EarningsMomentumDetector";

export {
  EarningsMomentumTradeBuilder,
  getEarningsMomentumTradeBuilder,
  resetEarningsMomentumTradeBuilder,
} from "./EarningsMomentumTradeBuilder";

export { enrichEarningsMomentumTradeSetup } from "./EarningsMomentumEnrichment";

export type {
  EarningsMomentumExplainability,
  EarningsMomentumExplainabilityConfig,
  EarningsMomentumExplanationFactor,
  EarningsMomentumExplanationImpact,
} from "./EarningsMomentumExplainability";

export {
  buildEarningsMomentumExplainability,
  buildEarningsMomentumExplanationFactors,
  buildEarningsMomentumSummary,
  createEmptyEarningsMomentumExplainability,
  resolveEarningsMomentumExplainabilityConfig,
} from "./EarningsMomentumExplainability";

export type {
  EarningsMomentumConvictionGrade,
  EarningsMomentumConvictionWeights,
  EarningsMomentumFactorScores,
  EarningsMomentumInstitutionalScore,
  EarningsMomentumScoringConfig,
  EarningsMomentumSignalGrade,
} from "./EarningsMomentumScoring";

export {
  DEFAULT_EARNINGS_MOMENTUM_CONVICTION_WEIGHTS,
  DEFAULT_EARNINGS_MOMENTUM_SCORING_CONFIG,
  buildEarningsMomentumInstitutionalScore,
  calculateEarningsMomentumConviction,
  calculateEarningsMomentumSignalGrade,
  classifyEarningsMomentumConvictionGrade,
  classifyEarningsMomentumSignalGrade,
  resolveEarningsMomentumScoringConfig,
  scoreEarningsMomentumConvictionFactors,
} from "./EarningsMomentumScoring";

export type { EarningsMomentumMetricsSnapshot } from "./EarningsMomentumMetrics";

export {
  EarningsMomentumMetrics,
  createEmptyEarningsMomentumMetrics,
  getEarningsMomentumMetrics,
  resetEarningsMomentumMetrics,
} from "./EarningsMomentumMetrics";

export {
  buildEarningsMomentumContextFromPipeline,
  ensureEarningsMomentumRegistered,
  executeEarningsMomentumThroughEngine,
  executeEarningsMomentumWithPipeline,
  getEarningsMomentumFromFactory,
  getEarningsMomentumIntegrationStatus,
  isEarningsMomentumExecutableInput,
} from "./EarningsMomentumIntegration";

export {
  EarningsMomentumStrategy,
  createEarningsMomentumStrategyRegistration,
  registerEarningsMomentumStrategy,
} from "./EarningsMomentumStrategy";
