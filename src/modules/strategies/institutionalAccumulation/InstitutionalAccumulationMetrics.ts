/**
 * Institutional Accumulation Metrics — Sprint 11B.3H.
 */

import { round } from "@/lib/engine/utils";
import type { InstitutionalAccumulationTradeSetup } from "./InstitutionalAccumulationTradeTypes";

export interface InstitutionalAccumulationMetricsSnapshot {
  signalsGenerated: number;
  rejectedSignals: number;
  averageConviction: number;
  averageQuality: number;
  averageRR: number;
  falseAccumulationRejects: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyInstitutionalAccumulationMetrics(): InstitutionalAccumulationMetricsSnapshot {
  return {
    signalsGenerated: 0,
    rejectedSignals: 0,
    averageConviction: 0,
    averageQuality: 0,
    averageRR: 0,
    falseAccumulationRejects: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class InstitutionalAccumulationMetrics {
  private snapshot = createEmptyInstitutionalAccumulationMetrics();
  private convictionSum = 0;
  private rrSum = 0;
  private qualitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): InstitutionalAccumulationMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyInstitutionalAccumulationMetrics();
    this.convictionSum = 0;
    this.rrSum = 0;
    this.qualitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: InstitutionalAccumulationTradeSetup;
    executionTimeMs: number;
    falseAccumulation?: boolean;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.signalsGenerated += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    const valid = setup.entry > 0 && setup.riskReward > 0;
    if (!valid) this.snapshot.rejectedSignals += 1;

    const falseAccumulation =
      input.falseAccumulation === true ||
      setup.detection.warnings.some((w) =>
        /false accumulation|weak volume|distribution|breakdown/i.test(w)
      ) ||
      setup.warnings.some((w) =>
        /false accumulation|weak volume|distribution|breakdown/i.test(w)
      );
    if (falseAccumulation) this.snapshot.falseAccumulationRejects += 1;

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

let metricsSingleton: InstitutionalAccumulationMetrics | null = null;

export function getInstitutionalAccumulationMetrics(): InstitutionalAccumulationMetrics {
  if (!metricsSingleton) {
    metricsSingleton = new InstitutionalAccumulationMetrics();
  }
  return metricsSingleton;
}

export function resetInstitutionalAccumulationMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
