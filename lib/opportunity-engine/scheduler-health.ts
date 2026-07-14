/**
 * Opportunity Engine — Scheduler Health Monitor (observability only).
 * Does not modify scoring, ranking, conviction, or scan selection.
 */

import {
  getMarketStatus,
  getNextSessionOpenISO,
  type MarketStatus,
} from "@/lib/market/session";
import { getOpportunityEngineState } from "@/lib/opportunity-engine/store";
import {
  getSchedulerObservability,
  type SchedulerLastError,
} from "@/lib/opportunity-engine/scheduler-observability";
import {
  OPPORTUNITY_CATEGORIES,
  SCAN_INTERVAL_MS,
  type OpportunityEngineState,
} from "@/lib/opportunity-engine/types";

export type SchedulerStatus = "RUNNING" | "PAUSED" | "FROZEN" | "ERROR";
export type SchedulerMarketState = "PRE_OPEN" | "OPEN" | "CLOSED" | "HOLIDAY";
export type DataFreshnessLevel = "Excellent" | "Good" | "Delayed" | "Stale";

export interface SchedulerHealth {
  schedulerStatus: SchedulerStatus;
  marketState: SchedulerMarketState;
  lastSuccessfulScan: string | null;
  nextScheduledScan: string | null;
  scansToday: number;
  averageScanDuration: number | null;
  lastScanDuration: number | null;
  symbolsScanned: number;
  opportunitiesGenerated: number;
  schedulerUptime: number;
  dataFreshnessSeconds: number | null;
  dataFreshness: DataFreshnessLevel | null;
  lastMarketDataSync: string | null;
  lastAIScan: string | null;
  lastPersistenceWrite: string | null;
  lastError: SchedulerLastError | null;
  retryCount: number;
  healthScore: number;
}

export interface SchedulerHealthInput {
  state: OpportunityEngineState;
  marketStatus: MarketStatus;
  nowMs: number;
  schedulerStarted: boolean;
  schedulerUptimeSeconds: number;
  lastError: SchedulerLastError | null;
  retryCount: number;
  lastPersistenceWrite: string | null;
  observabilityLastSuccess: string | null;
}

const EXCELLENT_MAX_SEC = 2 * 60;
const GOOD_MAX_SEC = 5 * 60;
const DELAYED_MAX_SEC = 15 * 60;

export function mapMarketState(status: MarketStatus): SchedulerMarketState {
  switch (status) {
    case "pre_open":
      return "PRE_OPEN";
    case "open":
      return "OPEN";
    case "holiday":
      return "HOLIDAY";
    case "post_close":
    case "closed":
    default:
      return "CLOSED";
  }
}

export function classifyDataFreshness(
  dataFreshnessSeconds: number | null
): DataFreshnessLevel | null {
  if (dataFreshnessSeconds == null || dataFreshnessSeconds < 0) return null;
  if (dataFreshnessSeconds < EXCELLENT_MAX_SEC) return "Excellent";
  if (dataFreshnessSeconds < GOOD_MAX_SEC) return "Good";
  if (dataFreshnessSeconds < DELAYED_MAX_SEC) return "Delayed";
  return "Stale";
}

export function countOpportunitiesGenerated(state: OpportunityEngineState): number {
  return OPPORTUNITY_CATEGORIES.reduce(
    (total, category) => total + (state.categories[category]?.length ?? 0),
    0
  );
}

export function averageScanDurationMs(state: OpportunityEngineState): number | null {
  const history = state.scanHistory;
  if (!history.length) {
    return state.lastScanMetrics?.durationMs ?? null;
  }
  const sum = history.reduce((acc, entry) => acc + entry.durationMs, 0);
  return Math.round(sum / history.length);
}

export function resolveSchedulerStatus(input: {
  marketStatus: MarketStatus;
  isFrozen: boolean;
  schedulerStarted: boolean;
  lastError: SchedulerLastError | null;
}): SchedulerStatus {
  if (input.lastError) return "ERROR";
  if (input.marketStatus === "holiday") return "PAUSED";
  if (input.isFrozen || input.marketStatus === "post_close") return "FROZEN";
  if (input.marketStatus === "open" && input.schedulerStarted) return "RUNNING";
  if (input.marketStatus === "closed" && input.isFrozen) return "FROZEN";
  if (input.marketStatus === "closed") return "FROZEN";
  return "PAUSED";
}

