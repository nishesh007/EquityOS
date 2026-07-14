/**
 * Readiness evaluator — module health, coverage, config, dependency, and operational checks.
 */

import type { ReleaseConfiguration } from "./ReleaseConfiguration";
import type { ReleaseSourceDefinition } from "./ReleaseRegistry";
import type { ReleaseHealthScore } from "./ReleaseMetrics";

export interface ReadinessDimension {
  key:
    | "module_health"
    | "test_coverage"
    | "configuration_completeness"
    | "dependency_health"
    | "performance_status"
    | "security_status"
    | "compliance_status"
    | "reliability_status"
    | "documentation_status"
    | "operational_readiness";
  score: number;
  passed: boolean;
  details: string;
}

export interface ReadinessEvaluation {
  dimensions: ReadinessDimension[];
  score: ReleaseHealthScore;
  overallPassed: boolean;
  warnings: string[];
  errors: string[];
}

export class ReadinessEvaluator {
  private config: ReleaseConfiguration;

  constructor(config: ReleaseConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ReleaseConfiguration): void {
    this.config = config;
  }

  evaluate(
    sources: ReleaseSourceDefinition[],
    overrides?: Partial<{
      health: number;
      testing: number;
      security: number;
      compliance: number;
      performance: number;
      reliability: number;
      operationalReadiness: number;
      documentation: number;
      configurationCompleteness: number;
      dependencyHealth: number;
    }>
  ): ReadinessEvaluation {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      if (sources.length === 0) {
        warnings.push("No release sources registered");
      }

      const avg = (picker: (s: ReleaseSourceDefinition) => number) =>
        sources.length === 0
          ? 0
          : round2(
              sources.reduce((sum, s) => sum + picker(s) * s.weight, 0) /
                Math.max(
                  1,
                  sources.reduce((sum, s) => sum + s.weight, 0)
                )
            );

      const health = overrides?.health ?? avg((s) => s.healthScore);
      const testing = overrides?.testing ?? avg((s) => s.testCoverage);
      const security = overrides?.security ?? avg((s) => s.securityScore);
      const compliance = overrides?.compliance ?? avg((s) => s.complianceScore);
      const performance =
        overrides?.performance ?? avg((s) => s.performanceScore);
      const reliability =
        overrides?.reliability ?? avg((s) => s.reliabilityScore);
      const documentation =
        overrides?.documentation ?? avg((s) => s.documentationScore);
      const configurationCompleteness =
        overrides?.configurationCompleteness ??
        clamp(round2((testing + documentation) / 2 + 5), 0, 100);
      const dependencyHealth =
        overrides?.dependencyHealth ??
        clamp(round2((health + reliability) / 2), 0, 100);
      const operationalReadiness =
        overrides?.operationalReadiness ??
        clamp(
          round2(
            (health + reliability + documentation + configurationCompleteness) /
              4
          ),
          0,
          100
        );

      const w = this.config.scoreWeights;
      const overall = clamp(
        Math.round(
          health * w.health +
            testing * w.testing +
            security * w.security +
            compliance * w.compliance +
            performance * w.performance +
            reliability * w.reliability +
            operationalReadiness * w.operationalReadiness
        ),
        0,
        100
      );

      const threshold =
        this.config.mode === "strict" || this.config.mode === "institutional"
          ? this.config.riskThresholds.conditionalBelowScore
          : this.config.riskThresholds.blockBelowScore;

      const dimensions: ReadinessDimension[] = [
        dim("module_health", health, threshold, "Module health aggregate"),
        dim("test_coverage", testing, threshold, "Test coverage aggregate"),
        dim(
          "configuration_completeness",
          configurationCompleteness,
          threshold,
          "Configuration completeness"
        ),
        dim(
          "dependency_health",
          dependencyHealth,
          threshold,
          "Dependency health"
        ),
        dim(
          "performance_status",
          performance,
          threshold,
          "Performance status"
        ),
        dim("security_status", security, threshold, "Security status"),
        dim("compliance_status", compliance, threshold, "Compliance status"),
        dim(
          "reliability_status",
          reliability,
          threshold,
          "Reliability status"
        ),
        dim(
          "documentation_status",
          documentation,
          threshold,
          "Documentation status"
        ),
        dim(
          "operational_readiness",
          operationalReadiness,
          threshold,
          "Operational readiness"
        ),
      ];

      for (const d of dimensions.filter((x) => !x.passed)) {
        warnings.push(`${d.key} below readiness threshold (${d.score})`);
      }

      return {
        dimensions,
        score: {
          health: round2(health),
          testing: round2(testing),
          security: round2(security),
          compliance: round2(compliance),
          performance: round2(performance),
          reliability: round2(reliability),
          operationalReadiness: round2(operationalReadiness),
          overall,
        },
        overallPassed: overall >= threshold,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`readiness evaluation failed: ${String(err)}`);
      return {
        dimensions: [],
        score: zeroScore(),
        overallPassed: false,
        warnings,
        errors,
      };
    }
  }
}

function dim(
  key: ReadinessDimension["key"],
  score: number,
  threshold: number,
  details: string
): ReadinessDimension {
  return {
    key,
    score: round2(score),
    passed: score >= threshold,
    details,
  };
}

function zeroScore(): ReleaseHealthScore {
  return {
    health: 0,
    testing: 0,
    security: 0,
    compliance: 0,
    performance: 0,
    reliability: 0,
    operationalReadiness: 0,
    overall: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
