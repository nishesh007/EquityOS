/**
 * Quality Compounder module — Sprint 11B.3Y.
 */

export {
  DEFAULT_QUALITY_COMPOUNDER_CONFIG,
  QUALITY_COMPOUNDER_STRATEGY_ID,
  QUALITY_COMPOUNDER_STRATEGY_NAME,
  resolveQualityCompounderConfig,
  type QualityCompounderConfig,
} from "./QualityCompounderConstants";

export type {
  QualityCompounderBusinessAnalysis,
  QualityCompounderBusinessGrade,
  QualityCompounderBusinessInputs,
  QualityCompounderCapitalAllocationAnalysis,
  QualityCompounderCapitalInputs,
  QualityCompounderCurrentSnapshot,
  QualityCompounderDetection,
  QualityCompounderDetectionContext,
  QualityCompounderFinancialAnalysis,
  QualityCompounderGrowthAnalysis,
  QualityCompounderInvestmentSetup,
  QualityCompounderManagementAnalysis,
  QualityCompounderManagementInputs,
  QualityCompounderMarketData,
  QualityCompounderMoatAnalysis,
  QualityCompounderMoatClassification,
  QualityCompounderMoatInputs,
  QualityCompounderPositionSize,
  QualityCompounderRecommendation,
  QualityCompounderStrategyInput,
  QualityCompounderValidationResult,
  QualityCompounderValuationAnalysis,
  QualityCompounderValuationStatus,
  QualityCompounderYearlyFinancials,
} from "./QualityCompounderTypes";

export {
  isQualityCompounderStrategyInput,
  toQualityCompounderDetectionContext,
} from "./QualityCompounderTypes";

export {
  average,
  calculateQualityCompounderQualityScore,
  classifyBusinessGrade,
  coefficientOfVariation,
  compoundAnnualGrowthRate,
  consistencyScoreFromCv,
  createEmptyQualityCompounderDetection,
  dedupeStrings,
  resolveExpectedCagr,
  resolvePositionSize,
  resolveRecommendation,
  seriesCagr,
  sortFinancialHistory,
} from "./QualityCompounderUtils";

export { analyzeBusinessQuality } from "./QualityCompounderBusinessAnalyzer";
export { analyzeEconomicMoat } from "./QualityCompounderMoatAnalyzer";
export { analyzeGrowthSustainability } from "./QualityCompounderGrowthAnalyzer";
export { analyzeCapitalAllocation } from "./QualityCompounderCapitalAllocationAnalyzer";
export { analyzeFinancialStrength } from "./QualityCompounderFinancialAnalyzer";
export { analyzeManagementQuality } from "./QualityCompounderManagementAnalyzer";
export { analyzeValuation } from "./QualityCompounderValuationAnalyzer";

export {
  QualityCompounderDetector,
  detectQualityCompounder,
  getQualityCompounderDetector,
  resetQualityCompounderDetector,
  validateQualityCompounderContext,
} from "./QualityCompounderDetector";

export {
  QualityCompounderTradeBuilder,
  createRejectedQualityCompounderSetup,
  getQualityCompounderTradeBuilder,
  resetQualityCompounderTradeBuilder,
} from "./QualityCompounderTradeBuilder";

export type {
  QualityCompounderExplainability,
  QualityCompounderExplainabilityConfig,
  QualityCompounderExplanationFactor,
  QualityCompounderExplanationImpact,
} from "./QualityCompounderExplainability";

export {
  buildQualityCompounderExplainability,
  buildQualityCompounderExplanationFactors,
  buildQualityCompounderSummary,
  createEmptyQualityCompounderExplainability,
  resolveQualityCompounderExplainabilityConfig,
} from "./QualityCompounderExplainability";

export type {
  QualityCompounderConvictionGrade,
  QualityCompounderConvictionWeights,
  QualityCompounderFactorScores,
  QualityCompounderInstitutionalScore,
  QualityCompounderScoringConfig,
  QualityCompounderSignalGrade,
} from "./QualityCompounderScoring";

export {
  DEFAULT_QUALITY_COMPOUNDER_CONVICTION_WEIGHTS,
  DEFAULT_QUALITY_COMPOUNDER_SCORING_CONFIG,
  buildQualityCompounderInstitutionalScore,
  calculateQualityCompounderConviction,
  classifyQualityCompounderConvictionGrade,
  classifyQualityCompounderSignalGrade,
  resolveQualityCompounderScoringConfig,
  scoreQualityCompounderConvictionFactors,
} from "./QualityCompounderScoring";

export type { QualityCompounderMetricsSnapshot } from "./QualityCompounderMetrics";

export {
  QualityCompounderMetrics,
  createEmptyQualityCompounderMetrics,
  getQualityCompounderMetrics,
  resetQualityCompounderMetrics,
} from "./QualityCompounderMetrics";

export {
  buildQualityCompounderContextFromPipeline,
  ensureQualityCompounderRegistered,
  executeQualityCompounderThroughEngine,
  executeQualityCompounderWithPipeline,
  getQualityCompounderFromFactory,
  getQualityCompounderIntegrationStatus,
  isQualityCompounderExecutableInput,
} from "./QualityCompounderIntegration";

export {
  QualityCompounderStrategy,
  createQualityCompounderStrategyRegistration,
  registerQualityCompounderStrategy,
} from "./QualityCompounderStrategy";
