/**
 * Strategy Eligibility Engine — Sprint 11B.2C.
 * Evaluates the Strategy Matrix against InstitutionalMarketContext + MarketRegime.
 */

import type { InstitutionalMarketContext } from "@/src/modules/marketContext";
import type { MarketRegime } from "@/src/modules/marketRegime";
import type {
  EligibleStrategy,
  StrategyEligibilityConfig,
  StrategyEligibilitySnapshot,
  StrategyProfile,
} from "./StrategyEligibilityTypes";
import { STRATEGY_MATRIX } from "./StrategyMatrix";
import {
  createFallbackEligibilitySnapshot,
  evaluateStrategyMatrix,
  resolveStrategyEligibilityConfig,
} from "./StrategyEligibilityUtils";

export class StrategyEligibilityEngine {
  private current: StrategyEligibilitySnapshot | null = null;
  private readonly config: StrategyEligibilityConfig;
  private readonly profiles: readonly StrategyProfile[];

  constructor(
    config?: Parameters<typeof resolveStrategyEligibilityConfig>[0],
    profiles?: readonly StrategyProfile[]
  ) {
    this.config = resolveStrategyEligibilityConfig(config);
    this.profiles = profiles ?? STRATEGY_MATRIX;
  }

  /**
   * Evaluate eligibility for all registered strategies.
   * Never crashes — returns a full rejection snapshot on failure.
   */
  evaluate(
    context: InstitutionalMarketContext | null | undefined,
    regime: MarketRegime | null | undefined
  ): StrategyEligibilitySnapshot {
    try {
      const snapshot = evaluateStrategyMatrix({
        context: context ?? null,
        regime: regime ?? null,
        profiles: this.profiles,
        config: this.config,
      });
      this.current = snapshot;
      return snapshot;
    } catch {
      const fallback = createFallbackEligibilitySnapshot(
        context?.timestamp ?? new Date(),
        "Strategy eligibility evaluation failed — all strategies rejected."
      );
      this.current = fallback;
      return fallback;
    }
  }

  getEligibleStrategies(): EligibleStrategy[] {
    return this.current?.eligible ?? [];
  }

  getRejectedStrategies(): EligibleStrategy[] {
    return this.current?.rejected ?? [];
  }

  getCurrentSnapshot(): StrategyEligibilitySnapshot | null {
    return this.current;
  }

  getConfiguration(): StrategyEligibilityConfig {
    return resolveStrategyEligibilityConfig(this.config);
  }

  getProfiles(): readonly StrategyProfile[] {
    return this.profiles;
  }

  clear(): void {
    this.current = null;
  }
}

let engineSingleton: StrategyEligibilityEngine | null = null;

export function getStrategyEligibilityEngine(
  config?: Parameters<typeof resolveStrategyEligibilityConfig>[0]
): StrategyEligibilityEngine {
  if (!engineSingleton) {
    engineSingleton = new StrategyEligibilityEngine(config);
  }
  return engineSingleton;
}

export function resetStrategyEligibilityEngine(): void {
  if (engineSingleton) engineSingleton.clear();
  engineSingleton = null;
}
