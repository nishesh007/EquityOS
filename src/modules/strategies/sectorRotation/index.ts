/**
 * Sector Rotation Strategy module — Sprint 11B.3J.
 */

export {
  DEFAULT_SECTOR_ROTATION_CONFIG,
  SECTOR_ROTATION_STRATEGY_ID,
  SECTOR_ROTATION_STRATEGY_NAME,
  resolveSectorRotationConfig,
  type SectorRotationConfig,
} from "./SectorRotationConstants";

export type {
  SectorRotationCandle,
  SectorRotationDetection,
  SectorRotationDetectionContext,
  SectorRotationDirection,
  SectorRotationMarketData,
  SectorRotationSignalKind,
  SectorRotationStrategyInput,
  SectorRotationValidationResult,
} from "./SectorRotationTypes";

export {
  isSectorRotationStrategyInput,
  toSectorRotationDetectionContext,
} from "./SectorRotationTypes";

export type {
  SectorRotationEntryMode,
  SectorRotationPositionType,
  SectorRotationQualityGrade,
  SectorRotationStopMethod,
  SectorRotationTradeConfig,
  SectorRotationTradeSetup,
} from "./SectorRotationTradeTypes";

export {
  DEFAULT_SECTOR_ROTATION_TRADE_CONFIG,
  resolveSectorRotationTradeConfig,
} from "./SectorRotationTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  classifySectorRotationSignalKind,
  createEmptySectorRotationDetection,
  detectSectorRotation,
  detectTrendStructure,
  evaluateSectorRotationLeadership,
  evaluateStockVsSector,
  isValidMarketHours,
  validateEmaAlignment,
  validateMarket,
  validateSectorBreadth,
  validateVolume,
  validateVwapAlignment,
} from "./SectorRotationUtils";

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
  type SectorRotationStopCandidate,
} from "./SectorRotationRisk";

export {
  calculateSectorRotationEntry,
  calculateSectorRotationTradeQuality,
  calculateRiskReward,
  classifySectorRotationQualityGrade,
  createRejectedSectorRotationTradeSetup,
  generateSectorRotationTargets,
  validateSectorRotationTradeSetup,
  type SectorRotationTargetLadder,
} from "./SectorRotationTradeUtils";

export {
  SectorRotationValidator,
  createSectorRotationValidator,
} from "./SectorRotationValidator";

export {
  SectorRotationDetector,
  getSectorRotationDetector,
  resetSectorRotationDetector,
} from "./SectorRotationDetector";

export {
  SectorRotationTradeBuilder,
  getSectorRotationTradeBuilder,
  resetSectorRotationTradeBuilder,
} from "./SectorRotationTradeBuilder";

export { enrichSectorRotationTradeSetup } from "./SectorRotationEnrichment";

export type {
  SectorRotationExplainability,
  SectorRotationExplainabilityConfig,
  SectorRotationExplanationFactor,
  SectorRotationExplanationImpact,
} from "./SectorRotationExplainability";

export {
  buildSectorRotationExplainability,
  buildSectorRotationExplanationFactors,
  buildSectorRotationSummary,
  createEmptySectorRotationExplainability,
  resolveSectorRotationExplainabilityConfig,
} from "./SectorRotationExplainability";

export type {
  SectorRotationConvictionGrade,
  SectorRotationConvictionWeights,
  SectorRotationFactorScores,
  SectorRotationInstitutionalScore,
  SectorRotationScoringConfig,
  SectorRotationSignalGrade,
} from "./SectorRotationScoring";

export {
  DEFAULT_SECTOR_ROTATION_CONVICTION_WEIGHTS,
  DEFAULT_SECTOR_ROTATION_SCORING_CONFIG,
  buildSectorRotationInstitutionalScore,
  calculateSectorRotationConviction,
  calculateSectorRotationSignalGrade,
  classifySectorRotationConvictionGrade,
  classifySectorRotationSignalGrade,
  resolveSectorRotationScoringConfig,
  scoreSectorRotationConvictionFactors,
} from "./SectorRotationScoring";

export type { SectorRotationMetricsSnapshot } from "./SectorRotationMetrics";

export {
  SectorRotationMetrics,
  createEmptySectorRotationMetrics,
  getSectorRotationMetrics,
  resetSectorRotationMetrics,
} from "./SectorRotationMetrics";

export {
  buildSectorRotationContextFromPipeline,
  ensureSectorRotationRegistered,
  executeSectorRotationThroughEngine,
  executeSectorRotationWithPipeline,
  getSectorRotationFromFactory,
  getSectorRotationIntegrationStatus,
  isSectorRotationExecutableInput,
} from "./SectorRotationIntegration";

export {
  SectorRotationStrategy,
  createSectorRotationStrategyRegistration,
  registerSectorRotationStrategy,
} from "./SectorRotationStrategy";
