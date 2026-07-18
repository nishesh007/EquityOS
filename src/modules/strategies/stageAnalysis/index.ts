/**
 * Stage Analysis Strategy module — Sprint 11B.3M.
 */

export {
  DEFAULT_STAGE_ANALYSIS_CONFIG,
  STAGE_ANALYSIS_STRATEGY_ID,
  STAGE_ANALYSIS_STRATEGY_NAME,
  resolveStageAnalysisConfig,
  type StageAnalysisConfig,
} from "./StageAnalysisConstants";

export type {
  StageAnalysisCandle,
  StageAnalysisDetection,
  StageAnalysisDetectionContext,
  StageAnalysisDirection,
  StageAnalysisMarketData,
  StageAnalysisStrategyInput,
  StageAnalysisValidationResult,
  StageTransition,
  WeinsteinStage,
} from "./StageAnalysisTypes";

export {
  isStageAnalysisStrategyInput,
  toStageAnalysisDetectionContext,
} from "./StageAnalysisTypes";

export type {
  StageAnalysisEntryMode,
  StageAnalysisPositionType,
  StageAnalysisQualityGrade,
  StageAnalysisStopMethod,
  StageAnalysisTradeConfig,
  StageAnalysisTradeSetup,
} from "./StageAnalysisTradeTypes";

export {
  DEFAULT_STAGE_ANALYSIS_TRADE_CONFIG,
  resolveStageAnalysisTradeConfig,
} from "./StageAnalysisTradeTypes";

export {
  analyzeStructure,
  averageSectorScore,
  calculateConfidence,
  classifyMaSlope,
  classifyWeinsteinStage,
  createEmptyStageAnalysisDetection,
  detectStageAnalysis,
  detectStageOnly,
  detectStageTransition,
  isValidMarketHours,
  resolveMa30Week,
  validateBreadth,
  validateSector,
} from "./StageAnalysisUtils";

export {
  calculateAtrStop,
  calculateEma20Stop,
  calculateMa30wStop,
  calculateRiskAmount,
  calculateSwingStop,
  isValidStop,
  resolveStopLoss,
  validateTradeRisk,
  type StageAnalysisStopCandidate,
} from "./StageAnalysisRisk";

export {
  calculateStageAnalysisEntry,
  calculateStageAnalysisTradeQuality,
  calculateRiskReward,
  classifyStageAnalysisQualityGrade,
  createRejectedStageAnalysisTradeSetup,
  generateStageAnalysisTargets,
  validateStageAnalysisTradeSetup,
  type StageAnalysisTargetLadder,
} from "./StageAnalysisTradeUtils";

export {
  StageAnalysisValidator,
  createStageAnalysisValidator,
} from "./StageAnalysisValidator";

export {
  StageAnalysisDetector,
  getStageAnalysisDetector,
  resetStageAnalysisDetector,
} from "./StageAnalysisDetector";

export {
  StageAnalysisTradeBuilder,
  getStageAnalysisTradeBuilder,
  resetStageAnalysisTradeBuilder,
} from "./StageAnalysisTradeBuilder";

export { enrichStageAnalysisTradeSetup } from "./StageAnalysisEnrichment";

export type {
  StageAnalysisExplainability,
  StageAnalysisExplainabilityConfig,
  StageAnalysisExplanationFactor,
  StageAnalysisExplanationImpact,
} from "./StageAnalysisExplainability";

export {
  buildStageAnalysisExplainability,
  buildStageAnalysisExplanationFactors,
  buildStageAnalysisSummary,
  createEmptyStageAnalysisExplainability,
  resolveStageAnalysisExplainabilityConfig,
} from "./StageAnalysisExplainability";

export type {
  StageAnalysisConvictionGrade,
  StageAnalysisConvictionWeights,
  StageAnalysisFactorScores,
  StageAnalysisInstitutionalScore,
  StageAnalysisScoringConfig,
  StageAnalysisSignalGrade,
} from "./StageAnalysisScoring";

export {
  DEFAULT_STAGE_ANALYSIS_CONVICTION_WEIGHTS,
  DEFAULT_STAGE_ANALYSIS_SCORING_CONFIG,
  buildStageAnalysisInstitutionalScore,
  calculateStageAnalysisConviction,
  calculateStageAnalysisSignalGrade,
  classifyStageAnalysisConvictionGrade,
  classifyStageAnalysisSignalGrade,
  resolveStageAnalysisScoringConfig,
  scoreStageAnalysisConvictionFactors,
} from "./StageAnalysisScoring";

export type { StageAnalysisMetricsSnapshot } from "./StageAnalysisMetrics";

export {
  StageAnalysisMetrics,
  createEmptyStageAnalysisMetrics,
  getStageAnalysisMetrics,
  resetStageAnalysisMetrics,
} from "./StageAnalysisMetrics";

export {
  buildStageAnalysisContextFromPipeline,
  ensureStageAnalysisRegistered,
  executeStageAnalysisThroughEngine,
  executeStageAnalysisWithPipeline,
  getStageAnalysisFromFactory,
  getStageAnalysisIntegrationStatus,
  isStageAnalysisExecutableInput,
} from "./StageAnalysisIntegration";

export {
  StageAnalysisStrategy,
  createStageAnalysisStrategyRegistration,
  registerStageAnalysisStrategy,
} from "./StageAnalysisStrategy";
