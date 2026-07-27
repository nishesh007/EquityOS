/**
 * Dashboard above-fold context — derived from the canonical Market Snapshot.
 * Context / Regime / timestamp are identical to the Markets page.
 */

import { cache } from "react";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  getCachedMarketIntelligenceSnapshot,
} from "@/services/marketIntelligence";
import {
  serializeContextRegimeSnapshot,
  serializePipelineSnapshot,
} from "@/lib/market-intelligence/serialize";
import {
  getMarketContextService,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import {
  getMarketRegimeService,
  type MarketRegime,
} from "@/src/modules/marketRegime";
import {
  createFallbackPipelineResult,
  getTradingPipelineService,
} from "@/src/modules/tradingPipeline";
import type { MarketBreadth, MarketIndex, MarketPulse } from "@/types";
import type { MarketStatus } from "@/lib/market/session";
import { dedupeInFlight } from "./cache";
import {
  getCachedMarketSnapshot,
  loadMarketSnapshot,
} from "./marketsSnapshot";

const DASHBOARD_CONTEXT_KEY = "dashboard-context";

/**
 * Lightweight summary surface for Market Snapshot / Market Pulse / MI strip.
 * Intelligence is always taken from the canonical Market Snapshot.
 */
export interface DashboardContext {
  indices: MarketIndex[];
  pulse: MarketPulse;
  breadth: MarketBreadth;
  intelligence: MarketIntelligenceSnapshot;
  /** Same as Markets page `MarketSnapshot.timestamp`. */
  timestamp: string;
  marketStatus: MarketStatus;
  marketStatusLabel: string;
}

/**
 * Cache-only peek for non-UI consumers (OE filtering) that must not await
 * a full snapshot build. Prefers the canonical process Market Snapshot when warm.
 *
 * UI surfaces (Dashboard strip / Pulse / Markets) must use `loadMarketSnapshot`
 * / `getDashboardContext` instead — never this alone.
 */
export const resolveCachedIntelligence = cache(
  function resolveCachedIntelligence(): MarketIntelligenceSnapshot {
    const fromSnapshot = getCachedMarketSnapshot()?.intelligence;
    if (fromSnapshot) return fromSnapshot;

    const mi = getCachedMarketIntelligenceSnapshot();
    if (mi) return mi;

    const pipeline = getTradingPipelineService().getCachedResult();
    if (pipeline) return serializePipelineSnapshot(pipeline);

    const institutional: InstitutionalMarketContext | null =
      getMarketContextService().getCachedInstitutionalContext();
    const regime: MarketRegime | null =
      getMarketRegimeService().getCachedRegime();
    if (institutional && regime) {
      return serializeContextRegimeSnapshot(institutional, regime);
    }

    return serializePipelineSnapshot(
      createFallbackPipelineResult(
        new Date(),
        "Neutral fallback — canonical Market Snapshot not yet warm."
      )
    );
  }
);

async function loadDashboardContext(): Promise<DashboardContext> {
  const snapshot = await loadMarketSnapshot();
  const intelligence = snapshot.intelligence;
  if (!intelligence) {
    throw new Error(
      "Canonical Market Snapshot missing intelligence — cannot build Dashboard context."
    );
  }

  return {
    indices: snapshot.indices,
    pulse: snapshot.pulse,
    breadth: snapshot.breadth,
    intelligence,
    timestamp: snapshot.timestamp,
    marketStatus: snapshot.marketStatus,
    marketStatusLabel: snapshot.marketStatusLabel,
  };
}

/**
 * Dashboard summary entry — identical Context/Regime/timestamp to Markets.
 */
export const getDashboardContext = cache(
  function getDashboardContext(): Promise<DashboardContext> {
    return dedupeInFlight(DASHBOARD_CONTEXT_KEY, loadDashboardContext);
  }
);
