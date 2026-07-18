/**
 * Momentum Continuation Strategy module — Sprint 11B.3F.
 */

export {
  DEFAULT_MOMENTUM_CONTINUATION_CONFIG,
  MOMENTUM_CONTINUATION_STRATEGY_ID,
  MOMENTUM_CONTINUATION_STRATEGY_NAME,
  resolveMomentumContinuationConfig,
  type MomentumContinuationConfig,
} from "./MomentumContinuationConstants";

export type {
  MomentumContinuationCandle,
  MomentumContinuationDetection,
  MomentumContinuationDetectionContext,
  MomentumContinuationDirection,
  MomentumContinuationMarketData,
  MomentumContinuationStrategyInput,
  MomentumContinuationValidationResult,
} from "./MomentumContinuationTypes";

export {
  isMomentumContinuationStrategyInput,
  toMomentumContinuationDetectionContext,
} from "./MomentumContinuationTypes";

export type {
  MomentumContinuationEntryMode,
  MomentumContinuationPositionType,
  MomentumContinuationQualityGrade,
  MomentumContinuationStopMethod,
  MomentumContinuationTradeConfig,
  MomentumContinuationTradeSetup,
} from "./MomentumContinuationTradeTypes";

export {
  DEFAULT_MOMENTUM_CONTINUATION_TRADE_CONFIG,
  resolveMomentumContinuationTradeConfig,
} from "./MomentumContinuationTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyMomentumContinuationDetection,
  detectMomentumContinuation,
  detectMomentumResumption,
  detectTrendStructure,
  evaluatePullback,
  isValidMarketHours,
  validateAdx,
  validateBreadth,
  validateEmaAlignment,
  validateMarket,
  validateSector,
  validateVolume,
  validateVwapAlignment,
} from "./MomentumContinuationUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculatePullbackStop,
  calculateRiskAmount,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type MomentumContinuationStopCandidate,
} from "./MomentumContinuationRisk";

export {
  calculateMomentumContinuationEntry,
  calculateMomentumContinuationTradeQuality,
  calculateRiskReward,
  classifyMomentumContinuationQualityGrade,
  createRejectedMomentumContinuationTradeSetup,
  generateMomentumContinuationTargets,
  validateMomentumContinuationTradeSetup,
  type MomentumContinuationTargetLadder,
} from "./MomentumContinuationTradeUtils";

export {
  MomentumContinuationValidator,
  createMomentumContinuationValidator,
} from "./MomentumContinuationValidator";

export {
  MomentumContinuationDetector,
  getMomentumContinuationDetector,
  resetMomentumContinuationDetector,
} from "./MomentumContinuationDetector";

export {
  MomentumContinuationTradeBuilder,
  getMomentumContinuationTradeBuilder,
  resetMomentumContinuationTradeBuilder,
} from "./MomentumContinuationTradeBuilder";

export { enrichMomentumContinuationTradeSetup } from "./MomentumContinuationEnrichment";

export type {
  MomentumContinuationExplainability,
  MomentumContinuationExplainabilityConfig,
  MomentumContinuationExplanationFactor,
  MomentumContinuationExplanationImpact,
} from "./MomentumContinuationExplainability";

export {
  buildMomentumContinuationExplainability,
  buildMomentumContinuationExplanationFactors,
  buildMomentumContinuationSummary,
  createEmptyMomentumContinuationExplainability,
  resolveMomentumContinuationExplainabilityConfig,
} from "./MomentumContinuationExplainability";

export type {
  MomentumContinuationConvictionGrade,
  MomentumContinuationConvictionWeights,
  MomentumContinuationFactorScores,
  MomentumContinuationInstitutionalScore,
  MomentumContinuationScoringConfig,
  MomentumContinuationSignalGrade,
} from "./MomentumContinuationScoring";

export {
  DEFAULT_MOMENTUM_CONTINUATION_CONVICTION_WEIGHTS,
  DEFAULT_MOMENTUM_CONTINUATION_SCORING_CONFIG,
  buildMomentumContinuationInstitutionalScore,
  calculateMomentumContinuationConviction,
  calculateMomentumContinuationSignalGrade,
  classifyMomentumContinuationConvictionGrade,
  classifyMomentumContinuationSignalGrade,
  resolveMomentumContinuationScoringConfig,
  scoreMomentumContinuationConvictionFactors,
} from "./MomentumContinuationScoring";

export type { MomentumContinuationMetricsSnapshot } from "./MomentumContinuationMetrics";

export {
  MomentumContinuationMetrics,
  createEmptyMomentumContinuationMetrics,
  getMomentumContinuationMetrics,
  resetMomentumContinuationMetrics,
} from "./MomentumContinuationMetrics";

export {
  buildMomentumContinuationContextFromPipeline,
  ensureMomentumContinuationRegistered,
  executeMomentumContinuationThroughEngine,
  executeMomentumContinuationWithPipeline,
  getMomentumContinuationFromFactory,
  getMomentumContinuationIntegrationStatus,
  isMomentumContinuationExecutableInput,
} from "./MomentumContinuationIntegration";

export {
  MomentumContinuationStrategy,
  createMomentumContinuationStrategyRegistration,
  registerMomentumContinuationStrategy,
} from "./MomentumContinuationStrategy";
