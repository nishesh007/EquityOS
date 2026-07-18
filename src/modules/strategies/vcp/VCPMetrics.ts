/**
 * VCP Metrics — Sprint 11B.3L.
 */

import { round } from "@/lib/engine/utils";
import type { VCPTradeSetup } from "./VCPTradeTypes";

export interface VCPMetricsSnapshot {
  signalsGenerated: number;
  rejectedPatterns: number;
  falseBreakouts: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyVCPMetrics(): VCPMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedPatterns: 0,
    falseBreakouts: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class VCPMetrics {
  private snapshot = createEmptyVCPMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): VCPMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyVCPMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: { setup: VCPTradeSetup; executionTimeMs: number }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;
    if (!valid) {
      this.snapshot.rejectedPatterns += 1;
      if (
        setup.warnings.some((w) =>
          /false breakout|weak close|extended breakout|late entry/i.test(w)
        ) ||
        setup.detection.reasons.some((r) =>
          /false breakout|weak close|late entry/i.test(r)
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

let metricsSingleton: VCPMetrics | null = null;

export function getVCPMetrics(): VCPMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new VCPMetrics();
  }
  return metricsSingleton;
}

export function resetVCPMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
