/**
 * Migration executor — dry-run / preview execution model only (no live mutation).
 * Never alters validation decisions or applies automatic rollbacks.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import type { MigrationPlan, RollbackPlan } from "./MigrationPlanner";
import type { MigrationValidationResult } from "./MigrationValidator";

export interface MigrationExecutionResult {
  executionId: string;
  planId: string;
  mode: string;
  executed: boolean;
  dryRun: boolean;
  stepsPreviewed: string[];
  rollbackPreview: string[];
  report: string;
  validation: MigrationValidationResult | null;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

export class MigrationExecutor {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  /**
   * Executes migration in advisory/dry-run mode only.
   * Never mutates live validation configuration or decisions.
   */
  execute(input: {
    plan: MigrationPlan;
    validation?: MigrationValidationResult;
    forceLive?: boolean;
  }): MigrationExecutionResult {
    const started = Date.now();
    const warnings: string[] = [...input.plan.warnings];
    const errors: string[] = [...input.plan.errors];

    try {
      // Hard guarantee: never perform live mutations from this engine.
      if (input.forceLive) {
        warnings.push(
          "Live migration execution is disabled; running dry-run model instead."
        );
      }

      if (input.validation && !input.validation.valid) {
        warnings.push("Executing preview despite validation issues.");
      }

      const stepsPreviewed = input.plan.steps.map(
        (s) => `${s.stepId}: ${s.description}`
      );
      const rollbackPreview = input.plan.rollbackPlan.preview;

      return {
        executionId: `mex:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        planId: input.plan.planId,
        mode: input.plan.mode,
        executed: false,
        dryRun: true,
        stepsPreviewed,
        rollbackPreview,
        report: buildReport(input.plan, input.plan.rollbackPlan),
        validation: input.validation ?? null,
        warnings,
        errors,
        executionTimeMs: Date.now() - started,
      };
    } catch (err) {
      errors.push(`Migration execution model failed: ${String(err)}`);
      return {
        executionId: `mex:error:${Math.random().toString(36).slice(2, 8)}`,
        planId: input.plan.planId,
        mode: input.plan.mode,
        executed: false,
        dryRun: true,
        stepsPreviewed: [],
        rollbackPreview: [],
        report: "Execution failed.",
        validation: input.validation ?? null,
        warnings,
        errors,
        executionTimeMs: Date.now() - started,
      };
    }
  }
}

function buildReport(plan: MigrationPlan, rollback: RollbackPlan): string {
  return [
    `Migration plan ${plan.planId} (${plan.direction}, mode=${plan.mode})`,
    `Steps: ${plan.steps.length}`,
    `Dry-run: true`,
    `Rollback plan: ${rollback.planId} (${rollback.steps.length} steps)`,
    `Note: No automatic rollback execution.`,
  ].join(" | ");
}
