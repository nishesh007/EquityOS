/**
 * Institutional Validation Observability & Telemetry Engine — façade (Prompt 9F.20).
 * Purely observational: never influences validation execution or outcomes.
 */

import {
  DEFAULT_TELEMETRY_CONFIGURATION,
  resolveTelemetryConfiguration,
  type TelemetryConfiguration,
  type TelemetryConfigurationInput,
  type TelemetryExportFormat,
} from "./TelemetryConfiguration";
import {
  areBuiltinTelemetrySourcesRegistered,
  collectAllTelemetrySamples,
  getRegisteredTelemetrySources,
  markBuiltinTelemetrySourcesRegistered,
  registerTelemetrySource,
  resetTelemetrySourceRegistrationState,
  type TelemetrySample,
  type TelemetrySourceDefinition,
} from "./TelemetryRegistry";
import { TelemetryCollector, type TelemetryRecord } from "./TelemetryCollector";
import { MetricsCollector, type MetricsSnapshot } from "./MetricsCollector";
import {
  TraceCollector,
  type DistributedTrace,
  type TraceSpanInput,
} from "./TraceCollector";
import {
  EventCollector,
  type ObservabilityEvent,
  type ObservabilityEventInput,
} from "./EventCollector";
import { TelemetryAggregator } from "./TelemetryAggregator";
import { TelemetryStorage } from "./TelemetryStorage";
import {
  TelemetryExporter,
  type TelemetryExportModel,
} from "./TelemetryExporter";
import { TelemetryMetricsTracker } from "./TelemetryMetrics";
import { TelemetryAuditLogger } from "./TelemetryAuditLogger";
import {
  TelemetrySnapshotStore,
  compareTelemetrySnapshots,
  type TelemetrySnapshot,
  type TelemetrySnapshotComparison,
} from "./TelemetrySnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface CollectTelemetryOptions {
  samples?: TelemetrySample[];
  includeLiveCollectors?: boolean;
  spans?: TraceSpanInput[];
  events?: ObservabilityEventInput[];
  parentTraceId?: string | null;
}

export interface TelemetryCollectionResult {
  runId: string;
  records: TelemetryRecord[];
  metrics: MetricsSnapshot;
  traces: DistributedTrace[];
  events: ObservabilityEvent[];
  observabilityScore: number;
  scoreBreakdown: ReturnType<TelemetryAggregator["aggregate"]>["score"];
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
  observationalOnly: true;
}

let defaultEngine: ValidationObservabilityEngine | null = null;
let engineRegistered = false;

export class ValidationObservabilityEngine {
  private config: TelemetryConfiguration;
  private telemetryCollector: TelemetryCollector;
  private readonly metricsCollector = new MetricsCollector();
  private traceCollector: TraceCollector;
  private eventCollector: EventCollector;
  private aggregator: TelemetryAggregator;
  private storage: TelemetryStorage;
  private readonly exporter = new TelemetryExporter();
  private readonly metrics = new TelemetryMetricsTracker();
  private audit: TelemetryAuditLogger;
  private snapshots: TelemetrySnapshotStore;
  private lastResult: TelemetryCollectionResult | null = null;

  constructor(configInput?: TelemetryConfigurationInput) {
    this.config = resolveTelemetryConfiguration(configInput);
    this.telemetryCollector = new TelemetryCollector(this.config);
    this.traceCollector = new TraceCollector(this.config);
    this.eventCollector = new EventCollector(this.config.bufferSize);
    this.aggregator = new TelemetryAggregator(this.config);
    this.storage = new TelemetryStorage(this.config);
    this.audit = new TelemetryAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new TelemetrySnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): TelemetryConfiguration {
    return resolveTelemetryConfiguration(this.config);
  }

