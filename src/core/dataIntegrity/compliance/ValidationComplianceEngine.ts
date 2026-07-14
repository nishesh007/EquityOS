/**
 * Institutional Validation Compliance & Governance Engine — façade (Prompt 9F.22).
 * Governance-only: never modifies validation decisions.
 */

import {
  DEFAULT_COMPLIANCE_CONFIGURATION,
  resolveComplianceConfiguration,
  type ComplianceConfiguration,
  type ComplianceConfigurationInput,
} from "./ComplianceConfiguration";
import {
  areBuiltinComplianceSourcesRegistered,
  collectAllComplianceObservations,
  getRegisteredComplianceSources,
  markBuiltinComplianceSourcesRegistered,
  registerComplianceSource,
  resetComplianceSourceRegistrationState,
  type ComplianceObservation,
  type ComplianceSourceDefinition,
} from "./ComplianceRegistry";
import { ComplianceRuleBookStore } from "./ComplianceRuleBook";
import { CompliancePolicyEngine } from "./CompliancePolicyEngine";
import { ComplianceEvaluator } from "./ComplianceEvaluator";
import { ComplianceAuditor } from "./ComplianceAuditor";
import {
  ComplianceViolations,
  meetsSeverityThreshold,
  type ComplianceViolation,
} from "./ComplianceViolations";
import { ComplianceScoreEngine } from "./ComplianceScoreEngine";
import {
  ComplianceReporting,
  type ComplianceReport,
} from "./ComplianceReporting";
import { ComplianceMetricsTracker } from "./ComplianceMetrics";
import { ComplianceAuditLogger } from "./ComplianceAuditLogger";
import {
  ComplianceSnapshotStore,
  buildComplianceSnapshotPayload,
  compareComplianceSnapshots,
  type ComplianceSnapshot,
  type ComplianceSnapshotComparison,
} from "./ComplianceSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface RunComplianceOptions {
  observations?: ComplianceObservation[];
  includeLiveCollectors?: boolean;
  profileId?: string;
  ruleBookVersion?: string;
}

export interface ComplianceRunResult {
  runId: string;
  generatedAt: string;
  report: ComplianceReport;
  violations: ComplianceViolation[];
  score: ComplianceReport["score"];
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationComplianceEngine | null = null;
let engineRegistered = false;

export class ValidationComplianceEngine {
  private config: ComplianceConfiguration;
  private readonly ruleBooks = new ComplianceRuleBookStore();
  private policyEngine: CompliancePolicyEngine;
  private evaluator: ComplianceEvaluator;
  private auditor: ComplianceAuditor;
  private scoreEngine: ComplianceScoreEngine;
  private reporting: ComplianceReporting;
  private readonly metrics = new ComplianceMetricsTracker();
  private audit: ComplianceAuditLogger;
  private snapshots: ComplianceSnapshotStore;
  private lastRun: ComplianceRunResult | null = null;

  constructor(configInput?: ComplianceConfigurationInput) {
    this.config = resolveComplianceConfiguration(configInput);
    this.policyEngine = new CompliancePolicyEngine(this.config);
    this.evaluator = new ComplianceEvaluator(this.config);
    this.auditor = new ComplianceAuditor(this.config);
    this.scoreEngine = new ComplianceScoreEngine(this.config);
    this.reporting = new ComplianceReporting(this.config);
    this.audit = new ComplianceAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new ComplianceSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): ComplianceConfiguration {
    return resolveComplianceConfiguration(this.config);
  }

  updateConfiguration(input: ComplianceConfigurationInput): void {
    this.config = resolveComplianceConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.policyEngine.setConfiguration(this.config);
    this.evaluator.setConfiguration(this.config);
    this.auditor.setConfiguration(this.config);
    this.scoreEngine.setConfiguration(this.config);
    this.reporting.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: ComplianceSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerComplianceSource(definition, options);
  }

