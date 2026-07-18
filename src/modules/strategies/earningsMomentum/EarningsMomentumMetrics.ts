/**
 * Earnings Momentum Metrics — Sprint 11B.3T.
 */

import { round } from "@/lib/engine/utils";
import type { EarningsMomentumTradeSetup } from "./EarningsMomentumTradeTypes";

export interface EarningsMomentumMetricsSnapshot {
  signalsGenerated: number;
  positiveEarningsSignals: number;
  negativeEarningsSignals: number;
  rejectedSignals: number;
  averageEpsSurprise: number;
  averageRevenueSurprise: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyEarningsMomentumMetrics(): EarningsMomentumMetricsSnapshot {
  return {
    signalsGenerated: 0,
    positiveEarningsSignals: 0,
    negativeEarningsSignals: 0,
    rejectedSignals: 0,
    averageEpsSurprise: 0,
    averageRevenueSurprise: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class EarningsMomentumMetrics {
  private snapshot = createEmptyEarningsMomentumMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private epsSurpriseSum = 0;
  private revenueSurpriseSum = 0;
  private scoredRuns = 0;
  private surpriseRuns = 0;

  getSnapshot(): EarningsMomentumMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyEarningsMomentumMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.epsSurpriseSum = 0;
    this.revenueSurpriseSum = 0;
    this.scoredRuns = 0;
    this.surpriseRuns = 0;
  }

  record(input: {
    setup: EarningsMomentumTradeSetup;
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

    if (valid && setup.detection.direction === "BUY") {
      this.snapshot.positiveEarningsSignals += 1;
    } else if (valid && setup.detection.direction === "SELL") {
      this.snapshot.negativeEarningsSignals += 1;
    } else {
      this.snapshot.rejectedSignals += 1;
    }

    this.scoredRuns += 1;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
    this.qualitySum += setup.qualityScore ?? 0;
    this.rrSum += setup.riskReward ?? 0;

    this.surpriseRuns += 1;
    this.epsSurpriseSum += setup.epsSurprise ?? setup.detection.epsSurprise ?? 0;
    this.revenueSurpriseSum +=
      setup.revenueSurprise ?? setup.detection.revenueSurprise ?? 0;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageQuality = round(
      this.qualitySum / this.scoredRuns,
      1
    );
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
    this.snapshot.averageEpsSurprise = round(
      this.epsSurpriseSum / this.surpriseRuns,
      4
    );
    this.snapshot.averageRevenueSurprise = round(
      this.revenueSurpriseSum / this.surpriseRuns,
      4
    );
  }
}

let metricsSingleton: EarningsMomentumMetrics | null = null;

export function getEarningsMomentumMetrics(): EarningsMomentumMetrics {
  if (!metricsSingleton) metricsSingleton = new EarningsMomentumMetrics();
  return metricsSingleton;
}

export function resetEarningsMomentumMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
