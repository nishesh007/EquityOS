/**
 * Institutional Validation Administration & Policy Engine — façade (Prompt 9F.17).
 * Governance control plane only: never modifies validation engine source or results.
 */

import {
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  resolveAdministrationConfiguration,
  type AdministrationConfiguration,
  type AdministrationConfigurationInput,
  type ApprovalStatus,
  type GovernanceProfileId,
} from "./AdministrationConfiguration";
import {
  areBuiltinPoliciesRegistered,
  markBuiltinPoliciesRegistered,
  registerPolicy,
  resetPolicyRegistry,
  type PolicyDefinition,
} from "./PolicyRegistry";
import {
  PolicyManager,
  type CreatePolicyInput,
  type UpdatePolicyInput,
} from "./PolicyManager";
import { PolicyEvaluator } from "./PolicyEvaluator";
import { PolicyProfiles } from "./PolicyProfiles";
import {
  PolicyOverrides,
  type ApplyOverrideInput,
} from "./PolicyOverrides";
import { RuleGovernance } from "./RuleGovernance";
import { ModuleGovernance } from "./ModuleGovernance";
import { ConfigurationProfiles } from "./ConfigurationProfiles";
import { AdministrationMetricsTracker } from "./AdministrationMetrics";
import { AdministrationAuditLogger } from "./AdministrationAuditLogger";
import {
  AdministrationSnapshotStore,
  compareGovernanceSnapshots,
  hashPolicyVersions,
  type GovernanceSnapshot,
  type GovernanceSnapshotComparison,
  type GovernanceSnapshotPayload,
} from "./AdministrationSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface EvaluatePolicyOptions {
  policyIds?: string[];
}

let defaultEngine: ValidationAdministrationEngine | null = null;
let engineRegistered = false;

const DEFAULT_MODULES = [
  "dataIntegrity",
  "ruleEngine",
  "market",
  "technical",
  "fundamental",
  "recommendation",
  "tradeSetup",
  "hallucination",
  "historical",
  "trust",
  "dashboard",
  "analytics",
  "reporting",
  "diagnostics",
  "orchestrator",
  "eventBus",
] as const;

export class ValidationAdministrationEngine {
  private config: AdministrationConfiguration;
  private policyManager: PolicyManager;
  private evaluator: PolicyEvaluator;
  private readonly policyProfiles: PolicyProfiles;
  private readonly configurationProfiles: ConfigurationProfiles;
  private overrides: PolicyOverrides;
  private readonly ruleGovernance = new RuleGovernance();
  private readonly moduleGovernance = new ModuleGovernance();
  private readonly metrics = new AdministrationMetricsTracker();
  private audit: AdministrationAuditLogger;
  private snapshots: AdministrationSnapshotStore;

  constructor(configInput?: AdministrationConfigurationInput) {
    this.config = resolveAdministrationConfiguration(configInput);
    this.policyManager = new PolicyManager(this.config);
    this.evaluator = new PolicyEvaluator(this.config);
    this.policyProfiles = new PolicyProfiles(this.config.defaultProfileId);
    this.configurationProfiles = new ConfigurationProfiles(
      this.config.defaultProfileId
    );
    this.overrides = new PolicyOverrides(this.config);
    this.audit = new AdministrationAuditLogger(this.config.auditRetention);
    this.snapshots = new AdministrationSnapshotStore(
      this.config.snapshotRetention
    );
    this.seedDefaultModules();
  }

  getConfiguration(): AdministrationConfiguration {
    return resolveAdministrationConfiguration(this.config);
  }