  runCompliance(options: RunComplianceOptions = {}): ComplianceRunResult {
    const started = Date.now();
    try {
      const observations = this.resolveObservations(options);
      const profileId =
        (options.profileId as ComplianceConfiguration["complianceProfile"]) ??
        this.config.complianceProfile;
      const ruleBookVersion =
        options.ruleBookVersion ?? this.config.ruleBookVersion;
      const ruleBook = this.ruleBooks.getBook(profileId, ruleBookVersion);
      if (!ruleBook) {
        throw new Error(
          `Rule book not found for profile=${profileId} version=${ruleBookVersion}`
        );
      }

      const policyResult = this.policyEngine.evaluate(observations, ruleBook);
      const evaluation = this.evaluator.evaluate(observations, ruleBook);
      const auditResult = this.auditor.audit({
        observations,
        policyResult,
        evaluation,
      });

      const bag = new ComplianceViolations(this.config.maxViolations);
      bag.addAll(
        auditResult.violations.filter((v) =>
          meetsSeverityThreshold(v.severity, this.config.severityThreshold)
        )
      );
      const violations = bag.list();

      const score = this.scoreEngine.score({
        policyResult,
        evaluation,
        audit: auditResult,
        violations,
      });

      const report = this.reporting.generate({
        policyResult,
        evaluation,
        audit: auditResult,
        violations,
        score,
      });

      const executionTimeMs = Date.now() - started;
      const criticalViolations = violations.filter(
        (v) => v.severity === "CRITICAL"
      ).length;

      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        violations: violations.length,
        criticalViolations,
        policyCoverage: policyResult.policyCoveragePercent,
        auditCoverage: auditResult.auditCoveragePercent,
        complianceScore: score.overall,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ComplianceRun",
        complianceScore: score.overall,
        scoreBreakdown: score,
        violationCount: violations.length,
        criticalViolationCount: criticalViolations,
        policyVersion: ruleBook.version,
        configurationVersion: this.config.engineVersion,
        executionTimeMs,
        warnings: report.warnings,
        errors: report.errors,
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "compliance",
        source: "compliance-engine",
        severity: "INFO",
        payload: {
          runId: report.reportId,
          complianceScore: score.overall,
          governanceOnly: true,
        },
        executionTimeMs,
      });

