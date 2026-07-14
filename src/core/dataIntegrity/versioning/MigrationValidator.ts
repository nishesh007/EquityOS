/**
 * Migration validator — integrity and compatibility of planned migrations.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import type { MigrationPlan, RollbackPlan } from "./MigrationPlanner";
import type { CompatibilityCheckResult } from "./CompatibilityChecker";

export interface MigrationValidationResult {
  valid: boolean;
  configurationIntegrity: boolean;
  dependencyIntegrity: boolean;
  schemaCompatibility: boolean;
  policyCompatibility: boolean;
  ruleCompatibility: boolean;
  snapshotCompatibility: boolean;
  backwardCompatibility: boolean;
  rollbackValidated: boolean;
  issues: string[];
  warnings: string[];
  errors: string[];
  validatedAt: string;
}

export class MigrationValidator {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  validate(input: {
    plan: MigrationPlan;
    compatibility?: CompatibilityCheckResult;
  }): MigrationValidationResult {
    const warnings: string[] = [...input.plan.warnings];
    const errors: string[] = [...input.plan.errors];
    const issues: string[] = [];

    try {
      const plan = input.plan;
      const compatibility = input.compatibility;

      const configurationIntegrity = plan.steps.every(
        (s) => s.kind !== "CONFIGURATION" || s.evidence.length > 0
      );
      if (!configurationIntegrity) {
        issues.push("Configuration integrity check failed.");
      }

      const dependencyIntegrity = !plan.steps.some(
        (s) => s.kind === "DEPENDENCY" && s.risk === "HIGH" && !s.reversible
      );
      if (!dependencyIntegrity) {
        issues.push("Dependency integrity at risk.");
      }

      const schemaHighRisk = plan.steps.some(
        (s) => s.kind === "SCHEMA" && s.risk === "HIGH"
      );
      const schemaCritical =
        compatibility?.issues.some(
          (i) => i.code === "SCHEMA_DIFFERENCE" && i.severity === "CRITICAL"
        ) ?? false;
      const finalSchemaCompatibility = !(
        schemaHighRisk &&
        schemaCritical &&
        this.config.compatibilityStrictness === "strict"
      );

      const policyCompatibility = !(
        compatibility?.issues.some((i) => i.code === "POLICY_DIFFERENCE") &&
        this.config.compatibilityStrictness === "strict" &&
        plan.direction === "backward"
      );

      const ruleCompatibility = !(
        compatibility?.issues.some((i) => i.code === "REMOVED_RULE") ?? false
      );

      const snapshotCompatibility = plan.steps.length > 0;
      const backwardCompatibility =
        plan.direction === "forward"
          ? !(compatibility?.issues.some((i) => i.code === "BREAKING_CHANGE") ?? false) ||
            this.config.mode === "relaxed"
          : plan.rollbackPlan.steps.length > 0;

      const rollbackValidated = validateRollback(plan.rollbackPlan);
      if (!rollbackValidated) {
        issues.push("Rollback plan incomplete.");
      }

      if (compatibility && !compatibility.compatible) {
        issues.push("Compatibility check reported incompatible versions.");
        warnings.push(...compatibility.warnings);
      }

      const valid =
        errors.length === 0 &&
        configurationIntegrity &&
        dependencyIntegrity &&
        finalSchemaCompatibility &&
        policyCompatibility &&
        ruleCompatibility &&
        snapshotCompatibility &&
        (backwardCompatibility || plan.dryRun) &&
        (rollbackValidated || !this.config.institutionalMode);

      return {
        valid,
        configurationIntegrity,
        dependencyIntegrity,
        schemaCompatibility: finalSchemaCompatibility,
        policyCompatibility,
        ruleCompatibility,
        snapshotCompatibility,
        backwardCompatibility,
        rollbackValidated,
        issues,
        warnings,
        errors,
        validatedAt: new Date().toISOString(),
      };
    } catch (err) {
      errors.push(`validateMigration failed: ${String(err)}`);
      return {
        valid: false,
        configurationIntegrity: false,
        dependencyIntegrity: false,
        schemaCompatibility: false,
        policyCompatibility: false,
        ruleCompatibility: false,
        snapshotCompatibility: false,
        backwardCompatibility: false,
        rollbackValidated: false,
        issues,
        warnings,
        errors,
        validatedAt: new Date().toISOString(),
      };
    }
  }

  validateRollback(plan: RollbackPlan): MigrationValidationResult {
    const ok = validateRollback(plan);
    return {
      valid: ok,
      configurationIntegrity: ok,
      dependencyIntegrity: ok,
      schemaCompatibility: ok,
      policyCompatibility: ok,
      ruleCompatibility: ok,
      snapshotCompatibility: ok,
      backwardCompatibility: ok,
      rollbackValidated: ok,
      issues: ok ? [] : ["Rollback validation failed."],
      warnings: [],
      errors: [],
      validatedAt: new Date().toISOString(),
    };
  }
}

function validateRollback(plan: RollbackPlan): boolean {
  if (plan.steps.length === 0) return false;
  return plan.steps.every(
    (s) => s.reversible && s.description.length > 0 && s.evidence.length >= 0
  );
}
