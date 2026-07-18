/**
 * VWAP Mean Reversion Metrics — Sprint 11B.3D.3.
 * Tracks signal throughput, rejects, conviction, RR, quality, hold time, timing.
 */

import { round } from "@/lib/engine/utils";
import type { VWAPMeanReversionTradeSetup } from "./VWAPMeanReversionTradeTypes";

export const VWAP_MEAN_REVERSION_HOLD_TIME_MINUTES = {
  Scalp: 30,
  Intraday: 180,
} as const;

export interface VWAPMeanReversionMetricsSnapshot {
  signalsGenerated: number;
  validSignals: number;
  rejectedSignals: number;
  falseReversionRejects: number;
  averageConviction: number;
  averageRR: number;
  averageTradeQuality: number;
  averageHoldTime: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyVWAPMeanReversionMetrics(): VWAPMeanReversionMetricsSnapshot {
  return {
    signalsGenerated: 0,
    validSignals: 0,
    rejectedSignals: 0,
    falseReversionRejects: 0,
    averageConviction: 0,
    averageRR: 0,
    averageTradeQuality: 0,
    averageHoldTime: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class VWAPMeanReversionMetrics {
  private snapshot = createEmptyVWAPMeanReversionMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private holdTimeSum = 0;
  private scoredRuns = 0;

  getSnapshot(): VWAPMeanReversionMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyVWAPMeanReversionMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.holdTimeSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: VWAPMeanReversionTradeSetup;
    executionTimeMs: number;
    falseReversion?: boolean;
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

    const falseReversion =
      input.falseReversion === true ||
      setup.detection.warnings.some((w) =>
        /strong trend|false reversion|no reversal/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /strong trend|false reversion|no reversal/i.test(w)
      );
    if (falseReversion) {
      this.snapshot.falseReversionRejects += 1;
    }

    const conviction = setup.institutionalScore?.conviction ?? 0;
    const quality = setup.qualityScore ?? 0;
    const rr = setup.riskReward ?? 0;
    const hold =
      VWAP_MEAN_REVERSION_HOLD_TIME_MINUTES[setup.positionType] ??
      VWAP_MEAN_REVERSION_HOLD_TIME_MINUTES.Scalp;

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

let metricsSingleton: VWAPMeanReversionMetrics | null = null;

export function getVWAPMeanReversionMetrics(): VWAPMeanReversionMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new VWAPMeanReversionMetrics();
  }
  return metricsSingleton;
}

export function resetVWAPMeanReversionMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
