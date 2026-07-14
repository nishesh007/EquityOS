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
