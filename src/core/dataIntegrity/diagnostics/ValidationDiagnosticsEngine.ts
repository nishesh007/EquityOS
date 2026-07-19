/**
 * Institutional Validation Developer Tools & Diagnostics Engine — façade (Prompt 9F.16).
 * Observability only: inspects validation systems, never alters validation results.
 */

import {
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  resolveDiagnosticsConfiguration,
  type DiagnosticsConfiguration,
  type DiagnosticsConfigurationInput,
  type DiagnosticsMode,
  type DiagnosticsReportType,
} from "./DiagnosticsConfiguration";
import {
  areBuiltinDiagnosticsSourcesRegistered,
  collectAllDiagnosticsProbes,
  getRegisteredDiagnosticsSources,
  markBuiltinDiagnosticsSourcesRegistered,
  registerDiagnosticsSource,
  resetDiagnosticsSourceRegistrationState,
  type DiagnosticsProbe,
  type DiagnosticsSourceDefinition,
} from "./DiagnosticsRegistry";
import { DiagnosticsInspector } from "./DiagnosticsInspector";
import {
  DiagnosticsRuleInspector,
  type RuleInspectionInput,
} from "./DiagnosticsRuleInspector";
import {
  DiagnosticsPipelineInspector,
  type PipelineInspectionInput,
} from "./DiagnosticsPipelineInspector";
import { DiagnosticsProfiler, type ProfileSample } from "./DiagnosticsProfiler";
import { DiagnosticsTracer, type TraceInput } from "./DiagnosticsTracer";
import { DiagnosticsHealthChecker } from "./DiagnosticsHealthChecker";
import {
  DiagnosticsSnapshotStore,
  buildSnapshotPayload,
  compareDiagnosticsSnapshots,
  type DiagnosticsSnapshot,
  type DiagnosticsSnapshotComparison,
} from "./DiagnosticsSnapshot";
import { DiagnosticsMetricsTracker } from "./DiagnosticsMetrics";
import { DiagnosticsAuditLogger } from "./DiagnosticsAuditLogger";
import {
  DiagnosticsReportBuilder,
  type DiagnosticsReport,
} from "./DiagnosticsReportBuilder";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface RunDiagnosticsOptions {
  mode?: DiagnosticsMode;
  probes?: DiagnosticsProbe[];
  rules?: RuleInspectionInput[];
  pipelines?: PipelineInspectionInput[];
  includeLiveCollectors?: boolean;
  profileSamples?: ProfileSample[];
  traces?: TraceInput[];
  reportType?: DiagnosticsReportType;
}

export interface DiagnosticsRunResult {
  runId: string;
  mode: DiagnosticsMode;
  report: DiagnosticsReport;
  healthScore: number;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
}

let defaultEngine: ValidationDiagnosticsEngine | null = null;
let engineRegistered = false;

export class ValidationDiagnosticsEngine {
  private config: DiagnosticsConfiguration;
  private readonly inspector = new DiagnosticsInspector();
  private readonly ruleInspector = new DiagnosticsRuleInspector();
  private readonly pipelineInspector = new DiagnosticsPipelineInspector();
  private profiler: DiagnosticsProfiler;
  private tracer: DiagnosticsTracer;
  private healthChecker: DiagnosticsHealthChecker;
  private readonly metrics = new DiagnosticsMetricsTracker();
  private audit: DiagnosticsAuditLogger;
  private snapshots: DiagnosticsSnapshotStore;
  private readonly reportBuilder = new DiagnosticsReportBuilder();
  private lastRun: DiagnosticsRunResult | null = null;

  constructor(configInput?: DiagnosticsConfigurationInput) {
    this.config = resolveDiagnosticsConfiguration(configInput);
    this.profiler = new DiagnosticsProfiler(this.config);
    this.tracer = new DiagnosticsTracer(this.config);
    this.healthChecker = new DiagnosticsHealthChecker(this.config);
    this.audit = new DiagnosticsAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new DiagnosticsSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): DiagnosticsConfiguration {
    return resolveDiagnosticsConfiguration(this.config);
  }

  updateConfiguration(input: DiagnosticsConfigurationInput): void {
    this.config = resolveDiagnosticsConfiguration({
      ...this.config,
      ...input,
      healthWeights: {
        ...this.config.healthWeights,
        ...input.healthWeights,
      },
    });
    this.profiler.setConfiguration(this.config);
    this.tracer.setConfiguration(this.config);
    this.healthChecker.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: DiagnosticsSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerDiagnosticsSource(definition, options);
  }

