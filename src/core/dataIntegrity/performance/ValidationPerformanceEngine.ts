/**
 * Institutional Validation Performance Benchmark & Capacity Planning Engine — façade (Prompt 9F.26).
 * Advisory only: never influences validation decisions or interrupts validation execution.
 */

import {
  DEFAULT_PERFORMANCE_CONFIGURATION,
  resolvePerformanceConfiguration,
  type PerformanceConfiguration,
  type PerformanceConfigurationInput,
  type BenchmarkMode,
} from "./PerformanceConfiguration";
import {
  areBuiltinPerformanceSourcesRegistered,
  createPerformanceSourceId,
  listPerformanceSources,
  markBuiltinPerformanceSourcesRegistered,
  registerPerformanceSource,
  resetPerformanceRegistry,
  type PerformanceSourceDefinition,
  type PerformanceSourceKind,
} from "./PerformanceRegistry";
import {
  BenchmarkEngine,
  type BenchmarkRunOptions,
  type BenchmarkRunResult,
} from "./BenchmarkEngine";
import { LatencyProfiler, type LatencyProfile } from "./LatencyProfiler";
import { CapacityPlanner, type CapacityPlan } from "./CapacityPlanner";
import {
  PerformanceMetricsTracker,
  type PerformanceHealthScore,
  type PerformanceOperationalMetrics,
} from "./PerformanceMetrics";
import { PerformanceAuditLogger } from "./PerformanceAuditLogger";
import {
  PerformanceSnapshotStore,
  buildPerformanceSnapshotPayload,
  comparePerformanceSnapshots,
  type PerformanceSnapshot,
  type PerformanceSnapshotComparison,
  type PerformanceSnapshotKind,
} from "./PerformanceSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export type { PerformanceHealthScore };

export interface AnalyzeLatencyOptions {
  samplesMs: number[];
  targetLatencyMs?: number;
}

export interface AnalyzeCapacityOptions {
  throughputPerSec: number;
  cpuUsagePct?: number;
  memoryUsagePct?: number;
  concurrency?: number;
  historicalThroughput?: number[];
}

let defaultEngine: ValidationPerformanceEngine | null = null;
let engineRegistered = false;

export class ValidationPerformanceEngine {
  private config: PerformanceConfiguration;
  private benchmarkEngine: BenchmarkEngine;
  private readonly latencyProfiler = new LatencyProfiler();
  private readonly capacityPlanner = new CapacityPlanner();
  private readonly metrics = new PerformanceMetricsTracker();
  private audit: PerformanceAuditLogger;
  private snapshots: PerformanceSnapshotStore;
  private lastResult: BenchmarkRunResult | null = null;
  private lastHealthScore: PerformanceHealthScore | null = null;
  private throughputHistory: number[] = [];

  constructor(configInput?: PerformanceConfigurationInput) {
    this.config = resolvePerformanceConfiguration(configInput);
    this.benchmarkEngine = new BenchmarkEngine(this.config);
    this.audit = new PerformanceAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new PerformanceSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): PerformanceConfiguration {
    return resolvePerformanceConfiguration(this.config);
  }

