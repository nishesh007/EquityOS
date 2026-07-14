/**
 * Institutional Validation Automation & Optimization Engine — façade (Prompt 9F.18).
 * Advisory execution optimization only: never alters validation decisions or correctness.
 */

import {
  DEFAULT_OPTIMIZATION_CONFIGURATION,
  resolveOptimizationConfiguration,
  type OptimizationConfiguration,
  type OptimizationConfigurationInput,
  type OptimizationMode,
} from "./OptimizationConfiguration";
import {
  areBuiltinOptimizationSourcesRegistered,
  collectAllOptimizationProbes,
  getRegisteredOptimizationSources,
  markBuiltinOptimizationSourcesRegistered,
  registerOptimizationSource,
  resetOptimizationSourceRegistrationState,
  type OptimizationProbe,
  type OptimizationSourceDefinition,
} from "./OptimizationRegistry";
import { OptimizationPlanner, type OptimizationPlan } from "./OptimizationPlanner";
import { PipelineOptimizer } from "./PipelineOptimizer";
import { ExecutionOptimizer } from "./ExecutionOptimizer";
import { CacheOptimizer } from "./CacheOptimizer";
import { DependencyOptimizer } from "./DependencyOptimizer";
import { PerformanceOptimizer } from "./PerformanceOptimizer";
import { OptimizationMetricsTracker } from "./OptimizationMetrics";
import { OptimizationAuditLogger } from "./OptimizationAuditLogger";
import {
  OptimizationSnapshotStore,
  compareOptimizationSnapshots,
  type OptimizationSnapshot,
  type OptimizationSnapshotComparison,
} from "./OptimizationSnapshot";
import type { OptimizationRecommendation } from "./OptimizationStrategies";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface RunOptimizationOptions {
  mode?: OptimizationMode;
  probes?: OptimizationProbe[];
  includeLiveCollectors?: boolean;
}

export interface OptimizationRunResult {
  runId: string;
  mode: OptimizationMode;
  plan: OptimizationPlan;
  pipeline: ReturnType<PipelineOptimizer["optimize"]>;
  execution: ReturnType<ExecutionOptimizer["optimize"]>;
  cache: ReturnType<CacheOptimizer["optimize"]>;
  dependencies: ReturnType<DependencyOptimizer["analyze"]>;
  performance: ReturnType<PerformanceOptimizer["analyze"]>;
  optimizationScore: number;
  recommendations: OptimizationRecommendation[];
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
  engineVersion: string;
  advisoryOnly: true;
}

let defaultEngine: ValidationOptimizationEngine | null = null;
let engineRegistered = false;

export class ValidationOptimizationEngine {
  private config: OptimizationConfiguration;
  private planner: OptimizationPlanner;
  private pipelineOptimizer: PipelineOptimizer;
  private executionOptimizer: ExecutionOptimizer;
  private cacheOptimizer: CacheOptimizer;
  private readonly dependencyOptimizer = new DependencyOptimizer();
  private performanceOptimizer: PerformanceOptimizer;
  private readonly metrics = new OptimizationMetricsTracker();
  private audit: OptimizationAuditLogger;
  private snapshots: OptimizationSnapshotStore;
  private lastRun: OptimizationRunResult | null = null;

  constructor(configInput?: OptimizationConfigurationInput) {
    this.config = resolveOptimizationConfiguration(configInput);
    this.planner = new OptimizationPlanner(this.config);
    this.pipelineOptimizer = new PipelineOptimizer(this.config);
    this.executionOptimizer = new ExecutionOptimizer(this.config);
    this.cacheOptimizer = new CacheOptimizer(this.config);
    this.performanceOptimizer = new PerformanceOptimizer(this.config);
    this.audit = new OptimizationAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new OptimizationSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): OptimizationConfiguration {
    return resolveOptimizationConfiguration(this.config);
  }

  updateConfiguration(input: OptimizationConfigurationInput): void {
    this.config = resolveOptimizationConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.planner.setConfiguration(this.config);
    this.pipelineOptimizer.setConfiguration(this.config);
    this.executionOptimizer.setConfiguration(this.config);
    this.cacheOptimizer.setConfiguration(this.config);
    this.performanceOptimizer.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: OptimizationSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerOptimizationSource(definition, options);
  }