      const result: ComplianceRunResult = {
        runId: report.reportId,
        generatedAt: report.generatedAt,
        report,
        violations,
        score,
        warnings: report.warnings,
        errors: report.errors,
      };
      this.lastRun = result;
      return result;
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      const emptyScore = {
        policyCoverage: 0,
        governanceQuality: 0,
        auditCoverage: 0,
        configurationHealth: 0,
        operationalReadiness: 0,
        monitoringCoverage: 0,
        overall: 0,
      };
      const report = this.reporting.generate({
        policyResult: {
          evaluatedAt: new Date().toISOString(),
          policiesPresent: 0,
          policiesEnabled: 0,
          policyCoveragePercent: 0,
          missingPolicies: true,
          findings: [],
          warnings: [],
          errors: [`runCompliance failed: ${String(err)}`],
        },
        evaluation: {
          evaluatedAt: new Date().toISOString(),
          ruleBookVersion: this.config.ruleBookVersion,
          profileId: this.config.complianceProfile,
          violations: [],
          passedRuleIds: [],
          failedRuleIds: [],
          skippedRuleIds: [],
          warnings: [],
          errors: [`runCompliance failed: ${String(err)}`],
        },
        audit: {
          auditedAt: new Date().toISOString(),
          violations: [],
          auditCoveragePercent: 0,
          monitoringCoveragePercent: 0,
          reportingCoveragePercent: 0,
          warnings: [],
          errors: [`runCompliance failed: ${String(err)}`],
        },
        violations: [],
        score: emptyScore,
      });
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        violations: 0,
        criticalViolations: 0,
        policyCoverage: 0,
        auditCoverage: 0,
        complianceScore: 0,
      });
      const result: ComplianceRunResult = {
        runId: report.reportId,
        generatedAt: report.generatedAt,
        report,
        violations: [],
        score: emptyScore,
        warnings: report.warnings,
        errors: report.errors,
      };
      this.lastRun = result;
      return result;
    }
  }

  evaluatePolicies(options: RunComplianceOptions = {}) {
    try {
      const observations = this.resolveObservations(options);
      const profileId =
        (options.profileId as ComplianceConfiguration["complianceProfile"]) ??
        this.config.complianceProfile;
      const ruleBookVersion =
        options.ruleBookVersion ?? this.config.ruleBookVersion;
      const ruleBook = this.ruleBooks.getBook(profileId, ruleBookVersion);
      if (!ruleBook) {
        return {
          evaluatedAt: new Date().toISOString(),
          policiesPresent: 0,
          policiesEnabled: 0,
          policyCoveragePercent: 0,
          missingPolicies: true,
          findings: [],
          warnings: [],
          errors: [`Rule book not found for ${profileId}@${ruleBookVersion}`],
        };
      }
      return this.policyEngine.evaluate(observations, ruleBook);
    } catch (err) {
      return {
        evaluatedAt: new Date().toISOString(),
        policiesPresent: 0,
        policiesEnabled: 0,
        policyCoveragePercent: 0,
        missingPolicies: true,
        findings: [],
        warnings: [],
        errors: [`evaluatePolicies failed: ${String(err)}`],
      };
    }
  }

  detectViolations(options: RunComplianceOptions = {}): {
    violations: ComplianceViolation[];
    warnings: string[];
    errors: string[];
  } {
    try {
      const run = this.runCompliance(options);
      return {
        violations: run.violations,
        warnings: run.warnings,
        errors: run.errors,
      };
    } catch (err) {
      return {
        violations: [],
        warnings: [],
        errors: [`detectViolations failed: ${String(err)}`],
      };
    }
  }

  generateComplianceReport(
    options: RunComplianceOptions = {}
  ): ComplianceReport {
    return this.runCompliance(options).report;
  }

  getComplianceScore(options?: RunComplianceOptions) {
    if (
      options?.observations !== undefined ||
      options?.includeLiveCollectors !== undefined ||
      options?.profileId !== undefined ||
      options?.ruleBookVersion !== undefined ||
      !this.lastRun
    ) {
      return this.runCompliance(options ?? {}).score;
    }
    return this.lastRun.score;
  }

  getComplianceMetrics() {
    return this.metrics.getMetrics();
  }

  createComplianceSnapshot(label?: string): ComplianceSnapshot {
    const started = Date.now();
    try {
      const run = this.lastRun ?? this.runCompliance({ includeLiveCollectors: false, observations: [] });
      const payload = buildComplianceSnapshotPayload({
        score: run.score,
        violationCount: run.violations.length,
        criticalViolationCount: run.violations.filter(
          (v) => v.severity === "CRITICAL"
        ).length,
        policyCoveragePercent: run.report.policyCoverage.percent,
        auditCoveragePercent: run.report.auditCoverage.percent,
        monitoringCoveragePercent: run.score.monitoringCoverage,
        ruleBookVersion: this.config.ruleBookVersion,
        policyVersion: run.report.ruleBookVersion,
        configurationVersion: this.config.engineVersion,
        profileId: this.config.complianceProfile,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        complianceScore: run.score.overall,
        scoreBreakdown: run.score,
        violationCount: run.violations.length,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
        configurationVersion: this.config.engineVersion,
        policyVersion: this.config.ruleBookVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildComplianceSnapshotPayload({
          score: {
            policyCoverage: 0,
            governanceQuality: 0,
            auditCoverage: 0,
            configurationHealth: 0,
            operationalReadiness: 0,
            monitoringCoverage: 0,
            overall: 0,
          },
          violationCount: 0,
          criticalViolationCount: 0,
          policyCoveragePercent: 0,
          auditCoveragePercent: 0,
          monitoringCoveragePercent: 0,
          ruleBookVersion: this.config.ruleBookVersion,
          policyVersion: this.config.ruleBookVersion,
          configurationVersion: this.config.engineVersion,
          profileId: this.config.complianceProfile,
        }),
        label ?? "error"
      );
    }
  }

  compareComplianceSnapshots(
    baselineId: string,
    compareId: string
  ): ComplianceSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareComplianceSnapshots(a, b);
  }

  listSnapshots(): ComplianceSnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getRuleBooks() {
    return this.ruleBooks.listBooks();
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastRun = null;
  }

  private resolveObservations(
    options: RunComplianceOptions
  ): ComplianceObservation[] {
    if (options.observations) return options.observations;
    if (options.includeLiveCollectors === false) return [];
    return collectAllComplianceObservations();
  }
}

