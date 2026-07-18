/**
 * Peter Lynch GARP module — Sprint 11B.3W.
 */

export {
  DEFAULT_PETER_LYNCH_CONFIG,
  PETER_LYNCH_STRATEGY_ID,
  PETER_LYNCH_STRATEGY_NAME,
  resolvePeterLynchConfig,
  type PeterLynchConfig,
} from "./PeterLynchConstants";

export type {
  PeterLynchBusinessAnalysis,
  PeterLynchBusinessInputs,
  PeterLynchCurrentSnapshot,
  PeterLynchDetection,
  PeterLynchDetectionContext,
  PeterLynchFinancialAnalysis,
  PeterLynchGrowthAnalysis,
  PeterLynchGrowthGrade,
  PeterLynchInvestmentSetup,
  PeterLynchMarketData,
  PeterLynchPegAnalysis,
  PeterLynchPegBand,
  PeterLynchPositionSize,
  PeterLynchRecommendation,
  PeterLynchStrategyInput,
  PeterLynchValidationResult,
  PeterLynchValuationAnalysis,
  PeterLynchValuationStatus,
  PeterLynchYearlyFinancials,
} from "./PeterLynchTypes";

export {
  isPeterLynchStrategyInput,
  toPeterLynchDetectionContext,
} from "./PeterLynchTypes";

export {
  average,
  calculatePeterLynchQualityScore,
  classifyGrowthGrade,
  classifyPegBand,
  compoundAnnualGrowthRate,
  createEmptyPeterLynchDetection,
  resolvePositionSize,
  resolveRecommendation,
  sortFinancialHistory,
} from "./PeterLynchUtils";

export { analyzeGrowth } from "./PeterLynchGrowthAnalyzer";
export { analyzePeg } from "./PeterLynchPEGAnalyzer";
export { analyzeBusinessQuality } from "./PeterLynchBusinessAnalyzer";
export { analyzeFinancialStrength } from "./PeterLynchFinancialAnalyzer";
export { analyzeValuation } from "./PeterLynchValuationAnalyzer";

export {
  PeterLynchDetector,
  detectPeterLynch,
  getPeterLynchDetector,
  resetPeterLynchDetector,
  validatePeterLynchContext,
} from "./PeterLynchDetector";

export {
  PeterLynchTradeBuilder,
  createRejectedPeterLynchSetup,
  getPeterLynchTradeBuilder,
  resetPeterLynchTradeBuilder,
} from "./PeterLynchTradeBuilder";

export type {
  PeterLynchExplainability,
  PeterLynchExplainabilityConfig,
  PeterLynchExplanationFactor,
  PeterLynchExplanationImpact,
} from "./PeterLynchExplainability";

export {
  buildPeterLynchExplainability,
  buildPeterLynchExplanationFactors,
  buildPeterLynchSummary,
  createEmptyPeterLynchExplainability,
  resolvePeterLynchExplainabilityConfig,
} from "./PeterLynchExplainability";

export type {
  PeterLynchConvictionGrade,
  PeterLynchConvictionWeights,
  PeterLynchFactorScores,
  PeterLynchInstitutionalScore,
  PeterLynchScoringConfig,
  PeterLynchSignalGrade,
} from "./PeterLynchScoring";

export {
  DEFAULT_PETER_LYNCH_CONVICTION_WEIGHTS,
  DEFAULT_PETER_LYNCH_SCORING_CONFIG,
  buildPeterLynchInstitutionalScore,
  calculatePeterLynchConviction,
  classifyPeterLynchConvictionGrade,
  classifyPeterLynchSignalGrade,
  resolvePeterLynchScoringConfig,
  scorePeterLynchConvictionFactors,
} from "./PeterLynchScoring";

export type { PeterLynchMetricsSnapshot } from "./PeterLynchMetrics";

export {
  PeterLynchMetrics,
  createEmptyPeterLynchMetrics,
  getPeterLynchMetrics,
  resetPeterLynchMetrics,
} from "./PeterLynchMetrics";

export {
  buildPeterLynchContextFromPipeline,
  ensurePeterLynchRegistered,
  executePeterLynchThroughEngine,
  executePeterLynchWithPipeline,
  getPeterLynchFromFactory,
  getPeterLynchIntegrationStatus,
  isPeterLynchExecutableInput,
} from "./PeterLynchIntegration";

export {
  PeterLynchStrategy,
  createPeterLynchStrategyRegistration,
  registerPeterLynchStrategy,
} from "./PeterLynchStrategy";
