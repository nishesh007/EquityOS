/**
 * Darvas Box Metrics — Sprint 11B.3N.
 */

import { round } from "@/lib/engine/utils";
import type { DarvasBoxTradeSetup } from "./DarvasBoxTradeTypes";

export interface DarvasBoxMetricsSnapshot {
  signalsGenerated: number;
  boxesCreated: number;
  confirmedBreakouts: number;
  falseBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyDarvasBoxMetrics(): DarvasBoxMetricsSnapshot {
  return {
    signalsGenerated: 0,
    boxesCreated: 0,
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

export class DarvasBoxMetrics {
  private snapshot = createEmptyDarvasBoxMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): DarvasBoxMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyDarvasBoxMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: { setup: DarvasBoxTradeSetup; executionTimeMs: number }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.boxDuration > 0 || setup.detection.boxDuration > 0) {
      this.snapshot.boxesCreated += 1;
    }

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;
    if (valid && setup.detection.breakoutConfirmed) {
      this.snapshot.confirmedBreakouts += 1;
    } else if (
      setup.warnings.some((w) =>
        /false breakout|weak close|weak volume|late breakout/i.test(w)
      ) ||
      setup.detection.reasons.some((r) =>
        /false breakout|weak close|weak volume|late breakout/i.test(r)
      )
    ) {
      this.snapshot.falseBreakouts += 1;
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

let metricsSingleton: DarvasBoxMetrics | null = null;

export function getDarvasBoxMetrics(): DarvasBoxMetrics {
  if (!metricsSingleton) metricsSingleton = new DarvasBoxMetrics();
  return metricsSingleton;
}

export function resetDarvasBoxMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
