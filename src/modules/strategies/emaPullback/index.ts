/**
 * EMA Pullback Strategy module — Sprint 11B.3P.
 */

export {
  DEFAULT_EMA_PULLBACK_CONFIG,
  EMA_PULLBACK_STRATEGY_ID,
  EMA_PULLBACK_STRATEGY_NAME,
  resolveEMAPullbackConfig,
  type EMAPullbackConfig,
} from "./EMAPullbackConstants";

export type {
  EMAPullbackCandle,
  EMAPullbackDetection,
  EMAPullbackDetectionContext,
  EMAPullbackDirection,
  EMAPullbackMarketData,
  EMAPullbackStrategyInput,
  EMAPullbackTrendDirection,
  EMAPullbackType,
  EMAPullbackValidationResult,
} from "./EMAPullbackTypes";

export {
  isEMAPullbackStrategyInput,
  toEMAPullbackDetectionContext,
} from "./EMAPullbackTypes";

export type {
  EMAPullbackEntryMode,
  EMAPullbackPositionType,
  EMAPullbackQualityGrade,
  EMAPullbackStopMethod,
  EMAPullbackTradeConfig,
  EMAPullbackTradeSetup,
} from "./EMAPullbackTradeTypes";

export {
  DEFAULT_EMA_PULLBACK_TRADE_CONFIG,
  resolveEMAPullbackTradeConfig,
} from "./EMAPullbackTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  classifyPullbackType,
  createEmptyEMAPullbackDetection,
  detectEMAPullback,
  detectTrendStructure,
  evaluatePullback,
  isValidMarketHours,
  validateBreadth,
  validateSector,
} from "./EMAPullbackUtils";

export {
  calculateAtrStop,
  calculateEma50Stop,
  calculateRiskAmount,
  calculateSwingStop,
  calculateVwapStop,
  findRecentSwingHigh,
  findRecentSwingLow,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type EMAPullbackStopCandidate,
} from "./EMAPullbackRisk";

export {
  calculateEMAPullbackEntry,
  calculateEMAPullbackTradeQuality,
  calculateRiskReward,
  classifyEMAPullbackQualityGrade,
  createRejectedEMAPullbackTradeSetup,
  generateEMAPullbackTargets,
  validateEMAPullbackTradeSetup,
  type EMAPullbackTargetLadder,
} from "./EMAPullbackTradeUtils";

export {
  EMAPullbackValidator,
  createEMAPullbackValidator,
} from "./EMAPullbackValidator";

export {
  EMAPullbackDetector,
  getEMAPullbackDetector,
  resetEMAPullbackDetector,
} from "./EMAPullbackDetector";

export {
  EMAPullbackTradeBuilder,
  getEMAPullbackTradeBuilder,
  resetEMAPullbackTradeBuilder,
} from "./EMAPullbackTradeBuilder";

export { enrichEMAPullbackTradeSetup } from "./EMAPullbackEnrichment";

export type {
  EMAPullbackExplainability,
  EMAPullbackExplainabilityConfig,
  EMAPullbackExplanationFactor,
  EMAPullbackExplanationImpact,
} from "./EMAPullbackExplainability";

export {
  buildEMAPullbackExplainability,
  buildEMAPullbackExplanationFactors,
  buildEMAPullbackSummary,
  createEmptyEMAPullbackExplainability,
  resolveEMAPullbackExplainabilityConfig,
} from "./EMAPullbackExplainability";

export type {
  EMAPullbackConvictionGrade,
  EMAPullbackConvictionWeights,
  EMAPullbackFactorScores,
  EMAPullbackInstitutionalScore,
  EMAPullbackScoringConfig,
  EMAPullbackSignalGrade,
} from "./EMAPullbackScoring";

export {
  DEFAULT_EMA_PULLBACK_CONVICTION_WEIGHTS,
  DEFAULT_EMA_PULLBACK_SCORING_CONFIG,
  buildEMAPullbackInstitutionalScore,
  calculateEMAPullbackConviction,
  calculateEMAPullbackSignalGrade,
  classifyEMAPullbackConvictionGrade,
  classifyEMAPullbackSignalGrade,
  resolveEMAPullbackScoringConfig,
  scoreEMAPullbackConvictionFactors,
} from "./EMAPullbackScoring";

export type { EMAPullbackMetricsSnapshot } from "./EMAPullbackMetrics";

export {
  EMAPullbackMetrics,
  createEmptyEMAPullbackMetrics,
  getEMAPullbackMetrics,
  resetEMAPullbackMetrics,
} from "./EMAPullbackMetrics";

export {
  buildEMAPullbackContextFromPipeline,
  ensureEMAPullbackRegistered,
  executeEMAPullbackThroughEngine,
  executeEMAPullbackWithPipeline,
  getEMAPullbackFromFactory,
  getEMAPullbackIntegrationStatus,
  isEMAPullbackExecutableInput,
} from "./EMAPullbackIntegration";

export {
  EMAPullbackStrategy,
  createEMAPullbackStrategyRegistration,
  registerEMAPullbackStrategy,
} from "./EMAPullbackStrategy";
