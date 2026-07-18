/**
 * Flat Base Metrics — Sprint 11B.3R.
 */

import { round } from "@/lib/engine/utils";
import type { FlatBaseTradeSetup } from "./FlatBaseTradeTypes";

export interface FlatBaseMetricsSnapshot {
  signalsGenerated: number;
  validBases: number;
  rejectedBases: number;
  confirmedBreakouts: number;
  falseBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyFlatBaseMetrics(): FlatBaseMetricsSnapshot {
  return {
    signalsGenerated: 0,
    validBases: 0,
    rejectedBases: 0,
    confirmedBreakouts: 0,
    falseBreakouts: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class FlatBaseMetrics {
  private snapshot = createEmptyFlatBaseMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): FlatBaseMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyFlatBaseMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: { setup: FlatBaseTradeSetup; executionTimeMs: number }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.detection.baseDuration > 0 || setup.baseDuration > 0) {
      this.snapshot.validBases += 1;
    }

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;

    if (valid && setup.detection.breakoutConfirmed) {
      this.snapshot.confirmedBreakouts += 1;
    } else {
      this.snapshot.rejectedBases += 1;
      if (
        setup.warnings.some((w) =>
          /false breakout|weak volume|late breakout|deep base|wide base/i.test(
            w
          )
        ) ||
        setup.detection.reasons.some((r) =>
          /false breakout|weak volume|late breakout|deep base|wide base/i.test(
            r
          )
        )
      ) {
        this.snapshot.falseBreakouts += 1;
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

let metricsSingleton: FlatBaseMetrics | null = null;

export function getFlatBaseMetrics(): FlatBaseMetrics {
  if (!metricsSingleton) metricsSingleton = new FlatBaseMetrics();
  return metricsSingleton;
}

export function resetFlatBaseMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
