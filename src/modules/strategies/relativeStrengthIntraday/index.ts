/**
 * Relative Strength Intraday Strategy module — Sprint 11B.3G.
 */

export {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG,
  RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
  RELATIVE_STRENGTH_INTRADAY_STRATEGY_NAME,
  resolveRelativeStrengthIntradayConfig,
  type RelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayConstants";

export type {
  RelativeStrengthIntradayCandle,
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayDetectionContext,
  RelativeStrengthIntradayDirection,
  RelativeStrengthIntradayMarketData,
  RelativeStrengthIntradayStrategyInput,
  RelativeStrengthIntradayValidationResult,
} from "./RelativeStrengthIntradayTypes";

export {
  isRelativeStrengthIntradayStrategyInput,
  toRelativeStrengthIntradayDetectionContext,
} from "./RelativeStrengthIntradayTypes";

export type {
  RelativeStrengthIntradayEntryMode,
  RelativeStrengthIntradayPositionType,
  RelativeStrengthIntradayQualityGrade,
  RelativeStrengthIntradayStopMethod,
  RelativeStrengthIntradayTradeConfig,
  RelativeStrengthIntradayTradeSetup,
} from "./RelativeStrengthIntradayTradeTypes";

export {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_TRADE_CONFIG,
  resolveRelativeStrengthIntradayTradeConfig,
} from "./RelativeStrengthIntradayTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyRelativeStrengthIntradayDetection,
  detectRelativeStrengthIntraday,
  detectTrendStructure,
  evaluateRelativeStrengthLeadership,
  isValidMarketHours,
  validateBreadth,
  validateEmaAlignment,
  validateMarket,
  validateSector,
  validateVolume,
  validateVwapAlignment,
} from "./RelativeStrengthIntradayUtils";

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
  type RelativeStrengthIntradayStopCandidate,
} from "./RelativeStrengthIntradayRisk";

export {
  calculateRelativeStrengthIntradayEntry,
  calculateRelativeStrengthIntradayTradeQuality,
  calculateRiskReward,
  classifyRelativeStrengthIntradayQualityGrade,
  createRejectedRelativeStrengthIntradayTradeSetup,
  generateRelativeStrengthIntradayTargets,
  validateRelativeStrengthIntradayTradeSetup,
  type RelativeStrengthIntradayTargetLadder,
} from "./RelativeStrengthIntradayTradeUtils";

export {
  RelativeStrengthIntradayValidator,
  createRelativeStrengthIntradayValidator,
} from "./RelativeStrengthIntradayValidator";

export {
  RelativeStrengthIntradayDetector,
  getRelativeStrengthIntradayDetector,
  resetRelativeStrengthIntradayDetector,
} from "./RelativeStrengthIntradayDetector";

export {
  RelativeStrengthIntradayTradeBuilder,
  getRelativeStrengthIntradayTradeBuilder,
  resetRelativeStrengthIntradayTradeBuilder,
} from "./RelativeStrengthIntradayTradeBuilder";

export { enrichRelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayEnrichment";

export type {
  RelativeStrengthIntradayExplainability,
  RelativeStrengthIntradayExplainabilityConfig,
  RelativeStrengthIntradayExplanationFactor,
  RelativeStrengthIntradayExplanationImpact,
} from "./RelativeStrengthIntradayExplainability";

export {
  buildRelativeStrengthIntradayExplainability,
  buildRelativeStrengthIntradayExplanationFactors,
  buildRelativeStrengthIntradaySummary,
  createEmptyRelativeStrengthIntradayExplainability,
  resolveRelativeStrengthIntradayExplainabilityConfig,
} from "./RelativeStrengthIntradayExplainability";

export type {
  RelativeStrengthIntradayConvictionGrade,
  RelativeStrengthIntradayConvictionWeights,
  RelativeStrengthIntradayFactorScores,
  RelativeStrengthIntradayInstitutionalScore,
  RelativeStrengthIntradayScoringConfig,
  RelativeStrengthIntradaySignalGrade,
} from "./RelativeStrengthIntradayScoring";

export {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONVICTION_WEIGHTS,
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_SCORING_CONFIG,
  buildRelativeStrengthIntradayInstitutionalScore,
  calculateRelativeStrengthIntradayConviction,
  calculateRelativeStrengthIntradaySignalGrade,
  classifyRelativeStrengthIntradayConvictionGrade,
  classifyRelativeStrengthIntradaySignalGrade,
  resolveRelativeStrengthIntradayScoringConfig,
  scoreRelativeStrengthIntradayConvictionFactors,
} from "./RelativeStrengthIntradayScoring";

export type { RelativeStrengthIntradayMetricsSnapshot } from "./RelativeStrengthIntradayMetrics";

export {
  RelativeStrengthIntradayMetrics,
  createEmptyRelativeStrengthIntradayMetrics,
  getRelativeStrengthIntradayMetrics,
  resetRelativeStrengthIntradayMetrics,
} from "./RelativeStrengthIntradayMetrics";

export {
  buildRelativeStrengthIntradayContextFromPipeline,
  ensureRelativeStrengthIntradayRegistered,
  executeRelativeStrengthIntradayThroughEngine,
  executeRelativeStrengthIntradayWithPipeline,
  getRelativeStrengthIntradayFromFactory,
  getRelativeStrengthIntradayIntegrationStatus,
  isRelativeStrengthIntradayExecutableInput,
} from "./RelativeStrengthIntradayIntegration";

export {
  RelativeStrengthIntradayStrategy,
  createRelativeStrengthIntradayStrategyRegistration,
  registerRelativeStrengthIntradayStrategy,
} from "./RelativeStrengthIntradayStrategy";
