/**
 * Migration engine — orchestrates plan → validate → execute(preview) → score.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import type { VersionRecord } from "./VersionRegistry";
import { MigrationPlanner, type MigrationPlan } from "./MigrationPlanner";
import { MigrationValidator, type MigrationValidationResult } from "./MigrationValidator";
import { MigrationExecutor, type MigrationExecutionResult } from "./MigrationExecutor";
import { CompatibilityChecker, type CompatibilityCheckResult } from "./CompatibilityChecker";
import { VersionComparator } from "./VersionComparator";

export interface VersionHealthScore {
  compatibility: number;
  migrationSafety: number;
  schemaIntegrity: number;
  rollbackReadiness: number;
  configurationStability: number;
  dependencyHealth: number;
  overall: number;
}

export interface MigrationEngineResult {
  plan: MigrationPlan;
  compatibility: CompatibilityCheckResult;
  validation: MigrationValidationResult;
  execution: MigrationExecutionResult;
  healthScore: VersionHealthScore;
}

export class MigrationEngine {
  private planner: MigrationPlanner;
  private validator: MigrationValidator;
  private executor: MigrationExecutor;
  private compatibility: CompatibilityChecker;
  private comparator: VersionComparator;

  constructor(private config: VersionConfiguration) {
    this.planner = new MigrationPlanner(config);
    this.validator = new MigrationValidator(config);
    this.executor = new MigrationExecutor(config);
    this.compatibility = new CompatibilityChecker(config);
    this.comparator = new VersionComparator(config);
  }

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
    this.planner.setConfiguration(config);
    this.validator.setConfiguration(config);
    this.executor.setConfiguration(config);
    this.compatibility.setConfiguration(config);
    this.comparator.setConfiguration(config);
  }

  run(input: {
    from: VersionRecord;
    to: VersionRecord;
    knownRemovedRules?: string[];
    configDrift?: boolean;
    dependencyConflicts?: string[];
  }): MigrationEngineResult {
    const comparison = this.comparator.compareRecords(
      input.from,
      input.to,
      mapKind(input.from.kind)
    );
    const compatibility = this.compatibility.check({
      from: input.from,
      to: input.to,
      comparison,
      knownRemovedRules: input.knownRemovedRules,
      configDrift: input.configDrift,
      dependencyConflicts: input.dependencyConflicts,
    });
    const plan = this.planner.plan({
      from: input.from,
      to: input.to,
      mode: this.config.migrationMode,
    });
    const validation = this.validator.validate({ plan, compatibility });
    // Mark rollback validated flag on a copy for reporting
    plan.rollbackPlan.validated = validation.rollbackValidated;

    const execution = this.executor.execute({ plan, validation });
    const healthScore = computeHealthScore({
      config: this.config,
      compatibility,
      validation,
      plan,
    });

    return { plan, compatibility, validation, execution, healthScore };
  }

  computeHealthScore(input: {
    compatibility: CompatibilityCheckResult;
    validation: MigrationValidationResult;
    plan: MigrationPlan;
  }): VersionHealthScore {
    return computeHealthScore({ config: this.config, ...input });
  }
}

function mapKind(
  kind: string
): "ENGINE" | "CONFIGURATION" | "POLICY" | "SCHEMA" | "MODULE" | "RULE" | "SNAPSHOT" | "MIGRATION_PLAN" {
  switch (kind) {
    case "CONFIGURATION":
      return "CONFIGURATION";
    case "POLICY":
      return "POLICY";
    case "SCHEMA":
      return "SCHEMA";
    case "MODULE":
      return "MODULE";
    case "RULE":
      return "RULE";
    case "MIGRATION":
      return "MIGRATION_PLAN";
    default:
      return "ENGINE";
  }
}

function computeHealthScore(input: {
  config: VersionConfiguration;
  compatibility: CompatibilityCheckResult;
  validation: MigrationValidationResult;
  plan: MigrationPlan;
}): VersionHealthScore {
  const w = input.config.scoreWeights;
  const compatibility = input.compatibility.compatibilityScore;
  const migrationSafety = input.validation.valid
    ? input.plan.steps.every((s) => s.risk !== "HIGH")
      ? 95
      : 70
    : 40;
  const schemaIntegrity = input.validation.schemaCompatibility ? 95 : 45;
  const rollbackReadiness = input.validation.rollbackValidated
    ? Math.min(100, 60 + input.plan.rollbackPlan.steps.length * 8)
    : 30;
  const configurationStability = input.validation.configurationIntegrity
    ? 90
    : 40;
  const dependencyHealth = input.validation.dependencyIntegrity ? 90 : 35;

  const overall =
    compatibility * w.compatibility +
    migrationSafety * w.migrationSafety +
    schemaIntegrity * w.schemaIntegrity +
    rollbackReadiness * w.rollbackReadiness +
    configurationStability * w.configurationStability +
    dependencyHealth * w.dependencyHealth;

  return {
    compatibility: round2(compatibility),
    migrationSafety: round2(migrationSafety),
    schemaIntegrity: round2(schemaIntegrity),
    rollbackReadiness: round2(Math.min(100, rollbackReadiness)),
    configurationStability: round2(configurationStability),
    dependencyHealth: round2(dependencyHealth),
    overall: round2(Math.max(0, Math.min(100, overall))),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
