/**
 * Strategy Eligibility Service — Sprint 11B.2C.
 * Consumes InstitutionalMarketContext + MarketRegime only.
 * No duplicate market-data fetching or strategy signal generation.
 */

import {
  getInstitutionalMarketContext,
  type InstitutionalMarketContext,
} from "@/src/modules/marketContext";
import {
  getMarketRegime,
  type MarketRegime,
} from "@/src/modules/marketRegime";
import { getStrategyEligibilityEngine } from "./StrategyEligibilityEngine";
import type {
  EligibleStrategy,
  StrategyEligibilityListener,
  StrategyEligibilityServiceOptions,
  StrategyEligibilitySnapshot,
} from "./StrategyEligibilityTypes";
import { createFallbackEligibilitySnapshot } from "./StrategyEligibilityUtils";

export class StrategyEligibilityService {
  private readonly listeners = new Set<StrategyEligibilityListener>();
  private cache: StrategyEligibilitySnapshot | null = null;
  private lastContext: InstitutionalMarketContext | null = null;
  private lastRegime: MarketRegime | null = null;
  private inflight: Promise<StrategyEligibilitySnapshot> | null = null;

  /**
   * Returns eligible strategies from cache or a fresh evaluation.
   */
  async getEligibleStrategies(
    options: StrategyEligibilityServiceOptions = {}
  ): Promise<EligibleStrategy[]> {
    const snapshot = await this.getSnapshot(options);
    return snapshot.eligible;
  }

  async getSnapshot(
    options: StrategyEligibilityServiceOptions = {}
  ): Promise<StrategyEligibilitySnapshot> {
    if (!options.forceRefresh && this.cache) {
      return this.cache;
    }
    return this.refreshEligibility();
  }

  /**
   * Force-refresh: load context + regime, then evaluate the matrix.
   */
  async refreshEligibility(): Promise<StrategyEligibilitySnapshot> {
    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = this.computeFresh().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Subscribe to eligibility updates. Returns unsubscribe function.
   */
  subscribe(listener: StrategyEligibilityListener): () => void {
    this.listeners.add(listener);
    if (this.cache) {
      listener(this.cache);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCachedSnapshot(): StrategyEligibilitySnapshot | null {
    return this.cache;
  }

  clearCache(): void {
    this.cache = null;
    this.lastContext = null;
    this.lastRegime = null;
  }

  private async computeFresh(): Promise<StrategyEligibilitySnapshot> {
    try {
      const [context, regime] = await Promise.all([
        getInstitutionalMarketContext({ forceRefresh: true }),
        getMarketRegime({ forceRefresh: true }),
      ]);
      this.lastContext = context;
      this.lastRegime = regime;
      const snapshot = getStrategyEligibilityEngine().evaluate(context, regime);
      this.cache = snapshot;
      this.notify(snapshot);
      return snapshot;
    } catch {
      const fallback = createFallbackEligibilitySnapshot(
        new Date(),
        "Strategy eligibility refresh failed — all strategies rejected."
      );
      this.cache = fallback;
      this.lastContext = null;
      this.lastRegime = null;
      getStrategyEligibilityEngine().evaluate(null, null);
      this.notify(fallback);
      return fallback;
    }
  }

  private notify(snapshot: StrategyEligibilitySnapshot): void {
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Listener errors must not break the service.
      }
    }
  }
}

let serviceSingleton: StrategyEligibilityService | null = null;

export function getStrategyEligibilityService(): StrategyEligibilityService {
  if (!serviceSingleton) {
    serviceSingleton = new StrategyEligibilityService();
  }
  return serviceSingleton;
}

export function resetStrategyEligibilityService(): void {
  if (serviceSingleton) serviceSingleton.clearCache();
  serviceSingleton = null;
}

export async function getEligibleStrategies(
  options?: StrategyEligibilityServiceOptions
): Promise<EligibleStrategy[]> {
  return getStrategyEligibilityService().getEligibleStrategies(options);
}

export async function refreshEligibility(): Promise<StrategyEligibilitySnapshot> {
  return getStrategyEligibilityService().refreshEligibility();
}

export function subscribeStrategyEligibility(
  listener: StrategyEligibilityListener
): () => void {
  return getStrategyEligibilityService().subscribe(listener);
}
