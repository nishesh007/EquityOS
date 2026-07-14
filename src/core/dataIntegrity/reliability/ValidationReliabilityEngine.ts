/**
 * Institutional Validation Reliability & Resilience Engine — façade (Prompt 9F.19).
 * Robustness only: never alters validation decisions or correctness.
 */

import {
  DEFAULT_RELIABILITY_CONFIGURATION,
  resolveReliabilityConfiguration,
  type ReliabilityConfiguration,
  type ReliabilityConfigurationInput,
} from "./ReliabilityConfiguration";
import {
  areBuiltinReliabilitySourcesRegistered,
  collectAllReliabilityProbes,
  getRegisteredReliabilitySources,
  markBuiltinReliabilitySourcesRegistered,
  registerReliabilitySource,
  resetReliabilitySourceRegistrationState,
  type FailureKind,
  type ReliabilityProbe,
  type ReliabilitySourceDefinition,
} from "./ReliabilityRegistry";
import { CircuitBreaker, type CircuitBreakerStatus } from "./CircuitBreaker";
import { RetryManager } from "./RetryManager";
import { TimeoutManager, type TimeoutScope } from "./TimeoutManager";
import {
  FailureRecovery,
  type RecoveryTargetType,
} from "./FailureRecovery";
import { GracefulDegradation } from "./GracefulDegradation";
import { HealthSupervisor } from "./HealthSupervisor";
import { ReliabilityMonitor } from "./ReliabilityMonitor";
import { ReliabilityMetricsTracker } from "./ReliabilityMetrics";
import { ReliabilityAuditLogger } from "./ReliabilityAuditLogger";
import {
  ReliabilitySnapshotStore,
  compareReliabilitySnapshots,
  type ReliabilitySnapshot,
  type ReliabilitySnapshotComparison,
} from "./ReliabilitySnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface CheckHealthOptions {
  probes?: ReliabilityProbe[];
  includeLiveCollectors?: boolean;
}

let defaultEngine: ValidationReliabilityEngine | null = null;
let engineRegistered = false;

export class ValidationReliabilityEngine {
  private config: ReliabilityConfiguration;
  private circuitBreaker: CircuitBreaker;
  private retryManager: RetryManager;
  private timeoutManager: TimeoutManager;
  private failureRecovery: FailureRecovery;
  private readonly degradation = new GracefulDegradation();
  private healthSupervisor: HealthSupervisor;
  private monitor: ReliabilityMonitor;
  private readonly metrics = new ReliabilityMetricsTracker();
  private audit: ReliabilityAuditLogger;
  private snapshots: ReliabilitySnapshotStore;
  private successfulRetries = 0;
  private lastHealth: ReturnType<ReliabilityMonitor["buildReport"]> | null =
    null;

  constructor(configInput?: ReliabilityConfigurationInput) {
    this.config = resolveReliabilityConfiguration(configInput);
    this.circuitBreaker = new CircuitBreaker(this.config);
    this.retryManager = new RetryManager(this.config);
    this.timeoutManager = new TimeoutManager(this.config);
    this.failureRecovery = new FailureRecovery(this.config);
    this.healthSupervisor = new HealthSupervisor(this.config);
    this.monitor = new ReliabilityMonitor(this.config);
    this.audit = new ReliabilityAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new ReliabilitySnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): ReliabilityConfiguration {
    return resolveReliabilityConfiguration(this.config);
  }

  updateConfiguration(input: ReliabilityConfigurationInput): void {
    this.config = resolveReliabilityConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.circuitBreaker.setConfiguration(this.config);
    this.retryManager.setConfiguration(this.config);
    this.timeoutManager.setConfiguration(this.config);
    this.failureRecovery.setConfiguration(this.config);
    this.healthSupervisor.setConfiguration(this.config);
    this.monitor.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: ReliabilitySourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerReliabilitySource(definition, options);
  }

