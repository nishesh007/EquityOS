/**
 * EMA Pullback Metrics — Sprint 11B.3P.
 */

import { round } from "@/lib/engine/utils";
import type { EMAPullbackTradeSetup } from "./EMAPullbackTradeTypes";

export interface EMAPullbackMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  successfulPullbacks: number;
  failedPullbacks: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyEMAPullbackMetrics(): EMAPullbackMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    successfulPullbacks: 0,
    failedPullbacks: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class EMAPullbackMetrics {
  private snapshot = createEmptyEMAPullbackMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): EMAPullbackMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyEMAPullbackMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: { setup: EMAPullbackTradeSetup; executionTimeMs: number }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;

    if (valid) {
      this.snapshot.successfulPullbacks += 1;
    } else {
      this.snapshot.rejectedSignals += 1;
      if (
        setup.warnings.some((w) =>
          /deep|reversal|failed pullback|weak volume|weak breadth|weak sector/i.test(
            w
          )
        ) ||
        setup.detection.reasons.some((r) =>
          /deep|reversal|failed pullback|weak volume|weak breadth|weak sector/i.test(
            r
          )
        )
      ) {
        this.snapshot.failedPullbacks += 1;
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

let metricsSingleton: EMAPullbackMetrics | null = null;

export function getEMAPullbackMetrics(): EMAPullbackMetrics {
  if (!metricsSingleton) metricsSingleton = new EMAPullbackMetrics();
  return metricsSingleton;
}

export function resetEMAPullbackMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
