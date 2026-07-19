/**
 * Institutional Validation Security & Access Control Engine — façade (Prompt 9F.25).
 * Authorization only: never influences validation decisions or interrupts validation execution.
 */

import {
  DEFAULT_SECURITY_CONFIGURATION,
  resolveSecurityConfiguration,
  type SecurityConfiguration,
  type SecurityConfigurationInput,
} from "./SecurityConfiguration";
import {
  areBuiltinSecurityResourcesRegistered,
  createResourceId,
  listSecurityResources,
  markBuiltinSecurityResourcesRegistered,
  registerSecurityResource,
  resetSecurityRegistry,
  type SecurityModuleId,
  type SecurityResourceType,
} from "./SecurityRegistry";
import {
  createSecurityContext,
  type SecurityContext,
  type SecurityPermissionAction,
} from "./SecurityContext";
import {
  RoleManager,
  buildBuiltinRoles,
  type CreateRoleInput,
  type RoleDefinition,
} from "./RoleManager";
import {
  PermissionManager,
  type CreatePermissionInput,
} from "./PermissionManager";
import {
  AccessPolicyEngine,
  type CreateAccessPolicyInput,
  type PolicyEvaluationResult,
} from "./AccessPolicyEngine";
import { AccessEvaluator } from "./AccessEvaluator";
import {
  AccessValidator,
  type AccessValidationResult,
} from "./AccessValidator";
import {
  SecurityMetricsTracker,
  type SecurityHealthScore,
  type SecurityOperationalMetrics,
} from "./SecurityMetrics";
import { SecurityAuditLogger } from "./SecurityAuditLogger";
import {
  SecuritySnapshotStore,
  buildSecuritySnapshotPayload,
  compareSecuritySnapshots,
  type SecuritySnapshot,
  type SecuritySnapshotComparison,
  type SecuritySnapshotKind,
} from "./SecuritySnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { SecurityHealthScore };

export interface AuthorizeOptions {
  context: SecurityContext;
}

export interface AuthorizeResult {
  allowed: boolean;
  decision: "allow" | "deny";
  validation: AccessValidationResult;
  healthScore: SecurityHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationSecurityEngine | null = null;
let engineRegistered = false;

export class ValidationSecurityEngine {
  private config: SecurityConfiguration;
  private readonly roles: RoleManager;
  private readonly permissions: PermissionManager;
  private policies: AccessPolicyEngine;
  private evaluator: AccessEvaluator;
  private validator: AccessValidator;
  private readonly metrics = new SecurityMetricsTracker();
  private audit: SecurityAuditLogger;
  private snapshots: SecuritySnapshotStore;
  private lastHealthScore: SecurityHealthScore | null = null;
  private lastValidationPassRate = 1;

  constructor(configInput?: SecurityConfigurationInput) {
    this.config = resolveSecurityConfiguration(configInput);
    this.roles = new RoleManager(this.config.maxRoles);
    this.permissions = new PermissionManager(this.config.maxPermissions);
    this.policies = new AccessPolicyEngine(this.config);
    this.evaluator = new AccessEvaluator(this.config);
    this.validator = new AccessValidator(this.config);
    this.audit = new SecurityAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new SecuritySnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): SecurityConfiguration {
    return resolveSecurityConfiguration(this.config);
  }

  updateConfiguration(input: SecurityConfigurationInput): void {
    this.config = resolveSecurityConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.roles.setMaxRoles(this.config.maxRoles);
    this.permissions.setMaxPermissions(this.config.maxPermissions);
    this.policies.setConfiguration(this.config);
    this.evaluator.setConfiguration(this.config);
    this.validator.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerRole(input: CreateRoleInput, options?: { force?: boolean }) {
    const result = this.roles.register(input, options);
    this.syncCounts();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "RoleChanged",
      subjectId: input.roleId,
      executionTimeMs: 0,
      warnings: [],
      errors: result.errors,
      engineVersion: this.config.engineVersion,
    });
    return result;
  }

