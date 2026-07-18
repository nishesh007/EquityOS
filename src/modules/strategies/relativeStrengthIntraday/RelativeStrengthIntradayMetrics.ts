/**
 * Relative Strength Intraday Metrics — Sprint 11B.3G.
 */

import { round } from "@/lib/engine/utils";
import type { RelativeStrengthIntradayTradeSetup } from "./RelativeStrengthIntradayTradeTypes";

export interface RelativeStrengthIntradayMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  falseLeadershipRejects: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyRelativeStrengthIntradayMetrics(): RelativeStrengthIntradayMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    falseLeadershipRejects: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class RelativeStrengthIntradayMetrics {
  private snapshot = createEmptyRelativeStrengthIntradayMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): RelativeStrengthIntradayMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyRelativeStrengthIntradayMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: RelativeStrengthIntradayTradeSetup;
    executionTimeMs: number;
    falseLeadership?: boolean;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (!valid) this.snapshot.rejectedSignals += 1;

    const falseLeadership =
      input.falseLeadership === true ||
      setup.detection.warnings.some((w) =>
        /false leadership|weak rs|relative strength|underperform/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /false leadership|weak rs|relative strength|underperform/i.test(w)
      );
    if (falseLeadership) this.snapshot.falseLeadershipRejects += 1;

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

let metricsSingleton: RelativeStrengthIntradayMetrics | null = null;

export function getRelativeStrengthIntradayMetrics(): RelativeStrengthIntradayMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new RelativeStrengthIntradayMetrics();
  }
  return metricsSingleton;
}

export function resetRelativeStrengthIntradayMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
