/**
 * Aggregates read-only observations into validation analytics summaries.
 * Never mutates validation results.
 */

import type { AnalyticsObservation } from "./AnalyticsRegistry";
import { clampScore, average } from "./AnalyticsCalculator";

export interface AnalyticsSummary {
  totalValidations: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalFailures: number;
  averageRuntime: number;
  averageIntegrityScore: number;
  averageTrustScore: number;
  averageHallucinationScore: number;
  historicalScore: number;
  recommendationQuality: number;
  tradeQuality: number;
  generatedAt: string;
  observationCount: number;
}

export class AnalyticsAggregator {
  aggregate(
    observations: AnalyticsObservation[],
    generatedAt: string = new Date().toISOString()
  ): AnalyticsSummary {
    const totalValidations = sum(observations.map((o) => o.validationCount ?? 0));
    const passed = sum(observations.map((o) => o.passed ?? 0));
    const failed = sum(observations.map((o) => o.failed ?? 0));
    const warnings = sum(observations.map((o) => o.warnings ?? 0));
    const criticalFailures = sum(observations.map((o) => o.critical ?? 0));

    return {
      totalValidations,
      passed,
      failed,
      warnings,
      criticalFailures,
      averageRuntime: clampScore(
        average(
          observations
            .map((o) => o.averageRuntimeMs)
            .filter((v): v is number => typeof v === "number")
        ),
        false
      ),
      averageIntegrityScore: avgScore(observations, "integrityScore"),
      averageTrustScore: avgScore(observations, "trustScore"),
      averageHallucinationScore: avgScore(observations, "hallucinationScore"),
      historicalScore: avgScore(observations, "historicalScore"),
      recommendationQuality: avgScore(observations, "recommendationQuality"),
      tradeQuality: avgScore(observations, "tradeQuality"),
      generatedAt,
      observationCount: observations.length,
    };
  }
}

function avgScore(
  observations: AnalyticsObservation[],
  key: keyof AnalyticsObservation
): number {
  const values = observations
    .map((o) => o[key])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return clampScore(average(values));
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
