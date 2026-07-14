/**
 * Institutional Validation Versioning & Migration Engine — façade (Prompt 9F.24).
 * Guarantees safe upgrade planning without altering validation decisions.
 */

import {
  DEFAULT_VERSION_CONFIGURATION,
  resolveVersionConfiguration,
  type VersionConfiguration,
  type VersionConfigurationInput,
} from "./VersionConfiguration";
import {
  areBuiltinVersionsRegistered,
  listVersionRecords,
  markBuiltinVersionsRegistered,
  resetVersionRegistry,
  type VersionRecord,
} from "./VersionRegistry";
import {
  VersionManager,
  type RegisterVersionInput,
} from "./VersionManager";
import { VersionComparator } from "./VersionComparator";
import type { VersionComparisonKind } from "./VersionComparator";
import { CompatibilityChecker } from "./CompatibilityChecker";
import { MigrationPlanner } from "./MigrationPlanner";
import { MigrationValidator } from "./MigrationValidator";
import { MigrationEngine, type VersionHealthScore } from "./MigrationEngine";
import { VersionMetricsTracker } from "./VersionMetrics";
import { VersionAuditLogger } from "./VersionAuditLogger";
import {
  VersionSnapshotStore,
  buildVersionSnapshotPayload,
  compareVersionSnapshots,
  type VersionSnapshot,
  type VersionSnapshotComparison,
} from "./VersionSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface PlanMigrationOptions {
  fromVersionId: string;
  toVersionId: string;
  knownRemovedRules?: string[];
  configDrift?: boolean;
  dependencyConflicts?: string[];
}

let defaultEngine: ValidationVersioningEngine | null = null;
let engineRegistered = false;

export class ValidationVersioningEngine {
  private config: VersionConfiguration;
  private manager: VersionManager;
  private comparator: VersionComparator;
  private compatibilityChecker: CompatibilityChecker;
  private planner: MigrationPlanner;
  private validator: MigrationValidator;
  private migrationEngine: MigrationEngine;
  private readonly metrics = new VersionMetricsTracker();
  private audit: VersionAuditLogger;
  private snapshots: VersionSnapshotStore;
  private lastHealthScore: VersionHealthScore | null = null;
  private lastCompatibilityScore = 100;
  private migrationHistoryCount = 0;
  private rollbackPlanCount = 0;

  constructor(configInput?: VersionConfigurationInput) {
    this.config = resolveVersionConfiguration(configInput);
    this.manager = new VersionManager(this.config);
    this.comparator = new VersionComparator(this.config);
    this.compatibilityChecker = new CompatibilityChecker(this.config);
    this.planner = new MigrationPlanner(this.config);
    this.validator = new MigrationValidator(this.config);
    this.migrationEngine = new MigrationEngine(this.config);
    this.audit = new VersionAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new VersionSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): VersionConfiguration {
    return resolveVersionConfiguration(this.config);
  }

  updateConfiguration(input: VersionConfigurationInput): void {
    this.config = resolveVersionConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.manager.setConfiguration(this.config);
    this.comparator.setConfiguration(this.config);
    this.compatibilityChecker.setConfiguration(this.config);
    this.planner.setConfiguration(this.config);
    this.validator.setConfiguration(this.config);
    this.migrationEngine.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerVersion(
    input: RegisterVersionInput,
    options?: { force?: boolean }
  ) {
    const started = Date.now();
    try {
      const result = this.manager.register(input, options);
      this.metrics.setVersionCount(listVersionRecords().length);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "VersionRegistered",
        fromVersion: input.version,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        registered: false,
        skipped: false,
        record: null,
        errors: [`registerVersion failed: ${String(err)}`],
      };
    }
  }

