/**
 * Magic Formula Metrics — Sprint 11B.3X.
 */

import { round } from "@/lib/engine/utils";
import type { MagicFormulaInvestmentSetup } from "./MagicFormulaTypes";

export interface MagicFormulaMetricsSnapshot {
  companiesScreened: number;
  qualifiedInvestments: number;
  averageMagicFormulaRank: number;
  averageEarningsYield: number;
  averageReturnOnCapital: number;
  averageQuality: number;
  averageConviction: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyMagicFormulaMetrics(): MagicFormulaMetricsSnapshot {
  return {
    companiesScreened: 0,
    qualifiedInvestments: 0,
    averageMagicFormulaRank: 0,
    averageEarningsYield: 0,
    averageReturnOnCapital: 0,
    averageQuality: 0,
    averageConviction: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class MagicFormulaMetrics {
  private snapshot = createEmptyMagicFormulaMetrics();
  private qualitySum = 0;
  private convictionSum = 0;
  private rankSum = 0;
  private eySum = 0;
  private rocSum = 0;
  private scoredRuns = 0;

  getSnapshot(): MagicFormulaMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyMagicFormulaMetrics();
    this.qualitySum = 0;
    this.convictionSum = 0;
    this.rankSum = 0;
    this.eySum = 0;
    this.rocSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: MagicFormulaInvestmentSetup;
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
    this.rankSum += setup.magicFormulaRank ?? 0;
    this.eySum += setup.earningsYield ?? 0;
    this.rocSum += setup.returnOnCapital ?? 0;

    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageMagicFormulaRank = round(
      this.rankSum / this.scoredRuns,
      2
    );
    this.snapshot.averageEarningsYield = round(
      this.eySum / this.scoredRuns,
      6
    );
    this.snapshot.averageReturnOnCapital = round(
      this.rocSum / this.scoredRuns,
      6
    );
  }
}

let metricsSingleton: MagicFormulaMetrics | null = null;

export function getMagicFormulaMetrics(): MagicFormulaMetrics {
  if (!metricsSingleton) metricsSingleton = new MagicFormulaMetrics();
  return metricsSingleton;
}

export function resetMagicFormulaMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
