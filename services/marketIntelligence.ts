/**
 * Application Market Intelligence service — Sprint 11B Integration.
 * Single shared source of truth for Dashboard, Opportunity Engine,
 * Research, Watchlists, Recommendations, and Validation.
 *
 * Session-aware: cache is invalidated when trading session changes.
 */

import {
  getCurrentTradingSessionId,
  isSessionCurrent,
} from "@/lib/market/market-state-manager";
import {
  getInstitutionalMarketContext,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import {
  getMarketRegime,
  type MarketRegime,
} from "@/src/modules/marketRegime";
import {
  getTradingPipelineService,
  runTradingPipeline,
  type TradingPipelineResult,
} from "@/src/modules/tradingPipeline";
import {
  serializeContextRegimeSnapshot,
  serializeMarketContext,
  serializeMarketRegime,
  serializePipelineSnapshot,
} from "@/lib/market-intelligence/serialize";
import type {
  MarketContextView,
  MarketIntelligenceSnapshot,
  MarketRegimeView,
} from "@/lib/market-intelligence/types";

export type { MarketContextView, MarketIntelligenceSnapshot, MarketRegimeView };

export interface MarketIntelligenceOptions {
  /** Force refresh of underlying engines (bypasses service caches). */
  forceRefresh?: boolean;
  /**
   * Prefer full trading pipeline (context → regime → confidence → eligibility).
   * Default true — keeps a single computation shared across consumers.
   */
  usePipeline?: boolean;
}

let snapshotCache: MarketIntelligenceSnapshot | null = null;
let cachedSessionDate: string | null = null;
let snapshotInflight: Promise<MarketIntelligenceSnapshot> | null = null;

function rejectStaleIntelligenceCache(): void {
  if (snapshotCache && !isSessionCurrent(cachedSessionDate)) {
    snapshotCache = null;
    cachedSessionDate = null;
    getTradingPipelineService().clearCache();
  }
}

/**
 * Canonical application snapshot. All UI / API consumers should call this
 * instead of invoking Market Context / Regime engines separately.
 */
export async function getMarketIntelligenceSnapshot(
  options: MarketIntelligenceOptions = {}
): Promise<MarketIntelligenceSnapshot> {
  const forceRefresh = Boolean(options.forceRefresh);
  const usePipeline = options.usePipeline !== false;

  rejectStaleIntelligenceCache();

  if (!forceRefresh && snapshotCache && isSessionCurrent(cachedSessionDate)) {
    return snapshotCache;
  }

  if (snapshotInflight) {
    return snapshotInflight;
  }

  snapshotInflight = (async () => {
    try {
      const sessionDate = getCurrentTradingSessionId();
      if (usePipeline) {
        const pipeline = await runTradingPipeline({ forceRefresh });
        const snapshot = serializePipelineSnapshot(pipeline);
        snapshotCache = snapshot;
        cachedSessionDate = sessionDate;
        return snapshot;
      }

      const [context, regime] = await Promise.all([
        getInstitutionalMarketContext({ forceRefresh }),
        getMarketRegime({ forceRefresh }),
      ]);
      const snapshot = serializeContextRegimeSnapshot(context, regime);
      snapshotCache = snapshot;
      cachedSessionDate = sessionDate;
      return snapshot;
    } catch {
      const context = await getInstitutionalMarketContext({ forceRefresh });
      const regime = await getMarketRegime({ forceRefresh: false });
      const snapshot = serializeContextRegimeSnapshot(context, regime);
      snapshotCache = snapshot;
      cachedSessionDate = getCurrentTradingSessionId();
      return snapshot;
    } finally {
      snapshotInflight = null;
    }
  })();

  return snapshotInflight;
}

/** Context-only view — shares the same snapshot cache when warm. */
export async function getMarketContextView(
  options: MarketIntelligenceOptions = {}
): Promise<MarketContextView> {
  rejectStaleIntelligenceCache();
  if (!options.forceRefresh && snapshotCache) {
    return snapshotCache.context;
  }
  const snapshot = await getMarketIntelligenceSnapshot(options);
  return snapshot.context;
}

/** Regime-only view — shares the same snapshot cache when warm. */
export async function getMarketRegimeView(
  options: MarketIntelligenceOptions = {}
): Promise<MarketRegimeView> {
  rejectStaleIntelligenceCache();
  if (!options.forceRefresh && snapshotCache) {
    return snapshotCache.regime;
  }
  const snapshot = await getMarketIntelligenceSnapshot(options);
  return snapshot.regime;
}

/** Synchronous peek — null before first refresh or when session stale. */
export function getCachedMarketIntelligenceSnapshot(): MarketIntelligenceSnapshot | null {
  rejectStaleIntelligenceCache();
  return snapshotCache;
}

export function clearMarketIntelligenceCache(): void {
  snapshotCache = null;
  cachedSessionDate = null;
  getTradingPipelineService().clearCache();
}

/** Raw pipeline access for strategy / eligibility consumers. */
export async function getTradingPipelineResult(
  options: MarketIntelligenceOptions = {}
): Promise<TradingPipelineResult> {
  return runTradingPipeline({ forceRefresh: Boolean(options.forceRefresh) });
}

/** Raw institutional context for engine adapters. */
export async function getSharedInstitutionalContext(
  options: MarketIntelligenceOptions = {}
): Promise<InstitutionalMarketContext> {
  return getInstitutionalMarketContext({
    forceRefresh: Boolean(options.forceRefresh),
  });
}

/** Raw regime for engine adapters. */
export async function getSharedMarketRegime(
  options: MarketIntelligenceOptions = {}
): Promise<MarketRegime> {
  return getMarketRegime({ forceRefresh: Boolean(options.forceRefresh) });
}

/** Re-export serializers for specialized adapters. */
export {
  serializeMarketContext,
  serializeMarketRegime,
  serializePipelineSnapshot,
};
