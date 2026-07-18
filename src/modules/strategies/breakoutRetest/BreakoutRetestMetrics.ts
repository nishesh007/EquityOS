/**
 * Breakout Retest Metrics — Sprint 11B.3I.
 */

import { round } from "@/lib/engine/utils";
import type { BreakoutRetestTradeSetup } from "./BreakoutRetestTradeTypes";

export interface BreakoutRetestMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  falseBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyBreakoutRetestMetrics(): BreakoutRetestMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    falseBreakouts: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class BreakoutRetestMetrics {
  private snapshot = createEmptyBreakoutRetestMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): BreakoutRetestMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyBreakoutRetestMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: BreakoutRetestTradeSetup;
    executionTimeMs: number;
    falseBreakout?: boolean;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (!valid) this.snapshot.rejectedSignals += 1;

    const falseBreakout =
      input.falseBreakout === true ||
      setup.detection.warnings.some((w) =>
        /false breakout|deep retracement|weak confirmation|failed retest/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /false breakout|deep retracement|weak confirmation|failed retest/i.test(w)
      );
    if (falseBreakout) this.snapshot.falseBreakouts += 1;

    this.scoredRuns += 1;
    this.convictionSum += setup.institutionalScore?.conviction ?? 0;
    this.qualitySum += setup.qualityScore ?? 0;
    this.rrSum += setup.riskReward ?? 0;

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

let metricsSingleton: BreakoutRetestMetrics | null = null;

export function getBreakoutRetestMetrics(): BreakoutRetestMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new BreakoutRetestMetrics();
  }
  return metricsSingleton;
}

export function resetBreakoutRetestMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
