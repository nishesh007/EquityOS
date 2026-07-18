/**
 * Institutional Accumulation Strategy module — Sprint 11B.3H.
 */

export {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_CONFIG,
  INSTITUTIONAL_ACCUMULATION_STRATEGY_ID,
  INSTITUTIONAL_ACCUMULATION_STRATEGY_NAME,
  resolveInstitutionalAccumulationConfig,
  type InstitutionalAccumulationConfig,
} from "./InstitutionalAccumulationConstants";

export type {
  InstitutionalAccumulationCandle,
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationDetectionContext,
  InstitutionalAccumulationDirection,
  InstitutionalAccumulationMarketData,
  InstitutionalAccumulationPattern,
  InstitutionalAccumulationStrategyInput,
  InstitutionalAccumulationValidationResult,
} from "./InstitutionalAccumulationTypes";

export {
  isInstitutionalAccumulationStrategyInput,
  toInstitutionalAccumulationDetectionContext,
} from "./InstitutionalAccumulationTypes";

export type {
  InstitutionalAccumulationEntryMode,
  InstitutionalAccumulationPositionType,
  InstitutionalAccumulationQualityGrade,
  InstitutionalAccumulationStopMethod,
  InstitutionalAccumulationTradeConfig,
  InstitutionalAccumulationTradeSetup,
} from "./InstitutionalAccumulationTradeTypes";

export {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_TRADE_CONFIG,
  resolveInstitutionalAccumulationTradeConfig,
} from "./InstitutionalAccumulationTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  computeDemandZone,
  createEmptyInstitutionalAccumulationDetection,
  detectInstitutionalAccumulation,
  detectTrendStructure,
  isValidMarketHours,
  validateBreadth,
  validateEmaAlignment,
  validateMarket,
  validateSector,
  validateVolume,
  validateVwapAlignment,
} from "./InstitutionalAccumulationUtils";

export {
  calculateAtrStop,
  calculateDemandZoneStop,
  calculateSwingStop,
  calculateVwapStop,
  calculateRiskAmount,
  findRecentSwingHigh,
  findRecentSwingLow,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type InstitutionalAccumulationStopCandidate,
} from "./InstitutionalAccumulationRisk";

export {
  calculateInstitutionalAccumulationEntry,
  calculateInstitutionalAccumulationTradeQuality,
  calculateRiskReward,
  classifyInstitutionalAccumulationQualityGrade,
  createRejectedInstitutionalAccumulationTradeSetup,
  generateInstitutionalAccumulationTargets,
  validateInstitutionalAccumulationTradeSetup,
  type InstitutionalAccumulationTargetLadder,
} from "./InstitutionalAccumulationTradeUtils";

export {
  InstitutionalAccumulationValidator,
  createInstitutionalAccumulationValidator,
} from "./InstitutionalAccumulationValidator";

export {
  InstitutionalAccumulationDetector,
  getInstitutionalAccumulationDetector,
  resetInstitutionalAccumulationDetector,
} from "./InstitutionalAccumulationDetector";

export {
  InstitutionalAccumulationTradeBuilder,
  getInstitutionalAccumulationTradeBuilder,
  resetInstitutionalAccumulationTradeBuilder,
} from "./InstitutionalAccumulationTradeBuilder";

export { enrichInstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationEnrichment";

export type {
  InstitutionalAccumulationExplainability,
  InstitutionalAccumulationExplainabilityConfig,
  InstitutionalAccumulationExplanationFactor,
  InstitutionalAccumulationExplanationImpact,
} from "./InstitutionalAccumulationExplainability";

export {
  buildInstitutionalAccumulationExplainability,
  buildInstitutionalAccumulationExplanationFactors,
  buildInstitutionalAccumulationSummary,
  createEmptyInstitutionalAccumulationExplainability,
  resolveInstitutionalAccumulationExplainabilityConfig,
} from "./InstitutionalAccumulationExplainability";

export type {
  InstitutionalAccumulationConvictionGrade,
  InstitutionalAccumulationConvictionWeights,
  InstitutionalAccumulationFactorScores,
  InstitutionalAccumulationInstitutionalScore,
  InstitutionalAccumulationScoringConfig,
  InstitutionalAccumulationSignalGrade,
} from "./InstitutionalAccumulationScoring";

export {
  DEFAULT_INSTITUTIONAL_ACCUMULATION_CONVICTION_WEIGHTS,
  DEFAULT_INSTITUTIONAL_ACCUMULATION_SCORING_CONFIG,
  buildInstitutionalAccumulationInstitutionalScore,
  calculateInstitutionalAccumulationConviction,
  calculateInstitutionalAccumulationSignalGrade,
  classifyInstitutionalAccumulationConvictionGrade,
  classifyInstitutionalAccumulationSignalGrade,
  resolveInstitutionalAccumulationScoringConfig,
  scoreInstitutionalAccumulationConvictionFactors,
} from "./InstitutionalAccumulationScoring";

export type { InstitutionalAccumulationMetricsSnapshot } from "./InstitutionalAccumulationMetrics";

export {
  InstitutionalAccumulationMetrics,
  createEmptyInstitutionalAccumulationMetrics,
  getInstitutionalAccumulationMetrics,
  resetInstitutionalAccumulationMetrics,
} from "./InstitutionalAccumulationMetrics";

export {
  buildInstitutionalAccumulationContextFromPipeline,
  ensureInstitutionalAccumulationRegistered,
  executeInstitutionalAccumulationThroughEngine,
  executeInstitutionalAccumulationWithPipeline,
  getInstitutionalAccumulationFromFactory,
  getInstitutionalAccumulationIntegrationStatus,
  isInstitutionalAccumulationExecutableInput,
} from "./InstitutionalAccumulationIntegration";

export {
  InstitutionalAccumulationStrategy,
  createInstitutionalAccumulationStrategyRegistration,
  registerInstitutionalAccumulationStrategy,
} from "./InstitutionalAccumulationStrategy";