  runOptimization(options: RunOptimizationOptions = {}): OptimizationRunResult {
    const started = Date.now();
    const mode = options.mode ?? this.config.optimizationMode;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      if (Math.random() > this.config.samplingRate) {
        warnings.push("Optimization skipped by sampling rate.");
      }

      const probes = this.resolveProbes(options);
      const includePipeline =
        mode === "full" ||
        mode === "pipeline" ||
        mode === "deep" ||
        mode === "quick" ||
        mode === "custom";
      const includeCache =
        mode === "full" || mode === "cache" || mode === "deep" || mode === "custom";
      const includeDeps =
        mode === "full" ||
        mode === "dependency" ||
        mode === "deep" ||
        mode === "custom";
      const includePerf =
        mode === "full" ||
        mode === "performance" ||
        mode === "deep" ||
        mode === "quick" ||
        mode === "custom";

      const pipeline = includePipeline
        ? this.pipelineOptimizer.optimize(probes)
        : emptyPipeline();
      const execution = this.executionOptimizer.optimize(probes);
      const cache = includeCache
        ? this.cacheOptimizer.optimize(probes)
        : emptyCache(this.config.cacheDefaultTtlMs);
      const dependencies = includeDeps
        ? this.dependencyOptimizer.analyze(probes)
        : emptyDependencies();
      const performance = includePerf
        ? this.performanceOptimizer.analyze(probes)
        : emptyPerformance();

      warnings.push(
        ...pipeline.warnings,
        ...execution.warnings,
        ...cache.warnings,
        ...dependencies.warnings,
        ...performance.warnings
      );
      errors.push(
        ...pipeline.errors,
        ...execution.errors,
        ...cache.errors,
        ...dependencies.errors,
        ...performance.errors
      );

      const recommendations = [
        ...pipeline.recommendations,
        ...execution.recommendations,
        ...cache.recommendations,
        ...dependencies.recommendations,
        ...performance.recommendations,
      ];

      const plan = this.planner.buildPlan({
        pipelineEfficiency: pipeline.pipelineEfficiency,
        cacheEfficiency: cache.cacheEfficiency,
        executionSpeed: execution.executionSpeed,
        memoryEfficiency: performance.memoryEfficiency,
        dependencyHealth: dependencies.dependencyHealth,
        recommendations,
        warnings,
        errors,
      });

      const executionTimeMs = Date.now() - started;
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        optimizationScore: plan.score.overall,
        cacheHitRate: cache.averageHitRate,
        recommendationCount: plan.recommendations.length,
        pipelineImprovements: pipeline.suggestedOrder.length,
        memorySavingsEstimate: performance.highMemoryConsumers.length * 1024,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "OptimizationRun",
        mode,
        optimizationScore: plan.score.overall,
        scoreBreakdown: plan.score,
        recommendationCount: plan.recommendations.length,
        runtimeMs: executionTimeMs,
        warnings: plan.warnings,
        errors: plan.errors,
        configurationVersion: this.config.engineVersion,
        engineVersion: this.config.engineVersion,
      });

      const result: OptimizationRunResult = {
        runId: `opt-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        mode,
        plan,
        pipeline,
        execution,
        cache,
        dependencies,
        performance,
        optimizationScore: plan.score.overall,
        recommendations: plan.recommendations,
        executionTimeMs,
        warnings: plan.warnings,
        errors: plan.errors,
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      };
      this.lastRun = result;

      safePublishEvent({
        eventType: "WarningRaised",
        module: "optimization",
        source: "optimization-engine",
        severity: "INFO",
        payload: {
          runId: result.runId,
          optimizationScore: result.optimizationScore,
          advisoryOnly: true,
        },
        executionTimeMs,
      });

      return result;
    } catch (err) {
      const executionTimeMs = Date.now() - started;
      errors.push(`Optimization failed: ${String(err)}`);
      const plan = this.planner.buildPlan({
        pipelineEfficiency: 0,
        cacheEfficiency: 0,
        executionSpeed: 0,
        memoryEfficiency: 0,
        dependencyHealth: 0,
        recommendations: [],
        warnings,
        errors,
      });
      this.metrics.recordRun({
        runtimeMs: executionTimeMs,
        optimizationScore: 0,
        recommendationCount: 0,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "OptimizationRun",
        mode,
        optimizationScore: 0,
        recommendationCount: 0,
        runtimeMs: executionTimeMs,
        warnings,
        errors,
        configurationVersion: this.config.engineVersion,
        engineVersion: this.config.engineVersion,
      });
      const result: OptimizationRunResult = {
        runId: `opt-run:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        mode,
        plan,
        pipeline: emptyPipeline(),
        execution: {
          executionSpeed: 0,
          averageRuntimeMs: 0,
          highRetryTargets: [],
          congestedQueues: [],
          recommendations: [],
          warnings: [],
          errors: [],
        },
        cache: emptyCache(this.config.cacheDefaultTtlMs),
        dependencies: emptyDependencies(),
        performance: emptyPerformance(),
        optimizationScore: 0,
        recommendations: [],
        executionTimeMs,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      };
      this.lastRun = result;
      return result;
    }
  }

  analyzePerformance(options: RunOptimizationOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      return this.performanceOptimizer.analyze(probes);
    } catch (err) {
      return {
        ...emptyPerformance(),
        errors: [`analyzePerformance failed: ${String(err)}`],
      };
    }
  }

  optimizePipeline(options: RunOptimizationOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      return this.pipelineOptimizer.optimize(probes);
    } catch (err) {
      return {
        ...emptyPipeline(),
        errors: [`optimizePipeline failed: ${String(err)}`],
      };
    }
  }

  optimizeCache(options: RunOptimizationOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      return this.cacheOptimizer.optimize(probes);
    } catch (err) {
      return {
        ...emptyCache(this.config.cacheDefaultTtlMs),
        errors: [`optimizeCache failed: ${String(err)}`],
      };
    }
  }

  analyzeDependencies(options: RunOptimizationOptions = {}) {
    try {
      const probes = this.resolveProbes(options);
      return this.dependencyOptimizer.analyze(probes);
    } catch (err) {
      return {
        ...emptyDependencies(),
        errors: [`analyzeDependencies failed: ${String(err)}`],
      };
    }
  }

  getOptimizationMetrics() {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  createOptimizationSnapshot(label?: string): OptimizationSnapshot {
    try {
      const run =
        this.lastRun ??
        this.runOptimization({ mode: "quick", includeLiveCollectors: false });
      const snapshot = this.snapshots.save(
        {
          score: run.plan.score,
          averageRuntimeMs: run.execution.averageRuntimeMs,
          cacheHitRate: run.cache.averageHitRate,
          recommendationCount: run.recommendations.length,
          pipelineEfficiency: run.pipeline.pipelineEfficiency,
          cacheEfficiency: run.cache.cacheEfficiency,
          dependencyHealth: run.dependencies.dependencyHealth,
          memoryEfficiency: run.performance.memoryEfficiency,
          configurationVersion: this.config.engineVersion,
          mode: run.mode,
        },
        label
      );
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        mode: run.mode,
        optimizationScore: run.optimizationScore,
        recommendationCount: run.recommendations.length,
        runtimeMs: 0,
        warnings: [],
        errors: [],
        configurationVersion: this.config.engineVersion,
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch (err) {
      return this.snapshots.save(
        {
          score: {
            pipelineEfficiency: 0,
            cacheEfficiency: 0,
            executionSpeed: 0,
            memoryEfficiency: 0,
            dependencyHealth: 0,
            automationOpportunities: 0,
            overall: 0,
          },
          averageRuntimeMs: 0,
          cacheHitRate: null,
          recommendationCount: 0,
          pipelineEfficiency: 0,
          cacheEfficiency: 0,
          dependencyHealth: 0,
          memoryEfficiency: 0,
          configurationVersion: this.config.engineVersion,
          mode: "quick",
        },
        label ?? `error:${String(err)}`
      );
    }
  }

  compareOptimizationSnapshots(
    baselineId: string,
    compareId: string
  ): OptimizationSnapshotComparison | null {
    try {
      const baseline = this.snapshots.load(baselineId);
      const compare = this.snapshots.load(compareId);
      if (!baseline || !compare) return null;
      return compareOptimizationSnapshots(baseline, compare, this.config);
    } catch {
      return null;
    }
  }

  listSnapshots(): OptimizationSnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastRun(): OptimizationRunResult | null {
    return this.lastRun;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastRun = null;
  }

  private resolveProbes(
    options: RunOptimizationOptions = {}
  ): OptimizationProbe[] {
    const probes: OptimizationProbe[] = [...(options.probes ?? [])];
    if (options.includeLiveCollectors !== false) {
      try {
        probes.push(...collectAllOptimizationProbes());
      } catch {
        // never interrupt
      }
    }
    return probes;
  }
}

function emptyPipeline() {
  return {
    pipelineEfficiency: 100,
    suggestedOrder: [] as Array<{
      pipelineId: string;
      runtimeMs: number;
      rank: number;
    }>,
    parallelCandidates: [] as string[],
    recommendations: [] as OptimizationRecommendation[],
    warnings: [] as string[],
    errors: [] as string[],
  };
}

function emptyCache(defaultTtl: number) {
  return {
    cacheEfficiency: 100,
    averageHitRate: null as number | null,
    suggestedTtlMs: defaultTtl,
    recommendations: [] as OptimizationRecommendation[],
    warnings: [] as string[],
    errors: [] as string[],
  };
}

function emptyDependencies() {
  return {
    dependencyHealth: 100,
    unusedDependencies: [] as Array<{ ruleId: string; dependency: string }>,
    circularDependencies: [] as string[][],
    duplicateExecutions: [] as string[],
    redundantRules: [] as string[],
    idlePipelines: [] as string[],
    deadPaths: [] as string[],
    recommendations: [] as OptimizationRecommendation[],
    warnings: [] as string[],
    errors: [] as string[],
  };
}

function emptyPerformance() {
  return {
    memoryEfficiency: 100,
    slowRules: [] as Array<{ ruleId: string; runtimeMs: number }>,
    slowPipelines: [] as Array<{ pipelineId: string; runtimeMs: number }>,
    slowModules: [] as Array<{ module: string; runtimeMs: number }>,
    highMemoryConsumers: [] as Array<{ module: string; memoryBytes: number }>,
    frequentRetries: [] as Array<{ targetId: string; retryCount: number }>,
    bottlenecks: [] as string[],
    queueCongestion: [] as Array<{ targetId: string; queueDepth: number }>,
    recommendations: [] as OptimizationRecommendation[],
    warnings: [] as string[],
    errors: [] as string[],
  };
}

function safeCollect(
  sourceId: string,
  fn: () => OptimizationProbe[]
): OptimizationProbe[] {
  try {
    return fn();
  } catch {
    return [
      {
        sourceId: sourceId as OptimizationProbe["sourceId"],
        module: sourceId,
        timestamp: new Date().toISOString(),
        metadata: { unavailable: true },
      },
    ];
  }
}

export function buildBuiltinOptimizationSources(): OptimizationSourceDefinition[] {
  return [
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const { getValidationOrchestrator } = require("../orchestrator") as {
            getValidationOrchestrator: () => {
              getMetrics: () => {
                averageExecutionTime: number;
                failed: number;
                requests: number;
              };
              getPipelineManager: () => {
                listPipelines: () => Array<{ id: string; engines: string[] }>;
              };
            };
          };
          const orch = getValidationOrchestrator();
          const m = orch.getMetrics();
          return orch.getPipelineManager().listPipelines().map((p) => ({
            sourceId: "orchestrator" as const,
            module: "orchestrator",
            timestamp: new Date().toISOString(),
            pipelineId: p.id,
            runtimeMs: m.averageExecutionTime,
            retryCount: m.failed,
            parallelSlots: Math.min(p.engines.length, 4),
            dependencies: p.engines.slice(0, -1),
          }));
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
                  averageRuntime: number;
                  totalExecutions: number;
                };
                getCacheStats: () => {
                  hits: number;
                  misses: number;
                  size: number;
                  ttlMs: number;
                };
                listRules: () => Array<{
                  id: string;
                  dependencies?: string[];
                }>;
              };
            };
          };
          const engine = getDataIntegrityEngine().getRuleEngine();
          const agg = engine.getAggregateMetrics();
          const cache = engine.getCacheStats();
          const total = cache.hits + cache.misses;
          const hitRate = total === 0 ? undefined : (cache.hits / total) * 100;
          return engine.listRules().slice(0, 50).map((rule, index) => ({
            sourceId: "ruleEngine" as const,
            module: "ruleEngine",
            timestamp: new Date().toISOString(),
            ruleId: rule.id,
            runtimeMs: agg.averageRuntime,
            dependencies: [...(rule.dependencies ?? [])],
            executionOrder: index,
            cacheHitRate: hitRate,
            cacheSize: cache.size,
            cacheTtlMs: cache.ttlMs,
          }));
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
                averageRuntime: number;
                healthScore: number;
              };
            };
          };
          const m = getValidationAnalyticsEngine().getMetrics();
          return [
            {
              sourceId: "analytics",
              module: "analytics",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageRuntime,
              successRate: m.healthScore,
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
                averageRuntime: number;
                healthScore: number;
                memoryUsage: number;
              };
            };
          };
          const m = getValidationDiagnosticsEngine().getMetrics();
          return [
            {
              sourceId: "diagnostics",
              module: "diagnostics",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageRuntime,
              memoryBytes: m.memoryUsage,
              successRate: m.healthScore,
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
              runtimeMs: m.averageGenerationTime,
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
              };
            };
          };
          const m = getValidationDashboardService().getDashboardMetrics();
          return [
            {
              sourceId: "dashboard",
              module: "dashboard",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageAggregationTime,
              cacheHitRate: m.cacheHitPercent,
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
                averageDispatchTime: number;
                queueSize: number;
              };
            };
          };
          const m = getValidationEventBus().getEventMetrics();
          return [
            {
              sourceId: "eventBus",
              module: "eventBus",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageDispatchTime,
              queueDepth: m.queueSize,
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
              runtimeMs: m.averageValidationRuntime,
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
              averageValidationRuntime: number;
            };
          };
          const m = getHistoricalValidationMetrics();
          return [
            {
              sourceId: "historical",
              module: "historical",
              timestamp: new Date().toISOString(),
              runtimeMs: m.averageValidationRuntime,
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
              getAdministrationMetrics: () => {
                policies: number;
              };
            };
          };
          const m = getValidationAdministrationEngine().getAdministrationMetrics();
          return [
            {
              sourceId: "admin",
              module: "admin",
              timestamp: new Date().toISOString(),
              metadata: { policies: m.policies },
            },
          ];
        }),
    },
  ];
}

export function registerBuiltinOptimizationSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinOptimizationSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredOptimizationSources().length,
      total: getRegisteredOptimizationSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinOptimizationSources()) {
    const result = registerOptimizationSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinOptimizationSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredOptimizationSources().length,
  };
}

export interface OptimizationRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationOptimizationEngine(options?: {
  engine?: ValidationOptimizationEngine;
  config?: OptimizationConfigurationInput;
  force?: boolean;
}): OptimizationRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredOptimizationSources().length,
    };
  }

  const sources = registerBuiltinOptimizationSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationOptimizationEngine(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationOptimizationEngine(
  options?: OptimizationConfigurationInput
): ValidationOptimizationEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationOptimizationEngine(options);
    registerBuiltinOptimizationSources();
  }
  return defaultEngine;
}

export function resetValidationOptimizationEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetOptimizationSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function runOptimization(options?: RunOptimizationOptions) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().runOptimization(options);
}

export function analyzePerformance(options?: RunOptimizationOptions) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().analyzePerformance(options);
}

export function optimizePipeline(options?: RunOptimizationOptions) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().optimizePipeline(options);
}

export function optimizeCache(options?: RunOptimizationOptions) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().optimizeCache(options);
}

export function analyzeDependencies(options?: RunOptimizationOptions) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().analyzeDependencies(options);
}

export function getOptimizationMetrics() {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().getOptimizationMetrics();
}

export function createOptimizationSnapshot(label?: string) {
  registerValidationOptimizationEngine();
  return getValidationOptimizationEngine().createOptimizationSnapshot(label);
}

export {
  DEFAULT_OPTIMIZATION_CONFIGURATION,
  resolveOptimizationConfiguration,
  registerOptimizationSource,
};
