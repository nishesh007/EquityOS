/**
 * Canonical Market Snapshot service — single source of truth for
 * Dashboard and Markets Context / Regime / indices / pulse / breadth.
 *
 * Process-level cache + React cache() so both pages share identical
 * intelligence (values + timestamp) within the snapshot TTL.
 */

import { cache } from "react";
import {
  getMarketStatus,
  getMarketStatusLabel,
  getTradingDateKey,
} from "@/lib/market/session";
import type { MarketSnapshot } from "@/lib/market-orchestrator/types";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchMarketIndices } from "@/services/marketData";
import { fetchMarketHeatmap } from "@/services/marketHeatmapData";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { MARKETS_REFRESH_MS_OPEN } from "./marketsRefreshPolicy";

export {
  MARKETS_REFRESH_MS_OPEN,
  getMarketsRefreshIntervalMs,
  resolveMarketsRefreshMode,
  type MarketsRefreshMode,
} from "./marketsRefreshPolicy";

export { assertUniformMarketSnapshotTimestamp } from "./marketsSnapshotGuard";

/** Align process cache TTL with Markets open-hours refresh cadence. */
export const MARKET_SNAPSHOT_TTL_MS = MARKETS_REFRESH_MS_OPEN;

let processSnapshot: MarketSnapshot | null = null;
let processCachedAtMs = 0;
let processInflight: Promise<MarketSnapshot> | null = null;

function isProcessCacheFresh(nowMs = Date.now()): boolean {
  return (
    processSnapshot != null &&
    nowMs - processCachedAtMs < MARKET_SNAPSHOT_TTL_MS
  );
}

/**
 * Synchronous peek of the shared process snapshot (null if cold / expired).
 */
export function getCachedMarketSnapshot(): MarketSnapshot | null {
  if (!isProcessCacheFresh()) return null;
  return processSnapshot;
}

export function clearMarketSnapshotCache(): void {
  processSnapshot = null;
  processCachedAtMs = 0;
  processInflight = null;
}

async function buildMarketSnapshot(
  forceRefresh: boolean
): Promise<MarketSnapshot> {
  const [indices, pulse, breadth, heatmap, intelligence] = await Promise.all([
    fetchMarketIndices(),
    fetchMarketPulse(),
    fetchMarketBreadth("nse", { forceRefresh }),
    fetchMarketHeatmap("nse"),
    getMarketIntelligenceSnapshot({ forceRefresh }),
  ]);

  // Canonical as-of = intelligence engine timestamp (shared across pages).
  const timestamp = intelligence.timestamp;
  const now = new Date();
  const status = getMarketStatus(now);

  const stampedBreadth = {
    ...breadth,
    lastUpdated: timestamp,
    marketStatus: status,
    marketStatusLabel: getMarketStatusLabel(status),
  };
  const stampedHeatmap = heatmap
    ? { ...heatmap, lastUpdated: timestamp }
    : null;

  // Do not overwrite context/regime timestamps — they already equal intelligence.timestamp.
  return {
    indices,
    pulse,
    intelligence,
    breadth: stampedBreadth,
    heatmap: stampedHeatmap,
    timestamp,
    marketStatus: status,
    marketStatusLabel: getMarketStatusLabel(status),
    tradingDate: getTradingDateKey(now),
  };
}

/**
 * Uncached / forceable loader — also populates the process cache.
 * Prefer `loadMarketSnapshot()` for RSC; use this from API with forceRefresh.
 */
export async function loadMarketSnapshotUncached(
  options: { forceRefresh?: boolean } = {}
): Promise<MarketSnapshot> {
  const forceRefresh = Boolean(options.forceRefresh);
  const nowMs = Date.now();

  if (!forceRefresh && isProcessCacheFresh(nowMs) && processSnapshot) {
    return processSnapshot;
  }

  if (!forceRefresh && processInflight) {
    return processInflight;
  }

  const run = (async () => {
    const snapshot = await buildMarketSnapshot(forceRefresh);
    processSnapshot = snapshot;
    processCachedAtMs = Date.now();
    return snapshot;
  })();

  if (!forceRefresh) {
    processInflight = run;
  }

  try {
    return await run;
  } finally {
    if (processInflight === run) {
      processInflight = null;
    }
  }
}

/**
 * Canonical Market Snapshot — React cache() per request + process TTL cache
 * shared by Dashboard and Markets.
 */
export const loadMarketSnapshot = cache(async function loadMarketSnapshot(): Promise<MarketSnapshot> {
  return loadMarketSnapshotUncached({ forceRefresh: false });
});

/** @deprecated Prefer loadMarketSnapshot. */
export const loadInstitutionalMarketSnapshot = loadMarketSnapshot;
