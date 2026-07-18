/**
 * Market Breadth Engine — Sprint 11B.1B.
 * Determines market participation, internal strength, and breadth quality.
 */

import type {
  BreadthAnalysis,
  BreadthConfig,
  BreadthEngineInput,
} from "./MarketContextTypes";
import {
  buildBreadthAnalysis,
  createFallbackBreadthAnalysis,
  resolveBreadthConfig,
} from "./BreadthUtils";

export class BreadthEngine {
  private current: BreadthAnalysis | null = null;
  private previousBreadthPercent: number | null = null;
  private readonly config: BreadthConfig;

  constructor(config?: Partial<BreadthConfig>) {
    this.config = resolveBreadthConfig(config);
  }

  /**
   * Analyze market breadth from normalized inputs.
   * Automatically threads prior breadth % for momentum when available.
   */
  analyze(input: BreadthEngineInput): BreadthAnalysis {
    try {
      const merged: BreadthEngineInput = {
        ...input,
        previousBreadthPercent:
          input.previousBreadthPercent ?? this.previousBreadthPercent,
        config: { ...this.config, ...input.config },
      };
      const analysis = buildBreadthAnalysis(merged);
      this.previousBreadthPercent = analysis.breadthPercent;
      this.current = analysis;
      return analysis;
    } catch {
      const fallback = createFallbackBreadthAnalysis(
        input.asOf ?? new Date(),
        "Breadth analysis failed — neutral fallback applied"
      );
      this.current = fallback;
      return fallback;
    }
  }

  getCurrentAnalysis(): BreadthAnalysis | null {
    return this.current;
  }

  getConfiguration(): BreadthConfig {
    return resolveBreadthConfig(this.config);
  }

  clear(): void {
    this.current = null;
    this.previousBreadthPercent = null;
  }
}

let breadthSingleton: BreadthEngine | null = null;

export function getBreadthEngine(
  config?: Partial<BreadthConfig>
): BreadthEngine {
  if (!breadthSingleton) {
    breadthSingleton = new BreadthEngine(config);
  }
  return breadthSingleton;
}

export function resetBreadthEngine(): void {
  if (breadthSingleton) breadthSingleton.clear();
  breadthSingleton = null;
}