  updateConfiguration(input: AdministrationConfigurationInput): void {
    const previous = { ...this.config };
    this.config = resolveAdministrationConfiguration({
      ...this.config,
      ...input,
    });
    this.policyManager.setConfiguration(this.config);
    this.evaluator.setConfiguration(this.config);
    this.overrides.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.auditRetention);
    this.snapshots.setRetention(this.config.snapshotRetention);
    this.metrics.recordConfigurationChange();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "ConfigurationChanged",
      previousValue: previous,
      newValue: this.config,
      reason: "updateConfiguration",
      executionTimeMs: 0,
      engineVersion: this.config.engineVersion,
      warnings: [],
      errors: [],
    });
  }

  createPolicy(input: CreatePolicyInput) {
    const started = Date.now();
    try {
      const result = this.policyManager.createPolicy(input);
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PolicyCreated",
        actor: input.createdBy,
        targetId: result.policy?.policyId,
        newValue: result.policy,
        reason: input.reason,
        approvalStatus: result.approvalStatus,
        version: result.policy?.version,
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: result.warnings,
        errors: result.errors,
      });
      this.publishGovernanceEvent("PolicyCreated", result.policy?.policyId);
      return result;
    } catch (err) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`createPolicy failed: ${String(err)}`],
        approvalStatus: "REJECTED" as ApprovalStatus,
      };
    }
  }

  updatePolicy(input: UpdatePolicyInput) {
    const started = Date.now();
    try {
      const result = this.policyManager.updatePolicy(input);
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PolicyUpdated",
        actor: input.updatedBy,
        targetId: input.policyId,
        previousValue: result.previous,
        newValue: result.policy,
        reason: input.reason,
        approvalStatus: result.approvalStatus,
        version: result.policy?.version,
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: result.warnings,
        errors: result.errors,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`updatePolicy failed: ${String(err)}`],
        approvalStatus: "REJECTED" as ApprovalStatus,
      };
    }
  }

  deletePolicy(
    policyId: string,
    options?: {
      deletedBy?: string;
      reason?: string;
      approvalStatus?: ApprovalStatus;
    }
  ) {
    const started = Date.now();
    try {
      const result = this.policyManager.deletePolicy(policyId, options);
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PolicyDeleted",
        actor: options?.deletedBy,
        targetId: policyId,
        previousValue: result.previous,
        reason: options?.reason,
        approvalStatus: result.approvalStatus,
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: result.warnings,
        errors: result.errors,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`deletePolicy failed: ${String(err)}`],
        approvalStatus: "REJECTED" as ApprovalStatus,
      };
    }
  }

  enablePolicy(policyId: string, updatedBy?: string) {
    const result = this.policyManager.enablePolicy(policyId, updatedBy);
    this.refreshMetrics();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "PolicyEnabled",
      actor: updatedBy,
      targetId: policyId,
      newValue: result.policy,
      approvalStatus: result.approvalStatus,
      version: result.policy?.version,
      executionTimeMs: 0,
      engineVersion: this.config.engineVersion,
      warnings: result.warnings,
      errors: result.errors,
    });
    return result;
  }

  disablePolicy(policyId: string, updatedBy?: string) {
    const result = this.policyManager.disablePolicy(policyId, updatedBy);
    this.refreshMetrics();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "PolicyDisabled",
      actor: updatedBy,
      targetId: policyId,
      newValue: result.policy,
      approvalStatus: result.approvalStatus,
      version: result.policy?.version,
      executionTimeMs: 0,
      engineVersion: this.config.engineVersion,
      warnings: result.warnings,
      errors: result.errors,
    });
    return result;
  }

  clonePolicy(policyId: string, options?: { name?: string; createdBy?: string }) {
    const result = this.policyManager.clonePolicy(policyId, options);
    this.refreshMetrics();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "PolicyCloned",
      actor: options?.createdBy,
      targetId: result.policy?.policyId,
      previousValue: { policyId },
      newValue: result.policy,
      approvalStatus: result.approvalStatus,
      version: result.policy?.version,
      executionTimeMs: 0,
      engineVersion: this.config.engineVersion,
      warnings: result.warnings,
      errors: result.errors,
    });
    return result;
  }

  rollbackPolicy(
    policyId: string,
    toVersion: number,
    options?: { rolledBackBy?: string; reason?: string }
  ) {
    const started = Date.now();
    try {
      const result = this.policyManager.rollbackPolicy(
        policyId,
        toVersion,
        options
      );
      if (result.ok) this.metrics.recordRollback();
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PolicyRolledBack",
        actor: options?.rolledBackBy,
        targetId: policyId,
        previousValue: result.previous,
        newValue: result.policy,
        reason: options?.reason ?? `rollback to v${toVersion}`,
        approvalStatus: result.approvalStatus,
        version: result.policy?.version,
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: result.warnings,
        errors: result.errors,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        policy: null,
        warnings: [],
        errors: [`rollbackPolicy failed: ${String(err)}`],
        approvalStatus: "REJECTED" as ApprovalStatus,
      };
    }
  }

  evaluatePolicy(options: EvaluatePolicyOptions = {}) {
    try {
      const policies = this.policyManager.listPolicies();
      const selected =
        options.policyIds && options.policyIds.length > 0
          ? policies.filter((p) => options.policyIds!.includes(p.policyId))
          : policies;
      return this.evaluator.evaluate({
        policies: selected,
        profile: this.policyProfiles.getActiveProfile(),
        rules: this.ruleGovernance.listRules(),
        modules: this.moduleGovernance.listModules(),
        overrides: this.overrides.listActive(),
      });
    } catch (err) {
      return {
        eligible: false,
        ruleEligibility: {},
        moduleEligibility: {},
        profileCompatible: false,
        configurationCompatible: false,
        dependencyCompatible: false,
        conflicts: [
          {
            code: "EVALUATION_FAILURE",
            severity: "ERROR" as const,
            message: String(err),
          },
        ],
        warnings: [],
        errors: [`evaluatePolicy failed: ${String(err)}`],
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  applyOverride(input: ApplyOverrideInput) {
    const started = Date.now();
    try {
      const result = this.overrides.applyOverride(input);
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "OverrideApplied",
        actor: input.createdBy,
        targetId: input.targetId,
        previousValue: input.previousValues,
        newValue: result.override,
        reason: input.reason,
        approvalStatus: result.override?.approvalStatus,
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: result.warnings,
        errors: result.errors,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        override: null,
        warnings: [],
        errors: [`applyOverride failed: ${String(err)}`],
      };
    }
  }

  switchProfile(profileId: GovernanceProfileId) {
    const started = Date.now();
    try {
      const policySwitch = this.policyProfiles.switchProfile(profileId);
      const configSwitch = this.configurationProfiles.switchTo(profileId);
      if (configSwitch.ok && configSwitch.profile) {
        this.config = resolveAdministrationConfiguration(
          configSwitch.profile.configuration
        );
        this.policyManager.setConfiguration(this.config);
        this.evaluator.setConfiguration(this.config);
        this.overrides.setConfiguration(this.config);
        this.metrics.recordConfigurationChange();
      }
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ProfileSwitched",
        targetId: profileId,
        previousValue: {
          policyProfile: policySwitch.previousId,
          configProfile: configSwitch.previousId,
        },
        newValue: {
          policyProfile: policySwitch.profile?.profileId,
          configProfile: configSwitch.profile?.profileId,
        },
        executionTimeMs: Date.now() - started,
        engineVersion: this.config.engineVersion,
        warnings: [],
        errors: [...policySwitch.errors, ...configSwitch.errors],
      });
      return {
        ok: policySwitch.ok && configSwitch.ok,
        policyProfile: policySwitch.profile,
        configurationProfile: configSwitch.profile,
        errors: [...policySwitch.errors, ...configSwitch.errors],
      };
    } catch (err) {
      return {
        ok: false,
        policyProfile: null,
        configurationProfile: null,
        errors: [`switchProfile failed: ${String(err)}`],
      };
    }
  }

  /** Rule governance helpers (no source modification). */
  getRuleGovernance(): RuleGovernance {
    return this.ruleGovernance;
  }

  getModuleGovernance(): ModuleGovernance {
    return this.moduleGovernance;
  }

  getPolicyProfiles(): PolicyProfiles {
    return this.policyProfiles;
  }

  getConfigurationProfiles(): ConfigurationProfiles {
    return this.configurationProfiles;
  }

  createGovernanceSnapshot(label?: string): GovernanceSnapshot {
    try {
      const payload = this.buildSnapshotPayload();
      const snapshot = this.snapshots.save(payload, label);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        targetId: snapshot.snapshotId,
        newValue: { label, version: snapshot.version },
        version: snapshot.version,
        executionTimeMs: 0,
        engineVersion: this.config.engineVersion,
        warnings: [],
        errors: [],
      });
      this.publishGovernanceEvent("SnapshotCreated", snapshot.snapshotId);
      return snapshot;
    } catch (err) {
      return this.snapshots.save(
        this.buildSnapshotPayload(),
        label ?? `error:${String(err)}`
      );
    }
  }

  compareGovernanceSnapshots(
    baselineId: string,
    compareId: string
  ): GovernanceSnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareGovernanceSnapshots(baseline, compare);
    } catch {
      return null;
    }
  }

  rollbackSnapshot(
    snapshotId: string,
    options?: { rolledBackBy?: string; reason?: string }
  ): {
    ok: boolean;
    snapshot: GovernanceSnapshot | null;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const snapshot = this.snapshots.load(snapshotId);
      if (!snapshot) {
        errors.push(`Snapshot not found: ${snapshotId}`);
        return { ok: false, snapshot: null, warnings, errors };
      }

      // Restore policy registry from snapshot (governance-layer only)
      resetPolicyRegistry();
      markBuiltinPoliciesRegistered();
      for (const policy of snapshot.payload.policies) {
        registerPolicy(policy, { force: true });
      }

      this.ruleGovernance.reset();
      for (const rule of snapshot.payload.rules) {
        this.ruleGovernance.ensureRule(rule);
      }

      this.moduleGovernance.reset();
      for (const mod of snapshot.payload.modules) {
        this.moduleGovernance.ensureModule(mod);
      }

      this.overrides.reset();
      for (const override of snapshot.payload.overrides) {
        this.overrides.applyOverride({
          targetType: override.targetType,
          targetId: override.targetId,
          severity: override.severity,
          priority: override.priority,
          threshold: override.threshold,
          executionMode: override.executionMode,
          retryCount: override.retryCount,
          timeoutMs: override.timeoutMs,
          createdBy: override.createdBy,
          reason: override.reason,
          approvalStatus: "AUTO_APPROVED",
          previousValues: override.previousValues,
          ttlMs: 0,
        });
      }

      this.policyProfiles.switchProfile(
        snapshot.payload.activePolicyProfile.profileId
      );
      this.configurationProfiles.switchTo(
        snapshot.payload.activeConfigurationProfile.profileId
      );
      this.config = resolveAdministrationConfiguration(
        snapshot.payload.configuration
      );
      this.policyManager.setConfiguration(this.config);
      this.evaluator.setConfiguration(this.config);
      this.overrides.setConfiguration(this.config);

      this.metrics.recordRollback();
      this.refreshMetrics();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotRolledBack",
        actor: options?.rolledBackBy,
        targetId: snapshotId,
        reason: options?.reason ?? "rollback snapshot",
        version: snapshot.version,
        executionTimeMs: 0,
        engineVersion: this.config.engineVersion,
        warnings,
        errors,
      });

      return { ok: true, snapshot, warnings, errors };
    } catch (err) {
      errors.push(`rollbackSnapshot failed: ${String(err)}`);
      return { ok: false, snapshot: null, warnings, errors };
    }
  }

  getAdministrationMetrics() {
    this.refreshMetrics();
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listSnapshots(): GovernanceSnapshot[] {
    return this.snapshots.list();
  }

  listPolicies() {
    return this.policyManager.listPolicies();
  }

  getPolicy(policyId: string) {
    return this.policyManager.getPolicy(policyId);
  }

  getPolicyVersions(policyId: string) {
    return this.policyManager.getVersions(policyId);
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.overrides.reset();
    this.ruleGovernance.reset();
    this.moduleGovernance.reset();
    resetPolicyRegistry();
    this.seedDefaultModules();
  }

  private buildSnapshotPayload(): GovernanceSnapshotPayload {
    const policies = this.policyManager.listPolicies();
    return {
      policies,
      activePolicyProfile: this.policyProfiles.getActiveProfile(),
      activeConfigurationProfile: this.configurationProfiles.getActive(),
      configuration: this.getConfiguration(),
      rules: this.ruleGovernance.listRules(),
      modules: this.moduleGovernance.listModules(),
      overrides: this.overrides.listAll(),
      configurationVersion: this.configurationProfiles.getActive().version,
      policyVersionHash: hashPolicyVersions(policies),
    };
  }

  private refreshMetrics(): void {
    const policies = this.policyManager.listPolicies();
    this.metrics.setPolicyCounts(
      policies.length,
      policies.filter((p) => p.status === "ENABLED").length
    );
    this.metrics.setOverrideCount(this.overrides.listActive().length);
    this.metrics.setActiveProfiles(1);
    this.metrics.setDisabledRules(this.ruleGovernance.disabledCount());
    this.metrics.setDisabledModules(this.moduleGovernance.disabledCount());
  }

  private seedDefaultModules(): void {
    for (const moduleId of DEFAULT_MODULES) {
      this.moduleGovernance.ensureModule({
        moduleId,
        name: moduleId,
        enabled: true,
        developmentMode: true,
      });
    }
  }

  private publishGovernanceEvent(eventType: string, targetId?: string): void {
    safePublishEvent({
      eventType: "WarningRaised",
      module: "admin",
      source: "administration-engine",
      severity: "INFO",
      payload: {
        governanceEvent: eventType,
        targetId,
        engineVersion: this.config.engineVersion,
      },
    });
  }
}