  runDiagnostics(options: RunDiagnosticsOptions = {}): DiagnosticsRunResult {
    const started = Date.now();
    const mode =
      options.mode ?? this.config.defaultDiagnosticsMode ?? "quick";
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const probes = this.resolveProbes(options);
      const ruleInputs = this.resolveRules(options, probes);
      const pipelineInputs = this.resolvePipelines(options, probes);

      const includeRules =
        mode === "deep" ||
        mode === "rule" ||
        mode === "custom" ||
        mode === "quick" ||
        mode === "engine" ||
        mode === "performance";
      const includePipelines =
        mode === "deep" ||
        mode === "pipeline" ||
        mode === "custom" ||
        mode === "performance" ||
        mode === "engine";
      const includeProfile =
        this.config.profilerEnabled &&
        (mode === "deep" ||
          mode === "performance" ||
          mode === "memory" ||
          mode === "custom" ||
          mode === "engine");
      const includeModules = mode !== "rule" && mode !== "pipeline";

      const modules = includeModules
        ? this.inspector.inspectModules(probes)
        : null;
      const rules = includeRules
        ? this.ruleInspector.inspectRules(ruleInputs)
        : null;
      const pipelines = includePipelines
        ? this.pipelineInspector.inspectPipelines(pipelineInputs)
        : null;

      warnings.push(
        ...(modules?.warnings ?? []),
        ...(rules?.warnings ?? []),
        ...(pipelines?.warnings ?? [])
      );
      errors.push(
        ...(modules?.errors ?? []),
        ...(rules?.errors ?? []),
        ...(pipelines?.errors ?? [])
      );

      let profile = null;
      const profileStarted = Date.now();
      if (includeProfile) {
        profile = this.profiler.profile({
          probes,
          rules: rules?.rules,
          pipelines: pipelines?.pipelines,
          samples: options.profileSamples,
        });
        warnings.push(...profile.warnings);
        errors.push(...profile.errors);
        this.metrics.recordProfiler(Date.now() - profileStarted);
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "ProfileGenerated",
          mode,
          executionTimeMs: Date.now() - profileStarted,
          healthScore: 0,
          warnings: profile.warnings,
          errors: profile.errors,
          profilerSummary: `samples=${profile.samples.length};slowRules=${profile.slowestRules.length}`,
          engineVersion: this.config.engineVersion,
        });
      } else if (mode === "memory") {
        profile = this.profiler.profile({
          probes,
          samples: options.profileSamples,
        });
        this.metrics.recordProfiler(Date.now() - profileStarted);
      }

      const health = this.healthChecker.evaluate({
        engines: modules?.engines,
        rules: rules ?? undefined,
        pipelines: pipelines ?? undefined,
        profile,
      });
      warnings.push(...health.warnings);
      errors.push(...health.errors);

      const traces = (options.traces ?? []).map((t) => {
        const trace = this.tracer.generateTrace(t);
        this.audit.append({
          timestamp: new Date().toISOString(),
          event: "TraceGenerated",
          mode,
          executionTimeMs: trace.executionTimeMs,
          healthScore: health.breakdown.overallHealthScore,
          warnings: trace.warnings,
          errors: [],
          engineVersion: this.config.engineVersion,
        });
        return trace;
      });
      this.metrics.setTraceCount(this.tracer.getTraceCount());

      const reportType =
        options.reportType ?? this.defaultReportTypeForMode(mode);
      const report = this.reportBuilder.build({
        reportType,
        mode,
        health,
        modules,
        rules,
        pipelines,
        profile,
        traces: [...traces, ...this.tracer.getTraces(5)],
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });

      const executionTimeMs = Date.now() - started;
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        healthScore: health.breakdown.overallHealthScore,
        memoryUsageBytes: profile?.memoryUsageBytes,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DiagnosticsRun",
        mode,
        executionTimeMs,
        healthScore: health.breakdown.overallHealthScore,
        warnings: report.warnings,
        errors: report.errors,
        profilerSummary: profile
          ? `exec=${profile.executionTimeMs}ms;mem=${profile.memoryUsageBytes}`
          : undefined,
        engineVersion: this.config.engineVersion,
      });

      const result: DiagnosticsRunResult = {
        runId: `diag-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        mode,
        report,
        healthScore: health.breakdown.overallHealthScore,
        executionTimeMs,
        warnings: report.warnings,
        errors: report.errors,
        engineVersion: this.config.engineVersion,
      };
      this.lastRun = result;

      safePublishEvent({
        eventType: "WarningRaised",
        module: "diagnostics",
        severity: health.status === "CRITICAL" ? "CRITICAL" : "INFO",
        source: "diagnostics-engine",
        payload: {
          runId: result.runId,
          mode,
          healthScore: result.healthScore,
          message: `Diagnostics run completed (${mode}) health=${result.healthScore}`,
        },
        executionTimeMs,
      });

      return result;
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      errors.push(`Diagnostics failed: ${String(err)}`);
      const report = this.reportBuilder.build({
        reportType: "DiagnosticsSummary",
        mode,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        healthScore: 0,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DiagnosticsRun",
        mode,
        executionTimeMs,
        healthScore: 0,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });
      const result: DiagnosticsRunResult = {
        runId: `diag-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        mode,
        report,
        healthScore: 0,
        executionTimeMs,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      };
      this.lastRun = result;
      return result;
    }
  }

  inspectRules(rules?: RuleInspectionInput[]): ReturnType<
    DiagnosticsRuleInspector["inspectRules"]
  > {
    try {
      const inputs =
        rules ??
        this.resolveRules({ includeLiveCollectors: true }, this.resolveProbes());
      return this.ruleInspector.inspectRules(inputs);
    } catch (err) {
      return {
        rules: [],
        registeredCount: 0,
        disabledCount: 0,
        unregisteredCount: 0,
        inspectedAt: new Date().toISOString(),
        warnings: [],
        errors: [`Rule inspection failed: ${String(err)}`],
      };
    }
  }

  inspectPipeline(pipelines?: PipelineInspectionInput[]): ReturnType<
    DiagnosticsPipelineInspector["inspectPipelines"]
  > {
    try {
      const inputs =
        pipelines ??
        this.resolvePipelines(
          { includeLiveCollectors: true },
          this.resolveProbes()
        );
      return this.pipelineInspector.inspectPipelines(inputs);
    } catch (err) {
      return {
        pipelines: [],
        inspectedAt: new Date().toISOString(),
        warnings: [],
        errors: [`Pipeline inspection failed: ${String(err)}`],
      };
    }
  }

  generateTrace(input?: TraceInput) {
    try {
      const trace = this.tracer.generateTrace(input);
      this.metrics.setTraceCount(this.tracer.getTraceCount());
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "TraceGenerated",
        executionTimeMs: trace.executionTimeMs,
        healthScore: this.lastRun?.healthScore ?? 0,
        warnings: trace.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return trace;
    } catch (err) {
      return {
        traceId: `trace:error:${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        validationRequest: input?.validationRequest ?? "unknown",
        pipeline: input?.pipeline ?? "unknown",
        executedRules: [],
        skippedRules: [],
        executionTimeMs: 0,
        failures: [`Trace failed: ${String(err)}`],
        warnings: [],
        trustScore: null,
        integrityScore: null,
        sampled: false,
        metadata: {},
      };
    }
  }

  profileValidation(options: RunDiagnosticsOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      const rules = this.ruleInspector.inspectRules(
        this.resolveRules(options, probes)
      );
      const pipelines = this.pipelineInspector.inspectPipelines(
        this.resolvePipelines(options, probes)
      );
      const started = Date.now();
      const profile = this.profiler.profile({
        probes,
        rules: rules.rules,
        pipelines: pipelines.pipelines,
        samples: options.profileSamples,
      });
      this.metrics.recordProfiler(Date.now() - started);
      return profile;
    } catch (err) {
      return {
        profileId: `prof:error:${Math.random().toString(36).slice(2, 8)}`,
        executionTimeMs: 0,
        cpuTimeMs: 0,
        memoryUsageBytes: 0,
        allocationCount: 0,
        cachePerformance: { averageHitRate: null, sampleCount: 0 },
        slowestRules: [],
        slowestPipelines: [],
        slowestEngines: [],
        samples: [],
        warnings: [],
        errors: [`Profiling failed: ${String(err)}`],
        profilerEnabled: this.config.profilerEnabled,
      };
    }
  }

  getDiagnosticsHealth(options: RunDiagnosticsOptions = {}) {
    try {
      const run = this.runDiagnostics({
        ...options,
        mode: options.mode ?? "engine",
      });
      return (
        run.report.health ?? {
          breakdown: {
            registrationHealth: 0,
            executionHealth: 0,
            dependencyHealth: 0,
            runtimeHealth: 0,
            memoryHealth: 0,
            cacheHealth: 0,
            configurationHealth: 0,
            overallHealthScore: 0,
          },
          status: "CRITICAL" as const,
          warnings: run.warnings,
          errors: run.errors,
          evaluatedAt: new Date().toISOString(),
        }
      );
    } catch (err) {
      return {
        breakdown: {
          registrationHealth: 0,
          executionHealth: 0,
          dependencyHealth: 0,
          runtimeHealth: 0,
          memoryHealth: 0,
          cacheHealth: 0,
          configurationHealth: 0,
          overallHealthScore: 0,
        },
        status: "CRITICAL" as const,
        warnings: [],
        errors: [`Health evaluation failed: ${String(err)}`],
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  createDiagnosticsSnapshot(label?: string): DiagnosticsSnapshot {
    try {
      const run =
        this.lastRun ??
        this.runDiagnostics({ mode: "quick", includeLiveCollectors: false });
      const payload = buildSnapshotPayload({
        health:
          run.report.health?.breakdown ?? {
            registrationHealth: 0,
            executionHealth: 0,
            dependencyHealth: 0,
            runtimeHealth: 0,
            memoryHealth: 0,
            cacheHealth: 0,
            configurationHealth: 0,
            overallHealthScore: run.healthScore,
          },
        profile: run.report.profile,
        configuration: this.config,
        ruleCount: run.report.summary.ruleCount,
        pipelineCount: run.report.summary.pipelineCount,
        engineCount: run.report.summary.engineCount,
        mode: run.mode,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        mode: run.mode,
        executionTimeMs: 0,
        healthScore: run.healthScore,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch (err) {
      const fallback = this.snapshots.save(
        {
          health: {
            registrationHealth: 0,
            executionHealth: 0,
            dependencyHealth: 0,
            runtimeHealth: 0,
            memoryHealth: 0,
            cacheHealth: 0,
            configurationHealth: 0,
            overallHealthScore: 0,
          },
          profileSummary: {
            executionTimeMs: 0,
            memoryUsageBytes: 0,
            slowRuleCount: 0,
            slowPipelineCount: 0,
          },
          configuration: {
            profilerEnabled: this.config.profilerEnabled,
            tracingEnabled: this.config.tracingEnabled,
            samplingRate: this.config.samplingRate,
            environment: this.config.environment,
            engineVersion: this.config.engineVersion,
          },
          ruleCount: 0,
          pipelineCount: 0,
          engineCount: 0,
          mode: "quick",
        },
        label ?? `error:${String(err)}`
      );
      return fallback;
    }
  }

  compareDiagnosticsSnapshots(
    baselineId: string,
    compareId: string
  ): DiagnosticsSnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareDiagnosticsSnapshots(baseline, compare, this.config);
    } catch {
      return null;
    }
  }

  generateDiagnosticsReport(
    options: RunDiagnosticsOptions & { reportType?: DiagnosticsReportType } = {}
  ): DiagnosticsReport {
    const run = this.runDiagnostics(options);
    if (options.reportType && options.reportType !== run.report.reportType) {
      return this.reportBuilder.build({
        reportType: options.reportType,
        mode: run.mode,
        health: run.report.health,
        modules: run.report.modules,
        rules: run.report.rules,
        pipelines: run.report.pipelines,
        profile: run.report.profile,
        traces: run.report.traces,
        regression: run.report.regression,
        warnings: run.warnings,
        errors: run.errors,
        engineVersion: this.config.engineVersion,
      });
    }
    return run.report;
  }

  listSnapshots(): DiagnosticsSnapshot[] {
    return this.snapshots.list();
  }

  getMetrics() {
    this.metrics.setSnapshotCount(this.snapshots.size);
    this.metrics.setTraceCount(this.tracer.getTraceCount());
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastRun(): DiagnosticsRunResult | null {
    return this.lastRun;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.tracer.reset();
    this.snapshots.clear();
    this.lastRun = null;
  }

  private defaultReportTypeForMode(mode: DiagnosticsMode): DiagnosticsReportType {
    switch (mode) {
      case "performance":
      case "memory":
        return "PerformanceReport";
      case "pipeline":
        return "PipelineReport";
      case "rule":
        return "RuleReport";
      case "engine":
        return "HealthReport";
      default:
        return "DiagnosticsSummary";
    }
  }

  private resolveProbes(options: RunDiagnosticsOptions = {}): DiagnosticsProbe[] {
    const probes: DiagnosticsProbe[] = [...(options.probes ?? [])];
    if (options.includeLiveCollectors !== false) {
      try {
        probes.push(...collectAllDiagnosticsProbes());
      } catch {
        // never interrupt diagnostics
      }
    }
    return probes;
  }

  private resolveRules(
    options: RunDiagnosticsOptions,
    probes: DiagnosticsProbe[]
  ): RuleInspectionInput[] {
    if (options.rules) return options.rules;
    const fromProbes: RuleInspectionInput[] = [];
    for (const probe of probes) {
      const ruleCount = probe.ruleCount ?? 0;
      for (let i = 0; i < Math.min(ruleCount, 20); i++) {
        fromProbes.push({
          ruleId: `${probe.module}:rule:${i + 1}`,
          name: `${probe.module} rule ${i + 1}`,
          module: probe.module,
          category: probe.module.toUpperCase(),
          priority: i,
          executionOrder: i,
          executionTimeMs: probe.averageRuntimeMs ?? 0,
          successCount: probe.passed ?? 0,
          failureCount: probe.failed ?? 0,
          registered: probe.registered !== false,
          enabled: true,
          version: probe.engineVersion,
        });
      }
    }
    if (fromProbes.length > 0) return fromProbes;
    if (options.includeLiveCollectors !== false) {
      return collectLiveRules();
    }
    return [];
  }

  private resolvePipelines(
    options: RunDiagnosticsOptions,
    probes: DiagnosticsProbe[]
  ): PipelineInspectionInput[] {
    if (options.pipelines) return options.pipelines;
    if (options.includeLiveCollectors !== false) {
      const live = collectLivePipelines();
      if (live.length > 0) return live;
    }
    return probes
      .filter((p) => (p.pipelineCount ?? 0) > 0 || p.sourceId === "orchestrator")
      .map((p) => ({
        pipelineId: `${p.module}-pipeline`,
        name: `${p.module} pipeline`,
        engines: [p.module],
        averageRuntimeMs: p.averageRuntimeMs ?? 0,
        failures: p.failed ?? 0,
      }));
  }
}

function safeCollect(
  sourceId: string,
  fn: () => DiagnosticsProbe[]
): DiagnosticsProbe[] {
  try {
    return fn();
  } catch {
    return [
      {
        sourceId: sourceId as DiagnosticsProbe["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        registered: false,
        healthy: false,
        warnings: 1,
        metadata: { unavailable: true },
      },
    ];
  }
}

function collectLiveRules(): RuleInspectionInput[] {
  try {
    const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
      getDataIntegrityEngine: () => {
        getRules: () => Array<{
          id: string;
          name: string;
          category: string;
          priority: number;
          enabled: boolean;
          version: string;
        }>;
        getRuleEngine: () => {
          listRules: () => Array<{
            id: string;
            name: string;
            category: string;
            priority: number | string;
            enabled: boolean;
            version: string;
            dependencies?: string[];
          }>;
          getAggregateMetrics: () => {
            averageRuntime: number;
            successRate: number;
            failureRate: number;
            totalExecutions: number;
          };
        };
      };
    };
    const engine = getDataIntegrityEngine();
    const agg = engine.getRuleEngine().getAggregateMetrics();
    const successShare = agg.successRate / 100;
    const failureShare = agg.failureRate / 100;
    const priorityRank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    let rules: RuleInspectionInput[] = [];
    try {
      const advanced = engine.getRuleEngine().listRules();
      rules = advanced.map((rule, index) => ({
        ruleId: rule.id,
        name: rule.name,
        module: "ruleEngine",
        category: String(rule.category),
        priority:
          typeof rule.priority === "number"
            ? rule.priority
            : (priorityRank[String(rule.priority)] ?? index),
        dependencies: [...(rule.dependencies ?? [])],
        executionOrder: index,
        executionTimeMs: agg.averageRuntime,
        successCount: Math.round(agg.totalExecutions * successShare),
        failureCount: Math.round(agg.totalExecutions * failureShare),
        registered: true,
        enabled: rule.enabled,
        version: rule.version,
      }));
    } catch {
      rules = [];
    }

    if (rules.length === 0) {
      rules = engine.getRules().map((rule, index) => ({
        ruleId: rule.id,
        name: rule.name,
        module: "dataIntegrity",
        category: rule.category,
        priority: rule.priority,
        executionOrder: index,
        executionTimeMs: agg.averageRuntime,
        successCount: Math.round(agg.totalExecutions * successShare),
        failureCount: Math.round(agg.totalExecutions * failureShare),
        registered: true,
        enabled: rule.enabled,
        version: rule.version,
      }));
    }
    return rules;
  } catch {
    return [];
  }
}

function collectLivePipelines(): PipelineInspectionInput[] {
  try {
    const { getValidationOrchestrator } = require("../orchestrator") as {
      getValidationOrchestrator: () => {
        getPipelineManager: () => {
          listPipelines: () => Array<{
            id: string;
            name: string;
            engines: string[];
          }>;
        };
        getMetrics: () => {
          failed: number;
          averageExecutionTime: number;
        };
      };
    };
    const orch = getValidationOrchestrator();
    const metrics = orch.getMetrics();
    return orch.getPipelineManager().listPipelines().map((p) => ({
      pipelineId: p.id,
      name: p.name,
      engines: [...p.engines],
      failures: metrics.failed,
      averageRuntimeMs: metrics.averageExecutionTime,
      executionTimeline: p.engines.map((engine) => ({
        step: engine,
        status: "OK" as const,
        durationMs: metrics.averageExecutionTime,
      })),
    }));
  } catch {
    return [];
  }
}

export function buildBuiltinDiagnosticsSources(): DiagnosticsSourceDefinition[] {
  return [
    {
      id: "dataIntegrity",
      name: "Data Integrity Engine",
      collect: () =>
        safeCollect("dataIntegrity", () => {
          const { getDataIntegrityEngine } = require("../DataIntegrityEngine") as {
            getDataIntegrityEngine: () => {
              getRules: () => unknown[];
              getMetrics: () => {
                datasetsValidated: number;
                datasetsApproved: number;
                datasetsRejected: number;
                averageIntegrityScore: number;
                averageExecutionTime: number;
              };
            };
          };
          const engine = getDataIntegrityEngine();
          const metrics = engine.getMetrics();
          return [
            {
              sourceId: "dataIntegrity",
              module: "dataIntegrity",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              ruleCount: engine.getRules().length,
              validationCount: metrics.datasetsValidated,
              passed: metrics.datasetsApproved,
              failed: metrics.datasetsRejected,
              averageRuntimeMs: metrics.averageExecutionTime,
              integrityScore: metrics.averageIntegrityScore,
              healthScore: metrics.averageIntegrityScore || 100,
              engineVersion: "9F.1",
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
                listRules: () => unknown[];
                getAggregateMetrics: () => {
                  totalExecutions: number;
                  successRate: number;
                  failureRate: number;
                  averageRuntime: number;
                };
              };
              getRules: () => unknown[];
            };
          };
          const engine = getDataIntegrityEngine();
          const ruleEngine = engine.getRuleEngine();
          const agg = ruleEngine.getAggregateMetrics();
          const ruleCount =
            ruleEngine.listRules().length || engine.getRules().length;
          return [
            {
              sourceId: "ruleEngine",
              module: "ruleEngine",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: agg.failureRate < 50,
              validationCount: agg.totalExecutions,
              passed: Math.round((agg.successRate / 100) * agg.totalExecutions),
              failed: Math.round((agg.failureRate / 100) * agg.totalExecutions),
              averageRuntimeMs: agg.averageRuntime,
              ruleCount,
              healthScore: agg.successRate,
            },
          ];
        }),
    },
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getPipelineManager: () => {
                listPipelines: () => unknown[];
              };
              getMetrics: () => {
                requests: number;
                completed: number;
                failed: number;
                averageExecutionTime: number;
              };
            };
          };
          const orch = getValidationOrchestrator();
          const m = orch.getMetrics();
          return [
            {
              sourceId: "orchestrator",
              module: "orchestrator",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: m.failed === 0 || m.requests === 0,
              validationCount: m.requests,
              passed: m.completed,
              failed: m.failed,
              averageRuntimeMs: m.averageExecutionTime,
              pipelineCount: orch.getPipelineManager().listPipelines().length,
              healthScore:
                m.requests === 0
                  ? 100
                  : Math.max(0, 100 - (m.failed / m.requests) * 100),
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
                totalCalculations: number;
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
              registered: true,
              healthy: true,
              validationCount: m.totalCalculations,
              trustScore: m.averageTrustScore,
              healthScore: m.averageTrustScore || 100,
              averageRuntimeMs: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      collect: () =>
        safeCollect("dashboard", () => {
          const { getValidationDashboardService } = require("../dashboard") as {
            getValidationDashboardService: () => {
              getDashboardMetrics: () => {
                totalRefreshes: number;
                averageAggregationTime: number;
                cacheHitPercent: number;
              };
            };
          };
          const m = getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.totalRefreshes,
              averageRuntimeMs: m.averageAggregationTime,
              cacheHitRate: m.cacheHitPercent,
              healthScore: 100,
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
                analyticsRuns: number;
                healthScore: number;
                averageRuntime: number;
              };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: m.healthScore >= 50,
              validationCount: m.analyticsRuns,
              healthScore: m.healthScore,
              averageRuntimeMs: m.averageRuntime,
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
              registered: true,
              healthy: true,
              validationCount: m.reportsGenerated,
              averageRuntimeMs: m.averageGenerationTime,
              healthScore: 100,
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
                failureCount: number;
                averageDispatchTime: number;
              };
              getEventHealth: () => { overall: string };
            };
          };
          const bus = getValidationEventBus();
          const m = bus.getEventMetrics();
          const health = bus.getEventHealth();
          const healthScore =
            health.overall === "HEALTHY"
              ? 100
              : health.overall === "DEGRADED"
                ? 60
                : health.overall === "CRITICAL"
                  ? 20
                  : 50;
          return [
            {
              sourceId: "eventBus",
              module: "eventBus",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: health.overall !== "CRITICAL",
              validationCount: m.totalEvents,
              failed: m.failureCount,
              averageRuntimeMs: m.averageDispatchTime,
              healthScore,
            },
          ];
        }),
    },
    {
      id: "market",
      name: "Market Validation",
      collect: () =>
        safeCollect("market", () => {
          const { getMarketValidationMetrics } = require("../rules/market") as {
            getMarketValidationMetrics: () => {
              marketDatasetsValidated: number;
              rejectedDatasets: number;
              averageExecutionTime: number;
            };
          };
          const m = getMarketValidationMetrics();
          return [
            {
              sourceId: "market",
              module: "market",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.marketDatasetsValidated,
              failed: m.rejectedDatasets,
              passed: Math.max(
                0,
                m.marketDatasetsValidated - m.rejectedDatasets
              ),
              averageRuntimeMs: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "technical",
      name: "Technical Validation",
      collect: () =>
        safeCollect("technical", () => {
          const {
            getTechnicalValidationMetrics,
          } = require("../rules/technical") as {
            getTechnicalValidationMetrics: () => {
              indicatorsValidated: number;
              failedIndicators: number;
              averageRuntime: number;
            };
          };
          const m = getTechnicalValidationMetrics();
          return [
            {
              sourceId: "technical",
              module: "technical",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.indicatorsValidated,
              failed: m.failedIndicators,
              passed: Math.max(0, m.indicatorsValidated - m.failedIndicators),
              averageRuntimeMs: m.averageRuntime,
            },
          ];
        }),
    },
    {
      id: "fundamental",
      name: "Fundamental Validation",
      collect: () =>
        safeCollect("fundamental", () => {
          const {
            getFundamentalValidationMetrics,
          } = require("../rules/fundamental") as {
            getFundamentalValidationMetrics: () => {
              companiesValidated: number;
              ratioFailures: number;
              averageExecutionTime: number;
            };
          };
          const m = getFundamentalValidationMetrics();
          return [
            {
              sourceId: "fundamental",
              module: "fundamental",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.companiesValidated,
              failed: m.ratioFailures,
              passed: Math.max(0, m.companiesValidated - m.ratioFailures),
              averageRuntimeMs: m.averageExecutionTime,
            },
          ];
        }),
    },
    {
      id: "recommendation",
      name: "Recommendation Validation",
      collect: () =>
        safeCollect("recommendation", () => {
          const {
            getRecommendationValidationMetrics,
          } = require("../rules/recommendation") as {
            getRecommendationValidationMetrics: () => {
              recommendationsValidated: number;
              rejected: number;
              averageValidationTime: number;
            };
          };
          const m = getRecommendationValidationMetrics();
          return [
            {
              sourceId: "recommendation",
              module: "recommendation",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.recommendationsValidated,
              failed: m.rejected,
              passed: Math.max(0, m.recommendationsValidated - m.rejected),
              averageRuntimeMs: m.averageValidationTime,
            },
          ];
        }),
    },
    {
      id: "tradeSetup",
      name: "Trade Setup Validation",
      collect: () =>
        safeCollect("tradeSetup", () => {
          const {
            getTradeSetupValidationMetrics,
          } = require("../rules/tradeSetup") as {
            getTradeSetupValidationMetrics: () => {
              tradeSetupsValidated: number;
              rejectedSetups: number;
              averageValidationRuntime: number;
            };
          };
          const m = getTradeSetupValidationMetrics();
          return [
            {
              sourceId: "tradeSetup",
              module: "tradeSetup",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.tradeSetupsValidated,
              failed: m.rejectedSetups,
              passed: Math.max(0, m.tradeSetupsValidated - m.rejectedSetups),
              averageRuntimeMs: m.averageValidationRuntime,
            },
          ];
        }),
    },
    {
      id: "hallucination",
      name: "Hallucination Engine",
      collect: () =>
        safeCollect("hallucination", () => {
          const {
            getHallucinationValidationMetrics,
          } = require("../rules/hallucination") as {
            getHallucinationValidationMetrics: () => {
              aiOutputsValidated: number;
              hallucinationsDetected: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHallucinationValidationMetrics();
          return [
            {
              sourceId: "hallucination",
              module: "hallucination",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: m.aiOutputsValidated,
              failed: m.hallucinationsDetected,
              passed: Math.max(
                0,
                m.aiOutputsValidated - m.hallucinationsDetected
              ),
              averageRuntimeMs: m.averageValidationRuntime,
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
              recommendationsAnalysed: number;
              tradesAnalysed: number;
              historicalScore: number;
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          const total = m.recommendationsAnalysed + m.tradesAnalysed;
          return [
            {
              sourceId: "historical",
              module: "historical",
              timestamp: new Date().toISOString(),
              registered: true,
              healthy: true,
              validationCount: total,
              healthScore: m.historicalScore,
              averageRuntimeMs: m.averageValidationRuntime,
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinDiagnosticsSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinDiagnosticsSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredDiagnosticsSources().length,
      total: getRegisteredDiagnosticsSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinDiagnosticsSources()) {
    const result = registerDiagnosticsSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinDiagnosticsSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredDiagnosticsSources().length,
  };
}

export interface DiagnosticsRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationDiagnosticsEngine(options?: {
  engine?: ValidationDiagnosticsEngine;
  config?: DiagnosticsConfigurationInput;
  force?: boolean;
}): DiagnosticsRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredDiagnosticsSources().length,
    };
  }

  const sources = registerBuiltinDiagnosticsSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationDiagnosticsEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationDiagnosticsEngine(
  options?: DiagnosticsConfigurationInput
): ValidationDiagnosticsEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationDiagnosticsEngine(options);
    registerBuiltinDiagnosticsSources();
  }
  return defaultEngine;
}

export function resetValidationDiagnosticsEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetDiagnosticsSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function runDiagnostics(
  options?: RunDiagnosticsOptions
): DiagnosticsRunResult {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().runDiagnostics(options);
}

export function inspectRules(rules?: RuleInspectionInput[]) {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().inspectRules(rules);
}

export function inspectPipeline(pipelines?: PipelineInspectionInput[]) {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().inspectPipeline(pipelines);
}

export function generateTrace(input?: TraceInput) {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().generateTrace(input);
}

export function profileValidation(options?: RunDiagnosticsOptions) {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().profileValidation(options);
}

export function getDiagnosticsHealth(options?: RunDiagnosticsOptions) {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().getDiagnosticsHealth(options);
}

export function createDiagnosticsSnapshot(label?: string): DiagnosticsSnapshot {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().createDiagnosticsSnapshot(label);
}

export function generateDiagnosticsReport(
  options?: RunDiagnosticsOptions
): DiagnosticsReport {
  registerValidationDiagnosticsEngine();
  return getValidationDiagnosticsEngine().generateDiagnosticsReport(options);
}

export {
  DEFAULT_DIAGNOSTICS_CONFIGURATION,
  resolveDiagnosticsConfiguration,
  registerDiagnosticsSource,
};
