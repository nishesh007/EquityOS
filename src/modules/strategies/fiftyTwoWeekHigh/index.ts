/**
 * 52-Week High Breakout Strategy module — Sprint 11B.3S.
 */

export {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG,
  FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
  FIFTY_TWO_WEEK_HIGH_STRATEGY_NAME,
  resolveFiftyTwoWeekHighConfig,
  type FiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighConstants";

export type {
  FiftyTwoWeekHighBreakoutInfo,
  FiftyTwoWeekHighCandle,
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighDetectionContext,
  FiftyTwoWeekHighDirection,
  FiftyTwoWeekHighMarketData,
  FiftyTwoWeekHighStrategyInput,
  FiftyTwoWeekHighValidationResult,
} from "./FiftyTwoWeekHighTypes";

export {
  isFiftyTwoWeekHighStrategyInput,
  toFiftyTwoWeekHighDetectionContext,
} from "./FiftyTwoWeekHighTypes";

export type {
  FiftyTwoWeekHighEntryMode,
  FiftyTwoWeekHighPositionType,
  FiftyTwoWeekHighQualityGrade,
  FiftyTwoWeekHighStopMethod,
  FiftyTwoWeekHighTradeConfig,
  FiftyTwoWeekHighTradeSetup,
} from "./FiftyTwoWeekHighTradeTypes";

export {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_TRADE_CONFIG,
  resolveFiftyTwoWeekHighTradeConfig,
} from "./FiftyTwoWeekHighTradeTypes";

export {
  analyzeBreakout,
  averageSectorScore,
  calculateConfidence,
  createEmptyFiftyTwoWeekHighDetection,
  detectFiftyTwoWeekHigh,
  isValidMarketHours,
  resolvePrevious52WeekHigh,
  validateBreadth,
  validateSector,
} from "./FiftyTwoWeekHighUtils";

export {
  calculateAtrStop,
  calculateBreakoutLevelStop,
  calculateEma20Stop,
  calculateRiskAmount,
  calculateSwingLowStop,
  calculateVwapStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type FiftyTwoWeekHighStopCandidate,
} from "./FiftyTwoWeekHighRisk";

export {
  calculateFiftyTwoWeekHighEntry,
  calculateFiftyTwoWeekHighTradeQuality,
  calculateRiskReward,
  classifyFiftyTwoWeekHighQualityGrade,
  createRejectedFiftyTwoWeekHighTradeSetup,
  generateFiftyTwoWeekHighTargets,
  validateFiftyTwoWeekHighTradeSetup,
  type FiftyTwoWeekHighTargetLadder,
} from "./FiftyTwoWeekHighTradeUtils";

export {
  FiftyTwoWeekHighValidator,
  createFiftyTwoWeekHighValidator,
} from "./FiftyTwoWeekHighValidator";

export {
  FiftyTwoWeekHighDetector,
  getFiftyTwoWeekHighDetector,
  resetFiftyTwoWeekHighDetector,
} from "./FiftyTwoWeekHighDetector";

export {
  FiftyTwoWeekHighTradeBuilder,
  getFiftyTwoWeekHighTradeBuilder,
  resetFiftyTwoWeekHighTradeBuilder,
} from "./FiftyTwoWeekHighTradeBuilder";

export { enrichFiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighEnrichment";

export type {
  FiftyTwoWeekHighExplainability,
  FiftyTwoWeekHighExplainabilityConfig,
  FiftyTwoWeekHighExplanationFactor,
  FiftyTwoWeekHighExplanationImpact,
} from "./FiftyTwoWeekHighExplainability";

export {
  buildFiftyTwoWeekHighExplainability,
  buildFiftyTwoWeekHighExplanationFactors,
  buildFiftyTwoWeekHighSummary,
  createEmptyFiftyTwoWeekHighExplainability,
  resolveFiftyTwoWeekHighExplainabilityConfig,
} from "./FiftyTwoWeekHighExplainability";

export type {
  FiftyTwoWeekHighConvictionGrade,
  FiftyTwoWeekHighConvictionWeights,
  FiftyTwoWeekHighFactorScores,
  FiftyTwoWeekHighInstitutionalScore,
  FiftyTwoWeekHighScoringConfig,
  FiftyTwoWeekHighSignalGrade,
} from "./FiftyTwoWeekHighScoring";

export {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_CONVICTION_WEIGHTS,
  DEFAULT_FIFTY_TWO_WEEK_HIGH_SCORING_CONFIG,
  buildFiftyTwoWeekHighInstitutionalScore,
  calculateFiftyTwoWeekHighConviction,
  calculateFiftyTwoWeekHighSignalGrade,
  classifyFiftyTwoWeekHighConvictionGrade,
  classifyFiftyTwoWeekHighSignalGrade,
  resolveFiftyTwoWeekHighScoringConfig,
  scoreFiftyTwoWeekHighConvictionFactors,
} from "./FiftyTwoWeekHighScoring";

export type { FiftyTwoWeekHighMetricsSnapshot } from "./FiftyTwoWeekHighMetrics";

export {
  FiftyTwoWeekHighMetrics,
  createEmptyFiftyTwoWeekHighMetrics,
  getFiftyTwoWeekHighMetrics,
  resetFiftyTwoWeekHighMetrics,
} from "./FiftyTwoWeekHighMetrics";

export {
  buildFiftyTwoWeekHighContextFromPipeline,
  ensureFiftyTwoWeekHighRegistered,
  executeFiftyTwoWeekHighThroughEngine,
  executeFiftyTwoWeekHighWithPipeline,
  getFiftyTwoWeekHighFromFactory,
  getFiftyTwoWeekHighIntegrationStatus,
  isFiftyTwoWeekHighExecutableInput,
} from "./FiftyTwoWeekHighIntegration";

export {
  FiftyTwoWeekHighStrategy,
  createFiftyTwoWeekHighStrategyRegistration,
  registerFiftyTwoWeekHighStrategy,
} from "./FiftyTwoWeekHighStrategy";
