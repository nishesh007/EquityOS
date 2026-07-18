/**
 * Sector Rotation Metrics — Sprint 11B.3J.
 */

import { round } from "@/lib/engine/utils";
import type { SectorRotationTradeSetup } from "./SectorRotationTradeTypes";

export interface SectorRotationMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  sectorRotationSuccessRate: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptySectorRotationMetrics(): SectorRotationMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    sectorRotationSuccessRate: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class SectorRotationMetrics {
  private snapshot = createEmptySectorRotationMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;
  private validSignals = 0;

  getSnapshot(): SectorRotationMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptySectorRotationMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
    this.validSignals = 0;
  }

  record(input: {
    setup: SectorRotationTradeSetup;
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
    } else {
      this.validSignals += 1;
    }

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
    this.snapshot.sectorRotationSuccessRate = round(
      this.snapshot.signalsGenerated > 0
        ? (this.validSignals / this.snapshot.signalsGenerated) * 100
        : 0,
      1
    );
  }
}

let metricsSingleton: SectorRotationMetrics | null = null;

export function getSectorRotationMetrics(): SectorRotationMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new SectorRotationMetrics();
  }
  return metricsSingleton;
}

export function resetSectorRotationMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
