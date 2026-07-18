/**
 * News Momentum Metrics — Sprint 11B.3K.
 */

import { round } from "@/lib/engine/utils";
import type { NewsMomentumTradeSetup } from "./NewsMomentumTradeTypes";

export interface NewsMomentumMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  falseNewsSignals: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  averageHoldingTime: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyNewsMomentumMetrics(): NewsMomentumMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    falseNewsSignals: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    averageHoldingTime: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

const DEFAULT_HOLDING_MINUTES = 240;

export class NewsMomentumMetrics {
  private snapshot = createEmptyNewsMomentumMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private holdingSum = 0;
  private scoredRuns = 0;
  private validSignals = 0;

  getSnapshot(): NewsMomentumMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyNewsMomentumMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.holdingSum = 0;
    this.scoredRuns = 0;
    this.validSignals = 0;
  }

  record(input: {
    setup: NewsMomentumTradeSetup;
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
    if (!valid) {
      this.snapshot.rejectedSignals += 1;
      if (
        setup.detection.newsQuality === "Ignore" ||
        setup.detection.newsQuality === "Low" ||
        setup.warnings.some((w) => /rumor|duplicate|old news/i.test(w))
      ) {
        this.snapshot.falseNewsSignals += 1;
      }
    } else {
      this.validSignals += 1;
    }

    this.scoredRuns += 1;
    this.convictionSum += setup.institutionalScore?.conviction ?? 0;
    this.qualitySum += setup.qualityScore ?? 0;
    this.rrSum += setup.riskReward ?? 0;
    this.holdingSum += DEFAULT_HOLDING_MINUTES;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageQuality = round(
      this.qualitySum / this.scoredRuns,
      1
    );
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
    this.snapshot.averageHoldingTime = round(
      this.holdingSum / this.scoredRuns,
      1
    );
  }
}

let metricsSingleton: NewsMomentumMetrics | null = null;

export function getNewsMomentumMetrics(): NewsMomentumMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new NewsMomentumMetrics();
  }
  return metricsSingleton;
}

export function resetNewsMomentumMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
