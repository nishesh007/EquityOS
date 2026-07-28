export {
  buildSharedRecommendation,
  buildFallbackRecommendation,
  selectSharedRecommendations,
  selectRecommendationsWithFallback,
} from "./shared-recommendation";
export type {
  RecommendationAction,
  SharedRecommendation,
  SharedRecommendationValidation,
  SharedMarketSnapshot,
} from "./shared-recommendation";
export {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  NO_HIGH_CONVICTION_MESSAGE,
  NO_RECOMMENDATION_AVAILABLE_MESSAGE,
  filledSlotCount,
  parseInstitutionalStrategyId,
  rankInstitutionalSlotsFromRecommendations,
  resolveDashboardSlotsFromRecommendations,
  selectInstitutionalStrategyDashboard,
} from "./institutional-strategy-dashboard";
export type {
  InstitutionalStrategyId,
  InstitutionalStrategyPick,
  InstitutionalStrategySlot,
} from "./institutional-strategy-dashboard";
export {
  ENTRY_AT_MARKET_TOLERANCE,
  planInstitutionalEntry,
  planInstitutionalEntryFromRecommendation,
} from "./institutional-entry";
export type {
  InstitutionalEntryMode,
  InstitutionalEntryPlan,
} from "./institutional-entry";
export {
  INSTITUTIONAL_MIN_RISK_REWARD,
  computeTradeMetrics,
  validateInstitutionalTradeLevels,
  resolveValidatedEntry,
  isPresentationEntryValid,
} from "./recommendation-validator";
export type {
  InstitutionalTradeLevelsInput,
  InstitutionalTradeLevelValidation,
  InstitutionalTradeLevelChecks,
  InstitutionalTradeLevelMetrics,
  RecommendationSideAction,
} from "./recommendation-validator";
export { auditRecommendationValidation } from "./recommendation-validation-audit";
export type { RecommendationValidationAudit } from "./recommendation-validation-audit";
export {
  INSTITUTIONAL_HOLDING_PERIODS,
  OE_CATEGORY_HOLDING_PERIODS,
  STRATEGY_RECOMMENDATION_TITLES,
  ensureThreeTargets,
  resolveInstitutionalHoldingPeriod,
  isHoldingPeriodConsistentWithHorizon,
} from "./institutional-horizons";
export {
  HORIZON_COLORS,
  runHorizonPipelines,
  clearHorizonPipelineCache,
  selectHorizonDashboardSlots,
  HORIZON_METHODOLOGY,
  getTradabilityAudit,
  getConflictAudit,
  evaluateTradability,
  filterUniverseByTradability,
  DEFAULT_TRADABILITY_THRESHOLDS,
  TRADABILITY_METHODOLOGY,
  resolveRecommendationConflicts,
} from "./horizons";
export type {
  LiquidityGrade,
  TradabilityAssessment,
  TradabilityAuditReport,
  TradabilityThresholds,
} from "./tradability";
export type { ConflictAuditReport, ConflictPair } from "./conflict-validator";
export {
  EXPECTED_RETURN_DEFINITION,
  EFFECTIVE_ENTRY_DEFINITION,
  resolveEffectiveEntry,
  computeCanonicalExpectedReturn,
  computeCanonicalRiskReward,
  sealTradeMetrics,
  auditRecommendationIntegrity,
  verifyRecommendationIntegrity,
} from "./trade-integrity";
export {
  readPublishedFromState,
  validatePublishedIntegrity,
  isPublishedIntegrityValid,
  PUBLISHED_RECOMMENDATION_VERSION,
  buildPublishedScanId,
} from "./published/client";
export type {
  PublishedRecommendationsBundle,
  PublishedConsumerId,
  PublishedConsumerStatus,
} from "./published/client";
export {
  evaluateRecommendationQuality,
  applyRecommendationQualityGate,
  getLastQualityGateReport,
  QUALITY_GATE_THRESHOLDS,
} from "./quality-gate";
export type {
  QualityGateReport,
  QualityRejectionReason,
  QualityGateRejection,
} from "./quality-gate";
export type {
  CanonicalTradeMetrics,
  IntegrityAuditReport,
  IntegrityFailure,
} from "./trade-integrity";
export {
  buildExecutiveDecisionView,
  convictionBandFromScore,
  toDecisionAction,
} from "./executive-decision-presenter";
export type {
  AiConvictionView,
  CommitteeVerdictView,
  DecisionAction,
  ExecutiveDecisionInput,
  ExecutiveDecisionView,
  ExecutiveSummaryView,
  TradePlanView,
} from "./executive-decision-presenter";
export {
  buildResearchIntelligenceView,
  buildEmptyResearchIntelligenceView,
} from "./research-intelligence-presenter";
export type { ResearchIntelligenceView } from "./research-intelligence-presenter";
export {
  buildInstitutionalTrustView,
  buildEmptyInstitutionalTrustView,
} from "./institutional-trust-presenter";
export type { InstitutionalTrustView } from "./institutional-trust-presenter";
