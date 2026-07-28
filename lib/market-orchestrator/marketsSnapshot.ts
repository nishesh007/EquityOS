/**
 * Canonical Market Snapshot service — single source of truth for
 * Dashboard and Markets Context / Regime / indices / pulse / breadth.
 *
 * Process-level cache + React cache() so both pages share identical
 * intelligence (values + timestamp) within the snapshot TTL.
 *
 * Session gate: snapshot.tradingDate must match current NSE session or
 * MarketStateManager invalidates and rebuilds automatically.
 */

import { cache } from "react";
import {
  getMarketStatus,
  getMarketStatusLabel,
  getTradingDateKey,
} from "@/lib/market/session";
import {
  buildSessionEnvelope,
  ensureSessionAlignment,
  getCurrentTradingSessionId,
  isSessionCurrent,
  markMarketRebuildEnd,
  markMarketRebuildStart,
} from "@/lib/market/market-state-manager";
import type { MarketSnapshot } from "@/lib/market-orchestrator/types";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchMarketIndices } from "@/services/marketData";
import { fetchMarketHeatmap } from "@/services/marketHeatmapData";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { MARKETS_REFRESH_MS_OPEN } from "./marketsRefreshPolicy";
import {
  clearMarketSnapshotCache,
  getProcessMarketSnapshot,
  getProcessMarketSnapshotCachedAtMs,
  getProcessMarketSnapshotInflight,
  setProcessMarketSnapshot,
  setProcessMarketSnapshotInflight,
} from "./marketsSnapshotProcessCache";

export {
  MARKETS_REFRESH_MS_OPEN,
  getMarketsRefreshIntervalMs,
  resolveMarketsRefreshMode,
  type MarketsRefreshMode,
} from "./marketsRefreshPolicy";

export { assertUniformMarketSnapshotTimestamp } from "./marketsSnapshotGuard";
export { clearMarketSnapshotCache } from "./marketsSnapshotProcessCache";

/** Align process cache TTL with Markets open-hours refresh cadence. */
export const MARKET_SNAPSHOT_TTL_MS = MARKETS_REFRESH_MS_OPEN;

function isProcessCacheFresh(nowMs = Date.now()): boolean {
  const processSnapshot = getProcessMarketSnapshot();
  if (processSnapshot == null) return false;
  if (nowMs - getProcessMarketSnapshotCachedAtMs() >= MARKET_SNAPSHOT_TTL_MS) {
    return false;
  }
  if (!isSessionCurrent(processSnapshot.tradingDate)) {
    ensureSessionAlignment(processSnapshot.tradingDate);
    clearMarketSnapshotCache();
    return false;
  }
  return true;
}

/**
 * Synchronous peek of the shared process snapshot (null if cold / expired / wrong session).
 */
export function getCachedMarketSnapshot(): MarketSnapshot | null {
  if (!isProcessCacheFresh()) return null;
  return getProcessMarketSnapshot();
}

async function buildMarketSnapshot(
  forceRefresh: boolean
): Promise<MarketSnapshot> {
  markMarketRebuildStart();
  try {
    const [indices, pulse, breadth, heatmap, intelligence] = await Promise.all([
      fetchMarketIndices(),
      fetchMarketPulse(),
      fetchMarketBreadth("nse", { forceRefresh }),
      fetchMarketHeatmap("nse"),
      getMarketIntelligenceSnapshot({ forceRefresh }),
    ]);

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

    const tradingDate = getTradingDateKey(now);

    // Clear inflight BEFORE stamping the session envelope — otherwise every
    // cached snapshot is permanently phase="updating" and the banner never leaves.
    markMarketRebuildEnd();

    return {
      indices,
      pulse,
      intelligence,
      breadth: stampedBreadth,
      heatmap: stampedHeatmap,
      timestamp,
      marketStatus: status,
      marketStatusLabel: getMarketStatusLabel(status),
      tradingDate,
      session: buildSessionEnvelope({
        sessionDate: tradingDate,
        generatedAt: timestamp,
        sourceTimestamp: timestamp,
        now,
      }),
    };
  } catch (error) {
    markMarketRebuildEnd();
    throw error;
  }
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
  let mustRebuild = forceRefresh;
  const processSnapshot = getProcessMarketSnapshot();

  if (!mustRebuild && isProcessCacheFresh(nowMs) && processSnapshot) {
    return processSnapshot;
  }

  if (processSnapshot && !isSessionCurrent(processSnapshot.tradingDate)) {
    ensureSessionAlignment(processSnapshot.tradingDate);
    mustRebuild = true;
  }

  const existingInflight = getProcessMarketSnapshotInflight();
  if (!mustRebuild && existingInflight) {
    return existingInflight;
  }

  const run = (async () => {
    const snapshot = await buildMarketSnapshot(mustRebuild);
    setProcessMarketSnapshot(snapshot, Date.now());
    return snapshot;
  })();

  if (!mustRebuild) {
    setProcessMarketSnapshotInflight(run);
  }

  try {
    return await run;
  } finally {
    if (getProcessMarketSnapshotInflight() === run) {
      setProcessMarketSnapshotInflight(null);
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
