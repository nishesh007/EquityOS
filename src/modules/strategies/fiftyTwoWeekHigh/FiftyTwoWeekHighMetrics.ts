/**
 * 52-Week High Metrics — Sprint 11B.3S.
 */

import { round } from "@/lib/engine/utils";
import type { FiftyTwoWeekHighTradeSetup } from "./FiftyTwoWeekHighTradeTypes";

export interface FiftyTwoWeekHighMetricsSnapshot {
  signalsGenerated: number;
  freshBreakouts: number;
  rejectedBreakouts: number;
  failedBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyFiftyTwoWeekHighMetrics(): FiftyTwoWeekHighMetricsSnapshot {
  return {
    signalsGenerated: 0,
    freshBreakouts: 0,
    rejectedBreakouts: 0,
    failedBreakouts: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class FiftyTwoWeekHighMetrics {
  private snapshot = createEmptyFiftyTwoWeekHighMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): FiftyTwoWeekHighMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyFiftyTwoWeekHighMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: FiftyTwoWeekHighTradeSetup;
    executionTimeMs: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;

    if (valid && setup.detection.breakoutConfirmed) {
      this.snapshot.freshBreakouts += 1;
    } else {
      this.snapshot.rejectedBreakouts += 1;
      if (
        setup.warnings.some((w) =>
          /failed breakout|old breakout|extended|low volume|weak/i.test(w)
        ) ||
        setup.detection.reasons.some((r) =>
          /failed breakout|old breakout|extended|low volume|weak/i.test(r)
        )
      ) {
        this.snapshot.failedBreakouts += 1;
      }
    }

    this.scoredRuns += 1;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
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

let metricsSingleton: FiftyTwoWeekHighMetrics | null = null;

export function getFiftyTwoWeekHighMetrics(): FiftyTwoWeekHighMetrics {
  if (!metricsSingleton) metricsSingleton = new FiftyTwoWeekHighMetrics();
  return metricsSingleton;
}

export function resetFiftyTwoWeekHighMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
