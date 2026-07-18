/**
 * Quality Compounder Metrics — Sprint 11B.3Y.
 */

import { round } from "@/lib/engine/utils";
import type { QualityCompounderInvestmentSetup } from "./QualityCompounderTypes";

export interface QualityCompounderMetricsSnapshot {
  companiesScreened: number;
  qualifiedCompounders: number;
  averageRoic: number;
  averageRoe: number;
  averageRevenueCagr: number;
  averageEpsCagr: number;
  averageMarginOfSafety: number;
  averageQuality: number;
  averageConviction: number;
  executionTimeMs: number;
  totalRuns: number;
  lastRunAt: Date | null;
}

export function createEmptyQualityCompounderMetrics(): QualityCompounderMetricsSnapshot {
  return {
    companiesScreened: 0,
    qualifiedCompounders: 0,
    averageRoic: 0,
    averageRoe: 0,
    averageRevenueCagr: 0,
    averageEpsCagr: 0,
    averageMarginOfSafety: 0,
    averageQuality: 0,
    averageConviction: 0,
    executionTimeMs: 0,
    totalRuns: 0,
    lastRunAt: null,
  };
}

export class QualityCompounderMetrics {
  private snapshot = createEmptyQualityCompounderMetrics();
  private qualitySum = 0;
  private convictionSum = 0;
  private roicSum = 0;
  private roeSum = 0;
  private revenueCagrSum = 0;
  private epsCagrSum = 0;
  private mosSum = 0;
  private scoredRuns = 0;

  getSnapshot(): QualityCompounderMetricsSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = createEmptyQualityCompounderMetrics();
    this.qualitySum = 0;
    this.convictionSum = 0;
    this.roicSum = 0;
    this.roeSum = 0;
    this.revenueCagrSum = 0;
    this.epsCagrSum = 0;
    this.mosSum = 0;
    this.scoredRuns = 0;
  }

  record(input: {
    setup: QualityCompounderInvestmentSetup;
    executionTimeMs: number;
    roic?: number;
    roe?: number;
    revenueCagr?: number;
    epsCagr?: number;
  }): void {
    const { setup, executionTimeMs } = input;
    this.snapshot.totalRuns += 1;
    this.snapshot.companiesScreened += 1;
    this.snapshot.lastRunAt = new Date();
    this.snapshot.executionTimeMs = round(executionTimeMs, 2);

    if (
      setup.recommendation === "BUY" ||
      setup.recommendation === "HOLD" ||
      setup.recommendation === "WATCH"
    ) {
      this.snapshot.qualifiedCompounders += 1;
    }

    this.scoredRuns += 1;
    this.qualitySum += setup.qualityScore ?? 0;
    this.convictionSum +=
      setup.conviction || setup.institutionalScore?.conviction || 0;
    this.roicSum += input.roic ?? setup.detection.capital.roic ?? 0;
    this.roeSum += input.roe ?? 0;
    this.revenueCagrSum +=
      input.revenueCagr ?? setup.detection.growth.revenueCagr ?? 0;
    this.epsCagrSum += input.epsCagr ?? setup.detection.growth.epsCagr ?? 0;
    this.mosSum += setup.marginOfSafety ?? 0;

    this.snapshot.averageQuality = round(this.qualitySum / this.scoredRuns, 1);
    this.snapshot.averageConviction = round(
      this.convictionSum / this.scoredRuns,
      1
    );
    this.snapshot.averageRoic = round(this.roicSum / this.scoredRuns, 4);
    this.snapshot.averageRoe = round(this.roeSum / this.scoredRuns, 4);
    this.snapshot.averageRevenueCagr = round(
      this.revenueCagrSum / this.scoredRuns,
      4
    );
    this.snapshot.averageEpsCagr = round(
      this.epsCagrSum / this.scoredRuns,
      4
    );
    this.snapshot.averageMarginOfSafety = round(
      this.mosSum / this.scoredRuns,
      4
    );
  }
}

let metricsSingleton: QualityCompounderMetrics | null = null;

export function getQualityCompounderMetrics(): QualityCompounderMetrics {
  if (!metricsSingleton) metricsSingleton = new QualityCompounderMetrics();
  return metricsSingleton;
}

export function resetQualityCompounderMetrics(): void {
  if (metricsSingleton) metricsSingleton.reset();
  metricsSingleton = null;
}
