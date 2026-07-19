/**
 * Institutional Watchlist Platform — metrics (Sprint 10B.R1).
 * Composes conviction, trust, risk, performance, alerts, and earnings signals.
 */

import type { WatchlistItemSnapshot } from "@/src/core/alerts/intelligence/AlertPresentationModels";
import {
  WATCHLIST_EMPTY,
  safeWatchlistNumber,
  safeWatchlistText,
  type WatchlistRecord,
} from "./WatchlistModels";
import { getCachedWatchlistMetricsKey, cacheWatchlistMetricsKey } from "./WatchlistRegistry";

export interface WatchlistMetricsBundle {
  watchlistId: string;
  companies: number;
  averageConviction: number;
  averageTrust: number;
  risk: number;
  performance: number;
  alerts: number;
  upcomingEarnings: number;
  labels: {
    companies: string;
    averageConviction: string;
    averageTrust: string;
    risk: string;
    performance: string;
    alerts: string;
    upcomingEarnings: string;
  };
  empty: boolean;
  emptyMessage: string;
  fromCache: boolean;
}

/**
 * Metrics accept any watchlist-shaped record; sub-platform engines
 * (analytics, intelligence) build synthetic records with their own
 * empty-state vocabularies, so `emptyMessage` is widened to string here.
 */
export type WatchlistMetricsRecord = Omit<WatchlistRecord, "emptyMessage"> & {
  emptyMessage: string;
};

export interface WatchlistMetricsInput {
  record: WatchlistMetricsRecord;
  snapshots?: Record<string, WatchlistItemSnapshot> | null;
  alertCount?: number | null;
  upcomingEarnings?: number | null;
  now?: Date | null;
  useCache?: boolean;
}

let lastExecutionMs = 0;

export function emptyWatchlistMetrics(
  message: string = WATCHLIST_EMPTY.noCompanies
): WatchlistMetricsBundle {
  return {
    watchlistId: "",
    companies: 0,
    averageConviction: 0,
    averageTrust: 0,
    risk: 0,
    performance: 0,
    alerts: 0,
    upcomingEarnings: 0,
    labels: {
      companies: message,
      averageConviction: "—",
      averageTrust: "—",
      risk: "—",
      performance: "—",
      alerts: "0",
      upcomingEarnings: "0",
    },
    empty: true,
    emptyMessage: message,
    fromCache: false,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function averageFromSnapshots(
  symbols: readonly string[],
  snapshots: Record<string, WatchlistItemSnapshot> | null | undefined,
  pick: (snap: WatchlistItemSnapshot) => number | null | undefined
): number {
  if (!snapshots || symbols.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const symbol of symbols) {
    const snap = snapshots[symbol.toUpperCase()];
    if (!snap) continue;
    const value = pick(snap);
    if (value == null || !Number.isFinite(value)) continue;
    sum += value;
    count += 1;
  }
  return count === 0 ? 0 : round2(sum / count);
}

function performanceFromSnapshots(
  symbols: readonly string[],
  snapshots: Record<string, WatchlistItemSnapshot> | null | undefined
): number {
  return averageFromSnapshots(snapshots ? symbols : [], snapshots, (s) =>
    safeWatchlistNumber(s.changePercent, 0)
  );
}

function riskFromSnapshots(
  symbols: readonly string[],
  snapshots: Record<string, WatchlistItemSnapshot> | null | undefined
): number {
  const conviction = averageFromSnapshots(snapshots ? symbols : [], snapshots, (s) =>
    safeWatchlistNumber(s.convictionScore, 0)
  );
  const trust = averageFromSnapshots(snapshots ? symbols : [], snapshots, (s) =>
    safeWatchlistNumber(s.trustScore, 0)
  );
  const perf = Math.abs(performanceFromSnapshots(symbols, snapshots));
  const inverseConviction = Math.max(0, 100 - conviction);
  const inverseTrust = Math.max(0, 100 - trust);
  return round2((inverseConviction * 0.4 + inverseTrust * 0.35 + perf * 0.25) / 1);
}

export function computeWatchlistMetrics(
  input: WatchlistMetricsInput
): WatchlistMetricsBundle {
  const started = Date.now();
  const record = input.record;
  if (record.empty || !record.id) {
    return emptyWatchlistMetrics(record.emptyMessage);
  }

  const cacheKey = record.cachedMetricsKey || `metrics:${record.id}`;
  const cached = getCachedWatchlistMetricsKey(record.id);
  if (input.useCache !== false && cached === cacheKey) {
    lastExecutionMs = Date.now() - started;
    const bundle = buildMetricsBundle(record, input, true);
    return { ...bundle, fromCache: true };
  }

  const bundle = buildMetricsBundle(record, input, false);
  cacheWatchlistMetricsKey(record.id, cacheKey, input.now);
  lastExecutionMs = Date.now() - started;
  return bundle;
}

function buildMetricsBundle(
  record: WatchlistMetricsRecord,
  input: WatchlistMetricsInput,
  fromCache: boolean
): WatchlistMetricsBundle {
  const symbols = record.symbols;
  const companies = symbols.length;
  const empty = companies === 0;

  const averageConviction = averageFromSnapshots(
    symbols,
    input.snapshots,
    (s) => s.convictionScore
  );
  const averageTrust = averageFromSnapshots(
    symbols,
    input.snapshots,
    (s) => s.trustScore
  );
  const performance = performanceFromSnapshots(symbols, input.snapshots);
  const risk = riskFromSnapshots(symbols, input.snapshots);
  const alerts = Math.max(0, Math.floor(safeWatchlistNumber(input.alertCount, 0)));
  const upcomingEarnings = Math.max(
    0,
    Math.floor(safeWatchlistNumber(input.upcomingEarnings, 0))
  );

  return {
    watchlistId: record.id,
    companies,
    averageConviction,
    averageTrust,
    risk,
    performance,
    alerts,
    upcomingEarnings,
    labels: {
      companies: empty ? WATCHLIST_EMPTY.noCompanies : String(companies),
      averageConviction: empty ? "—" : `${averageConviction}`,
      averageTrust: empty ? "—" : `${averageTrust}`,
      risk: empty ? "—" : `${risk}`,
      performance: empty ? "—" : `${performance}%`,
      alerts: String(alerts),
      upcomingEarnings: String(upcomingEarnings),
    },
    empty,
    emptyMessage: empty ? WATCHLIST_EMPTY.noCompanies : "",
    fromCache,
  };
}

export function getWatchlistMetricsExecutionMs(): number {
  return lastExecutionMs;
}

export function resetWatchlistMetrics(): void {
  lastExecutionMs = 0;
}

export class WatchlistMetricsTracker {
  compute = computeWatchlistMetrics;
  reset = resetWatchlistMetrics;
  getExecutionMs = getWatchlistMetricsExecutionMs;
}

export function assertWatchlistMetricLabelsSafe(
  metrics: WatchlistMetricsBundle
): boolean {
  return Object.values(metrics.labels).every((label) => {
    const text = safeWatchlistText(label, "");
    return text !== "null" && text !== "undefined" && text !== "NaN";
  });
}
