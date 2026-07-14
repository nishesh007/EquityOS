/**
 * Scenario comparator — compares scenario results across score dimensions.
 */

import type { ScenarioRunResult } from "./ScenarioRunner";

export interface ScenarioComparison {
  leftRunId: string;
  rightRunId: string;
  leftScenarioId: string;
  rightScenarioId: string;
  validationScoreDelta: number;
  confidenceScoreDelta: number;
  trustScoreDelta: number;
  performanceScoreDelta: number;
  failureRateDelta: number;
  ruleCoverageDelta: number;
  qualityScore: number;
  regressionDetected: boolean;
  regressionReasons: string[];
  warnings: string[];
  errors: string[];
}

export class ScenarioComparator {
  compare(
    left: ScenarioRunResult,
    right: ScenarioRunResult
  ): ScenarioComparison {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const validationScoreDelta = round2(
        right.validationScore - left.validationScore
      );
      const confidenceScoreDelta = round2(
        right.confidenceScore - left.confidenceScore
      );
      const trustScoreDelta = round2(right.trustScore - left.trustScore);
      const performanceScoreDelta = round2(
        right.performanceScore - left.performanceScore
      );
      const failureRateDelta = round2(right.failureRate - left.failureRate);
      const ruleCoverageDelta = round2(
        right.ruleCoverage - left.ruleCoverage
      );

      const regressionReasons: string[] = [];
      if (validationScoreDelta <= -10) {
        regressionReasons.push(
          `Validation score dropped by ${Math.abs(validationScoreDelta)}.`
        );
      }
      if (confidenceScoreDelta <= -10) {
        regressionReasons.push(
          `Confidence score dropped by ${Math.abs(confidenceScoreDelta)}.`
        );
      }
      if (trustScoreDelta <= -10) {
        regressionReasons.push(
          `Trust score dropped by ${Math.abs(trustScoreDelta)}.`
        );
      }
      if (performanceScoreDelta <= -10) {
        regressionReasons.push(
          `Performance score dropped by ${Math.abs(performanceScoreDelta)}.`
        );
      }
      if (failureRateDelta >= 0.15) {
        regressionReasons.push(
          `Failure rate rose by ${Math.round(failureRateDelta * 100)}%.`
        );
      }
      if (ruleCoverageDelta <= -15) {
        regressionReasons.push(
          `Rule coverage dropped by ${Math.abs(ruleCoverageDelta)}.`
        );
      }

      const dimensions = [
        Math.abs(validationScoreDelta),
        Math.abs(confidenceScoreDelta),
        Math.abs(trustScoreDelta),
        Math.abs(performanceScoreDelta),
        Math.abs(failureRateDelta) * 100,
        Math.abs(ruleCoverageDelta),
      ];
      const avgAbs = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
      const qualityScore = clamp(Math.round(100 - avgAbs * 0.5), 0, 100);

      if (!left.sandboxed || !right.sandboxed) {
        warnings.push("Comparison includes non-sandbox results");
      }

      return {
        leftRunId: left.runId,
        rightRunId: right.runId,
        leftScenarioId: left.scenarioId,
        rightScenarioId: right.scenarioId,
        validationScoreDelta,
        confidenceScoreDelta,
        trustScoreDelta,
        performanceScoreDelta,
        failureRateDelta,
        ruleCoverageDelta,
        qualityScore,
        regressionDetected: regressionReasons.length > 0,
        regressionReasons,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`scenario comparison failed: ${String(err)}`);
      return {
        leftRunId: left.runId,
        rightRunId: right.runId,
        leftScenarioId: left.scenarioId,
        rightScenarioId: right.scenarioId,
        validationScoreDelta: 0,
        confidenceScoreDelta: 0,
        trustScoreDelta: 0,
        performanceScoreDelta: 0,
        failureRateDelta: 0,
        ruleCoverageDelta: 0,
        qualityScore: 0,
        regressionDetected: false,
        regressionReasons: [],
        warnings,
        errors,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
