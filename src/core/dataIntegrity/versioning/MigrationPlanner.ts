/**
 * Migration planner — forward/backward/incremental/batch plans with rollback outline.
 */

import type { VersionConfiguration, MigrationMode } from "./VersionConfiguration";
import type { VersionRecord } from "./VersionRegistry";
import { compareSemver } from "./VersionManager";

export type MigrationStepKind =
  | "SCHEMA"
  | "CONFIGURATION"
  | "POLICY"
  | "RULE"
  | "MODULE"
  | "DEPENDENCY"
  | "CUSTOM";

export interface MigrationStep {
  stepId: string;
  kind: MigrationStepKind;
  description: string;
  fromVersion: string;
  toVersion: string;
  reversible: boolean;
  risk: "LOW" | "MEDIUM" | "HIGH";
  evidence: string[];
}

export interface RollbackPlan {
  planId: string;
  steps: MigrationStep[];
  validated: boolean;
  preview: string[];
  report: string;
}

export interface MigrationPlan {
  planId: string;
  mode: MigrationMode;
  fromVersionId: string;
  toVersionId: string;
  fromVersion: string;
  toVersion: string;
  direction: "forward" | "backward";
  steps: MigrationStep[];
  rollbackPlan: RollbackPlan;
  dryRun: boolean;
  preview: string[];
  createdAt: string;
  warnings: string[];
  errors: string[];
}

export class MigrationPlanner {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  plan(input: {
    from: VersionRecord;
    to: VersionRecord;
    mode?: MigrationMode;
    incremental?: boolean;
  }): MigrationPlan {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const mode = input.mode ?? this.config.migrationMode;
      const cmp = compareSemver(input.from.version, input.to.version);
      const direction: "forward" | "backward" =
        mode === "backward" || cmp > 0 ? "backward" : "forward";

      const steps: MigrationStep[] = [];
      const fromV = input.from.version.raw;
      const toV = input.to.version.raw;

      if (input.from.schemaVersion !== input.to.schemaVersion) {
        steps.push({
          stepId: stepId("schema"),
          kind: "SCHEMA",
          description: `Migrate schema ${input.from.schemaVersion ?? "?"} → ${input.to.schemaVersion ?? "?"}`,
          fromVersion: fromV,
          toVersion: toV,
          reversible: true,
          risk: "HIGH",
          evidence: [
            `fromSchema=${input.from.schemaVersion}`,
            `toSchema=${input.to.schemaVersion}`,
          ],
        });
      }

      if (input.from.kind === "CONFIGURATION" || input.to.kind === "CONFIGURATION") {
        steps.push({
          stepId: stepId("config"),
          kind: "CONFIGURATION",
          description: "Align configuration version",
          fromVersion: fromV,
          toVersion: toV,
          reversible: true,
          risk: "MEDIUM",
          evidence: ["configuration migration required"],
        });
      }

      if (input.from.kind === "POLICY" || input.to.kind === "POLICY") {
        steps.push({
          stepId: stepId("policy"),
          kind: "POLICY",
          description: "Migrate policy definitions",
          fromVersion: fromV,
          toVersion: toV,
          reversible: true,
          risk: "MEDIUM",
          evidence: ["policy migration required"],
        });
      }

      if (input.from.kind === "RULE" || input.to.kind === "RULE") {
        steps.push({
          stepId: stepId("rule"),
          kind: "RULE",
          description: "Migrate rule registrations",
          fromVersion: fromV,
          toVersion: toV,
          reversible: Boolean(!input.to.breaking),
          risk: input.to.breaking ? "HIGH" : "MEDIUM",
          evidence: [`breaking=${Boolean(input.to.breaking)}`],
        });
      }

      steps.push({
        stepId: stepId("module"),
        kind: "MODULE",
        description: `Update ${input.from.targetId} module version metadata`,
        fromVersion: fromV,
        toVersion: toV,
        reversible: true,
        risk: "LOW",
        evidence: [`target=${input.from.targetId}`],
      });

      steps.push({
        stepId: stepId("dep"),
        kind: "DEPENDENCY",
        description: "Verify dependency integrity after version change",
        fromVersion: fromV,
        toVersion: toV,
        reversible: true,
        risk: "MEDIUM",
        evidence: ["dependency check"],
      });

      let plannedSteps = steps;
      if (input.incremental || mode === "incremental") {
        plannedSteps = steps.filter((s) => s.risk !== "HIGH").concat(
          steps.filter((s) => s.risk === "HIGH")
        );
      }
      if (mode === "batch") {
        plannedSteps = [
          {
            stepId: stepId("batch"),
            kind: "CUSTOM",
            description: `Batch migrate ${plannedSteps.length} steps`,
            fromVersion: fromV,
            toVersion: toV,
            reversible: plannedSteps.every((s) => s.reversible),
            risk: plannedSteps.some((s) => s.risk === "HIGH")
              ? "HIGH"
              : "MEDIUM",
            evidence: plannedSteps.map((s) => s.stepId),
          },
        ];
      }

      const rollbackSteps = [...plannedSteps]
        .reverse()
        .filter((s) => s.reversible)
        .map((s) => ({
          ...s,
          stepId: stepId(`rb-${s.kind.toLowerCase()}`),
          description: `Rollback: ${s.description}`,
          fromVersion: s.toVersion,
          toVersion: s.fromVersion,
        }));

      const rollbackPlan: RollbackPlan = {
        planId: `rb:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        steps: rollbackSteps,
        validated: false,
        preview: rollbackSteps.map((s) => s.description),
        report: `Rollback plan with ${rollbackSteps.length} reversible step(s). No automatic execution.`,
      };

      const dryRun = mode === "dry_run" || mode === "preview";
      const preview = plannedSteps.map(
        (s) => `[${s.kind}/${s.risk}] ${s.description}`
      );

      if (direction === "backward") {
        warnings.push("Backward migration planned — validate carefully.");
      }
      if (input.to.breaking) {
        warnings.push("Target version marked breaking.");
      }

      return {
        planId: `mig:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        mode,
        fromVersionId: input.from.versionId,
        toVersionId: input.to.versionId,
        fromVersion: fromV,
        toVersion: toV,
        direction,
        steps: plannedSteps,
        rollbackPlan,
        dryRun,
        preview,
        createdAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`planMigration failed: ${String(err)}`);
      return emptyPlan(this.config.migrationMode, errors);
    }
  }
}

function stepId(prefix: string): string {
  return `ms:${prefix}:${Math.random().toString(36).slice(2, 8)}`;
}

function emptyPlan(mode: MigrationMode, errors: string[]): MigrationPlan {
  return {
    planId: `mig:error:${Math.random().toString(36).slice(2, 8)}`,
    mode,
    fromVersionId: "",
    toVersionId: "",
    fromVersion: "",
    toVersion: "",
    direction: "forward",
    steps: [],
    rollbackPlan: {
      planId: `rb:error`,
      steps: [],
      validated: false,
      preview: [],
      report: "No rollback plan.",
    },
    dryRun: true,
    preview: [],
    createdAt: new Date().toISOString(),
    warnings: [],
    errors,
  };
}
