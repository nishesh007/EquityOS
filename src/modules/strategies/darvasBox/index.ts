/**
 * Darvas Box Strategy module — Sprint 11B.3N.
 */

export {
  DEFAULT_DARVAS_BOX_CONFIG,
  DARVAS_BOX_STRATEGY_ID,
  DARVAS_BOX_STRATEGY_NAME,
  resolveDarvasBoxConfig,
  type DarvasBoxConfig,
} from "./DarvasBoxConstants";

export type {
  DarvasBoxCandle,
  DarvasBoxDetection,
  DarvasBoxDetectionContext,
  DarvasBoxDirection,
  DarvasBoxGeometry,
  DarvasBoxMarketData,
  DarvasBoxStrategyInput,
  DarvasBoxValidationResult,
} from "./DarvasBoxTypes";

export {
  isDarvasBoxStrategyInput,
  toDarvasBoxDetectionContext,
} from "./DarvasBoxTypes";

export type {
  DarvasBoxEntryMode,
  DarvasBoxPositionType,
  DarvasBoxQualityGrade,
  DarvasBoxStopMethod,
  DarvasBoxTradeConfig,
  DarvasBoxTradeSetup,
} from "./DarvasBoxTradeTypes";

export {
  DEFAULT_DARVAS_BOX_TRADE_CONFIG,
  resolveDarvasBoxTradeConfig,
} from "./DarvasBoxTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyDarvasBoxDetection,
  detectBoxOnly,
  detectDarvasBox,
  evaluateBoxWindow,
  findBestDarvasBox,
  isValidMarketHours,
  validateBreadth,
  validateSector,
} from "./DarvasBoxUtils";

export {
  calculateAtrStop,
  calculateBoxLowStop,
  calculateEma20Stop,
  calculateRiskAmount,
  calculateVwapStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type DarvasBoxStopCandidate,
} from "./DarvasBoxRisk";

export {
  calculateDarvasBoxEntry,
  calculateDarvasBoxTradeQuality,
  calculateRiskReward,
  classifyDarvasBoxQualityGrade,
  createRejectedDarvasBoxTradeSetup,
  generateDarvasBoxTargets,
  validateDarvasBoxTradeSetup,
  type DarvasBoxTargetLadder,
} from "./DarvasBoxTradeUtils";

export { DarvasBoxValidator, createDarvasBoxValidator } from "./DarvasBoxValidator";

export {
  DarvasBoxDetector,
  getDarvasBoxDetector,
  resetDarvasBoxDetector,
} from "./DarvasBoxDetector";

export {
  DarvasBoxTradeBuilder,
  getDarvasBoxTradeBuilder,
  resetDarvasBoxTradeBuilder,
} from "./DarvasBoxTradeBuilder";

export { enrichDarvasBoxTradeSetup } from "./DarvasBoxEnrichment";

export type {
  DarvasBoxExplainability,
  DarvasBoxExplainabilityConfig,
  DarvasBoxExplanationFactor,
  DarvasBoxExplanationImpact,
} from "./DarvasBoxExplainability";

export {
  buildDarvasBoxExplainability,
  buildDarvasBoxExplanationFactors,
  buildDarvasBoxSummary,
  createEmptyDarvasBoxExplainability,
  resolveDarvasBoxExplainabilityConfig,
} from "./DarvasBoxExplainability";

export type {
  DarvasBoxConvictionGrade,
  DarvasBoxConvictionWeights,
  DarvasBoxFactorScores,
  DarvasBoxInstitutionalScore,
  DarvasBoxScoringConfig,
  DarvasBoxSignalGrade,
} from "./DarvasBoxScoring";

export {
  DEFAULT_DARVAS_BOX_CONVICTION_WEIGHTS,
  DEFAULT_DARVAS_BOX_SCORING_CONFIG,
  buildDarvasBoxInstitutionalScore,
  calculateDarvasBoxConviction,
  calculateDarvasBoxSignalGrade,
  classifyDarvasBoxConvictionGrade,
  classifyDarvasBoxSignalGrade,
  resolveDarvasBoxScoringConfig,
  scoreDarvasBoxConvictionFactors,
} from "./DarvasBoxScoring";

export type { DarvasBoxMetricsSnapshot } from "./DarvasBoxMetrics";

export {
  DarvasBoxMetrics,
  createEmptyDarvasBoxMetrics,
  getDarvasBoxMetrics,
  resetDarvasBoxMetrics,
} from "./DarvasBoxMetrics";

export {
  buildDarvasBoxContextFromPipeline,
  ensureDarvasBoxRegistered,
  executeDarvasBoxThroughEngine,
  executeDarvasBoxWithPipeline,
  getDarvasBoxFromFactory,
  getDarvasBoxIntegrationStatus,
  isDarvasBoxExecutableInput,
} from "./DarvasBoxIntegration";

export {
  DarvasBoxStrategy,
  createDarvasBoxStrategyRegistration,
  registerDarvasBoxStrategy,
} from "./DarvasBoxStrategy";