export function computeNextScheduledScan(input: {
  state: OpportunityEngineState;
  marketStatus: MarketStatus;
  nowMs: number;
}): string | null {
  const { state, marketStatus, nowMs } = input;

  if (marketStatus === "open") {
    if (state.nextScanAt) return state.nextScanAt;
    if (state.lastScannedAt) {
      return new Date(
        new Date(state.lastScannedAt).getTime() + SCAN_INTERVAL_MS
      ).toISOString();
    }
    return new Date(nowMs + SCAN_INTERVAL_MS).toISOString();
  }

  if (marketStatus === "pre_open") {
    return getNextSessionOpenISO(new Date(nowMs));
  }

  // Closed / post_close / holiday / weekend → next trading session open
  return getNextSessionOpenISO(new Date(nowMs));
}

export function computeHealthScore(input: {
  schedulerStatus: SchedulerStatus;
  dataFreshness: DataFreshnessLevel | null;
  retryCount: number;
  nextScheduledScan: string | null;
  nowMs: number;
  marketStatus: MarketStatus;
}): number {
  let score = 100;

  if (input.schedulerStatus === "ERROR") score -= 40;
  if (input.retryCount > 0) score -= Math.min(25, input.retryCount * 5);

  switch (input.dataFreshness) {
    case "Excellent":
      break;
    case "Good":
      score -= 5;
      break;
    case "Delayed":
      score -= 20;
      break;
    case "Stale":
      score -= 40;
      break;
    case null:
      if (input.marketStatus === "open") score -= 15;
      break;
  }

  if (
    input.marketStatus === "open" &&
    input.schedulerStatus === "RUNNING" &&
    input.nextScheduledScan &&
    new Date(input.nextScheduledScan).getTime() < input.nowMs - 60_000
  ) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function buildSchedulerHealth(input: SchedulerHealthInput): SchedulerHealth {
  const lastSuccessfulScan =
    input.state.lastScannedAt ?? input.observabilityLastSuccess ?? null;
  const dataFreshnessSeconds =
    lastSuccessfulScan == null
      ? null
      : Math.max(0, Math.floor((input.nowMs - new Date(lastSuccessfulScan).getTime()) / 1000));
  const dataFreshness = classifyDataFreshness(dataFreshnessSeconds);
  const marketState = mapMarketState(input.marketStatus);
  const schedulerStatus = resolveSchedulerStatus({
    marketStatus: input.marketStatus,
    isFrozen: input.state.isFrozen,
    schedulerStarted: input.schedulerStarted,
    lastError: input.lastError,
  });
  const nextScheduledScan = computeNextScheduledScan({
    state: input.state,
    marketStatus: input.marketStatus,
    nowMs: input.nowMs,
  });
  const healthScore = computeHealthScore({
    schedulerStatus,
    dataFreshness,
    retryCount: input.retryCount,
    nextScheduledScan,
    nowMs: input.nowMs,
    marketStatus: input.marketStatus,
  });

  return {
    schedulerStatus,
    marketState,
    lastSuccessfulScan,
    nextScheduledScan,
    scansToday: input.state.scanCount,
    averageScanDuration: averageScanDurationMs(input.state),
    lastScanDuration: input.state.lastScanMetrics?.durationMs ?? null,
    symbolsScanned: input.state.lastScanMetrics?.symbolsScanned ?? 0,
    opportunitiesGenerated: countOpportunitiesGenerated(input.state),
    schedulerUptime: input.schedulerUptimeSeconds,
    dataFreshnessSeconds,
    dataFreshness,
    lastMarketDataSync: lastSuccessfulScan,
    lastAIScan: lastSuccessfulScan,
    lastPersistenceWrite: input.lastPersistenceWrite,
    lastError: input.lastError,
    retryCount: input.retryCount,
    healthScore,
  };
}

/** Public API — live scheduler health snapshot. */
export function getSchedulerHealth(now = new Date()): SchedulerHealth {
  const state = getOpportunityEngineState();
  const obs = getSchedulerObservability(now.getTime());

  return buildSchedulerHealth({
    state,
    marketStatus: getMarketStatus(now),
    nowMs: now.getTime(),
    schedulerStarted: obs.isStarted,
    schedulerUptimeSeconds: obs.schedulerUptimeSeconds,
    lastError: obs.lastError,
    retryCount: obs.retryCount,
    lastPersistenceWrite: obs.lastPersistenceWrite,
    observabilityLastSuccess: obs.lastSuccessfulScanAt,
  });
}
