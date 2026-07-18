/**
 * VWAP Continuation Metrics — Sprint 11B.3C.3.
 * Tracks signal throughput, rejects, conviction, RR, quality, hold time, timing.
 */

import { round } from "@/lib/engine/utils";
import type { VWAPContinuationTradeSetup } from "./VWAPContinuationTradeTypes";

export const VWAP_CONTINUATION_HOLD_TIME_MINUTES = {
  Scalp: 45,
  Intraday: 240,
} as const;

export interface VWAPContinuationMetricsSnapshot {
  signalsGenerated: number;
  validSignals: number;
  rejectedSignals: number;
  averageConviction: number;
  averageRR: number;
  averageTradeQuality: number;
  averageHoldTime: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyVWAPContinuationMetrics(): VWAPContinuationMetricsSnapshot {
  return {
    signalsGenerated: 0,
    validSignals: 0,
    rejectedSignals: 0,
    averageConviction: 0,
    averageRR: 0,
    averageTradeQuality: 0,
    averageHoldTime: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class VWAPContinuationMetrics {
  private snapshot = createEmptyVWAPContinuationMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private holdTimeSum = 0;
  private scoredRuns = 0;

  getSnapshot(): VWAPContinuationMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyVWAPContinuationMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.holdTimeSum = 0;
    this.scoredRuns = 0;
  }

  /**
   * Record one VWAP Continuation evaluation (detection + optional trade setup).
   */
  record(input: {
    setup: VWAPContinuationTradeSetup;
    executionTimeMs: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (valid) {
      this.snapshot.validSignals += 1;
    } else {
      this.snapshot.rejectedSignals += 1;
    }

    const conviction = setup.institutionalScore?.conviction ?? 0;
    const quality = setup.qualityScore ?? 0;
    const rr = setup.riskReward ?? 0;
    const hold =
      VWAP_CONTINUATION_HOLD_TIME_MINUTES[setup.positionType] ??
      VWAP_CONTINUATION_HOLD_TIME_MINUTES.Intraday;

    this.scoredRuns += 1;
    this.convictionSum += conviction;
    this.qualitySum += quality;
    this.rrSum += rr;
    this.holdTimeSum += valid ? hold : 0;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageTradeQuality = round(
      this.qualitySum / this.scoredRuns,
      1
    );
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
    this.snapshot.averageHoldTime = round(
      this.holdTimeSum / Math.max(this.snapshot.validSignals, 1),
      1
    );
  }
}

let metricsSingleton: VWAPContinuationMetrics | null = null;

export function getVWAPContinuationMetrics(): VWAPContinuationMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new VWAPContinuationMetrics();
  }
  return metricsSingleton;
}

export function resetVWAPContinuationMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
