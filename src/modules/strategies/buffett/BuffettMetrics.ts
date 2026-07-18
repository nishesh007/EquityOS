/**
 * Buffett Metrics — Sprint 11B.3U.
 */

import { round } from "@/lib/engine/utils";
import type { BuffettInvestmentSetup } from "./BuffettTypes";

export interface BuffettMetricsSnapshot {
  companiesScreened: number;
  companiesQualified: number;
  averageQuality: number;
  averageConviction: number;
  averageMarginOfSafety: number;
  averageRoe: number;
  averageRoce: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyBuffettMetrics(): BuffettMetricsSnapshot {
  return {
    companiesScreened: 0,
    companiesQualified: 0,
    averageQuality: 0,
    averageConviction: 0,
    averageMarginOfSafety: 0,
    averageRoe: 0,
    averageRoce: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class BuffettMetrics {
  private snapshot = createEmptyBuffettMetrics();
  private qualitySum = 0;
  private convictionSum = 0;
  private mosSum = 0;
  private roeSum = 0;
  private roceSum = 0;
  private scoredRuns = 0;

  getSnapshot(): BuffettMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyBuffettMetrics();
    this.qualitySum = 0;
    this.convictionSum = 0;
    this.mosSum = 0;
    this.roeSum = 0;
    this.roceSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: BuffettInvestmentSetup;
    executionTimeMs: number;
    roe?: number;
    roce?: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.companiesScreened += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (setup.recommendation === "BUY" || setup.recommendation === "HOLD") {
      this.snapshot.companiesQualified += 1;
    }

    this.scoredRuns += 1;
    this.qualitySum += setup.qualityScore ?? 0;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
    this.mosSum += setup.marginOfSafety ?? 0;
    this.roeSum += input.roe ?? 0;
    this.roceSum += input.roce ?? 0;

    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageMarginOfSafety = round(
      this.mosSum / this.scoredRuns,
      4
    );
    this.snapshot.averageRoe = round(this.roeSum / this.scoredRuns, 4);
    this.snapshot.averageRoce = round(this.roceSum / this.scoredRuns, 4);
  }
}

let metricsSingleton: BuffettMetrics | null = null;

export function getBuffettMetrics(): BuffettMetrics {
  if (!metricsSingleton) metricsSingleton = new BuffettMetrics();
  return metricsSingleton;
}

export function resetBuffettMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