export function buildBuiltinPolicies(): PolicyDefinition[] {
  const now = new Date().toISOString();
  return [
    {
      policyId: "pol:builtin:default-governance",
      name: "Default Governance",
      description: "Baseline institutional governance policy.",
      scope: "GLOBAL",
      status: "ENABLED",
      version: 1,
      tags: ["builtin", "default"],
      rules: {
        requireModules: ["dataIntegrity", "ruleEngine"],
      },
      metadata: { builtin: true },
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    {
      policyId: "pol:builtin:production-strict",
      name: "Production Strict",
      description: "Strict production policy profile binding.",
      scope: "PROFILE",
      status: "ENABLED",
      version: 1,
      profileIds: ["production", "institutional"],
      tags: ["builtin", "production"],
      rules: {
        requireModules: ["trust", "orchestrator"],
      },
      metadata: { builtin: true },
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
  ];
}

export function registerBuiltinPolicies(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinPoliciesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: 2,
      total: 2,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const policy of buildBuiltinPolicies()) {
    const result = registerPolicy(policy, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinPoliciesRegistered();
  return { registered: added, skipped, total: added + skipped };
}

export interface AdministrationRegistrationResult {
  registered: boolean;
  skipped: boolean;
  policiesRegistered: number;
}

export function registerValidationAdministrationEngine(options?: {
  engine?: ValidationAdministrationEngine;
  config?: AdministrationConfigurationInput;
  force?: boolean;
}): AdministrationRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      policiesRegistered: 0,
    };
  }

  const policies = registerBuiltinPolicies({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationAdministrationEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    policiesRegistered: policies.total,
  };
}

export function getValidationAdministrationEngine(
  options?: AdministrationConfigurationInput
): ValidationAdministrationEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationAdministrationEngine(options);
    registerBuiltinPolicies();
  }
  return defaultEngine;
}

export function resetValidationAdministrationEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetPolicyRegistry();
}

/** Public API convenience wrappers. */
export function createPolicy(input: CreatePolicyInput) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().createPolicy(input);
}

export function updatePolicy(input: UpdatePolicyInput) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().updatePolicy(input);
}

export function deletePolicy(
  policyId: string,
  options?: {
    deletedBy?: string;
    reason?: string;
    approvalStatus?: ApprovalStatus;
  }
) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().deletePolicy(policyId, options);
}

export function evaluatePolicy(options?: EvaluatePolicyOptions) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().evaluatePolicy(options);
}

export function applyOverride(input: ApplyOverrideInput) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().applyOverride(input);
}

export function rollbackPolicy(
  policyId: string,
  toVersion: number,
  options?: { rolledBackBy?: string; reason?: string }
) {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().rollbackPolicy(
    policyId,
    toVersion,
    options
  );
}

export function createGovernanceSnapshot(label?: string): GovernanceSnapshot {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().createGovernanceSnapshot(label);
}

export function getAdministrationMetrics() {
  registerValidationAdministrationEngine();
  return getValidationAdministrationEngine().getAdministrationMetrics();
}

export {
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  resolveAdministrationConfiguration,
  registerPolicy,
};