  registerPermission(
    input: CreatePermissionInput,
    options?: { force?: boolean }
  ) {
    const result = this.permissions.grant(input, options);
    this.syncCounts();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "PermissionChanged",
      subjectId: input.subjectId ?? input.roleId,
      action: input.action,
      module: input.module,
      executionTimeMs: 0,
      warnings: [],
      errors: result.errors,
      engineVersion: this.config.engineVersion,
    });
    return result;
  }

  createPolicy(input: CreateAccessPolicyInput, options?: { force?: boolean }) {
    const result = this.policies.create(input, options);
    this.syncCounts();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "PolicyChanged",
      subjectId: input.policyId,
      executionTimeMs: 0,
      warnings: [],
      errors: result.errors,
      engineVersion: this.config.engineVersion,
    });
    return result;
  }

  evaluatePolicy(context: SecurityContext): PolicyEvaluationResult {
    try {
      return this.policies.evaluate(createSecurityContext(context));
    } catch (err) {
      return {
        decision: this.config.denyByDefault ? "deny" : "not_applicable",
        matchedPolicies: [],
        requiresApproval: false,
        warnings: [],
        errors: [`evaluatePolicy failed: ${String(err)}`],
      };
    }
  }

  authorize(options: AuthorizeOptions): AuthorizeResult {
    const started = Date.now();
    try {
      const context = createSecurityContext(options.context);
      const evaluation = this.evaluator.evaluate({
        context,
        roles: this.roles,
        permissions: this.permissions,
        policies: this.policies,
      });
      const validation = this.validator.validate({ context, evaluation });
      const healthScore = this.computeSecurityHealthScore(validation);
      this.lastHealthScore = healthScore;
      this.lastValidationPassRate = validation.authorized ? 1 : 0;

      const allowed = validation.authorized;
      this.metrics.recordAuthorization({
        allowed,
        executionTimeMs: Date.now() - started,
        healthScore: healthScore.overall,
      });
      this.syncCounts();

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "AccessAttempt",
        subjectId: context.subject.subjectId,
        action: context.action,
        resourceId: context.resource.resourceId,
        module: context.resource.module,
        decision: allowed ? "allow" : "deny",
        securityHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: validation.warnings,
        errors: validation.errors,
        engineVersion: this.config.engineVersion,
      });

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: allowed ? "AccessGranted" : "AccessDenied",
        subjectId: context.subject.subjectId,
        action: context.action,
        resourceId: context.resource.resourceId,
        module: context.resource.module,
        decision: allowed ? "allow" : "deny",
        securityHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: Date.now() - started,
        warnings: validation.warnings,
        errors: validation.errors,
        engineVersion: this.config.engineVersion,
      });

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SecurityScoreComputed",
        securityHealthScore: healthScore.overall,
        scoreBreakdown: healthScore,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "security",
        source: "security-engine",
        severity: allowed ? "INFO" : "WARNING",
        payload: {
          subjectId: context.subject.subjectId,
          action: context.action,
          module: context.resource.module,
          allowed,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return {
        allowed,
        decision: allowed ? "allow" : "deny",
        validation,
        healthScore,
        executionTimeMs: Date.now() - started,
        warnings: validation.warnings,
        errors: validation.errors,
      };
    } catch (err) {
      // Security failures must never interrupt validation execution.
      const healthScore = zeroScore();
      this.metrics.recordAuthorization({
        allowed: false,
        executionTimeMs: Date.now() - started,
        healthScore: 0,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`authorize failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        allowed: false,
        decision: "deny",
        validation: {
          valid: false,
          authorized: false,
          issues: [],
          evaluation: {
            allowed: false,
            decision: "deny",
            reason: "authorize error",
            requiresApproval: false,
            inheritedPermissions: [],
            moduleRestricted: false,
            policyResult: {
              decision: "not_applicable",
              matchedPolicies: [],
              requiresApproval: false,
              warnings: [],
              errors: [],
            },
            warnings: [],
            errors: [`authorize failed: ${String(err)}`],
            executionTimeMs: Date.now() - started,
          },
          warnings: [],
          errors: [`authorize failed: ${String(err)}`],
        },
        healthScore,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`authorize failed: ${String(err)}`],
      };
    }
  }

  validateAccess(options: AuthorizeOptions): AccessValidationResult {
    return this.authorize(options).validation;
  }

  createSecuritySnapshot(
    label?: string,
    kind: SecuritySnapshotKind = "security"
  ): SecuritySnapshot {
    const started = Date.now();
    try {
      const score = this.lastHealthScore ?? this.computeSecurityHealthScore();
      const metrics = this.metrics.getMetrics();
      const deniedRate =
        metrics.accessRequests === 0
          ? 0
          : metrics.deniedRequests / metrics.accessRequests;

      const payload = buildSecuritySnapshotPayload({
        kind,
        score,
        roleCount: this.roles.size,
        permissionCount: this.permissions.size,
        policyCount: this.policies.size,
        resourceCount: listSecurityResources().length,
        deniedRate,
        configurationVersion: this.config.engineVersion,
        roleIds:
          kind === "role" || kind === "security"
            ? this.roles.list().map((r) => r.roleId)
            : undefined,
        permissionIds:
          kind === "permission" || kind === "security"
            ? this.permissions.list().map((p) => p.grantId)
            : undefined,
        policyIds:
          kind === "policy" || kind === "security"
            ? this.policies.list().map((p) => p.policyId)
            : undefined,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        securityHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildSecuritySnapshotPayload({
          kind,
          score: zeroScore(),
          roleCount: 0,
          permissionCount: 0,
          policyCount: 0,
          resourceCount: 0,
          deniedRate: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareSecuritySnapshots(
    baselineId: string,
    compareId: string
  ): SecuritySnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareSecuritySnapshots(a, b);
  }

  listSnapshots(): SecuritySnapshot[] {
    return this.snapshots.list();
  }

  getSecurityMetrics(): SecurityOperationalMetrics {
    this.syncCounts();
    return this.metrics.getMetrics();
  }

  getSecurityHealthScore(): SecurityHealthScore {
    return this.lastHealthScore ?? this.computeSecurityHealthScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listRoles(): RoleDefinition[] {
    return this.roles.list();
  }

  listPermissions() {
    return this.permissions.list();
  }

  listPolicies() {
    return this.policies.list();
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastHealthScore = null;
    this.lastValidationPassRate = 1;
  }

  computeSecurityHealthScore(
    lastValidation?: AccessValidationResult
  ): SecurityHealthScore {
    const weights = this.config.scoreWeights;
    const protectedModules = [
      ...new Set(listSecurityResources().map((r) => r.module)),
    ];

    const policyCoverage = this.policies.coverageScore(protectedModules);
    const permissionIntegrity = this.permissions.integrityScore();
    const roleConsistency = this.roleConsistencyScore();
    const auditCompleteness = this.audit.completenessScore();
    const configurationSecurity = this.configurationSecurityScore();
    const accessValidation =
      lastValidation !== undefined
        ? lastValidation.authorized
          ? 100
          : Math.max(0, 100 - lastValidation.issues.filter((i) => i.severity === "error").length * 20)
        : Math.round(this.lastValidationPassRate * 100);

    const overall = clamp(
      Math.round(
        policyCoverage * weights.policyCoverage +
          permissionIntegrity * weights.permissionIntegrity +
          roleConsistency * weights.roleConsistency +
          auditCompleteness * weights.auditCompleteness +
          configurationSecurity * weights.configurationSecurity +
          accessValidation * weights.accessValidation
      ),
      0,
      100
    );

    const score: SecurityHealthScore = {
      policyCoverage,
      permissionIntegrity,
      roleConsistency,
      auditCompleteness,
      configurationSecurity,
      accessValidation,
      overall,
    };
    this.metrics.setHealthScore(overall);
    return score;
  }

  private roleConsistencyScore(): number {
    const roles = this.roles.list();
    if (roles.length === 0) return 30;
    let issues = 0;
    const ids = new Set(roles.map((r) => r.roleId));
    for (const role of roles) {
      if (role.permissions.length === 0) issues += 1;
      for (const parent of role.inheritsFrom ?? []) {
        if (!ids.has(parent)) issues += 1;
      }
    }
    const ratio = issues / Math.max(1, roles.length);
    return clamp(Math.round(100 - ratio * 100), 0, 100);
  }

  private configurationSecurityScore(): number {
    let score = 100;
    if (!this.config.institutionalMode) score -= 15;
    if (!this.config.denyByDefault) score -= 20;
    if (this.config.mode !== "strict") score -= 10;
    if (this.config.approvalPolicy === "none") score -= 15;
    if (!this.config.requireApprovalForSensitive) score -= 10;
    return clamp(score, 0, 100);
  }

  private syncCounts(): void {
    this.metrics.setCounts({
      roles: this.roles.size,
      permissions: this.permissions.size,
      policies: this.policies.size,
    });
    this.metrics.setSnapshotCount(this.snapshots.size);
  }
}

function zeroScore(): SecurityHealthScore {
  return {
    policyCoverage: 0,
    permissionIntegrity: 0,
    roleConsistency: 0,
    auditCompleteness: 0,
    configurationSecurity: 0,
    accessValidation: 0,
    overall: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const BUILTIN_MODULES: Array<{
  module: SecurityModuleId;
  type: SecurityResourceType;
  label: string;
  sensitive?: boolean;
  requiresApproval?: boolean;
}> = [
  { module: "orchestrator", type: "VALIDATION_ENGINE", label: "Validation Orchestrator" },
  { module: "admin", type: "POLICY", label: "Administration Engine", sensitive: true, requiresApproval: true },
  { module: "compliance", type: "POLICY", label: "Compliance Engine", sensitive: true, requiresApproval: true },
  { module: "versioning", type: "CONFIGURATION", label: "Versioning Engine", sensitive: true },
  { module: "knowledge", type: "KNOWLEDGE_GRAPH", label: "Knowledge Graph" },
  { module: "analytics", type: "ANALYTICS", label: "Analytics Engine" },
  { module: "diagnostics", type: "DIAGNOSTICS", label: "Diagnostics Engine" },
  { module: "reporting", type: "REPORT", label: "Reporting Engine" },
  { module: "dashboard", type: "DASHBOARD", label: "Validation Dashboard" },
  { module: "observability", type: "METRICS", label: "Observability Engine" },
  { module: "reliability", type: "VALIDATION_ENGINE", label: "Reliability Engine" },
  { module: "optimization", type: "VALIDATION_ENGINE", label: "Optimization Engine" },
  { module: "events", type: "MODULE", label: "Validation Event Bus" },
  { module: "intelligence", type: "ANALYTICS", label: "Intelligence Engine" },
  { module: "security", type: "AUDIT_LOG", label: "Security Engine", sensitive: true, requiresApproval: true },
];

export function registerBuiltinSecurityResources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinSecurityResourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listSecurityResources().length,
      total: listSecurityResources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const mod of BUILTIN_MODULES) {
    const result = registerSecurityResource(
      {
        resourceId: createResourceId(mod.type, mod.module),
        type: mod.type,
        module: mod.module,
        label: mod.label,
        sensitive: mod.sensitive,
        requiresApproval: mod.requiresApproval,
        metadata: { integration: "read-only", sprint: "9F.25" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinSecurityResourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listSecurityResources().length,
  };
}

export function seedBuiltinSecurityModel(
  engine: ValidationSecurityEngine,
  options?: { force?: boolean }
): void {
  for (const role of buildBuiltinRoles()) {
    engine.registerRole(
      {
        roleId: role.roleId,
        label: role.label,
        description: role.description,
        permissions: role.permissions as SecurityPermissionAction[],
        inheritsFrom: role.inheritsFrom,
        modules: role.modules,
        custom: false,
      },
      { force: options?.force }
    );
  }

  engine.createPolicy(
    {
      policyId: "deny-public-security-manage",
      label: "Deny public manage_security",
      effect: "deny",
      actions: ["manage_security"],
      modules: ["security", "admin"],
      constraints: [
        { attribute: "networkZone", operator: "eq", value: "public" },
      ],
      priority: 10,
      requiresApproval: true,
    },
    { force: options?.force }
  );

  engine.createPolicy(
    {
      policyId: "allow-read-platform",
      label: "Allow platform read",
      effect: "allow",
      actions: ["read"],
      priority: 200,
    },
    { force: options?.force }
  );

  engine.createPolicy(
    {
      policyId: "auditor-audit-logs",
      label: "Auditor audit log access",
      effect: "allow",
      actions: ["view_audit_logs", "export", "manage_snapshots"],
      roles: ["auditor", "compliance_officer", "administrator"],
      resourceTypes: ["AUDIT_LOG", "SNAPSHOT"],
      priority: 50,
    },
    { force: options?.force }
  );
}

export interface SecurityRegistrationResult {
  registered: boolean;
  skipped: boolean;
  resourcesRegistered: number;
  rolesRegistered: number;
}

export function registerSecurity(options?: {
  engine?: ValidationSecurityEngine;
  config?: SecurityConfigurationInput;
  force?: boolean;
}): SecurityRegistrationResult {
  return registerValidationSecurityEngine(options);
}

export function registerValidationSecurityEngine(options?: {
  engine?: ValidationSecurityEngine;
  config?: SecurityConfigurationInput;
  force?: boolean;
}): SecurityRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      resourcesRegistered: listSecurityResources().length,
      rolesRegistered: defaultEngine?.listRoles().length ?? 0,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationSecurityEngine(options?.config);
  }

  const resources = registerBuiltinSecurityResources({
    force: options?.force,
  });
  seedBuiltinSecurityModel(defaultEngine, { force: options?.force });
  engineRegistered = true;

  return {
    registered: true,
    skipped: false,
    resourcesRegistered: resources.total,
    rolesRegistered: defaultEngine.listRoles().length,
  };
}

export function getValidationSecurityEngine(
  options?: SecurityConfigurationInput
): ValidationSecurityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationSecurityEngine(options);
    registerBuiltinSecurityResources();
    seedBuiltinSecurityModel(defaultEngine);
  }
  return defaultEngine;
}

export function resetValidationSecurityEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetSecurityRegistry();
}

/** Public API convenience wrappers. */
export function authorize(options: AuthorizeOptions) {
  registerSecurity();
  return getValidationSecurityEngine().authorize(options);
}

export function validateAccess(options: AuthorizeOptions) {
  registerSecurity();
  return getValidationSecurityEngine().validateAccess(options);
}

export function evaluatePolicy(context: SecurityContext) {
  registerSecurity();
  return getValidationSecurityEngine().evaluatePolicy(context);
}

export function createSecuritySnapshot(
  label?: string,
  kind?: SecuritySnapshotKind
) {
  registerSecurity();
  return getValidationSecurityEngine().createSecuritySnapshot(label, kind);
}

export function getSecurityMetrics() {
  registerSecurity();
  return getValidationSecurityEngine().getSecurityMetrics();
}

export {
  DEFAULT_SECURITY_CONFIGURATION,
  resolveSecurityConfiguration,
};
