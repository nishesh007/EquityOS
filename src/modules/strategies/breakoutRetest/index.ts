/**
 * Breakout Retest Strategy module — Sprint 11B.3I.
 */

export {
  DEFAULT_BREAKOUT_RETEST_CONFIG,
  BREAKOUT_RETEST_STRATEGY_ID,
  BREAKOUT_RETEST_STRATEGY_NAME,
  resolveBreakoutRetestConfig,
  type BreakoutRetestConfig,
} from "./BreakoutRetestConstants";

export type {
  BreakoutRetestCandle,
  BreakoutRetestDetection,
  BreakoutRetestDetectionContext,
  BreakoutRetestDirection,
  BreakoutRetestMarketData,
  BreakoutRetestPhase,
  BreakoutRetestStrategyInput,
  BreakoutRetestValidationResult,
} from "./BreakoutRetestTypes";

export {
  isBreakoutRetestStrategyInput,
  toBreakoutRetestDetectionContext,
} from "./BreakoutRetestTypes";

export type {
  BreakoutRetestEntryMode,
  BreakoutRetestPositionType,
  BreakoutRetestQualityGrade,
  BreakoutRetestStopMethod,
  BreakoutRetestTradeConfig,
  BreakoutRetestTradeSetup,
} from "./BreakoutRetestTradeTypes";

export {
  DEFAULT_BREAKOUT_RETEST_TRADE_CONFIG,
  resolveBreakoutRetestTradeConfig,
} from "./BreakoutRetestTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyBreakoutRetestDetection,
  detectBreakoutRetest,
  evaluateRetestQuality,
  isValidMarketHours,
  resolveResistanceLevel,
  resolveSupportLevel,
  validateBreadth,
  validateEmaAlignment,
  validateMarket,
  validateSector,
  validateVolume,
  validateVwapAlignment,
} from "./BreakoutRetestUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateRetestLowStop,
  calculateVwapStop,
  calculateRiskAmount,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type BreakoutRetestStopCandidate,
} from "./BreakoutRetestRisk";

export {
  calculateBreakoutRetestEntry,
  calculateBreakoutRetestTradeQuality,
  calculateRiskReward,
  classifyBreakoutRetestQualityGrade,
  createRejectedBreakoutRetestTradeSetup,
  generateBreakoutRetestTargets,
  validateBreakoutRetestTradeSetup,
  type BreakoutRetestTargetLadder,
} from "./BreakoutRetestTradeUtils";

export {
  BreakoutRetestValidator,
  createBreakoutRetestValidator,
} from "./BreakoutRetestValidator";

export {
  BreakoutRetestDetector,
  getBreakoutRetestDetector,
  resetBreakoutRetestDetector,
} from "./BreakoutRetestDetector";

export {
  BreakoutRetestTradeBuilder,
  getBreakoutRetestTradeBuilder,
  resetBreakoutRetestTradeBuilder,
} from "./BreakoutRetestTradeBuilder";

export { enrichBreakoutRetestTradeSetup } from "./BreakoutRetestEnrichment";

export type {
  BreakoutRetestExplainability,
  BreakoutRetestExplainabilityConfig,
  BreakoutRetestExplanationFactor,
  BreakoutRetestExplanationImpact,
} from "./BreakoutRetestExplainability";

export {
  buildBreakoutRetestExplainability,
  buildBreakoutRetestExplanationFactors,
  buildBreakoutRetestSummary,
  createEmptyBreakoutRetestExplainability,
  resolveBreakoutRetestExplainabilityConfig,
} from "./BreakoutRetestExplainability";

export type {
  BreakoutRetestConvictionGrade,
  BreakoutRetestConvictionWeights,
  BreakoutRetestFactorScores,
  BreakoutRetestInstitutionalScore,
  BreakoutRetestScoringConfig,
  BreakoutRetestSignalGrade,
} from "./BreakoutRetestScoring";

export {
  DEFAULT_BREAKOUT_RETEST_CONVICTION_WEIGHTS,
  DEFAULT_BREAKOUT_RETEST_SCORING_CONFIG,
  buildBreakoutRetestInstitutionalScore,
  calculateBreakoutRetestConviction,
  calculateBreakoutRetestSignalGrade,
  classifyBreakoutRetestConvictionGrade,
  classifyBreakoutRetestSignalGrade,
  resolveBreakoutRetestScoringConfig,
  scoreBreakoutRetestConvictionFactors,
} from "./BreakoutRetestScoring";

export type { BreakoutRetestMetricsSnapshot } from "./BreakoutRetestMetrics";

export {
  BreakoutRetestMetrics,
  createEmptyBreakoutRetestMetrics,
  getBreakoutRetestMetrics,
  resetBreakoutRetestMetrics,
} from "./BreakoutRetestMetrics";

export {
  buildBreakoutRetestContextFromPipeline,
  ensureBreakoutRetestRegistered,
  executeBreakoutRetestThroughEngine,
  executeBreakoutRetestWithPipeline,
  getBreakoutRetestFromFactory,
  getBreakoutRetestIntegrationStatus,
  isBreakoutRetestExecutableInput,
} from "./BreakoutRetestIntegration";

export {
  BreakoutRetestStrategy,
  createBreakoutRetestStrategyRegistration,
  registerBreakoutRetestStrategy,
} from "./BreakoutRetestStrategy";
