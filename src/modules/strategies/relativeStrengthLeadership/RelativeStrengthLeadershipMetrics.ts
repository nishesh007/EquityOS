/**
 * Relative Strength Leadership Metrics — Sprint 11B.3O.
 */

import { round } from "@/lib/engine/utils";
import type { RelativeStrengthLeadershipTradeSetup } from "./RelativeStrengthLeadershipTradeTypes";

export interface RelativeStrengthLeadershipMetricsSnapshot {
  signalsGenerated: number;
  leadershipCandidates: number;
  averageRelativeStrength: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  falseLeadershipSignals: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyRelativeStrengthLeadershipMetrics(): RelativeStrengthLeadershipMetricsSnapshot {
  return {
    signalsGenerated: 0,
    leadershipCandidates: 0,
    averageRelativeStrength: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    falseLeadershipSignals: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class RelativeStrengthLeadershipMetrics {
  private snapshot = createEmptyRelativeStrengthLeadershipMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private rsSum = 0;
  private scoredRuns = 0;

  getSnapshot(): RelativeStrengthLeadershipMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyRelativeStrengthLeadershipMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.rsSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: RelativeStrengthLeadershipTradeSetup;
    executionTimeMs: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (
      setup.detection.detected ||
      setup.leadershipPercentile > 0 ||
      setup.relativeStrengthScore > 0
    ) {
      this.snapshot.leadershipCandidates += 1;
    }

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;

    if (
      !valid &&
      (setup.warnings.some((w) =>
        /weak rs|declining rs|false leadership|weak volume|weak breadth|weak sector|news-only|circuit/i.test(
          w
        )
      ) ||
        setup.detection.reasons.some((r) =>
          /weak rs|declining rs|false leadership|weak volume|weak breadth|weak sector/i.test(
            r
          )
        ))
    ) {
      this.snapshot.falseLeadershipSignals += 1;
    }

    this.scoredRuns += 1;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
    this.qualitySum += setup.qualityScore ?? 0;
    this.rrSum += setup.riskReward ?? 0;
    this.rsSum += setup.relativeStrengthScore ?? 0;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageQuality = round(
      this.qualitySum / this.scoredRuns,
      1
    );
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
    this.snapshot.averageRelativeStrength = round(
      this.rsSum / this.scoredRuns,
      1
    );
  }
}

let metricsSingleton: RelativeStrengthLeadershipMetrics | null = null;

export function getRelativeStrengthLeadershipMetrics(): RelativeStrengthLeadershipMetrics {
  if (!metricsSingleton)
    metricsSingleton = new RelativeStrengthLeadershipMetrics();
  return metricsSingleton;
}

export function resetRelativeStrengthLeadershipMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
