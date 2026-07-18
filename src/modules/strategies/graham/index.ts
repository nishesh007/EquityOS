/**
 * Graham Value Investing module — Sprint 11B.3V.
 */

export {
  DEFAULT_GRAHAM_CONFIG,
  GRAHAM_STRATEGY_ID,
  GRAHAM_STRATEGY_NAME,
  resolveGrahamConfig,
  type GrahamConfig,
} from "./GrahamConstants";

export type {
  GrahamBalanceSheetAnalysis,
  GrahamCurrentSnapshot,
  GrahamDetection,
  GrahamDetectionContext,
  GrahamFinancialAnalysis,
  GrahamInvestmentSetup,
  GrahamIntrinsicValueAnalysis,
  GrahamMarginSafetyAnalysis,
  GrahamMarketData,
  GrahamPositionSize,
  GrahamRecommendation,
  GrahamScreenResult,
  GrahamStrategyInput,
  GrahamValidationResult,
  GrahamValuationStatus,
  GrahamYearlyFinancials,
} from "./GrahamTypes";

export {
  isGrahamStrategyInput,
  toGrahamDetectionContext,
} from "./GrahamTypes";

export {
  average,
  calculateGrahamQualityScore,
  classifyScreen,
  coefficientOfVariation,
  createEmptyGrahamDetection,
  resolvePositionSize,
  resolveRecommendation,
  sortFinancialHistory,
} from "./GrahamUtils";

export { analyzeFinancialStrength } from "./GrahamFinancialAnalyzer";
export { analyzeBalanceSheet } from "./GrahamBalanceSheetAnalyzer";
export { analyzeIntrinsicValue } from "./GrahamIntrinsicValueAnalyzer";
export { analyzeMarginOfSafety } from "./GrahamMarginSafetyAnalyzer";

export {
  GrahamDetector,
  detectGraham,
  getGrahamDetector,
  resetGrahamDetector,
  validateGrahamContext,
} from "./GrahamDetector";

export {
  GrahamTradeBuilder,
  createRejectedGrahamSetup,
  getGrahamTradeBuilder,
  resetGrahamTradeBuilder,
} from "./GrahamTradeBuilder";

export type {
  GrahamExplainability,
  GrahamExplainabilityConfig,
  GrahamExplanationFactor,
  GrahamExplanationImpact,
} from "./GrahamExplainability";

export {
  buildGrahamExplainability,
  buildGrahamExplanationFactors,
  buildGrahamSummary,
  createEmptyGrahamExplainability,
  resolveGrahamExplainabilityConfig,
} from "./GrahamExplainability";

export type {
  GrahamConvictionGrade,
  GrahamConvictionWeights,
  GrahamFactorScores,
  GrahamInstitutionalScore,
  GrahamScoringConfig,
  GrahamSignalGrade,
} from "./GrahamScoring";

export {
  DEFAULT_GRAHAM_CONVICTION_WEIGHTS,
  DEFAULT_GRAHAM_SCORING_CONFIG,
  buildGrahamInstitutionalScore,
  calculateGrahamConviction,
  classifyGrahamConvictionGrade,
  classifyGrahamSignalGrade,
  resolveGrahamScoringConfig,
  scoreGrahamConvictionFactors,
} from "./GrahamScoring";

export type { GrahamMetricsSnapshot } from "./GrahamMetrics";

export {
  GrahamMetrics,
  createEmptyGrahamMetrics,
  getGrahamMetrics,
  resetGrahamMetrics,
} from "./GrahamMetrics";

export {
  buildGrahamContextFromPipeline,
  ensureGrahamRegistered,
  executeGrahamThroughEngine,
  executeGrahamWithPipeline,
  getGrahamFromFactory,
  getGrahamIntegrationStatus,
  isGrahamExecutableInput,
} from "./GrahamIntegration";

export {
  GrahamStrategy,
  createGrahamStrategyRegistration,
  registerGrahamStrategy,
} from "./GrahamStrategy";