  updateConfiguration(input: TelemetryConfigurationInput): void {
    this.config = resolveTelemetryConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
      exportFormats: input.exportFormats ?? this.config.exportFormats,
    });
    this.telemetryCollector.setConfiguration(this.config);
    this.traceCollector.setConfiguration(this.config);
    this.eventCollector.setMaxEvents(this.config.bufferSize);
    this.aggregator.setConfiguration(this.config);
    this.storage.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: TelemetrySourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerTelemetrySource(definition, options);
  }

  collectTelemetry(
    options: CollectTelemetryOptions = {}
  ): TelemetryCollectionResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const samples = this.resolveSamples(options);
      const telemetry = this.telemetryCollector.collect(samples);
      warnings.push(...telemetry.warnings);
      errors.push(...telemetry.errors);

      const metricsResult = this.metricsCollector.collect(samples);
      warnings.push(...metricsResult.warnings);
      errors.push(...metricsResult.errors);

      const traces: DistributedTrace[] = [];
      if (options.spans && options.spans.length > 0) {
        const traced = this.traceCollector.collectTrace({
          spans: options.spans,
          parentTraceId: options.parentTraceId,
        });
        traces.push(traced.trace);
        warnings.push(...traced.warnings);
        errors.push(...traced.errors);
      }

      const events: ObservabilityEvent[] = [];
      for (const evt of options.events ?? []) {
        const collected = this.eventCollector.collectEvent(evt);
        if (collected.event) events.push(collected.event);
        warnings.push(...collected.warnings);
        errors.push(...collected.errors);
      }

      const stored = this.storage.store({
        records: telemetry.records,
        metrics: metricsResult.metrics,
        traces,
        events,
      });
      warnings.push(...stored.warnings);
      errors.push(...stored.errors);

      const aggregated = this.aggregator.aggregate({
        records: telemetry.records,
        metrics: metricsResult.metrics,
        traces: [...traces, ...this.traceCollector.getTraces(5)],
        events: [...events, ...this.eventCollector.getEvents(20)],
        registeredSourceCount: getRegisteredTelemetrySources().length || samples.length,
        droppedEvents:
          telemetry.dropped +
          this.eventCollector.getDroppedCount() +
          this.storage.getDroppedCount(),
        storageOk: this.storage.isHealthy(),
      });
      warnings.push(...aggregated.warnings);
      errors.push(...aggregated.errors);

      const executionTimeMs = Date.now() - started;
      this.metrics.recordCollection({
        runtimeMs: executionTimeMs,
        telemetryEvents: telemetry.records.length + events.length,
        metricsCount: 1,
        traceCount: traces.length,
        droppedEvents: telemetry.dropped,
        observabilityScore: aggregated.score.overall,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "TelemetryRun",
        observabilityScore: aggregated.score.overall,
        scoreBreakdown: aggregated.score,
        droppedEvents: telemetry.dropped,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });

      if (telemetry.dropped > 0) {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "DroppedEvents",
          droppedEvents: telemetry.dropped,
          warnings,
          errors: [],
          engineVersion: this.config.engineVersion,
        });
      }

      const result: TelemetryCollectionResult = {
        runId: `obs-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        records: telemetry.records,
        metrics: metricsResult.metrics,
        traces,
        events,
        observabilityScore: aggregated.score.overall,
        scoreBreakdown: aggregated.score,
        executionTimeMs,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
        observationalOnly: true,
      };
      this.lastResult = result;

      safePublishEvent({
        eventType: "WarningRaised",
        module: "observability",
        source: "observability-engine",
        severity: "INFO",
        payload: {
          runId: result.runId,
          observabilityScore: result.observabilityScore,
          observationalOnly: true,
        },
        executionTimeMs,
      });

      return result;
    } catch (err) {
      errors.push(`collectTelemetry failed: ${String(err)}`);
      const executionTimeMs = Date.now() - started;
      this.metrics.recordCollection({
        runtimeMs: executionTimeMs,
        telemetryEvents: 0,
        metricsCount: 0,
        traceCount: 0,
        droppedEvents: 0,
        observabilityScore: 0,
      });
      const emptyMetrics = this.metricsCollector.collect([]).metrics;
      const result: TelemetryCollectionResult = {
        runId: `obs-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        records: [],
        metrics: emptyMetrics,
        traces: [],
        events: [],
        observabilityScore: 0,
        scoreBreakdown: {
          telemetryCoverage: 0,
          metricsCoverage: 0,
          traceCoverage: 0,
          eventCoverage: 0,
          healthVisibility: 0,
          storageReliability: 0,
          overall: 0,
        },
        executionTimeMs,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
        observationalOnly: true,
      };
      this.lastResult = result;
      return result;
    }
  }

  collectMetrics(options: CollectTelemetryOptions = {}): MetricsSnapshot {
    try {
      const samples = this.resolveSamples(options);
      return this.metricsCollector.collect(samples).metrics;
    } catch {
      return this.metricsCollector.collect([]).metrics;
    }
  }

  collectTrace(input?: {
    spans?: TraceSpanInput[];
    parentTraceId?: string | null;
    childTraceIds?: string[];
  }): DistributedTrace {
    try {
      return this.traceCollector.collectTrace(input).trace;
    } catch (err) {
      return {
        traceId: `trace:error:${Math.random().toString(36).slice(2, 8)}`,
        parentTraceId: null,
        childTraceIds: [],
        pipelineTimeline: [],
        ruleTimeline: [],
        executionTree: [],
        criticalPath: [],
        totalDurationMs: 0,
        createdAt: new Date().toISOString(),
        depth: 0,
      };
    }
  }

  collectEvent(input: ObservabilityEventInput): ObservabilityEvent | null {
    try {
      const result = this.eventCollector.collectEvent(input);
      if (result.dropped) {
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "DroppedEvents",
          droppedEvents: 1,
          warnings: result.warnings,
          errors: result.errors,
          engineVersion: this.config.engineVersion,
        });
      }
      return result.event;
    } catch {
      return null;
    }
  }

  exportTelemetry(
    format: TelemetryExportFormat = "JSON",
    options?: CollectTelemetryOptions
  ): TelemetryExportModel {
    try {
      const run =
        this.lastResult ??
        this.collectTelemetry({
          ...options,
          includeLiveCollectors: options?.includeLiveCollectors ?? false,
        });
      const model = this.exporter.export({
        format,
        score: run.scoreBreakdown,
        records: run.records,
        metrics: run.metrics,
        traces: run.traces,
        events: run.events,
        engineVersion: this.config.engineVersion,
      });
      this.metrics.recordExport();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ExportRequested",
        exportFormat: format,
        observabilityScore: run.observabilityScore,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return model;
    } catch (err) {
      return {
        format: "JSON",
        generatedAt: new Date().toISOString(),
        score: {
          telemetryCoverage: 0,
          metricsCoverage: 0,
          traceCoverage: 0,
          eventCoverage: 0,
          healthVisibility: 0,
          storageReliability: 0,
          overall: 0,
        },
        records: [],
        metrics: null,
        traces: [],
        events: [],
      };
    }
  }

  getObservabilityMetrics() {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  createTelemetrySnapshot(label?: string): TelemetrySnapshot {
    try {
      const run =
        this.lastResult ??
        this.collectTelemetry({ includeLiveCollectors: false, samples: [] });
      const snapshot = this.snapshots.save(
        {
          score: run.scoreBreakdown,
          metrics: run.metrics,
          recordCount: run.records.length,
          traceCount: run.traces.length,
          eventCount: run.events.length,
          droppedEvents: this.metrics.getMetrics().droppedEvents,
          configurationVersion: this.config.engineVersion,
        },
        label
      );
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        observabilityScore: run.observabilityScore,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch (err) {
      return this.snapshots.save(
        {
          score: {
            telemetryCoverage: 0,
            metricsCoverage: 0,
            traceCoverage: 0,
            eventCoverage: 0,
            healthVisibility: 0,
            storageReliability: 0,
            overall: 0,
          },
          metrics: null,
          recordCount: 0,
          traceCount: 0,
          eventCount: 0,
          droppedEvents: 0,
          configurationVersion: this.config.engineVersion,
        },
        label ?? `error:${String(err)}`
      );
    }
  }

  compareTelemetrySnapshots(
    baselineId: string,
    compareId: string
  ): TelemetrySnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareTelemetrySnapshots(baseline, compare);
    } catch {
      return null;
    }
  }

  listSnapshots(): TelemetrySnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastResult(): TelemetryCollectionResult | null {
    return this.lastResult;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.storage.clear();
    this.traceCollector.reset();
    this.eventCollector.reset();
    this.metricsCollector.reset();
    this.telemetryCollector.resetCounters();
    this.lastResult = null;
  }

  private resolveSamples(
    options: CollectTelemetryOptions = {}
  ): TelemetrySample[] {
    const samples: TelemetrySample[] = [...(options.samples ?? [])];
    if (options.includeLiveCollectors !== false) {
      try {
        samples.push(...collectAllTelemetrySamples());
      } catch {
        // never interrupt
      }
    }
    return samples;
  }
}

