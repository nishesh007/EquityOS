/**
 * Cup & Handle Metrics — Sprint 11B.3Q.
 */

import { round } from "@/lib/engine/utils";
import type { CupHandleTradeSetup } from "./CupHandleTradeTypes";

export interface CupHandleMetricsSnapshot {
  signalsGenerated: number;
  validCupPatterns: number;
  rejectedPatterns: number;
  confirmedBreakouts: number;
  falseBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyCupHandleMetrics(): CupHandleMetricsSnapshot {
  return {
    signalsGenerated: 0,
    validCupPatterns: 0,
    rejectedPatterns: 0,
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

export class CupHandleMetrics {
  private snapshot = createEmptyCupHandleMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): CupHandleMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyCupHandleMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: { setup: CupHandleTradeSetup; executionTimeMs: number }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.detection.cupDuration > 0 || setup.cupDuration > 0) {
      this.snapshot.validCupPatterns += 1;
    }

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;

    if (valid && setup.detection.breakoutConfirmed) {
      this.snapshot.confirmedBreakouts += 1;
    } else {
      this.snapshot.rejectedPatterns += 1;
      if (
        setup.warnings.some((w) =>
          /false breakout|weak volume|late breakout|v-shaped|deep handle/i.test(
            w
          )
        ) ||
        setup.detection.reasons.some((r) =>
          /false breakout|weak volume|late breakout|v-shaped|deep handle/i.test(
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

let metricsSingleton: CupHandleMetrics | null = null;

export function getCupHandleMetrics(): CupHandleMetrics {
  if (!metricsSingleton) metricsSingleton = new CupHandleMetrics();
  return metricsSingleton;
}

export function resetCupHandleMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
