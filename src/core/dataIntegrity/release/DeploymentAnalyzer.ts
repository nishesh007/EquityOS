/**
 * Deployment analyzer — deployment risk, drift, migration, version, infra readiness.
 */

import type { ReleaseConfiguration } from "./ReleaseConfiguration";
import type { ReleaseHealthScore } from "./ReleaseMetrics";
import type { ChecklistResult } from "./ReleaseChecklist";
import type { RollbackReadinessResult } from "./RollbackReadiness";

export interface DeploymentAnalysis {
  deploymentRisk: number;
  configurationDrift: number;
  migrationReadiness: number;
  versionCompatibility: number;
  operationalRisk: number;
  infrastructureReadiness: number;
  rollbackReadiness: number;
  summary: string;
  warnings: string[];
  errors: string[];
}

export class DeploymentAnalyzer {
  private config: ReleaseConfiguration;

  constructor(config: ReleaseConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ReleaseConfiguration): void {
    this.config = config;
  }

  analyze(input: {
    score: ReleaseHealthScore;
    checklist: ChecklistResult;
    rollback: RollbackReadinessResult;
    configurationDrift?: number;
    migrationReadiness?: number;
    versionCompatibility?: number;
  }): DeploymentAnalysis {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const configurationDrift = clamp(
        input.configurationDrift ??
          round2(100 - input.score.operationalReadiness * 0.4 - input.score.testing * 0.2),
        0,
        100
      );
      const migrationReadiness = clamp(
        input.migrationReadiness ??
          (hasCompleted(input.checklist, "dep-migrate") ? 85 : 45),
        0,
        100
      );
      const versionCompatibility = clamp(
        input.versionCompatibility ??
          (input.rollback.versionCompatible ? 90 : 50),
        0,
        100
      );
      const infrastructureReadiness = clamp(
        hasCompleted(input.checklist, "dep-infra")
          ? round2((input.score.reliability + input.score.performance) / 2)
          : 40,
        0,
        100
      );
      const operationalRisk = clamp(
        round2(
          100 -
            input.score.operationalReadiness * 0.6 -
            input.checklist.completionPct * 0.2
        ),
        0,
        100
      );
      const deploymentRisk = clamp(
        Math.round(
          configurationDrift * 0.25 +
            (100 - migrationReadiness) * 0.2 +
            (100 - versionCompatibility) * 0.15 +
            (100 - infrastructureReadiness) * 0.15 +
            operationalRisk * 0.15 +
            (100 - input.rollback.score) * 0.1
        ),
        0,
        100
      );

      if (deploymentRisk >= this.config.riskThresholds.high) {
        warnings.push("Deployment risk exceeds high threshold");
      }
      if (configurationDrift >= this.config.riskThresholds.medium) {
        warnings.push("Configuration drift elevated");
      }

      const summary = `Deployment risk ${deploymentRisk}/100; migration readiness ${migrationReadiness}; rollback readiness ${input.rollback.score}.`;

      return {
        deploymentRisk,
        configurationDrift,
        migrationReadiness,
        versionCompatibility,
        operationalRisk,
        infrastructureReadiness,
        rollbackReadiness: input.rollback.score,
        summary,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`deployment analysis failed: ${String(err)}`);
      return {
        deploymentRisk: 100,
        configurationDrift: 100,
        migrationReadiness: 0,
        versionCompatibility: 0,
        operationalRisk: 100,
        infrastructureReadiness: 0,
        rollbackReadiness: 0,
        summary: "Deployment analysis unavailable",
        warnings,
        errors,
      };
    }
  }
}

function hasCompleted(checklist: ChecklistResult, itemId: string): boolean {
  return checklist.items.some((i) => i.itemId === itemId && i.completed);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