function safeCollect(
  sourceId: string,
  fn: () => TelemetrySample[]
): TelemetrySample[] {
  try {
    return fn();
  } catch {
    return [
      {
        sourceId: sourceId as TelemetrySample["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        metadata: { unavailable: true },
      },
    ];
  }
}

export function buildBuiltinTelemetrySources(): TelemetrySourceDefinition[] {
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
                completed: number;
                failed: number;
                averageExecutionTime: number;
              };
            };
          };
          const m = getValidationOrchestrator().getMetrics();
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              validationRequests: m.requests,
              pipelineExecutions: m.completed,
              failures: m.failed,
              executionTimeMs: m.averageExecutionTime,
              latencyMs: m.averageExecutionTime,
              successRate:
                m.requests === 0
                  ? 100
                  : ((m.completed) / Math.max(1, m.requests)) * 100,
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
                  averageRuntime: number;
                  successRate: number;
                  failureRate: number;
                };
                getCacheStats: () => {
                  hits: number;
                  misses: number;
                };
              };
            };
          };
          const engine = getDataIntegrityEngine().getRuleEngine();
          const agg = engine.getAggregateMetrics();
          const cache = engine.getCacheStats();
          return [
            {
              sourceId: "ruleEngine",
              module: "ruleEngine",
              timestamp: new Date().toISOString(),
              ruleExecutions: agg.totalExecutions,
              executionTimeMs: agg.averageRuntime,
              successRate: agg.successRate,
              errorRate: agg.failureRate,
              cacheHits: cache.hits,
              cacheMisses: cache.misses,
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
              getEventMetrics: () => {
                totalEvents: number;
                averageDispatchTime: number;
                failureCount: number;
              };
            };
          };
          const m = getValidationEventBus().getEventMetrics();
          return [
            {
              sourceId: "eventBus",
              module: "eventBus",
              timestamp: new Date().toISOString(),
              events: m.totalEvents,
              executionTimeMs: m.averageDispatchTime,
              failures: m.failureCount,
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
                totalCalculations: number;
              };
            };
          };
          const m = getTrustScoreEngine().getTrustMetrics();
          return [
            {
              sourceId: "trust",
              module: "trust",
              timestamp: new Date().toISOString(),
              trustScore: m.averageTrustScore,
              executionTimeMs: m.averageValidationRuntime,
              validationRequests: m.totalCalculations,
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
              getMetrics: () => {
                healthScore: number;
                averageRuntime: number;
                analyticsRuns: number;
              };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              healthScore: m.healthScore,
              executionTimeMs: m.averageRuntime,
              validationRequests: m.analyticsRuns,
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
              getMetrics: () => {
                reportsGenerated: number;
                averageGenerationTime: number;
              };
            };
          };
          const m = getValidationReportingEngine().getMetrics();
          return [
            {
              sourceId: "reporting",
              module: "reporting",
              timestamp: new Date().toISOString(),
              validationRequests: m.reportsGenerated,
              executionTimeMs: m.averageGenerationTime,
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
              getMetrics: () => {
                healthScore: number;
                averageRuntime: number;
                memoryUsage: number;
                diagnosticsRuns: number;
              };
            };
          };
          const m = getValidationDiagnosticsEngine().getMetrics();
          return [
            {
              sourceId: "diagnostics",
              module: "diagnostics",
              timestamp: new Date().toISOString(),
              healthScore: m.healthScore,
              executionTimeMs: m.averageRuntime,
              memoryBytes: m.memoryUsage,
              validationRequests: m.diagnosticsRuns,
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
                optimizationRuns: number;
              };
            };
          };
          const m = getValidationOptimizationEngine().getOptimizationMetrics();
          return [
            {
              sourceId: "optimization",
              module: "optimization",
              timestamp: new Date().toISOString(),
              healthScore: m.optimizationScore,
              executionTimeMs: m.averageRuntime,
              validationRequests: m.optimizationRuns,
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
                retryCount: number;
                timeoutCount: number;
              };
            };
          };
          const m = getValidationReliabilityEngine().getReliabilityMetrics();
          return [
            {
              sourceId: "reliability",
              module: "reliability",
              timestamp: new Date().toISOString(),
              availability: m.availability,
              healthScore: m.resilienceScore,
              retries: m.retryCount,
              timeouts: m.timeoutCount,
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
              getDashboardMetrics: () => {
                averageAggregationTime: number;
                cacheHitPercent: number;
                totalRefreshes: number;
              };
            };
          };
          const m = getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              executionTimeMs: m.averageAggregationTime,
              cacheHits: Math.round(m.cacheHitPercent),
              validationRequests: m.totalRefreshes,
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
              events: m.policies,
              healthScore: 100,
            },
          ];
        }),
    },
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      collect: () =>
        safeCollect("dataIntegrity", () => {
          const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
            getDataIntegrityEngine: () => {
              getMetrics: () => {
                datasetsValidated: number;
                averageIntegrityScore: number;
                averageExecutionTime: number;
                datasetsRejected: number;
                warningCount: number;
              };
            };
          };
          const m = getDataIntegrityEngine().getMetrics();
          return [
            {
              sourceId: "dataIntegrity",
              module: "dataIntegrity",
              timestamp: new Date().toISOString(),
              validationRequests: m.datasetsValidated,
              integrityScore: m.averageIntegrityScore,
              executionTimeMs: m.averageExecutionTime,
              failures: m.datasetsRejected,
              warnings: m.warningCount,
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinTelemetrySources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinTelemetrySourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredTelemetrySources().length,
      total: getRegisteredTelemetrySources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinTelemetrySources()) {
    const result = registerTelemetrySource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinTelemetrySourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredTelemetrySources().length,
  };
}

export interface ObservabilityRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationObservabilityEngine(options?: {
  engine?: ValidationObservabilityEngine;
  config?: TelemetryConfigurationInput;
  force?: boolean;
}): ObservabilityRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredTelemetrySources().length,
    };
  }

  const sources = registerBuiltinTelemetrySources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationObservabilityEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationObservabilityEngine(
  options?: TelemetryConfigurationInput
): ValidationObservabilityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationObservabilityEngine(options);
    registerBuiltinTelemetrySources();
  }
  return defaultEngine;
}

export function resetValidationObservabilityEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetTelemetrySourceRegistrationState();
}

/** Public API convenience wrappers. */
export function collectTelemetry(options?: CollectTelemetryOptions) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().collectTelemetry(options);
}

export function collectMetrics(options?: CollectTelemetryOptions) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().collectMetrics(options);
}

export function collectTrace(input?: {
  spans?: TraceSpanInput[];
  parentTraceId?: string | null;
  childTraceIds?: string[];
}) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().collectTrace(input);
}

export function collectEvent(input: ObservabilityEventInput) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().collectEvent(input);
}

export function exportTelemetry(
  format?: TelemetryExportFormat,
  options?: CollectTelemetryOptions
) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().exportTelemetry(format, options);
}

export function getObservabilityMetrics() {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().getObservabilityMetrics();
}

export function createTelemetrySnapshot(label?: string) {
  registerValidationObservabilityEngine();
  return getValidationObservabilityEngine().createTelemetrySnapshot(label);
}

export {
  DEFAULT_TELEMETRY_CONFIGURATION,
  resolveTelemetryConfiguration,
  registerTelemetrySource,
};
