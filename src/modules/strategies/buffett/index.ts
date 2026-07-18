/**
 * Buffett Quality Investing module — Sprint 11B.3U.
 */

export {
  DEFAULT_BUFFETT_CONFIG,
  BUFFETT_STRATEGY_ID,
  BUFFETT_STRATEGY_NAME,
  resolveBuffettConfig,
  type BuffettConfig,
} from "./BuffettConstants";

export type {
  BuffettBusinessAnalysis,
  BuffettCurrentSnapshot,
  BuffettDetection,
  BuffettDetectionContext,
  BuffettFinancialAnalysis,
  BuffettInvestmentSetup,
  BuffettManagementAnalysis,
  BuffettManagementInputs,
  BuffettMarketData,
  BuffettMoatAnalysis,
  BuffettMoatClassification,
  BuffettMoatInputs,
  BuffettPositionSize,
  BuffettRecommendation,
  BuffettStrategyInput,
  BuffettValidationResult,
  BuffettValuationAnalysis,
  BuffettValuationStatus,
  BuffettYearlyFinancials,
} from "./BuffettTypes";

export {
  isBuffettStrategyInput,
  toBuffettDetectionContext,
} from "./BuffettTypes";

export {
  average,
  calculateBuffettQualityScore,
  coefficientOfVariation,
  consistencyScoreFromCv,
  createEmptyBuffettDetection,
  growthSeries,
  resolvePositionSize,
  resolveRecommendation,
  sortFinancialHistory,
} from "./BuffettUtils";

export { analyzeBusinessQuality } from "./BuffettBusinessAnalyzer";
export { analyzeEconomicMoat } from "./BuffettMoatAnalyzer";
export { analyzeFinancialStrength } from "./BuffettFinancialAnalyzer";
export { analyzeManagementQuality } from "./BuffettManagementAnalyzer";
export { analyzeValuation } from "./BuffettValuationAnalyzer";

export {
  BuffettDetector,
  detectBuffett,
  getBuffettDetector,
  resetBuffettDetector,
  validateBuffettContext,
} from "./BuffettDetector";

export {
  BuffettTradeBuilder,
  createRejectedBuffettSetup,
  getBuffettTradeBuilder,
  resetBuffettTradeBuilder,
} from "./BuffettTradeBuilder";

export type {
  BuffettExplainability,
  BuffettExplainabilityConfig,
  BuffettExplanationFactor,
  BuffettExplanationImpact,
} from "./BuffettExplainability";

export {
  buildBuffettExplainability,
  buildBuffettExplanationFactors,
  buildBuffettSummary,
  createEmptyBuffettExplainability,
  resolveBuffettExplainabilityConfig,
} from "./BuffettExplainability";

export type {
  BuffettConvictionGrade,
  BuffettConvictionWeights,
  BuffettFactorScores,
  BuffettInstitutionalScore,
  BuffettScoringConfig,
  BuffettSignalGrade,
} from "./BuffettScoring";

export {
  DEFAULT_BUFFETT_CONVICTION_WEIGHTS,
  DEFAULT_BUFFETT_SCORING_CONFIG,
  buildBuffettInstitutionalScore,
  calculateBuffettConviction,
  classifyBuffettConvictionGrade,
  classifyBuffettSignalGrade,
  resolveBuffettScoringConfig,
  scoreBuffettConvictionFactors,
} from "./BuffettScoring";

export type { BuffettMetricsSnapshot } from "./BuffettMetrics";

export {
  BuffettMetrics,
  createEmptyBuffettMetrics,
  getBuffettMetrics,
  resetBuffettMetrics,
} from "./BuffettMetrics";

export {
  buildBuffettContextFromPipeline,
  ensureBuffettRegistered,
  executeBuffettThroughEngine,
  executeBuffettWithPipeline,
  getBuffettFromFactory,
  getBuffettIntegrationStatus,
  isBuffettExecutableInput,
} from "./BuffettIntegration";

export {
  BuffettStrategy,
  createBuffettStrategyRegistration,
  registerBuffettStrategy,
} from "./BuffettStrategy";
