/**
 * Stage Analysis Metrics — Sprint 11B.3M.
 */

import { round } from "@/lib/engine/utils";
import type { StageAnalysisTradeSetup } from "./StageAnalysisTradeTypes";

export interface StageAnalysisMetricsSnapshot {
  signalsGenerated: number;
  stageChanges: number;
  transitionAccuracy: number;
  falseStageSignals: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyStageAnalysisMetrics(): StageAnalysisMetricsSnapshot {
  return {
    signalsGenerated: 0,
    stageChanges: 0,
    transitionAccuracy: 0,
    falseStageSignals: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class StageAnalysisMetrics {
  private snapshot = createEmptyStageAnalysisMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;
  private transitionHits = 0;
  private transitionTotal = 0;

  getSnapshot(): StageAnalysisMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyStageAnalysisMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
    this.transitionHits = 0;
    this.transitionTotal = 0;
  }

  record(input: {
    setup: StageAnalysisTradeSetup;
    executionTimeMs: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.transition !== "none") {
      this.snapshot.stageChanges += 1;
      this.transitionTotal += 1;
      if (setup.transitionConfidence >= 55) {
        this.transitionHits += 1;
      }
      this.snapshot.transitionAccuracy = round(
        (this.transitionHits / Math.max(this.transitionTotal, 1)) * 100,
        1
      );
    }

    const valid =
      setup.entry > 0 &&
      setup.riskReward > 0 &&
      setup.detection.detected === true;
    if (!valid) {
      this.snapshot.falseStageSignals += 1;
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

let metricsSingleton: StageAnalysisMetrics | null = null;

export function getStageAnalysisMetrics(): StageAnalysisMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new StageAnalysisMetrics();
  }
  return metricsSingleton;
}

export function resetStageAnalysisMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
