/**
 * ORB Metrics — Sprint 11B.3B.3.
 * Tracks signal throughput, rejects, conviction, RR, quality, timing.
 */

import { round } from "@/lib/engine/utils";
import type { ORBTradeSetup } from "./ORBTradeTypes";

export interface ORBMetricsSnapshot {
  signalsGenerated: number;
  validSignals: number;
  rejectedSignals: number;
  falseBreakoutRejects: number;
  averageConviction: number;
  averageRR: number;
  averageQuality: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyORBMetrics(): ORBMetricsSnapshot {
  return {
    signalsGenerated: 0,
    validSignals: 0,
    rejectedSignals: 0,
    falseBreakoutRejects: 0,
    averageConviction: 0,
    averageRR: 0,
    averageQuality: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class ORBMetrics {
  private snapshot = createEmptyORBMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): ORBMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyORBMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  /**
   * Record one ORB evaluation (detection + optional trade setup).
   */
  record(input: {
    setup: ORBTradeSetup;
    executionTimeMs: number;
    falseBreakout?: boolean;
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

    const falseBreakout =
      input.falseBreakout === true ||
      setup.detection.warnings.some((w) => /false breakout/i.test(w)) ||
      setup.warnings.some((w) => /false breakout/i.test(w));
    if (falseBreakout) {
      this.snapshot.falseBreakoutRejects += 1;
    }

    const conviction = setup.institutionalScore?.conviction ?? 0;
    const quality = setup.qualityScore ?? 0;
    const rr = setup.riskReward ?? 0;

    this.scoredRuns += 1;
    this.convictionSum += conviction;
    this.qualitySum += quality;
    this.rrSum += rr;

    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageRR = round(this.rrSum / this.scoredRuns, 2);
  }
}

let metricsSingleton: ORBMetrics | null = null;

export function getORBMetrics(): ORBMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new ORBMetrics();
  }
  return metricsSingleton;
}

export function resetORBMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
