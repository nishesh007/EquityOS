/**
 * Pattern detector — repeated failures, bottlenecks, drift, instability trends.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { InsightObservation } from "./InsightsRegistry";

export type PatternKind =
  | "REPEATED_FAILURES"
  | "RECURRING_RULE_VIOLATIONS"
  | "EXECUTION_BOTTLENECK"
  | "TRUST_DEGRADATION"
  | "INTEGRITY_DRIFT"
  | "HALLUCINATION_TREND"
  | "HISTORICAL_PERFORMANCE_CHANGE"
  | "VALIDATION_INSTABILITY"
  | "MODULE_HEALTH_TREND"
  | (string & {});

export interface DetectedPattern {
  patternId: string;
  kind: PatternKind;
  title: string;
  description: string;
  module?: string;
  ruleId?: string;
  confidence: number;
  evidence: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export class PatternDetector {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  detect(observations: InsightObservation[]): {
    patterns: DetectedPattern[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const patterns: DetectedPattern[] = [];

    try {
      const byModule = groupBy(observations, (o) => o.module);
      const byRule = groupBy(
        observations.filter((o) => o.ruleId),
        (o) => o.ruleId!
      );

      for (const [module, rows] of byModule) {
        const failures = sum(rows, (r) => r.failures ?? 0);
        const validations = sum(rows, (r) => r.validations ?? 0);
        const failRate =
          validations === 0 ? 0 : failures / Math.max(1, validations);
        if (
          failures >= Math.max(3, this.config.patternSensitivity * 5) &&
          failRate >= this.config.patternSensitivity * 0.2
        ) {
          patterns.push(
            makePattern(
              "REPEATED_FAILURES",
              `Repeated failures in ${module}`,
              `${failures} failures across ${validations || rows.length} validations.`,
              clamp(0.5 + failRate, 0, 1),
              [`module=${module}`, `failures=${failures}`, `failRate=${round2(failRate)}`],
              failRate > 0.4 ? "HIGH" : "MEDIUM",
              module
            )
          );
        }

        const avgRuntime =
          avg(rows.map((r) => r.runtimeMs).filter((n): n is number => n != null)) ??
          0;
        if (avgRuntime >= this.config.runtimeBottleneckMs) {
          patterns.push(
            makePattern(
              "EXECUTION_BOTTLENECK",
              `Execution bottleneck in ${module}`,
              `Average runtime ${round2(avgRuntime)}ms exceeds threshold.`,
              clamp(avgRuntime / (this.config.runtimeBottleneckMs * 2), 0.55, 1),
              [`module=${module}`, `avgRuntimeMs=${round2(avgRuntime)}`],
              avgRuntime >= this.config.runtimeBottleneckMs * 2 ? "HIGH" : "MEDIUM",
              module
            )
          );
        }

        const healthTrend = trend(
          rows.map((r) => r.healthScore).filter((n): n is number => n != null)
        );
        if (healthTrend != null && healthTrend <= -this.config.trustDropThreshold * 0.5) {
          patterns.push(
            makePattern(
              "MODULE_HEALTH_TREND",
              `Declining health trend for ${module}`,
              `Health score trend ${round2(healthTrend)}.`,
              clamp(0.55 + Math.abs(healthTrend) / 50, 0, 1),
              [`module=${module}`, `healthTrend=${round2(healthTrend)}`],
              "MEDIUM",
              module
            )
          );
        }

        const trustTrend = trend(
          rows.map((r) => r.trustScore).filter((n): n is number => n != null)
        );
        if (
          trustTrend != null &&
          trustTrend <= -this.config.trustDropThreshold
        ) {
          patterns.push(
            makePattern(
              "TRUST_DEGRADATION",
              `Trust degradation in ${module}`,
              `Trust score dropped by ${round2(Math.abs(trustTrend))}.`,
              clamp(0.6 + Math.abs(trustTrend) / 40, 0, 1),
              [`module=${module}`, `trustTrend=${round2(trustTrend)}`],
              "HIGH",
              module
            )
          );
        }

        const integrityTrend = trend(
          rows
            .map((r) => r.integrityScore)
            .filter((n): n is number => n != null)
        );
        if (
          integrityTrend != null &&
          integrityTrend <= -this.config.integrityDriftThreshold
        ) {
          patterns.push(
            makePattern(
              "INTEGRITY_DRIFT",
              `Integrity drift in ${module}`,
              `Integrity score drifted by ${round2(Math.abs(integrityTrend))}.`,
              clamp(0.55 + Math.abs(integrityTrend) / 40, 0, 1),
              [`module=${module}`, `integrityTrend=${round2(integrityTrend)}`],
              "HIGH",
              module
            )
          );
        }

        const hallTrend = trend(
          rows
            .map((r) => r.hallucinationScore)
            .filter((n): n is number => n != null)
        );
        if (hallTrend != null && hallTrend <= -8) {
          patterns.push(
            makePattern(
              "HALLUCINATION_TREND",
              `Hallucination trend worsening in ${module}`,
              `Hallucination score trend ${round2(hallTrend)}.`,
              0.7,
              [`module=${module}`, `hallucinationTrend=${round2(hallTrend)}`],
              "HIGH",
              module
            )
          );
        }

        const histTrend = trend(
          rows
            .map((r) => r.historicalScore)
            .filter((n): n is number => n != null)
        );
        if (histTrend != null && Math.abs(histTrend) >= 10) {
          patterns.push(
            makePattern(
              "HISTORICAL_PERFORMANCE_CHANGE",
              `Historical performance change in ${module}`,
              `Historical score changed by ${round2(histTrend)}.`,
              0.65,
              [`module=${module}`, `historicalTrend=${round2(histTrend)}`],
              "MEDIUM",
              module
            )
          );
        }

        const errorRates = rows
          .map((r) => r.errorRate)
          .filter((n): n is number => n != null);
        if (errorRates.length >= 2) {
          const mean = avg(errorRates) ?? 0;
          const peak = Math.max(...errorRates);
          if (peak >= mean * this.config.failureSpikeMultiplier && peak > 10) {
            patterns.push(
              makePattern(
                "VALIDATION_INSTABILITY",
                `Validation instability in ${module}`,
                `Error rate spiked to ${round2(peak)} vs mean ${round2(mean)}.`,
                clamp(0.55 + peak / 100, 0, 1),
                [`module=${module}`, `peakErrorRate=${round2(peak)}`],
                "HIGH",
                module
              )
            );
          }
        }
      }

      for (const [ruleId, rows] of byRule) {
        const failures = sum(rows, (r) => r.failures ?? 0);
        if (failures >= Math.max(2, this.config.patternSensitivity * 4)) {
          patterns.push(
            makePattern(
              "RECURRING_RULE_VIOLATIONS",
              `Recurring violations for rule ${ruleId}`,
              `${failures} failures attributed to rule ${ruleId}.`,
              clamp(0.55 + failures / 20, 0, 1),
              [`ruleId=${ruleId}`, `failures=${failures}`],
              failures >= 10 ? "HIGH" : "MEDIUM",
              rows[0]?.module,
              ruleId
            )
          );
        }
      }

      patterns.sort((a, b) => b.confidence - a.confidence);
      if (patterns.length > this.config.maxPatterns) {
        warnings.push(
          `Truncated patterns to ${this.config.maxPatterns}.`
        );
        return {
          patterns: patterns.slice(0, this.config.maxPatterns),
          warnings,
          errors,
        };
      }
    } catch (err) {
      errors.push(`Pattern detection failed: ${String(err)}`);
    }

    return { patterns, warnings, errors };
  }
}

function makePattern(
  kind: PatternKind,
  title: string,
  description: string,
  confidence: number,
  evidence: string[],
  severity: DetectedPattern["severity"],
  module?: string,
  ruleId?: string
): DetectedPattern {
  return {
    patternId: `pat:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    description,
    module,
    ruleId,
    confidence: round2(confidence),
    evidence,
    severity,
  };
}

function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((s, i) => s + fn(i), 0);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function trend(values: number[]): number | null {
  if (values.length < 2) return null;
  return values[values.length - 1]! - values[0]!;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
