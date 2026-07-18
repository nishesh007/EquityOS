/**
 * Momentum Continuation Metrics — Sprint 11B.3F.
 */

import { round } from "@/lib/engine/utils";
import type { MomentumContinuationTradeSetup } from "./MomentumContinuationTradeTypes";

export interface MomentumContinuationMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  falseContinuations: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyMomentumContinuationMetrics(): MomentumContinuationMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    falseContinuations: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class MomentumContinuationMetrics {
  private snapshot = createEmptyMomentumContinuationMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): MomentumContinuationMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyMomentumContinuationMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: MomentumContinuationTradeSetup;
    executionTimeMs: number;
    falseContinuation?: boolean;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (!valid) this.snapshot.rejectedSignals += 1;

    const falseContinuation =
      input.falseContinuation === true ||
      setup.detection.warnings.some((w) =>
        /false continuation|deep pullback|weak trend|weak adx/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /false continuation|deep pullback|weak trend|weak adx/i.test(w)
      );
    if (falseContinuation) this.snapshot.falseContinuations += 1;

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

let metricsSingleton: MomentumContinuationMetrics | null = null;

export function getMomentumContinuationMetrics(): MomentumContinuationMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new MomentumContinuationMetrics();
  }
  return metricsSingleton;
}

export function resetMomentumContinuationMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
