/**
 * Institutional Trust Score Engine — public exports (Prompt 9F.10).
 */

export {
  DEFAULT_TRUST_CONFIGURATION,
  resolveTrustConfiguration,
  BUILTIN_TRUST_MODULE_IDS,
} from "./TrustConfiguration";

export type {
  TrustMode,
  TrustModuleId,
  BuiltinTrustModuleId,
  TrustWeightMap,
  TrustClassificationThresholds,
  TrustTrendWindows,
  TrustConfidenceAdjustments,
  TrustBonusScoring,
  TrustConfiguration,
  TrustConfigurationInput,
} from "./TrustConfiguration";

export {
  classifyTrust,
  isTrustRejected,
} from "./TrustClassification";

export type { TrustClassificationLabel } from "./TrustClassification";

export { TrustWeightManager } from "./TrustWeightManager";

export {
  TrustAggregationEngine,
  clampTrustScore,
} from "./TrustAggregationEngine";

export type {
  TrustModuleScoreMap,
  TrustAggregationInput,
  TrustAggregationResult,
} from "./TrustAggregationEngine";

export { TrustScoreCalculator } from "./TrustScoreCalculator";

export type {
  TrustAdjustmentSignals,
  TrustScoreCalculationInput,
  TrustScoreCalculationResult,
} from "./TrustScoreCalculator";

export { TrustHistoryStore } from "./TrustHistory";
export type { TrustHistoryEntry } from "./TrustHistory";

export { TrustTrendAnalyzer } from "./TrustTrendAnalyzer";
export type {
  TrustTrendSnapshot,
  TrustScoreTimePoint,
} from "./TrustTrendAnalyzer";

export { createTrustSnapshotId } from "./TrustSnapshot";
export type { TrustSnapshot } from "./TrustSnapshot";

export { TrustMetricsTracker } from "./TrustMetrics";
export type {
  TrustMetricsSnapshot,
  TrustErrorReport,
} from "./TrustMetrics";

export { TrustAuditLogger } from "./TrustAuditLogger";
export type { TrustAuditEntry } from "./TrustAuditLogger";

export {
  buildBuiltinTrustModules,
  registerTrustModule,
  registerBuiltinTrustModules,
  getRegisteredTrustModules,
  getTrustModule,
  extractAllModuleScores,
  readModuleScore,
  resetTrustModuleRegistrationState,
} from "./TrustRuleRegistry";

export type {
  TrustModuleDefinition,
  TrustModuleRegistrationResult,
} from "./TrustRuleRegistry";

export {
  TrustScoreEngine,
  registerTrustEngine,
  getTrustScoreEngine,
  resetTrustScoreEngine,
  calculateTrustScore,
  getTrustHistory,
  getTrustMetrics,
  getTrustTrend,
} from "./TrustScoreEngine";

export type {
  TrustScoreRequest,
  TrustFields,
  TrustScoreResult,
  TrustEngineRegistrationResult,
} from "./TrustScoreEngine";