  updateConfiguration(input: PerformanceConfigurationInput): void {
    this.config = resolvePerformanceConfiguration({
      ...this.config,
      ...input,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.benchmarkEngine.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: Omit<PerformanceSourceDefinition, "registeredAt"> & {
      registeredAt?: string;
    },
    options?: { force?: boolean }
  ) {
    return registerPerformanceSource(definition, options);
  }

  runBenchmark(options: BenchmarkRunOptions = {}): BenchmarkRunResult {
    const started = Date.now();
    try {
      const sources = listPerformanceSources();
      const result = this.benchmarkEngine.run(sources, {
        ...options,
        historicalThroughput:
          options.historicalThroughput ?? [...this.throughputHistory],
      });

      this.lastResult = result;
      this.lastHealthScore = result.healthScore;
      this.throughputHistory.push(result.throughput.validationsPerSec);
      if (this.throughputHistory.length > 50) {
        this.throughputHistory.splice(0, this.throughputHistory.length - 50);
      }

      this.metrics.recordBenchmark({
        latencyMs: result.latency.averageMs,
        throughputPerSec: result.throughput.validationsPerSec,
        capacity: result.capacity.recommendedCapacity,
        cpuUsagePct: result.resources.cpuUsagePct,
        memoryUsagePct: result.resources.memoryUsagePct,
        healthScore: result.healthScore.overall,
        runtimeMs: Date.now() - started,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "BenchmarkRun",
        benchmarkId: result.benchmarkId,
        mode: result.mode,
        performanceHealthScore: result.healthScore.overall,
        scoreBreakdown: result.healthScore,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "LatencyAnalyzed",
        benchmarkId: result.benchmarkId,
        performanceHealthScore: result.healthScore.overall,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CapacityPlanned",
        benchmarkId: result.benchmarkId,
        performanceHealthScore: result.capacity.score,
        executionTimeMs: 0,
        warnings: result.capacity.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PerformanceScoreComputed",
        benchmarkId: result.benchmarkId,
        performanceHealthScore: result.healthScore.overall,
        scoreBreakdown: result.healthScore,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "performance",
        source: "performance-engine",
        severity: result.errors.length > 0 ? "WARNING" : "INFO",
        payload: {
          benchmarkId: result.benchmarkId,
          mode: result.mode,
          healthScore: result.healthScore.overall,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return result;
    } catch (err) {
      // Performance failures must never interrupt validation execution.
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runBenchmark failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        benchmarkId: `bench:error:${Date.now()}`,
        mode: options.mode ?? this.config.benchmarkMode,
        generatedAt: new Date().toISOString(),
        samplesMs: [],
        latency: this.latencyProfiler.profile([], this.config.targetLatencyMs),
        throughput: {
          validationsPerSec: 0,
          rulesPerSec: 0,
          batchPerSec: 0,
          pipelinePerSec: 0,
          concurrentRequests: options.concurrency ?? this.config.concurrency,
          peakThroughput: 0,
          score: 0,
        },
        resources: {
          cpuUsagePct: 0,
          memoryUsagePct: 0,
          objectAllocationRate: 0,
          cacheEfficiencyPct: 0,
          gcPressurePct: 0,
          pipelineCost: 0,
          dependencyCost: 0,
          efficiencyScore: 0,
          warnings: [],
        },
        scalability: {
          linearScalingScore: 0,
          horizontalReadiness: 0,
          verticalReadiness: 0,
          concurrencyHeadroom: 0,
          queueDepth: 0,
          backpressurePct: 0,
          score: 0,
          warnings: [],
        },
        capacity: {
          currentCapacity: 0,
          maximumSustainableLoad: 0,
          recommendedCapacity: 0,
          growthTrendPct: 0,
          futureScalingRequirement: 0,
          safetyMarginPct: this.config.safetyMarginPct,
          score: 0,
          warnings: [],
        },
        healthScore: zeroScore(),
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`runBenchmark failed: ${String(err)}`],
      };
    }
  }

  analyzeLatency(options: AnalyzeLatencyOptions): LatencyProfile {
    try {
      const profile = this.latencyProfiler.profile(
        options.samplesMs,
        options.targetLatencyMs ?? this.config.targetLatencyMs
      );
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "LatencyAnalyzed",
        performanceHealthScore: profile.score,
        executionTimeMs: 0,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return profile;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: 0,
        warnings: [],
        errors: [`analyzeLatency failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return this.latencyProfiler.profile([], this.config.targetLatencyMs);
    }
  }

  analyzeCapacity(options: AnalyzeCapacityOptions): CapacityPlan {
    try {
      const plan = this.capacityPlanner.plan({
        throughputPerSec: options.throughputPerSec,
        targetThroughputPerSec: this.config.targetThroughputPerSec,
        cpuUsagePct: options.cpuUsagePct ?? 50,
        memoryUsagePct: options.memoryUsagePct ?? 50,
        safetyMarginPct: this.config.safetyMarginPct,
        concurrency: options.concurrency ?? this.config.concurrency,
        historicalThroughput:
          options.historicalThroughput ?? [...this.throughputHistory],
      });
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CapacityPlanned",
        performanceHealthScore: plan.score,
        executionTimeMs: 0,
        warnings: plan.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return plan;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: 0,
        warnings: [],
        errors: [`analyzeCapacity failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        currentCapacity: 0,
        maximumSustainableLoad: 0,
        recommendedCapacity: 0,
        growthTrendPct: 0,
        futureScalingRequirement: 0,
        safetyMarginPct: this.config.safetyMarginPct,
        score: 0,
        warnings: [`analyzeCapacity failed: ${String(err)}`],
      };
    }
  }

  createPerformanceSnapshot(
    label?: string,
    kind: PerformanceSnapshotKind = "performance"
  ): PerformanceSnapshot {
    const started = Date.now();
    try {
      const result = this.lastResult;
      const score = this.lastHealthScore ?? zeroScore();
      const payload = buildPerformanceSnapshotPayload({
        kind,
        score,
        latencyMs: result?.latency.averageMs ?? 0,
        throughputPerSec: result?.throughput.validationsPerSec ?? 0,
        capacity:
          kind === "capacity"
            ? (result?.capacity.recommendedCapacity ?? 0)
            : (result?.capacity.currentCapacity ?? 0),
        cpuUsagePct: result?.resources.cpuUsagePct ?? 0,
        memoryUsagePct: result?.resources.memoryUsagePct ?? 0,
        scalabilityScore: result?.scalability.score ?? 0,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        performanceHealthScore: score.overall,
        scoreBreakdown: score,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildPerformanceSnapshotPayload({
          kind,
          score: zeroScore(),
          latencyMs: 0,
          throughputPerSec: 0,
          capacity: 0,
          cpuUsagePct: 0,
          memoryUsagePct: 0,
          scalabilityScore: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  comparePerformanceSnapshots(
    baselineId: string,
    compareId: string
  ): PerformanceSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return comparePerformanceSnapshots(a, b);
  }

  listSnapshots(): PerformanceSnapshot[] {
    return this.snapshots.list();
  }

  getPerformanceMetrics(): PerformanceOperationalMetrics {
    this.metrics.setSnapshotCount(this.snapshots.size);
    return this.metrics.getMetrics();
  }

  getPerformanceHealthScore(): PerformanceHealthScore {
    return this.lastHealthScore ?? zeroScore();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  getLastBenchmark(): BenchmarkRunResult | null {
    return this.lastResult;
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.lastResult = null;
    this.lastHealthScore = null;
    this.throughputHistory = [];
  }
}

function zeroScore(): PerformanceHealthScore {
  return {
    latency: 0,
    throughput: 0,
    resourceEfficiency: 0,
    scalability: 0,
    capacityPlanning: 0,
    regressionStability: 0,
    overall: 0,
  };
}

const BUILTIN_SOURCES: Array<{
  kind: PerformanceSourceKind;
  label: string;
  baselineLatencyMs: number;
  baselineThroughput: number;
  weight: number;
}> = [
  { kind: "orchestrator", label: "Validation Orchestrator", baselineLatencyMs: 45, baselineThroughput: 120, weight: 1.2 },
  { kind: "analytics", label: "Analytics Engine", baselineLatencyMs: 55, baselineThroughput: 90, weight: 1 },
  { kind: "diagnostics", label: "Diagnostics Engine", baselineLatencyMs: 70, baselineThroughput: 60, weight: 0.9 },
  { kind: "reliability", label: "Reliability Engine", baselineLatencyMs: 40, baselineThroughput: 100, weight: 1 },
  { kind: "observability", label: "Observability Engine", baselineLatencyMs: 35, baselineThroughput: 150, weight: 0.8 },
  { kind: "optimization", label: "Optimization Engine", baselineLatencyMs: 65, baselineThroughput: 70, weight: 1 },
  { kind: "reporting", label: "Reporting Engine", baselineLatencyMs: 80, baselineThroughput: 50, weight: 0.9 },
  { kind: "dashboard", label: "Validation Dashboard", baselineLatencyMs: 50, baselineThroughput: 110, weight: 0.8 },
  { kind: "versioning", label: "Versioning Engine", baselineLatencyMs: 30, baselineThroughput: 140, weight: 0.7 },
  { kind: "security", label: "Security Engine", baselineLatencyMs: 25, baselineThroughput: 160, weight: 0.7 },
  { kind: "events", label: "Validation Event Bus", baselineLatencyMs: 15, baselineThroughput: 300, weight: 0.6 },
];

export function registerBuiltinPerformanceSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinPerformanceSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: listPerformanceSources().length,
      total: listPerformanceSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const src of BUILTIN_SOURCES) {
    const result = registerPerformanceSource(
      {
        sourceId: createPerformanceSourceId(src.kind),
        kind: src.kind,
        label: src.label,
        baselineLatencyMs: src.baselineLatencyMs,
        baselineThroughput: src.baselineThroughput,
        weight: src.weight,
        metadata: { integration: "read-only", sprint: "9F.26" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinPerformanceSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: listPerformanceSources().length,
  };
}

export interface PerformanceRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerPerformance(options?: {
  engine?: ValidationPerformanceEngine;
  config?: PerformanceConfigurationInput;
  force?: boolean;
}): PerformanceRegistrationResult {
  return registerValidationPerformanceEngine(options);
}

export function registerValidationPerformanceEngine(options?: {
  engine?: ValidationPerformanceEngine;
  config?: PerformanceConfigurationInput;
  force?: boolean;
}): PerformanceRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: listPerformanceSources().length,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationPerformanceEngine(options?.config);
  }

  const builtins = registerBuiltinPerformanceSources({
    force: options?.force,
  });
  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: builtins.total,
  };
}

export function getValidationPerformanceEngine(
  options?: PerformanceConfigurationInput
): ValidationPerformanceEngine {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationPerformanceEngine(options);
    registerBuiltinPerformanceSources();
  }
  return defaultEngine;
}

export function resetValidationPerformanceEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetPerformanceRegistry();
}

/** Public API convenience wrappers. */
export function runBenchmark(options?: BenchmarkRunOptions) {
  registerPerformance();
  return getValidationPerformanceEngine().runBenchmark(options);
}

export function analyzeLatency(options: AnalyzeLatencyOptions) {
  registerPerformance();
  return getValidationPerformanceEngine().analyzeLatency(options);
}

export function analyzeCapacity(options: AnalyzeCapacityOptions) {
  registerPerformance();
  return getValidationPerformanceEngine().analyzeCapacity(options);
}

export function createPerformanceSnapshot(
  label?: string,
  kind?: PerformanceSnapshotKind
) {
  registerPerformance();
  return getValidationPerformanceEngine().createPerformanceSnapshot(
    label,
    kind
  );
}

export function getPerformanceMetrics() {
  registerPerformance();
  return getValidationPerformanceEngine().getPerformanceMetrics();
}

export {
  DEFAULT_PERFORMANCE_CONFIGURATION,
  resolvePerformanceConfiguration,
};

export type { BenchmarkMode, BenchmarkRunOptions, BenchmarkRunResult };