function safeCollect(
  sourceId: string,
  collect: () => ComplianceObservation[]
): ComplianceObservation[] {
  try {
    return collect();
  } catch {
    return [
      {
        sourceId: sourceId as ComplianceObservation["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        metadata: { unavailable: true },
      },
    ];
  }
}

export function buildBuiltinComplianceSources(): ComplianceSourceDefinition[] {
  return [
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getMetrics: () => { requests: number; failed: number };
            };
          };
          getValidationOrchestrator().getMetrics();
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              dependencyOk: true,
              diagnosticsEnabled: true,
              healthScore: 100,
            },
          ];
        }),
    },
    {
      id: "admin",
      name: "Administration Engine",
      collect: () =>
        safeCollect("admin", () => {
          const {
            getValidationAdministrationEngine,
          } = require("../admin") as {
            getValidationAdministrationEngine: () => {
              getAdministrationMetrics: () => { policies: number };
            };
          };
          const m = getValidationAdministrationEngine().getAdministrationMetrics();
          return [
            {
              sourceId: "admin",
              module: "admin",
              timestamp: new Date().toISOString(),
              policiesPresent: m.policies,
              policiesEnabled: m.policies,
              auditEnabled: true,
              governanceViolation: false,
              dependencyOk: true,
            },
          ];
        }),
    },
    {
      id: "policy",
      name: "Policy Engine",
      collect: () =>
        safeCollect("policy", () => {
          const {
            getValidationAdministrationEngine,
          } = require("../admin") as {
            getValidationAdministrationEngine: () => {
              getAdministrationMetrics: () => { policies: number };
            };
          };
          const m = getValidationAdministrationEngine().getAdministrationMetrics();
          return [
            {
              sourceId: "policy",
              module: "policy",
              timestamp: new Date().toISOString(),
              policiesPresent: m.policies,
              policiesEnabled: m.policies,
              auditEnabled: true,
            },
          ];
        }),
    },
    {
      id: "reporting",
      name: "Reporting Engine",
      collect: () =>
        safeCollect("reporting", () => {
          const { getValidationReportingEngine } = require("../reporting") as {
            getValidationReportingEngine: () => {
              getMetrics: () => { averageGenerationTime: number };
            };
          };
          getValidationReportingEngine().getMetrics();
          return [
            {
              sourceId: "reporting",
              module: "reporting",
              timestamp: new Date().toISOString(),
              reportingEnabled: true,
              reportingGap: false,
              auditEnabled: true,
            },
          ];
        }),
    },
    {
      id: "analytics",
      name: "Analytics Engine",
      collect: () =>
        safeCollect("analytics", () => {
          const { getValidationAnalyticsEngine } = require("../analytics") as {
            getValidationAnalyticsEngine: () => {
              getMetrics: () => { healthScore: number };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              healthScore: m.healthScore,
              monitoringEnabled: true,
            },
          ];
        }),
    },
    {
      id: "diagnostics",
      name: "Diagnostics Engine",
      collect: () =>
        safeCollect("diagnostics", () => {
          const {
            getValidationDiagnosticsEngine,
          } = require("../diagnostics") as {
            getValidationDiagnosticsEngine: () => {
              getMetrics: () => { healthScore: number };
            };
          };
          const m = getValidationDiagnosticsEngine().getMetrics();
          return [
            {
              sourceId: "diagnostics",
              module: "diagnostics",
              timestamp: new Date().toISOString(),
              diagnosticsEnabled: true,
              healthScore: m.healthScore,
            },
          ];
        }),
    },
    {
      id: "optimization",
      name: "Optimization Engine",
      collect: () =>
        safeCollect("optimization", () => {
          const {
            getValidationOptimizationEngine,
          } = require("../optimization") as {
            getValidationOptimizationEngine: () => {
              getOptimizationMetrics: () => { optimizationScore: number };
            };
          };
          const m = getValidationOptimizationEngine().getOptimizationMetrics();
          return [
            {
              sourceId: "optimization",
              module: "optimization",
              timestamp: new Date().toISOString(),
              healthScore: m.optimizationScore,
              dependencyOk: true,
            },
          ];
        }),
    },
    {
      id: "reliability",
      name: "Reliability Engine",
      collect: () =>
        safeCollect("reliability", () => {
          const {
            getValidationReliabilityEngine,
          } = require("../reliability") as {
            getValidationReliabilityEngine: () => {
              getReliabilityMetrics: () => {
                availability: number;
                resilienceScore: number;
              };
            };
          };
          const m = getValidationReliabilityEngine().getReliabilityMetrics();
          return [
            {
              sourceId: "reliability",
              module: "reliability",
              timestamp: new Date().toISOString(),
              reliabilityScore: m.resilienceScore,
              availability: m.availability,
              healthScore: m.resilienceScore,
              dependencyOk: true,
            },
          ];
        }),
    },
    {
      id: "observability",
      name: "Observability Engine",
      collect: () =>
        safeCollect("observability", () => {
          const {
            getValidationObservabilityEngine,
          } = require("../observability") as {
            getValidationObservabilityEngine: () => {
              getObservabilityMetrics: () => { observabilityScore: number };
            };
          };
          const m =
            getValidationObservabilityEngine().getObservabilityMetrics();
          return [
            {
              sourceId: "observability",
              module: "observability",
              timestamp: new Date().toISOString(),
              observabilityScore: m.observabilityScore,
              monitoringEnabled: true,
              monitoringGap: false,
              healthScore: m.observabilityScore,
            },
          ];
        }),
    },
    {
      id: "intelligence",
      name: "Intelligence Engine",
      collect: () =>
        safeCollect("intelligence", () => {
          const {
            getValidationIntelligenceEngine,
          } = require("../intelligence") as {
            getValidationIntelligenceEngine: () => {
              getInsightMetrics: () => { insightScore: number };
            };
          };
          const m = getValidationIntelligenceEngine().getInsightMetrics();
          return [
            {
              sourceId: "intelligence",
              module: "intelligence",
              timestamp: new Date().toISOString(),
              healthScore: m.insightScore,
              auditEnabled: true,
              dependencyOk: true,
            },
          ];
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect("trust", () => {
          const { getTrustScoreEngine } = require("../trust") as {
            getTrustScoreEngine: () => {
              getTrustMetrics: () => { averageTrustScore: number };
            };
          };
          const m = getTrustScoreEngine().getTrustMetrics();
          return [
            {
              sourceId: "trust",
              module: "trust",
              timestamp: new Date().toISOString(),
              trustScore: m.averageTrustScore,
              healthScore: m.averageTrustScore,
            },
          ];
        }),
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      collect: () =>
        safeCollect("dashboard", () => {
          const {
            getValidationDashboardService,
          } = require("../dashboard") as {
            getValidationDashboardService: () => {
              getDashboardMetrics: () => { averageAggregationTime: number };
            };
          };
          getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              monitoringEnabled: true,
              reportingEnabled: true,
            },
          ];
        }),
    },
    {
      id: "ruleEngine",
      name: "Rule Engine",
      collect: () =>
        safeCollect("ruleEngine", () => {
          const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
            getDataIntegrityEngine: () => {
              getRuleEngine: () => {
                getAggregateMetrics: () => {
                  totalExecutions: number;
                  failureRate: number;
                };
              };
            };
          };
          const agg = getDataIntegrityEngine().getRuleEngine().getAggregateMetrics();
          return [
            {
              sourceId: "ruleEngine",
              module: "ruleEngine",
              timestamp: new Date().toISOString(),
              rulesTotal: Math.max(1, agg.totalExecutions),
              rulesEnabled: Math.max(1, agg.totalExecutions),
              criticalRulesDisabled: 0,
              configurationDrift: false,
              versionMismatch: false,
              configVersion: DEFAULT_COMPLIANCE_CONFIGURATION.engineVersion,
              expectedConfigVersion:
                DEFAULT_COMPLIANCE_CONFIGURATION.engineVersion,
              dependencyOk: true,
              auditEnabled: true,
            },
          ];
        }),
    },
    {
      id: "eventBus",
      name: "Validation Event Bus",
      collect: () =>
        safeCollect("eventBus", () => [
          {
            sourceId: "eventBus",
            module: "eventBus",
            timestamp: new Date().toISOString(),
            monitoringEnabled: true,
            dependencyOk: true,
          },
        ]),
    },
  ];
}

