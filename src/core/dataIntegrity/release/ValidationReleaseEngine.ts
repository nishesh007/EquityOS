/**
 * Institutional Validation Production Readiness & Release Certification Engine — façade (Prompt 9F.30).
 * Certification only: never modifies validation execution or outcomes.
 */

import {
  DEFAULT_RELEASE_CONFIGURATION,
  resolveReleaseConfiguration,
  type ChecklistProfile,
  type ReleaseConfiguration,
  type ReleaseConfigurationInput,
} from "./ReleaseConfiguration";
import {
  areBuiltinReleaseSourcesRegistered,
  createReleaseSourceId,
  listReleaseSources,
  markBuiltinReleaseSourcesRegistered,
  registerReleaseSource,
  resetReleaseRegistry,
  type ReleaseSourceDefinition,
  type ReleaseSourceKind,
} from "./ReleaseRegistry";
import { ReadinessEvaluator, type ReadinessEvaluation } from "./ReadinessEvaluator";
import { ReleaseChecklist, type ChecklistResult } from "./ReleaseChecklist";
import { RiskAssessment, type RiskAssessmentResult } from "./RiskAssessment";
import { RollbackReadiness, type RollbackReadinessResult } from "./RollbackReadiness";
import {
  DeploymentAnalyzer,
  type DeploymentAnalysis,
} from "./DeploymentAnalyzer";
import {
  CertificationEngine,
  type CertificationResult,
  type CertificationStatus,
} from "./CertificationEngine";
import {
  ReleaseMetricsTracker,
  type ReleaseHealthScore,
  type ReleaseOperationalMetrics,
} from "./ReleaseMetrics";
import { ReleaseAuditLogger } from "./ReleaseAuditLogger";
import {
  ReleaseSnapshotStore,
  buildReleaseSnapshotPayload,
  compareReleaseSnapshots,
  type ReleaseSnapshot,
  type ReleaseSnapshotComparison,
  type ReleaseSnapshotKind,
} from "./ReleaseSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { ReleaseHealthScore, CertificationStatus };

export interface EvaluateReadinessOptions {
  overrides?: Parameters<ReadinessEvaluator["evaluate"]>[1];
  checklistProfile?: ChecklistProfile;
  checklistOverrides?: Array<{
    itemId: string;
    completed: boolean;
    notes?: string;
  }>;
}

export interface CertifyReleaseOptions extends EvaluateReadinessOptions {
  configurationDrift?: number;
  migrationReadiness?: number;
  versionCompatibility?: number;
}

export interface AnalyzeDeploymentOptions extends CertifyReleaseOptions {}

export interface ReleaseRunResult {
  readiness: ReadinessEvaluation;
  checklist: ChecklistResult;
  risks: RiskAssessmentResult;
  rollback: RollbackReadinessResult;
  deployment: DeploymentAnalysis;
  certification: CertificationResult;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationReleaseEngine | null = null;
let engineRegistered = false;

export class ValidationReleaseEngine {
  private config: ReleaseConfiguration;
  private readinessEvaluator: ReadinessEvaluator;
  private checklist: ReleaseChecklist;
  private riskAssessment: RiskAssessment;
  private readonly rollbackReadiness = new RollbackReadiness();
  private deploymentAnalyzer: DeploymentAnalyzer;
  private certificationEngine: CertificationEngine;
  private readonly metrics = new ReleaseMetricsTracker();
  private audit: ReleaseAuditLogger;
  private snapshots: ReleaseSnapshotStore;
  private lastResult: ReleaseRunResult | null = null;
  private lastScore: ReleaseHealthScore | null = null;

