/**
 * Institutional Historical Performance Validation — public exports.
 */

export {
  DEFAULT_HISTORICAL_VALIDATION_CONFIG,
  resolveHistoricalConfig,
  resolveHistoricalScoreBand,
} from "./HistoricalValidationConfig";

export type {
  HistoricalMode,
  HistoricalScoreBand,
  HistoricalValidationConfig,
  HistoricalValidationConfigInput,
} from "./HistoricalValidationConfig";

export {
  buildHistoricalRules,
  registerHistoricalRules,
  resetHistoricalRuleRegistrationState,
  getHistoricalValidationMetrics,
  resetHistoricalValidationMetrics,
  getActiveHistoricalConfig,
  getHistoricalAuditLog,
  resetHistoricalAuditLog,
  calculateHistoricalScore,
  detectModelDecay,
  deriveHistoricalComponentScores,
  validateHistoricalPerformance,
  validateRecommendationHistory,
  validateTradeHistory,
  configFromContext,
  histFail,
  histPass,
  isPlainObject,
  readNumber,
  readString,
  section,
  metricsSection,
  hasNonEmptyText,
  appendHistoricalAudit,
} from "./HistoricalRuleRegistry";

export type {
  HistoricalValidationMetrics,
  HistoricalAuditEntry,
  HistoricalComponentScores,
  HistoricalScoreResult,
  ModelDecayResult,
} from "./HistoricalRuleRegistry";

export { createRecommendationPerformanceRules } from "./RecommendationPerformanceRules";
export { createTradePerformanceRules } from "./TradePerformanceRules";
export { createPredictionAccuracyRules } from "./PredictionAccuracyRules";
export { createHitRateValidationRules } from "./HitRateValidationRules";
export { createTargetAchievementRules } from "./TargetAchievementRules";
export { createStopLossValidationRules } from "./StopLossValidationRules";
export { createHoldingPeriodRules } from "./HoldingPeriodRules";
export { createRiskRewardPerformanceRules } from "./RiskRewardPerformanceRules";
export { createDrawdownValidationRules } from "./DrawdownValidationRules";
export { createConsistencyValidationRules } from "./ConsistencyValidationRules";
export { createModelDecayRules } from "./ModelDecayRules";
export { createPerformanceScoringRules } from "./PerformanceScoringRules";
export { createHistoricalAuditRules } from "./HistoricalAuditRules";
