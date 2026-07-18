/**
 * VCP Strategy module — Sprint 11B.3L.
 */

export {
  DEFAULT_VCP_CONFIG,
  VCP_STRATEGY_ID,
  VCP_STRATEGY_NAME,
  resolveVCPConfig,
  type VCPConfig,
} from "./VCPConstants";

export type {
  VCPCandle,
  VCPContraction,
  VCPDetection,
  VCPDetectionContext,
  VCPDirection,
  VCPMarketData,
  VCPStrategyInput,
  VCPValidationResult,
} from "./VCPTypes";

export {
  isVCPStrategyInput,
  toVCPDetectionContext,
} from "./VCPTypes";

export type {
  VCPEntryMode,
  VCPPositionType,
  VCPQualityGrade,
  VCPStopMethod,
  VCPTradeConfig,
  VCPTradeSetup,
} from "./VCPTradeTypes";

export {
  DEFAULT_VCP_TRADE_CONFIG,
  resolveVCPTradeConfig,
} from "./VCPTradeTypes";

export {
  averageSectorScore,
  calculateConfidence,
  createEmptyVCPDetection,
  detectVCP,
  findBestContractions,
  isValidMarketHours,
  validateBreadth,
  validateMarket,
  validatePrimaryUptrend,
  validateSector,
  validateVolume,
} from "./VCPUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateLastContractionLowStop,
  calculatePivotLowStop,
  calculateRiskAmount,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type VCPStopCandidate,
} from "./VCPRisk";

export {
  calculateVCPEntry,
  calculateVCPTradeQuality,
  calculateRiskReward,
  classifyVCPQualityGrade,
  createRejectedVCPTradeSetup,
  generateVCPTargets,
  validateVCPTradeSetup,
  type VCPTargetLadder,
} from "./VCPTradeUtils";

export { VCPValidator, createVCPValidator } from "./VCPValidator";

export {
  VCPDetector,
  getVCPDetector,
  resetVCPDetector,
} from "./VCPDetector";

export {
  VCPTradeBuilder,
  getVCPTradeBuilder,
  resetVCPTradeBuilder,
} from "./VCPTradeBuilder";

export { enrichVCPTradeSetup } from "./VCPEnrichment";

export type {
  VCPExplainability,
  VCPExplainabilityConfig,
  VCPExplanationFactor,
  VCPExplanationImpact,
} from "./VCPExplainability";

export {
  buildVCPExplainability,
  buildVCPExplanationFactors,
  buildVCPSummary,
  createEmptyVCPExplainability,
  resolveVCPExplainabilityConfig,
} from "./VCPExplainability";

export type {
  VCPConvictionGrade,
  VCPConvictionWeights,
  VCPFactorScores,
  VCPInstitutionalScore,
  VCPScoringConfig,
  VCPSignalGrade,
} from "./VCPScoring";

export {
  DEFAULT_VCP_CONVICTION_WEIGHTS,
  DEFAULT_VCP_SCORING_CONFIG,
  buildVCPInstitutionalScore,
  calculateVCPConviction,
  calculateVCPSignalGrade,
  classifyVCPConvictionGrade,
  classifyVCPSignalGrade,
  resolveVCPScoringConfig,
  scoreVCPConvictionFactors,
} from "./VCPScoring";

export type { VCPMetricsSnapshot } from "./VCPMetrics";

export {
  VCPMetrics,
  createEmptyVCPMetrics,
  getVCPMetrics,
  resetVCPMetrics,
} from "./VCPMetrics";

export {
  buildVCPContextFromPipeline,
  ensureVCPRegistered,
  executeVCPThroughEngine,
  executeVCPWithPipeline,
  getVCPFromFactory,
  getVCPIntegrationStatus,
  isVCPExecutableInput,
} from "./VCPIntegration";

export {
  VCPStrategy,
  createVCPStrategyRegistration,
  registerVCPStrategy,
} from "./VCPStrategy";
