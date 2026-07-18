/**
 * Liquidity Sweep Metrics — Sprint 11B.3E.
 */

import { round } from "@/lib/engine/utils";
import type { LiquiditySweepTradeSetup } from "./LiquiditySweepTradeTypes";

export const LIQUIDITY_SWEEP_HOLD_TIME_MINUTES = {
  Scalp: 30,
  Intraday: 180,
} as const;

export interface LiquiditySweepMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  falseSweepRejects: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyLiquiditySweepMetrics(): LiquiditySweepMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    falseSweepRejects: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class LiquiditySweepMetrics {
  private snapshot = createEmptyLiquiditySweepMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): LiquiditySweepMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyLiquiditySweepMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: LiquiditySweepTradeSetup;
    executionTimeMs: number;
    falseSweep?: boolean;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (!valid) {
      this.snapshot.rejectedSignals += 1;
    }

    const falseSweep =
      input.falseSweep === true ||
      setup.detection.warnings.some((w) =>
        /false sweep|trend continuation|weak reversal/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /false sweep|trend continuation|weak reversal/i.test(w)
      );
    if (falseSweep) {
      this.snapshot.falseSweepRejects += 1;
    }

    const conviction = setup.institutionalScore?.conviction ?? 0;
    const quality = setup.qualityScore ?? 0;
    const rr = setup.riskReward ?? 0;

    this.scoredRuns += 1;
    this.convictionSum += conviction;
    this.qualitySum += quality;
    this.rrSum += rr;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageQuality = round(
      this.qualitySum / this.scoredRuns,
      1
    );
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
  }
}

let metricsSingleton: LiquiditySweepMetrics | null = null;

export function getLiquiditySweepMetrics(): LiquiditySweepMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new LiquiditySweepMetrics();
  }
  return metricsSingleton;
}

export function resetLiquiditySweepMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
