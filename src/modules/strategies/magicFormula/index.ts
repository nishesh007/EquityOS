/**
 * Greenblatt Magic Formula module — Sprint 11B.3X.
 */

export {
  DEFAULT_MAGIC_FORMULA_CONFIG,
  MAGIC_FORMULA_STRATEGY_ID,
  MAGIC_FORMULA_STRATEGY_NAME,
  resolveMagicFormulaConfig,
  type MagicFormulaConfig,
} from "./MagicFormulaConstants";

export type {
  MagicFormulaCurrentSnapshot,
  MagicFormulaDetection,
  MagicFormulaDetectionContext,
  MagicFormulaEarningsYieldAnalysis,
  MagicFormulaFinancialAnalysis,
  MagicFormulaInvestmentSetup,
  MagicFormulaMarketData,
  MagicFormulaPeerSnapshot,
  MagicFormulaPositionSize,
  MagicFormulaRankingResult,
  MagicFormulaRecommendation,
  MagicFormulaRocAnalysis,
  MagicFormulaStrategyInput,
  MagicFormulaValidationResult,
  MagicFormulaYearlyFinancials,
} from "./MagicFormulaTypes";

export {
  isMagicFormulaStrategyInput,
  toMagicFormulaDetectionContext,
} from "./MagicFormulaTypes";

export {
  average,
  calculateMagicFormulaQualityScore,
  createEmptyMagicFormulaDetection,
  percentileFromRank,
  rankDescending,
  resolvePositionSize,
  resolveRecommendation,
  scoreFromPercentile,
  sortFinancialHistory,
} from "./MagicFormulaUtils";

export {
  analyzeEarningsYield,
  resolveEnterpriseValue,
} from "./MagicFormulaEarningsYieldAnalyzer";
export { analyzeReturnOnCapital } from "./MagicFormulaROCAnalyzer";
export { computeMagicFormulaRanking } from "./MagicFormulaRankingEngine";
export { analyzeFinancialStrength } from "./MagicFormulaFinancialAnalyzer";

export {
  MagicFormulaDetector,
  detectMagicFormula,
  getMagicFormulaDetector,
  resetMagicFormulaDetector,
  validateMagicFormulaContext,
} from "./MagicFormulaDetector";

export {
  MagicFormulaTradeBuilder,
  createRejectedMagicFormulaSetup,
  getMagicFormulaTradeBuilder,
  resetMagicFormulaTradeBuilder,
} from "./MagicFormulaTradeBuilder";

export type {
  MagicFormulaExplainability,
  MagicFormulaExplainabilityConfig,
  MagicFormulaExplanationFactor,
  MagicFormulaExplanationImpact,
} from "./MagicFormulaExplainability";

export {
  buildMagicFormulaExplainability,
  buildMagicFormulaExplanationFactors,
  buildMagicFormulaSummary,
  createEmptyMagicFormulaExplainability,
  resolveMagicFormulaExplainabilityConfig,
} from "./MagicFormulaExplainability";

export type {
  MagicFormulaConvictionGrade,
  MagicFormulaConvictionWeights,
  MagicFormulaFactorScores,
  MagicFormulaInstitutionalScore,
  MagicFormulaScoringConfig,
  MagicFormulaSignalGrade,
} from "./MagicFormulaScoring";

export {
  DEFAULT_MAGIC_FORMULA_CONVICTION_WEIGHTS,
  DEFAULT_MAGIC_FORMULA_SCORING_CONFIG,
  buildMagicFormulaInstitutionalScore,
  calculateMagicFormulaConviction,
  classifyMagicFormulaConvictionGrade,
  classifyMagicFormulaSignalGrade,
  resolveMagicFormulaScoringConfig,
  scoreMagicFormulaConvictionFactors,
} from "./MagicFormulaScoring";

export type { MagicFormulaMetricsSnapshot } from "./MagicFormulaMetrics";

export {
  MagicFormulaMetrics,
  createEmptyMagicFormulaMetrics,
  getMagicFormulaMetrics,
  resetMagicFormulaMetrics,
} from "./MagicFormulaMetrics";

export {
  buildMagicFormulaContextFromPipeline,
  ensureMagicFormulaRegistered,
  executeMagicFormulaThroughEngine,
  executeMagicFormulaWithPipeline,
  getMagicFormulaFromFactory,
  getMagicFormulaIntegrationStatus,
  isMagicFormulaExecutableInput,
} from "./MagicFormulaIntegration";

export {
  MagicFormulaStrategy,
  createMagicFormulaStrategyRegistration,
  registerMagicFormulaStrategy,
} from "./MagicFormulaStrategy";