  checkHealth(options: CheckHealthOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      const health = this.healthSupervisor.checkHealth(probes);
      const degradation = this.degradation.evaluate(probes);
      const report = this.monitor.buildReport({
        health,
        degradation,
        circuits: this.circuitBreaker.listCircuits(),
        recoveryRate: this.failureRecovery.getRecoveryRate(),
        timeoutCount: this.timeoutManager.getTimeoutCount(),
        retryCount: this.metrics.getMetrics().retryCount,
        successfulRetries: this.successfulRetries,
      });

      this.lastHealth = report;
      this.metrics.recordHealthCheck({
        availability: report.health.availabilityPct,
        resilienceScore: report.resilienceScore.overall,
      });
      this.metrics.setRecovery(
        this.failureRecovery.getRecoveryRate(),
        this.failureRecovery.getAverageRecoveryTime()
      );
      this.metrics.setTimeoutCount(this.timeoutManager.getTimeoutCount());
      this.metrics.setCircuitTrips(this.circuitBreaker.getTripCount());
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "HealthChecked",
        resilienceScore: report.resilienceScore.overall,
        scoreBreakdown: report.resilienceScore,
        warnings: report.warnings,
        errors: report.errors,
        engineVersion: this.config.engineVersion,
      });

      if (degradation.degraded) {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "Degradation",
          message: `status=${degradation.status}`,
          warnings: degradation.warnings,
          errors: degradation.errors,
          engineVersion: this.config.engineVersion,
        });
        safePublishEvent({
          eventType: "WarningRaised",
          module: "reliability",
          source: "reliability-engine",
          severity:
            degradation.status === "CRITICAL_PROTECTED" ? "CRITICAL" : "WARNING",
          payload: {
            status: degradation.status,
            skipped: degradation.skippedAdvisoryModules,
            resilienceScore: report.resilienceScore.overall,
          },
        });
      }

      return report;
    } catch (err) {
      return {
        resilienceScore: {
          availability: 0,
          recoverySuccess: 0,
          timeoutStability: 0,
          retryEfficiency: 0,
          healthStability: 0,
          gracefulDegradation: 0,
          overall: 0,
        },
        health: {
          overallStatus: "UNKNOWN" as const,
          overallHealthScore: 0,
          availabilityPct: 0,
          modules: [],
          unhealthyModules: [],
          checkedAt: new Date().toISOString(),
          warnings: [],
          errors: [`checkHealth failed: ${String(err)}`],
        },
        degradation: {
          degraded: true,
          decisions: [],
          skippedAdvisoryModules: [],
          continuedCoreModules: [],
          protectedCriticalModules: [],
          status: "DEGRADED" as const,
          warnings: [],
          errors: [String(err)],
          scoreContribution: 0,
        },
        openCircuits: [],
        monitoredAt: new Date().toISOString(),
        warnings: [],
        errors: [`checkHealth failed: ${String(err)}`],
      };
    }
  }

  runRecovery(input: {
    targetType: RecoveryTargetType;
    targetId: string;
    failureKind?: FailureKind;
    probes?: ReliabilityProbe[];
  }) {
    try {
      const result = this.failureRecovery.runRecovery(input);
      this.metrics.setRecovery(
        this.failureRecovery.getRecoveryRate(),
        this.failureRecovery.getAverageRecoveryTime()
      );
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: result.recovered ? "Recovery" : "Failure",
        targetId: input.targetId,
        message: result.strategy,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        recoveryId: `recov:error:${Math.random().toString(36).slice(2, 8)}`,
        targetType: input.targetType,
        targetId: input.targetId,
        strategy: "failed",
        recovered: false,
        partial: false,
        fallbackUsed: false,
        durationMs: 0,
        warnings: [],
        errors: [`runRecovery failed: ${String(err)}`],
      };
    }
  }

  tripCircuit(circuitId: string, reason?: string): CircuitBreakerStatus {
    try {
      const status = this.circuitBreaker.tripCircuit(circuitId, reason);
      this.metrics.setCircuitTrips(this.circuitBreaker.getTripCount());
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CircuitStateChanged",
        targetId: circuitId,
        circuitState: status.state,
        message: reason,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return status;
    } catch {
      return this.circuitBreaker.getOrCreate(circuitId);
    }
  }

  resetCircuit(circuitId: string): CircuitBreakerStatus {
    try {
      const status = this.circuitBreaker.resetCircuit(circuitId);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CircuitStateChanged",
        targetId: circuitId,
        circuitState: status.state,
        message: "reset",
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return status;
    } catch {
      return this.circuitBreaker.getOrCreate(circuitId);
    }
  }

  async retryExecution<T>(
    operation: () => Promise<T> | T,
    options?: {
      failureKind?: FailureKind;
      maxRetries?: number;
      sleep?: (ms: number) => Promise<void>;
      circuitId?: string;
    }
  ) {
    try {
      if (options?.circuitId && !this.circuitBreaker.allowsRequest(options.circuitId)) {
        return {
          ok: false,
          result: null as T | null,
          attempts: [],
          retried: false,
          skipped: true,
          skipReason: `Circuit ${options.circuitId} is OPEN.`,
          errors: [`Circuit ${options.circuitId} is OPEN.`],
          totalDelayMs: 0,
        };
      }

      const result = await this.retryManager.retryExecution(operation, options);
      this.metrics.addRetries(Math.max(0, result.attempts.length - 1));
      if (result.retried && result.ok) this.successfulRetries += 1;

      if (options?.circuitId) {
        if (result.ok) this.circuitBreaker.recordSuccess(options.circuitId);
        else this.circuitBreaker.recordFailure(options.circuitId);
        this.metrics.setCircuitTrips(this.circuitBreaker.getTripCount());
      }

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Retry",
        targetId: options?.circuitId,
        message: `attempts=${result.attempts.length};ok=${result.ok}`,
        warnings: result.skipReason ? [result.skipReason] : [],
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        ok: false,
        result: null as T | null,
        attempts: [],
        retried: false,
        skipped: false,
        errors: [`retryExecution failed: ${String(err)}`],
        totalDelayMs: 0,
      };
    }
  }

  checkTimeout(scope: TimeoutScope, targetId: string, elapsedMs: number) {
    const result = this.timeoutManager.check(scope, targetId, elapsedMs);
    if (result.timedOut) {
      this.metrics.setTimeoutCount(this.timeoutManager.getTimeoutCount());
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Timeout",
        targetId,
        message: `${scope} timeout after ${elapsedMs}ms (limit ${result.limitMs}ms)`,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
    }
    return result;
  }

  getReliabilityMetrics() {
    this.metrics.setTimeoutCount(this.timeoutManager.getTimeoutCount());
    this.metrics.setCircuitTrips(this.circuitBreaker.getTripCount());
    this.metrics.setSnapshotCount(this.snapshots.size);
    this.metrics.setRecovery(
      this.failureRecovery.getRecoveryRate(),
      this.failureRecovery.getAverageRecoveryTime()
    );
    return this.metrics.getMetrics();
  }

  createReliabilitySnapshot(label?: string): ReliabilitySnapshot {
    try {
      const report =
        this.lastHealth ??
        this.checkHealth({ includeLiveCollectors: false, probes: [] });
      const snapshot = this.snapshots.save(
        {
          resilienceScore: report.resilienceScore,
          availabilityPct: report.health.availabilityPct,
          recoveryRate: this.failureRecovery.getRecoveryRate(),
          timeoutCount: this.timeoutManager.getTimeoutCount(),
          retryCount: this.metrics.getMetrics().retryCount,
          circuitTrips: this.circuitBreaker.getTripCount(),
          overallStatus: report.health.overallStatus,
          openCircuits: report.openCircuits,
          configurationVersion: this.config.engineVersion,
        },
        label
      );
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        targetId: snapshot.snapshotId,
        resilienceScore: report.resilienceScore.overall,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch (err) {
      return this.snapshots.save(
        {
          resilienceScore: {
            availability: 0,
            recoverySuccess: 0,
            timeoutStability: 0,
            retryEfficiency: 0,
            healthStability: 0,
            gracefulDegradation: 0,
            overall: 0,
          },
          availabilityPct: 0,
          recoveryRate: 0,
          timeoutCount: 0,
          retryCount: 0,
          circuitTrips: 0,
          overallStatus: "UNKNOWN",
          openCircuits: [],
          configurationVersion: this.config.engineVersion,
        },
        label ?? `error:${String(err)}`
      );
    }
  }

  compareReliabilitySnapshots(
    baselineId: string,
    compareId: string
  ): ReliabilitySnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareReliabilitySnapshots(baseline, compare, this.config);
    } catch {
      return null;
    }
  }

  listCircuits(): CircuitBreakerStatus[] {
    return this.circuitBreaker.listCircuits();
  }

  getFailureHistory(limit?: number) {
    return this.failureRecovery.getFailureHistory(limit);
  }

  getRecoveryHistory(limit?: number) {
    return this.failureRecovery.getRecoveryHistory(limit);
  }

  listSnapshots(): ReliabilitySnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getTimeoutManager(): TimeoutManager {
    return this.timeoutManager;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.circuitBreaker.reset();
    this.timeoutManager.reset();
    this.failureRecovery.reset();
    this.successfulRetries = 0;
    this.lastHealth = null;
  }

  private resolveProbes(options: CheckHealthOptions = {}): ReliabilityProbe[] {
    const probes: ReliabilityProbe[] = [...(options.probes ?? [])];
    if (options.includeLiveCollectors !== false) {
      try {
        probes.push(...collectAllReliabilityProbes());
      } catch {
        // never interrupt
      }
    }
    return probes;
  }
}

