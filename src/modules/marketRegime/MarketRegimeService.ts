/**
 * Market Regime Service — Sprint 11B.2A.
 * Consumes InstitutionalMarketContext from Sprint 11B.1D only.
 * No duplicate market-data fetching or recalculation.
 */

import {
  getInstitutionalMarketContext,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import { getMarketRegimeEngine } from "./MarketRegimeEngine";
import type {
  MarketRegime,
  MarketRegimeListener,
  MarketRegimeServiceOptions,
} from "./MarketRegimeTypes";
import { createFallbackMarketRegime } from "./MarketRegimeUtils";

export class MarketRegimeService {
  private readonly listeners = new Set<MarketRegimeListener>();
  private cache: MarketRegime | null = null;
  private inflight: Promise<MarketRegime> | null = null;

  /**
   * Returns the latest market regime, using cache when available.
   */
  async getMarketRegime(
    options: MarketRegimeServiceOptions = {}
  ): Promise<MarketRegime> {
    if (!options.forceRefresh && this.cache) {
      return this.cache;
    }
    return this.refresh();
  }

  /**
   * Force-refresh: load InstitutionalMarketContext then classify.
   */
  async refresh(): Promise<MarketRegime> {
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.computeFreshRegime().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Subscribe to regime updates. Returns unsubscribe function.
   */
  subscribe(listener: MarketRegimeListener): () => void {
    this.listeners.add(listener);
    if (this.cache) {
      listener(this.cache);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCachedRegime(): MarketRegime | null {
    return this.cache;
  }

  clearCache(): void {
    this.cache = null;
  }

  private async computeFreshRegime(): Promise<MarketRegime> {
    try {
      const context: InstitutionalMarketContext =
        await getInstitutionalMarketContext({ forceRefresh: true });
      const regime = getMarketRegimeEngine().classify(context);
      this.cache = regime;
      this.notify(regime);
      return regime;
    } catch {
      const fallback = createFallbackMarketRegime(
        new Date(),
        "Market regime refresh failed — Sideways fallback applied."
      );
      this.cache = fallback;
      getMarketRegimeEngine().classify(null);
      this.notify(fallback);
      return fallback;
    }
  }

  private notify(regime: MarketRegime): void {
    for (const listener of this.listeners) {
      try {
        listener(regime);
      } catch {
        // Listener errors must not break the service.
      }
    }
  }
}

let serviceSingleton: MarketRegimeService | null = null;

export function getMarketRegimeService(): MarketRegimeService {
  if (!serviceSingleton) {
    serviceSingleton = new MarketRegimeService();
  }
  return serviceSingleton;
}

export function resetMarketRegimeService(): void {
  if (serviceSingleton) serviceSingleton.clearCache();
  serviceSingleton = null;
}

export async function getMarketRegime(
  options?: MarketRegimeServiceOptions
): Promise<MarketRegime> {
  return getMarketRegimeService().getMarketRegime(options);
}

export async function refreshMarketRegime(): Promise<MarketRegime> {
  return getMarketRegimeService().refresh();
}

export function subscribeMarketRegime(
  listener: MarketRegimeListener
): () => void {
  return getMarketRegimeService().subscribe(listener);
}
