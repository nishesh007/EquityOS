export * from "@/lib/opportunity-engine/types";
export {
  runOpportunityScan,
  getOpportunityState,
  getCategoryOpportunities,
} from "@/lib/opportunity-engine/engine";
export {
  startOpportunityScheduler,
  stopOpportunityScheduler,
  isOpportunitySchedulerStarted,
} from "@/lib/opportunity-engine/scheduler";
export { ensureTradingDayLifecycle } from "@/lib/opportunity-engine/store";
export {
  loadArchivedOpportunitySnapshot,
} from "@/lib/opportunity-engine/persistence";
export {
  listActiveRecommendationCandidates,
  listRecommendationHistory,
  replayRecommendation,
} from "@/lib/opportunity-engine/recommendation-memory";
export { updateRecommendationStatus } from "@/lib/opportunity-engine/store";
export { getTradingDateKey, isTradingDay } from "@/lib/market/session";
export {
  getSchedulerHealth,
  buildSchedulerHealth,
  classifyDataFreshness,
  computeHealthScore,
  computeNextScheduledScan,
  resolveSchedulerStatus,
} from "@/lib/opportunity-engine/scheduler-health";
export type {
  SchedulerHealth,
  SchedulerStatus,
  SchedulerMarketState,
  DataFreshnessLevel,
} from "@/lib/opportunity-engine/scheduler-health";
export {
  computeOpportunityScore,
  resolveOpportunityScoreWeights,
  DEFAULT_OPPORTUNITY_SCORE_WEIGHTS,
} from "@/lib/opportunity-engine/opportunity-score";
export type {
  OpportunityScoreFactors,
  OpportunityScoreResult,
  OpportunityScoreWeights,
} from "@/lib/opportunity-engine/opportunity-score";
export {
  enrichCandidateWithPipeline,
  enrichCandidatesWithPipeline,
  buildPipelineScanSummary,
  resolveCategoryStrategy,
  CATEGORY_STRATEGY_IDS,
  DEFAULT_PIPELINE_GATE_THRESHOLDS,
} from "@/lib/opportunity-engine/pipeline-enrichment";
export type {
  PipelineGateThresholds,
  PipelineScanSummary,
  PipelineEnrichmentOptions,
} from "@/lib/opportunity-engine/pipeline-enrichment";