function safeCollect(
  sourceId: string,
  fn: () => ReliabilityProbe[]
): ReliabilityProbe[] {
  try {
    return fn();
  } catch {
    return [
      {
        sourceId: sourceId as ReliabilityProbe["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        status: "UNKNOWN",
        available: false,
        healthScore: 0,
        metadata: { unavailable: true },
      },
    ];
  }
}

export function buildBuiltinReliabilitySources(): ReliabilitySourceDefinition[] {
  return [
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getMetrics: () => {
                requests: number;
                failed: number;
                averageExecutionTime: number;
              };
            };
          };
          const m = getValidationOrchestrator().getMetrics();
          const errorRate =
            m.requests === 0 ? 0 : (m.failed / m.requests) * 100;
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              critical: true,
              available: true,
              healthScore: Math.max(0, 100 - errorRate),
              latencyMs: m.averageExecutionTime,
              errorRate,
              status: errorRate > 20 ? "DEGRADED" : "HEALTHY",
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
                  successRate: number;
                  averageRuntime: number;
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
              critical: true,
              available: true,
              healthScore: agg.successRate,
              latencyMs: agg.averageRuntime,
              status: agg.successRate < 70 ? "DEGRADED" : "HEALTHY",
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
              getMetrics: () => { healthScore: number; averageRuntime: number };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              advisory: true,
              available: true,
              healthScore: m.healthScore || 100,
              latencyMs: m.averageRuntime,
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
              getMetrics: () => { healthScore: number; averageRuntime: number };
            };
          };
          const m = getValidationDiagnosticsEngine().getMetrics();
          return [
            {
              sourceId: "diagnostics",
              module: "diagnostics",
              timestamp: new Date().toISOString(),
              advisory: true,
              available: true,
              healthScore: m.healthScore || 100,
              latencyMs: m.averageRuntime,
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
          const m = getValidationReportingEngine().getMetrics();
          return [
            {
              sourceId: "reporting",
              module: "reporting",
              timestamp: new Date().toISOString(),
              advisory: true,
              available: true,
              healthScore: 100,
              latencyMs: m.averageGenerationTime,
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
              getOptimizationMetrics: () => {
                optimizationScore: number;
                averageRuntime: number;
              };
            };
          };
          const m = getValidationOptimizationEngine().getOptimizationMetrics();
          return [
            {
              sourceId: "optimization",
              module: "optimization",
              timestamp: new Date().toISOString(),
              advisory: true,
              available: true,
              healthScore: m.optimizationScore || 100,
              latencyMs: m.averageRuntime,
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
          const m = getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              advisory: true,
              available: true,
              healthScore: 100,
              latencyMs: m.averageAggregationTime,
            },
          ];
        }),
    },
    {
      id: "eventBus",
      name: "Validation Event Bus",
      collect: () =>
        safeCollect("eventBus", () => {
          const { getValidationEventBus } = require("../events") as {
            getValidationEventBus: () => {
              getEventHealth: () => { overall: string };
              getEventMetrics: () => { averageDispatchTime: number };
            };
          };
          const bus = getValidationEventBus();
          const health = bus.getEventHealth();
          const m = bus.getEventMetrics();
          return [
            {
              sourceId: "eventBus",
              module: "eventBus",
              timestamp: new Date().toISOString(),
              critical: true,
              available: health.overall !== "CRITICAL",
              healthScore:
                health.overall === "HEALTHY"
                  ? 100
                  : health.overall === "DEGRADED"
                    ? 60
                    : 20,
              latencyMs: m.averageDispatchTime,
              status:
                health.overall === "HEALTHY"
                  ? "HEALTHY"
                  : health.overall === "DEGRADED"
                    ? "DEGRADED"
                    : "CRITICAL",
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
              getTrustMetrics: () => {
                averageTrustScore: number;
                averageValidationRuntime: number;
              };
            };
          };
          const m = getTrustScoreEngine().getTrustMetrics();
          return [
            {
              sourceId: "trust",
              module: "trust",
              timestamp: new Date().toISOString(),
              critical: true,
              available: true,
              healthScore: m.averageTrustScore || 100,
              latencyMs: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "historical",
      name: "Historical Engine",
      collect: () =>
        safeCollect("historical", () => {
          const {
            getHistoricalValidationMetrics,
          } = require("../rules/historical") as {
            getHistoricalValidationMetrics: () => {
              historicalScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          return [
            {
              sourceId: "historical",
              module: "historical",
              timestamp: new Date().toISOString(),
              available: true,
              healthScore: m.historicalScore || 100,
              latencyMs: m.averageValidationRuntime,
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
          getValidationAdministrationEngine().getAdministrationMetrics();
          return [
            {
              sourceId: "admin",
              module: "admin",
              timestamp: new Date().toISOString(),
              available: true,
              healthScore: 100,
              advisory: true,
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinReliabilitySources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinReliabilitySourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredReliabilitySources().length,
      total: getRegisteredReliabilitySources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinReliabilitySources()) {
    const result = registerReliabilitySource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinReliabilitySourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredReliabilitySources().length,
  };
}

export interface ReliabilityRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationReliabilityEngine(options?: {
  engine?: ValidationReliabilityEngine;
  config?: ReliabilityConfigurationInput;
  force?: boolean;
}): ReliabilityRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredReliabilitySources().length,
    };
  }

  const sources = registerBuiltinReliabilitySources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationReliabilityEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationReliabilityEngine(
  options?: ReliabilityConfigurationInput
): ValidationReliabilityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationReliabilityEngine(options);
    registerBuiltinReliabilitySources();
  }
  return defaultEngine;
}

export function resetValidationReliabilityEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetReliabilitySourceRegistrationState();
}

/** Public API convenience wrappers. */
export function checkHealth(options?: CheckHealthOptions) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().checkHealth(options);
}

export function runRecovery(input: {
  targetType: RecoveryTargetType;
  targetId: string;
  failureKind?: FailureKind;
  probes?: ReliabilityProbe[];
}) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().runRecovery(input);
}

export function tripCircuit(circuitId: string, reason?: string) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().tripCircuit(circuitId, reason);
}

export function resetCircuit(circuitId: string) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().resetCircuit(circuitId);
}

export function retryExecution<T>(
  operation: () => Promise<T> | T,
  options?: {
    failureKind?: FailureKind;
    maxRetries?: number;
    sleep?: (ms: number) => Promise<void>;
    circuitId?: string;
  }
) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().retryExecution(operation, options);
}

export function getReliabilityMetrics() {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().getReliabilityMetrics();
}

export function createReliabilitySnapshot(label?: string) {
  registerValidationReliabilityEngine();
  return getValidationReliabilityEngine().createReliabilitySnapshot(label);
}

export {
  DEFAULT_RELIABILITY_CONFIGURATION,
  resolveReliabilityConfiguration,
  registerReliabilitySource,
};
