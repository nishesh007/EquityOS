/**
 * Graham Metrics — Sprint 11B.3V.
 */

import { round } from "@/lib/engine/utils";
import type { GrahamInvestmentSetup } from "./GrahamTypes";

export interface GrahamMetricsSnapshot {
  companiesScreened: number;
  qualifiedInvestments: number;
  averageMarginOfSafety: number;
  averageQuality: number;
  averageConviction: number;
  averageCurrentRatio: number;
  averageDebtEquity: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyGrahamMetrics(): GrahamMetricsSnapshot {
  return {
    companiesScreened: 0,
    qualifiedInvestments: 0,
    averageMarginOfSafety: 0,
    averageQuality: 0,
    averageConviction: 0,
    averageCurrentRatio: 0,
    averageDebtEquity: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class GrahamMetrics {
  private snapshot = createEmptyGrahamMetrics();
  private qualitySum = 0;
  private convictionSum = 0;
  private mosSum = 0;
  private currentRatioSum = 0;
  private debtEquitySum = 0;
  private scoredRuns = 0;

  getSnapshot(): GrahamMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyGrahamMetrics();
    this.qualitySum = 0;
    this.convictionSum = 0;
    this.mosSum = 0;
    this.currentRatioSum = 0;
    this.debtEquitySum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: GrahamInvestmentSetup;
    executionTimeMs: number;
    currentRatio?: number;
    debtEquity?: number;
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
    this.mosSum += setup.marginOfSafety ?? 0;
    this.currentRatioSum += input.currentRatio ?? 0;
    this.debtEquitySum += input.debtEquity ?? 0;

    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageMarginOfSafety = round(
      this.mosSum / this.scoredRuns,
      4
    );
    this.snapshot.averageCurrentRatio = round(
      this.currentRatioSum / this.scoredRuns,
      4
    );
    this.snapshot.averageDebtEquity = round(
      this.debtEquitySum / this.scoredRuns,
      4
    );
  }
}

let metricsSingleton: GrahamMetrics | null = null;

export function getGrahamMetrics(): GrahamMetrics {
  if (!metricsSingleton) metricsSingleton = new GrahamMetrics();
  return metricsSingleton;
}

export function resetGrahamMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
