/**
 * Peter Lynch Metrics — Sprint 11B.3W.
 */

import { round } from "@/lib/engine/utils";
import type { PeterLynchInvestmentSetup } from "./PeterLynchTypes";

export interface PeterLynchMetricsSnapshot {
  companiesScreened: number;
  qualifiedInvestments: number;
  averagePeg: number;
  averageGrowthRate: number;
  averageRevenueCagr: number;
  averageEpsCagr: number;
  averageQuality: number;
  averageConviction: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyPeterLynchMetrics(): PeterLynchMetricsSnapshot {
  return {
    companiesScreened: 0,
    qualifiedInvestments: 0,
    averagePeg: 0,
    averageGrowthRate: 0,
    averageRevenueCagr: 0,
    averageEpsCagr: 0,
    averageQuality: 0,
    averageConviction: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class PeterLynchMetrics {
  private snapshot = createEmptyPeterLynchMetrics();
  private qualitySum = 0;
  private convictionSum = 0;
  private pegSum = 0;
  private growthSum = 0;
  private revenueCagrSum = 0;
  private epsCagrSum = 0;
  private scoredRuns = 0;

  getSnapshot(): PeterLynchMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyPeterLynchMetrics();
    this.qualitySum = 0;
    this.convictionSum = 0;
    this.pegSum = 0;
    this.growthSum = 0;
    this.revenueCagrSum = 0;
    this.epsCagrSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: PeterLynchInvestmentSetup;
    executionTimeMs: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.companiesScreened += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.recommendation === "BUY" || setup.recommendation === "WATCH") {
      this.snapshot.qualifiedInvestments += 1;
    }

    this.scoredRuns += 1;
    this.qualitySum += setup.qualityScore ?? 0;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
    this.pegSum += setup.pegRatio ?? 0;
    this.growthSum += setup.growthRate ?? 0;
    this.revenueCagrSum += setup.revenueCagr ?? 0;
    this.epsCagrSum += setup.epsCagr ?? 0;

    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averagePeg = round(this.pegSum / this.scoredRuns, 4);
    this.snapshot.averageGrowthRate = round(
      this.growthSum / this.scoredRuns,
      4
    );
    this.snapshot.averageRevenueCagr = round(
      this.revenueCagrSum / this.scoredRuns,
      4
    );
    this.snapshot.averageEpsCagr = round(
      this.epsCagrSum / this.scoredRuns,
      4
    );
  }
}

let metricsSingleton: PeterLynchMetrics | null = null;

export function getPeterLynchMetrics(): PeterLynchMetrics {
  if (!metricsSingleton) metricsSingleton = new PeterLynchMetrics();
  return metricsSingleton;
}

export function resetPeterLynchMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