  constructor(configInput?: ReleaseConfigurationInput) {
    this.config = resolveReleaseConfiguration(configInput);
    this.readinessEvaluator = new ReadinessEvaluator(this.config);
    this.checklist = new ReleaseChecklist(this.config);
    this.riskAssessment = new RiskAssessment(this.config);
    this.deploymentAnalyzer = new DeploymentAnalyzer(this.config);
    this.certificationEngine = new CertificationEngine(this.config);
    this.audit = new ReleaseAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new ReleaseSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): ReleaseConfiguration {
    return resolveReleaseConfiguration(this.config);
  }

  updateConfiguration(input: ReleaseConfigurationInput): void {
    this.config = resolveReleaseConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
      riskThresholds: {
        ...this.config.riskThresholds,
        ...input.riskThresholds,
      },
    });
    this.readinessEvaluator.setConfiguration(this.config);
    this.checklist.setConfiguration(this.config);
    this.riskAssessment.setConfiguration(this.config);
    this.deploymentAnalyzer.setConfiguration(this.config);
    this.certificationEngine.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: Omit<ReleaseSourceDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerReleaseSource(definition, options);
  }

  evaluateReadiness(
    options: EvaluateReadinessOptions = {}
  ): ReadinessEvaluation {
    const started = Date.now();
    try {
      const readiness = this.readinessEvaluator.evaluate(
        listReleaseSources(),
        options.overrides
      );
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ReadinessEvaluated",
        releaseScore: readiness.score.overall,
        scoreBreakdown: readiness.score,
        executionTimeMs: Date.now() - started,
        warnings: readiness.warnings,
        errors: readiness.errors,
        engineVersion: this.config.engineVersion,
      });
      return readiness;
    } catch (err) {
      return {
        dimensions: [],
        score: zeroScore(),
        overallPassed: false,
        warnings: [],
        errors: [`evaluateReadiness failed: ${String(err)}`],
      };
    }
  }

  analyzeDeployment(
    options: AnalyzeDeploymentOptions = {}
  ): DeploymentAnalysis {
    const started = Date.now();
    try {
      const run = this.runInternal(options);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DeploymentReviewed",
        certificationId: run.certification.certificationId,
        releaseScore: run.certification.score.overall,
        status: run.certification.status,
        executionTimeMs: Date.now() - started,
        warnings: run.deployment.warnings,
        errors: run.deployment.errors,
        engineVersion: this.config.engineVersion,
      });
      return run.deployment;
    } catch (err) {
      return {
        deploymentRisk: 100,
        configurationDrift: 100,
        migrationReadiness: 0,
        versionCompatibility: 0,
        operationalRisk: 100,
        infrastructureReadiness: 0,
        rollbackReadiness: 0,
        summary: `analyzeDeployment failed: ${String(err)}`,
        warnings: [],
        errors: [`analyzeDeployment failed: ${String(err)}`],
      };
    }
  }

  certifyRelease(options: CertifyReleaseOptions = {}): CertificationResult {
    const started = Date.now();
    try {
      const run = this.runInternal(options);
      this.lastResult = run;
      this.lastScore = run.certification.score;

      this.metrics.recordCertification({
        releaseScore: run.certification.score.overall,
        deploymentRisks: run.risks.criticalCount + run.risks.highCount,
        rollbackReadiness: run.rollback.score,
        checklistCompletion: run.checklist.completionPct,
        runtimeMs: Date.now() - started,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "RiskAssessed",
        certificationId: run.certification.certificationId,
        releaseScore: run.risks.overallRisk,
        status: run.certification.status,
        executionTimeMs: 0,
        warnings: run.risks.warnings,
        errors: run.risks.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ChecklistCompleted",
        certificationId: run.certification.certificationId,
        releaseScore: run.checklist.completionPct,
        executionTimeMs: 0,
        warnings: run.checklist.warnings,
        errors: run.checklist.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CertificationRun",
        certificationId: run.certification.certificationId,
        releaseScore: run.certification.score.overall,
        scoreBreakdown: run.certification.score,
        status: run.certification.status,
        executionTimeMs: Date.now() - started,
        warnings: run.warnings,
        errors: run.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ReleaseScoreComputed",
        certificationId: run.certification.certificationId,
        releaseScore: run.certification.score.overall,
        scoreBreakdown: run.certification.score,
        status: run.certification.status,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "release",
        source: "release-engine",
        severity:
          run.certification.status === "blocked" ||
          run.certification.status === "not_ready"
            ? "WARN"
            : "INFO",
        payload: {
          certificationId: run.certification.certificationId,
          status: run.certification.status,
          score: run.certification.score.overall,
          certificationOnly: true,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return run.certification;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`certifyRelease failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        certificationId: `cert:error:${Date.now()}`,
        status: "blocked",
        summary: "Certification failed",
        reasoning: [String(err)],
        score: zeroScore(),
        checklistPassed: false,
        rollbackReady: false,
        criticalRisks: 0,
        generatedAt: new Date().toISOString(),
        warnings: [],
        errors: [`certifyRelease failed: ${String(err)}`],
      };
    }
  }

  createReleaseSnapshot(
    label?: string,
    kind: ReleaseSnapshotKind = "release"
  ): ReleaseSnapshot {
    const started = Date.now();
    try {
      const score = this.lastScore ?? zeroScore();
      const result = this.lastResult;
      const payload = buildReleaseSnapshotPayload({
        kind,
        score,
        certificationStatus: result?.certification.status ?? "unknown",
        deploymentRisk: result?.deployment.deploymentRisk ?? 0,
        rollbackReadiness: result?.rollback.score ?? 0,
        checklistCompletion: result?.checklist.completionPct ?? 0,
        criticalRiskCount: result?.risks.criticalCount ?? 0,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        releaseScore: score.overall,
        scoreBreakdown: score,
        status: result?.certification.status,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildReleaseSnapshotPayload({
          kind,
          score: zeroScore(),
          certificationStatus: "error",
          deploymentRisk: 0,
          rollbackReadiness: 0,
          checklistCompletion: 0,
          criticalRiskCount: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareReleaseSnapshots(
    baselineId: string,
    compareId: string
  ): ReleaseSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareReleaseSnapshots(a, b);
  }

  listSnapshots(): ReleaseSnapshot[] {
    return this.snapshots.list();
  }

  getReleaseMetrics(): ReleaseOperationalMetrics {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getReleaseHealthScore(): ReleaseHealthScore {
    return this.lastScore ?? zeroScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastResult(): ReleaseRunResult | null {
    return this.lastResult;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastResult = null;
    this.lastScore = null;
  }

  private runInternal(options: CertifyReleaseOptions): ReleaseRunResult {
    const started = Date.now();
    const readiness = this.readinessEvaluator.evaluate(
      listReleaseSources(),
      options.overrides
    );
    const checklist = this.checklist.evaluate(
      options.checklistProfile ?? this.config.checklistProfile,
      options.checklistOverrides
    );
    const rollback = this.rollbackReadiness.evaluate({
      checklist,
      score: readiness.score,
      versionCompatible: (options.versionCompatibility ?? 90) >= 70,
    });
    const deployment = this.deploymentAnalyzer.analyze({
      score: readiness.score,
      checklist,
      rollback,
      configurationDrift: options.configurationDrift,
      migrationReadiness: options.migrationReadiness,
      versionCompatibility: options.versionCompatibility,
    });
    const risks = this.riskAssessment.assess({
      score: readiness.score,
      checklist,
      deploymentRiskHint: deployment.deploymentRisk,
      rollbackReadiness: rollback.score,
    });
    const certification = this.certificationEngine.certify({
      score: readiness.score,
      risks,
      checklist,
      deployment,
      rollback,
    });

    return {
      readiness,
      checklist,
      risks,
      rollback,
      deployment,
      certification,
      executionTimeMs: Date.now() - started,
      warnings: [
        ...readiness.warnings,
        ...checklist.warnings,
        ...risks.warnings,
        ...rollback.warnings,
        ...deployment.warnings,
        ...certification.warnings,
      ],
      errors: [
        ...readiness.errors,
        ...checklist.errors,
        ...risks.errors,
        ...rollback.errors,
        ...deployment.errors,
        ...certification.errors,
      ],
    };
  }
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

const BUILTIN_SOURCES: Array<{
  kind: ReleaseSourceKind;
  label: string;
  module: string;
  healthScore: number;
  testCoverage: number;
  securityScore: number;
  complianceScore: number;
  performanceScore: number;
  reliabilityScore: number;
  documentationScore: number;
  weight: number;
}> = [
  { kind: "orchestrator", label: "Validation Orchestrator", module: "orchestrator", healthScore: 92, testCoverage: 88, securityScore: 90, complianceScore: 90, performanceScore: 86, reliabilityScore: 91, documentationScore: 85, weight: 1.2 },
  { kind: "integrity", label: "Integrity Engine", module: "integrity", healthScore: 90, testCoverage: 87, securityScore: 88, complianceScore: 89, performanceScore: 85, reliabilityScore: 90, documentationScore: 84, weight: 1.1 },
  { kind: "trade", label: "Trade Validation", module: "tradeSetup", healthScore: 88, testCoverage: 85, securityScore: 86, complianceScore: 87, performanceScore: 84, reliabilityScore: 88, documentationScore: 82, weight: 1 },
  { kind: "trust", label: "Trust Engine", module: "trust", healthScore: 89, testCoverage: 86, securityScore: 88, complianceScore: 88, performanceScore: 85, reliabilityScore: 89, documentationScore: 83, weight: 1 },
  { kind: "analytics", label: "Analytics Engine", module: "analytics", healthScore: 87, testCoverage: 84, securityScore: 85, complianceScore: 86, performanceScore: 83, reliabilityScore: 86, documentationScore: 81, weight: 0.9 },
  { kind: "performance", label: "Performance Engine", module: "performance", healthScore: 86, testCoverage: 83, securityScore: 84, complianceScore: 85, performanceScore: 90, reliabilityScore: 87, documentationScore: 80, weight: 0.9 },
  { kind: "learning", label: "Learning Engine", module: "learning", healthScore: 85, testCoverage: 82, securityScore: 84, complianceScore: 85, performanceScore: 82, reliabilityScore: 85, documentationScore: 80, weight: 0.8 },
  { kind: "simulation", label: "Simulation Engine", module: "simulation", healthScore: 86, testCoverage: 83, securityScore: 84, complianceScore: 85, performanceScore: 83, reliabilityScore: 86, documentationScore: 81, weight: 0.8 },
  { kind: "explainability", label: "Explainability Engine", module: "explainability", healthScore: 87, testCoverage: 84, securityScore: 85, complianceScore: 86, performanceScore: 82, reliabilityScore: 86, documentationScore: 84, weight: 0.8 },
  { kind: "compliance", label: "Compliance Engine", module: "compliance", healthScore: 90, testCoverage: 86, securityScore: 89, complianceScore: 93, performanceScore: 84, reliabilityScore: 89, documentationScore: 88, weight: 1.1 },
  { kind: "security", label: "Security Engine", module: "security", healthScore: 91, testCoverage: 87, securityScore: 94, complianceScore: 90, performanceScore: 85, reliabilityScore: 90, documentationScore: 86, weight: 1.2 },
  { kind: "versioning", label: "Versioning Engine", module: "versioning", healthScore: 88, testCoverage: 85, securityScore: 86, complianceScore: 87, performanceScore: 84, reliabilityScore: 88, documentationScore: 83, weight: 0.9 },
  { kind: "reliability", label: "Reliability Engine", module: "reliability", healthScore: 90, testCoverage: 86, securityScore: 87, complianceScore: 88, performanceScore: 86, reliabilityScore: 93, documentationScore: 84, weight: 1 },
  { kind: "dashboard", label: "Validation Dashboard", module: "dashboard", healthScore: 84, testCoverage: 80, securityScore: 83, complianceScore: 84, performanceScore: 82, reliabilityScore: 84, documentationScore: 82, weight: 0.7 },
  { kind: "reporting", label: "Reporting Engine", module: "reporting", healthScore: 85, testCoverage: 81, securityScore: 84, complianceScore: 85, performanceScore: 81, reliabilityScore: 85, documentationScore: 86, weight: 0.8 },
  { kind: "observability", label: "Observability Engine", module: "observability", healthScore: 88, testCoverage: 84, securityScore: 86, complianceScore: 86, performanceScore: 87, reliabilityScore: 89, documentationScore: 83, weight: 0.8 },
  { kind: "knowledge", label: "Knowledge Graph", module: "knowledge", healthScore: 86, testCoverage: 82, securityScore: 84, complianceScore: 85, performanceScore: 82, reliabilityScore: 86, documentationScore: 84, weight: 0.8 },
  { kind: "events", label: "Validation Event Bus", module: "events", healthScore: 92, testCoverage: 88, securityScore: 90, complianceScore: 89, performanceScore: 91, reliabilityScore: 92, documentationScore: 85, weight: 0.7 },
];

export function registerBuiltinReleaseSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinReleaseSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listReleaseSources().length,
      total: listReleaseSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const src of BUILTIN_SOURCES) {
    const result = registerReleaseSource(
      {
        sourceId: createReleaseSourceId(src.kind),
        kind: src.kind,
        label: src.label,
        module: src.module,
        healthScore: src.healthScore,
        testCoverage: src.testCoverage,
        securityScore: src.securityScore,
        complianceScore: src.complianceScore,
        performanceScore: src.performanceScore,
        reliabilityScore: src.reliabilityScore,
        documentationScore: src.documentationScore,
        weight: src.weight,
        metadata: { integration: "read-only-certification", sprint: "9F.30" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinReleaseSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listReleaseSources().length,
  };
}

export interface ReleaseRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerRelease(options?: {
  engine?: ValidationReleaseEngine;
  config?: ReleaseConfigurationInput;
  force?: boolean;
}): ReleaseRegistrationResult {
  return registerValidationReleaseEngine(options);
}

export function registerValidationReleaseEngine(options?: {
  engine?: ValidationReleaseEngine;
  config?: ReleaseConfigurationInput;
  force?: boolean;
}): ReleaseRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listReleaseSources().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationReleaseEngine(options?.config);
  }

  const builtins = registerBuiltinReleaseSources({ force: options?.force });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
  };
}

export function getValidationReleaseEngine(
  options?: ReleaseConfigurationInput
): ValidationReleaseEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationReleaseEngine(options);
    registerBuiltinReleaseSources();
  }
  return defaultEngine;
}

export function resetValidationReleaseEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetReleaseRegistry();
}

/** Public API convenience wrappers. */
export function evaluateReadiness(options?: EvaluateReadinessOptions) {
  registerRelease();
  return getValidationReleaseEngine().evaluateReadiness(options);
}

export function certifyRelease(options?: CertifyReleaseOptions) {
  registerRelease();
  return getValidationReleaseEngine().certifyRelease(options);
}

export function analyzeDeployment(options?: AnalyzeDeploymentOptions) {
  registerRelease();
  return getValidationReleaseEngine().analyzeDeployment(options);
}

export function createReleaseSnapshot(
  label?: string,
  kind?: ReleaseSnapshotKind
) {
  registerRelease();
  return getValidationReleaseEngine().createReleaseSnapshot(label, kind);
}

export function getReleaseMetrics() {
  registerRelease();
  return getValidationReleaseEngine().getReleaseMetrics();
}

export {
  DEFAULT_RELEASE_CONFIGURATION,
  resolveReleaseConfiguration,
};