  planMigration(options: PlanMigrationOptions) {
    const started = Date.now();
    try {
      const from = this.resolveRecord(options.fromVersionId);
      const to = this.resolveRecord(options.toVersionId);
      if (!from || !to) {
        return {
          plan: null,
          compatibility: null,
          validation: null,
          execution: null,
          healthScore: zeroScore(),
          errors: ["fromVersionId or toVersionId not found"],
        };
      }

      const result = this.migrationEngine.run({
        from,
        to,
        knownRemovedRules: options.knownRemovedRules,
        configDrift: options.configDrift,
        dependencyConflicts: options.dependencyConflicts,
      });

      this.lastHealthScore = result.healthScore;
      this.lastCompatibilityScore = result.compatibility.compatibilityScore;
      this.migrationHistoryCount += 1;
      this.rollbackPlanCount += 1;

      const schemaChanges = result.plan.steps.filter(
        (s) => s.kind === "SCHEMA"
      ).length;

      this.metrics.recordMigration({
        schemaChanges,
        rollbackPlans: 1,
        healthScore: result.healthScore.overall,
        validationTimeMs: Date.now() - started,
      });
      this.metrics.setVersionCount(listVersionRecords().length);
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "MigrationPlanned",
        versionHealthScore: result.healthScore.overall,
        scoreBreakdown: result.healthScore,
        fromVersion: from.version.raw,
        toVersion: to.version.raw,
        planId: result.plan.planId,
        executionTimeMs: Date.now() - started,
        warnings: result.plan.warnings,
        errors: result.plan.errors,
        engineVersion: this.config.engineVersion,
      });

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "RollbackPlanned",
        planId: result.plan.rollbackPlan.planId,
        versionHealthScore: result.healthScore.overall,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "versioning",
        source: "versioning-engine",
        severity: "INFO",
        payload: {
          planId: result.plan.planId,
          healthScore: result.healthScore.overall,
          dryRun: true,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return { ...result, errors: result.plan.errors };
    } catch (err) {
      return {
        plan: null,
        compatibility: null,
        validation: null,
        execution: null,
        healthScore: zeroScore(),
        errors: [`planMigration failed: ${String(err)}`],
      };
    }
  }

  validateMigration(options: PlanMigrationOptions) {
    const planned = this.planMigration(options);
    if (!planned.validation) {
      return {
        valid: false,
        errors: planned.errors,
      };
    }
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "MigrationValidated",
      versionHealthScore: planned.healthScore.overall,
      scoreBreakdown: planned.healthScore,
      planId: planned.plan?.planId,
      executionTimeMs: 0,
      warnings: planned.validation.warnings,
      errors: planned.validation.errors,
      engineVersion: this.config.engineVersion,
    });
    return planned.validation;
  }

  checkCompatibility(options: {
    fromVersionId: string;
    toVersionId: string;
    knownRemovedRules?: string[];
    configDrift?: boolean;
    dependencyConflicts?: string[];
  }) {
    const started = Date.now();
    try {
      const from = this.resolveRecord(options.fromVersionId);
      const to = this.resolveRecord(options.toVersionId);
      if (!from || !to) {
        return {
          compatible: false,
          issues: [],
          compatibilityScore: 0,
          warnings: [],
          errors: ["fromVersionId or toVersionId not found"],
          checkedAt: new Date().toISOString(),
        };
      }
      const comparison = this.comparator.compareRecords(from, to);
      const result = this.compatibilityChecker.check({
        from,
        to,
        comparison,
        knownRemovedRules: options.knownRemovedRules,
        configDrift: options.configDrift,
        dependencyConflicts: options.dependencyConflicts,
      });
      this.lastCompatibilityScore = result.compatibilityScore;
      this.metrics.recordCompatibilityCheck();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CompatibilityChecked",
        fromVersion: from.version.raw,
        toVersion: to.version.raw,
        versionHealthScore: result.compatibilityScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        compatible: false,
        issues: [],
        compatibilityScore: 0,
        warnings: [],
        errors: [`checkCompatibility failed: ${String(err)}`],
        checkedAt: new Date().toISOString(),
      };
    }
  }

  compareVersions(input: {
    kind?: VersionComparisonKind;
    leftVersionId?: string;
    rightVersionId?: string;
    leftId?: string;
    rightId?: string;
    leftVersion?: string;
    rightVersion?: string;
  }) {
    try {
      if (input.leftVersionId && input.rightVersionId) {
        const left = this.resolveRecord(input.leftVersionId);
        const right = this.resolveRecord(input.rightVersionId);
        if (!left || !right) {
          return this.comparator.compareVersions(
            input.kind ?? "ENGINE",
            input.leftVersionId,
            input.rightVersionId,
            "0.0.0",
            "0.0.0"
          );
        }
        return this.comparator.compareRecords(
          left,
          right,
          input.kind ?? "ENGINE"
        );
      }
      return this.comparator.compareVersions(
        input.kind ?? "ENGINE",
        input.leftId ?? "left",
        input.rightId ?? "right",
        input.leftVersion ?? "0.0.0",
        input.rightVersion ?? "0.0.0"
      );
    } catch (err) {
      return {
        kind: input.kind ?? "ENGINE",
        leftId: input.leftId ?? "",
        rightId: input.rightId ?? "",
        leftVersion: input.leftVersion ?? "",
        rightVersion: input.rightVersion ?? "",
        equal: false,
        leftNewer: false,
        majorDelta: 0,
        minorDelta: 0,
        patchDelta: 0,
        breakingLikely: true,
        differences: [],
        warnings: [],
        errors: [`compareVersions failed: ${String(err)}`],
      };
    }
  }

  createVersionSnapshot(label?: string): VersionSnapshot {
    const started = Date.now();
    try {
      const score = this.lastHealthScore ?? zeroScore();
      const payload = buildVersionSnapshotPayload({
        score,
        versionCount: listVersionRecords().length,
        migrationCount: this.migrationHistoryCount,
        schemaVersion: this.config.schemaVersion,
        compatibilityScore: this.lastCompatibilityScore,
        rollbackPlanCount: this.rollbackPlanCount,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        versionHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildVersionSnapshotPayload({
          score: zeroScore(),
          versionCount: 0,
          migrationCount: 0,
          schemaVersion: this.config.schemaVersion,
          compatibilityScore: 0,
          rollbackPlanCount: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareVersionSnapshots(
    baselineId: string,
    compareId: string
  ): VersionSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareVersionSnapshots(a, b);
  }

  listSnapshots(): VersionSnapshot[] {
    return this.snapshots.list();
  }

  getVersionMetrics() {
    this.metrics.setVersionCount(listVersionRecords().length);
    return this.metrics.getMetrics();
  }

  getVersionHealthScore(): VersionHealthScore {
    return this.lastHealthScore ?? zeroScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listVersions(filter?: Parameters<VersionManager["list"]>[0]): VersionRecord[] {
    return this.manager.list(filter);
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastHealthScore = null;
    this.lastCompatibilityScore = 100;
    this.migrationHistoryCount = 0;
    this.rollbackPlanCount = 0;
  }

  private resolveRecord(versionId: string): VersionRecord | null {
    return listVersionRecords().find((v) => v.versionId === versionId) ?? null;
  }
}

function zeroScore(): VersionHealthScore {
  return {
    compatibility: 0,
    migrationSafety: 0,
    schemaIntegrity: 0,
    rollbackReadiness: 0,
    configurationStability: 0,
    dependencyHealth: 0,
    overall: 0,
  };
}

export function buildBuiltinVersions(): RegisterVersionInput[] {
  return [
    {
      kind: "ENGINE",
      targetId: "orchestrator",
      label: "Validation Orchestrator",
      version: "1.0.0",
      module: "orchestrator",
      schemaVersion: DEFAULT_VERSION_CONFIGURATION.schemaVersion,
    },
    {
      kind: "ENGINE",
      targetId: "admin",
      label: "Administration Engine",
      version: "17.0.0",
      module: "admin",
      metadata: { sprint: "9F.17" },
    },
    {
      kind: "ENGINE",
      targetId: "compliance",
      label: "Compliance Engine",
      version: "22.0.0",
      module: "compliance",
      metadata: { sprint: "9F.22" },
    },
    {
      kind: "ENGINE",
      targetId: "knowledge",
      label: "Knowledge Graph",
      version: "23.0.0",
      module: "knowledge",
      metadata: { sprint: "9F.23" },
    },
    {
      kind: "ENGINE",
      targetId: "analytics",
      label: "Analytics Engine",
      version: "1.0.0",
      module: "analytics",
    },
    {
      kind: "ENGINE",
      targetId: "reporting",
      label: "Reporting Engine",
      version: "1.0.0",
      module: "reporting",
    },
    {
      kind: "ENGINE",
      targetId: "diagnostics",
      label: "Diagnostics Engine",
      version: "1.0.0",
      module: "diagnostics",
    },
    {
      kind: "ENGINE",
      targetId: "optimization",
      label: "Optimization Engine",
      version: "1.0.0",
      module: "optimization",
    },
    {
      kind: "ENGINE",
      targetId: "reliability",
      label: "Reliability Engine",
      version: "1.0.0",
      module: "reliability",
    },
    {
      kind: "ENGINE",
      targetId: "observability",
      label: "Observability Engine",
      version: "1.0.0",
      module: "observability",
    },
    {
      kind: "ENGINE",
      targetId: "intelligence",
      label: "Intelligence Engine",
      version: "21.0.0",
      module: "intelligence",
      metadata: { sprint: "9F.21" },
    },
    {
      kind: "SCHEMA",
      targetId: "validation-platform",
      label: "Validation Platform Schema",
      version: DEFAULT_VERSION_CONFIGURATION.schemaVersion,
      schemaVersion: DEFAULT_VERSION_CONFIGURATION.schemaVersion,
    },
    {
      kind: "CONFIGURATION",
      targetId: "platform-config",
      label: "Platform Configuration",
      version: "1.0.0",
      schemaVersion: DEFAULT_VERSION_CONFIGURATION.schemaVersion,
    },
  ];
}

export function registerBuiltinVersions(options?: {
  force?: boolean;
  engine?: ValidationVersioningEngine;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinVersionsRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listVersionRecords().length,
      total: listVersionRecords().length,
    };
  }
  const engine = options?.engine ?? new ValidationVersioningEngine();
  let added = 0;
  let skipped = 0;
  for (const input of buildBuiltinVersions()) {
    const result = engine.registerVersion(input, { force: options?.force });
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinVersionsRegistered();
  return {
    registered: added,
    skipped,
    total: listVersionRecords().length,
  };
}

export interface VersioningRegistrationResult {
  registered: boolean;
  skipped: boolean;
  versionsRegistered: number;
}

export function registerValidationVersioningEngine(options?: {
  engine?: ValidationVersioningEngine;
  config?: VersionConfigurationInput;
  force?: boolean;
}): VersioningRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      versionsRegistered: listVersionRecords().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationVersioningEngine(options?.config);
  }

  const builtins = registerBuiltinVersions({
    force: options?.force,
    engine: defaultEngine,
  });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    versionsRegistered: builtins.total,
  };
}

export function getValidationVersioningEngine(
  options?: VersionConfigurationInput
): ValidationVersioningEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationVersioningEngine(options);
    registerBuiltinVersions({ engine: defaultEngine });
  }
  return defaultEngine;
}

export function resetValidationVersioningEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetVersionRegistry();
}

/** Public API convenience wrappers. */
export function registerVersion(
  input: RegisterVersionInput,
  options?: { force?: boolean }
) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().registerVersion(input, options);
}

export function planMigration(options: PlanMigrationOptions) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().planMigration(options);
}

export function validateMigration(options: PlanMigrationOptions) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().validateMigration(options);
}

export function checkCompatibility(
  options: Parameters<ValidationVersioningEngine["checkCompatibility"]>[0]
) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().checkCompatibility(options);
}

export function compareVersions(
  input: Parameters<ValidationVersioningEngine["compareVersions"]>[0]
) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().compareVersions(input);
}

export function createVersionSnapshot(label?: string) {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().createVersionSnapshot(label);
}

export function getVersionMetrics() {
  registerValidationVersioningEngine();
  return getValidationVersioningEngine().getVersionMetrics();
}

export {
  DEFAULT_VERSION_CONFIGURATION,
  resolveVersionConfiguration,
};
