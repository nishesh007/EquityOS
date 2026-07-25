/**
 * Sprint 9F.2 — Horizon-First recommendation engine public API.
 */

export type {
  HorizonId,
  HorizonRecommendation,
  HorizonPipelineSnapshot,
} from "./types";
export {
  HORIZON_COLORS,
  getHorizonColors,
  horizonAccentStyle,
  horizonCardSurfaceStyle,
  horizonSectionSurfaceStyle,
} from "./colors";
export type { HorizonColorTheme } from "./colors";
export {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
} from "./ids";
export type { InstitutionalStrategyId } from "./ids";
export {
  runHorizonPipelines,
  clearHorizonPipelineCache,
  horizonPipelineIndependenceReport,
  getHorizonCalibrationAudit,
  getTradabilityAudit,
  getConflictAudit,
} from "./pipeline";
export { selectHorizonDashboardSlots } from "./adapters";
export { HORIZON_METHODOLOGY, constructTradeForHorizon } from "./trade";
export { buildHorizonUniverse } from "./universe";
export { selectForHorizon, HORIZON_SELECTORS } from "./selection";
export {
  HORIZON_HOLDING_ENVELOPES,
  HORIZON_RETURN_ENVELOPES,
  MIN_RECOMMENDATION_QUALITY,
} from "./definitions";
export {
  calibrateHorizonSnapshot,
  calibrateRecommendation,
  calibrateConfidence,
  computeRecommendationQualityScore,
} from "./calibration";
export type { CalibrationAuditReport } from "./calibration";
export {
  EXPECTED_RETURN_DEFINITION,
  EFFECTIVE_ENTRY_DEFINITION,
  resolveEffectiveEntry,
  computeCanonicalExpectedReturn,
  computeCanonicalRiskReward,
  sealTradeMetrics,
  auditRecommendationIntegrity,
  verifyRecommendationIntegrity,
} from "../trade-integrity";
export {
  evaluateTradability,
  filterUniverseByTradability,
  DEFAULT_TRADABILITY_THRESHOLDS,
  TRADABILITY_METHODOLOGY,
} from "../tradability";
export type {
  LiquidityGrade,
  TradabilityAssessment,
  TradabilityAuditReport,
  TradabilityThresholds,
} from "../tradability";
export {
  resolveRecommendationConflicts,
  MIN_BAND_DISTANCE_TO_RETAIN,
  HORIZON_BAND,
} from "../conflict-validator";
export type { ConflictAuditReport, ConflictPair } from "../conflict-validator";