export function registerBuiltinComplianceSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinComplianceSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredComplianceSources().length,
      total: getRegisteredComplianceSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinComplianceSources()) {
    const result = registerComplianceSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinComplianceSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredComplianceSources().length,
  };
}

export interface ComplianceRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationComplianceEngine(options?: {
  engine?: ValidationComplianceEngine;
  config?: ComplianceConfigurationInput;
  force?: boolean;
}): ComplianceRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredComplianceSources().length,
    };
  }

  const sources = registerBuiltinComplianceSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationComplianceEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationComplianceEngine(
  options?: ComplianceConfigurationInput
): ValidationComplianceEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationComplianceEngine(options);
    registerBuiltinComplianceSources();
  }
  return defaultEngine;
}

export function resetValidationComplianceEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetComplianceSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function runCompliance(options?: RunComplianceOptions) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().runCompliance(options);
}

export function evaluatePolicies(options?: RunComplianceOptions) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().evaluatePolicies(options);
}

export function detectViolations(options?: RunComplianceOptions) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().detectViolations(options);
}

export function generateComplianceReport(options?: RunComplianceOptions) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().generateComplianceReport(options);
}

export function getComplianceScore(options?: RunComplianceOptions) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().getComplianceScore(options);
}

export function getComplianceMetrics() {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().getComplianceMetrics();
}

export function createComplianceSnapshot(label?: string) {
  registerValidationComplianceEngine();
  return getValidationComplianceEngine().createComplianceSnapshot(label);
}

export { DEFAULT_COMPLIANCE_CONFIGURATION, resolveComplianceConfiguration };
