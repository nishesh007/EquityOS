/**
 * Volatility Engine — Sprint 11B.1C.
 * Multi-factor institutional India VIX & market volatility analysis.
 */

import type {
  VolatilityAnalysis,
  VolatilityConfig,
  VolatilityEngineInput,
} from "./MarketContextTypes";
import {
  buildVolatilityAnalysis,
  createFallbackVolatilityAnalysis,
  resolveVolatilityConfig,
} from "./VolatilityUtils";

export class VolatilityEngine {
  private current: VolatilityAnalysis | null = null;
  private previousIndiaVix: number | null = null;
  private readonly config: VolatilityConfig;

  constructor(config?: Partial<VolatilityConfig>) {
    this.config = resolveVolatilityConfig(config);
  }

  /**
   * Analyze market volatility from normalized multi-factor inputs.
   * Threads prior India VIX for momentum when not supplied by the caller.
   */
  analyze(input: VolatilityEngineInput): VolatilityAnalysis {
    try {
      const merged: VolatilityEngineInput = {
        ...input,
        previousIndiaVix:
          input.previousIndiaVix ?? this.previousIndiaVix,
        config: { ...this.config, ...input.config },
      };
      const analysis = buildVolatilityAnalysis(merged);
      if (analysis.indiaVix > 0) {
        this.previousIndiaVix = analysis.indiaVix;
      }
      this.current = analysis;
      return analysis;
    } catch {
      const fallback = createFallbackVolatilityAnalysis(
        input.asOf ?? new Date(),
        "Volatility analysis failed — neutral fallback applied"
      );
      this.current = fallback;
      return fallback;
    }
  }

  getCurrentAnalysis(): VolatilityAnalysis | null {
    return this.current;
  }

  getConfiguration(): VolatilityConfig {
    return resolveVolatilityConfig(this.config);
  }

  clear(): void {
    this.current = null;
    this.previousIndiaVix = null;
  }
}

let volatilitySingleton: VolatilityEngine | null = null;

export function getVolatilityEngine(
  config?: Partial<VolatilityConfig>
): VolatilityEngine {
  if (!volatilitySingleton) {
    volatilitySingleton = new VolatilityEngine(config);
  }
  return volatilitySingleton;
}

export function resetVolatilityEngine(): void {
  if (volatilitySingleton) volatilitySingleton.clear();
  volatilitySingleton = null;
}
