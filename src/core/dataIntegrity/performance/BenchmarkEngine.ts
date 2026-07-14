/**
 * Benchmark engine — generates advisory synthetic samples and orchestrates analyzers.
 */

import type {
  BenchmarkMode,
  PerformanceConfiguration,
} from "./PerformanceConfiguration";
import type { PerformanceSourceDefinition } from "./PerformanceRegistry";
import { LatencyProfiler, type LatencyProfile } from "./LatencyProfiler";
import {
  ThroughputAnalyzer,
  type ThroughputAnalysis,
} from "./ThroughputAnalyzer";
import { ResourceAnalyzer, type ResourceAnalysis } from "./ResourceAnalyzer";
import {
  ScalabilityAnalyzer,
  type ScalabilityAnalysis,
} from "./ScalabilityAnalyzer";
import { CapacityPlanner, type CapacityPlan } from "./CapacityPlanner";
import type { PerformanceHealthScore } from "./PerformanceMetrics";

export interface BenchmarkRunOptions {
  mode?: BenchmarkMode;
  sampleSize?: number;
  concurrency?: number;
  sourceId?: string;
  moduleId?: string;
  historicalThroughput?: number[];
  /** Injected samples for deterministic tests (ms). */
  injectedSamplesMs?: number[];
}

export interface BenchmarkRunResult {
  benchmarkId: string;
  mode: BenchmarkMode;
  generatedAt: string;
  samplesMs: number[];
  latency: LatencyProfile;
  throughput: ThroughputAnalysis;
  resources: ResourceAnalysis;
  scalability: ScalabilityAnalysis;
  capacity: CapacityPlan;
  healthScore: PerformanceHealthScore;
  executionTimeMs: number;
  warnings: string[];
  errors: string[];
}

export class BenchmarkEngine {
  private config: PerformanceConfiguration;
  private readonly latencyProfiler = new LatencyProfiler();
  private readonly throughputAnalyzer = new ThroughputAnalyzer();
  private readonly resourceAnalyzer = new ResourceAnalyzer();
  private readonly scalabilityAnalyzer = new ScalabilityAnalyzer();
  private readonly capacityPlanner = new CapacityPlanner();
  private runSeq = 0;

  constructor(config: PerformanceConfiguration) {
    this.config = config;
  }

  setConfiguration(config: PerformanceConfiguration): void {
    this.config = config;
  }

  run(
    sources: PerformanceSourceDefinition[],
    options: BenchmarkRunOptions = {}
  ): BenchmarkRunResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    this.runSeq += 1;
    const benchmarkId = `bench:${this.runSeq}:${Date.now()}`;

    try {
      const mode = options.mode ?? this.config.benchmarkMode;
      const sampleSize = Math.max(
        1,
        options.sampleSize ?? this.config.sampleSize
      );
      const concurrency = Math.max(
        1,
        options.concurrency ?? this.config.concurrency
      );

      const selected = this.selectSources(sources, options);
      if (selected.length === 0) {
        errors.push("no performance sources available");
      }

      const samplesMs =
        options.injectedSamplesMs?.slice(0, sampleSize) ??
        this.generateSamples(selected, mode, sampleSize, concurrency);

      const latency = this.latencyProfiler.profile(
        samplesMs,
        this.config.targetLatencyMs
      );
      const durationMs = Math.max(
        1,
        latency.averageMs * Math.ceil(sampleSize / concurrency)
      );
      const throughput = this.throughputAnalyzer.analyze({
        completedOps: sampleSize,
        durationMs,
        concurrency,
        targetThroughputPerSec: this.config.targetThroughputPerSec,
        rulesPerValidation: mode === "pipeline" ? 12 : 8,
        batchSize: mode === "batch" ? 20 : 10,
        pipelineStages: mode === "pipeline" ? 6 : 4,
      });
      const resources = this.resourceAnalyzer.analyze({
        concurrency,
        sampleSize,
        averageLatencyMs: latency.averageMs,
        sourceCount: Math.max(1, selected.length),
        institutionalMode: this.config.institutionalMode,
      });
      warnings.push(...resources.warnings);

      const scalability = this.scalabilityAnalyzer.analyze({
        concurrency,
        throughputPerSec: throughput.validationsPerSec,
        targetThroughputPerSec: this.config.targetThroughputPerSec,
        cpuUsagePct: resources.cpuUsagePct,
        memoryUsagePct: resources.memoryUsagePct,
        p95LatencyMs: latency.p95Ms,
        targetLatencyMs: this.config.targetLatencyMs,
      });
      warnings.push(...scalability.warnings);

      const capacity = this.capacityPlanner.plan({
        throughputPerSec: throughput.validationsPerSec,
        targetThroughputPerSec: this.config.targetThroughputPerSec,
        cpuUsagePct: resources.cpuUsagePct,
        memoryUsagePct: resources.memoryUsagePct,
        safetyMarginPct: this.config.safetyMarginPct,
        concurrency,
        historicalThroughput: options.historicalThroughput,
      });
      warnings.push(...capacity.warnings);

      const regressionStability =
        mode === "regression"
          ? clamp(Math.round(100 - Math.max(0, latency.p95Ms - this.config.targetLatencyMs) * 0.5), 0, 100)
          : 90;

      const healthScore = this.score({
        latency: latency.score,
        throughput: throughput.score,
        resourceEfficiency: resources.efficiencyScore,
        scalability: scalability.score,
        capacityPlanning: capacity.score,
        regressionStability,
      });

      if (mode === "cold_start" && latency.averageMs > this.config.targetLatencyMs * 1.5) {
        warnings.push("Cold start latency above advisory threshold");
      }

      return {
        benchmarkId,
        mode,
        generatedAt: new Date().toISOString(),
        samplesMs: [...samplesMs],
        latency,
        throughput,
        resources,
        scalability,
        capacity,
        healthScore,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`benchmark failed: ${String(err)}`);
      return {
        benchmarkId,
        mode: options.mode ?? this.config.benchmarkMode,
        generatedAt: new Date().toISOString(),
        samplesMs: [],
        latency: this.latencyProfiler.profile([], this.config.targetLatencyMs),
        throughput: this.throughputAnalyzer.analyze({
          completedOps: 0,
          durationMs: 1,
          concurrency: 1,
          targetThroughputPerSec: this.config.targetThroughputPerSec,
        }),
        resources: this.resourceAnalyzer.analyze({
          concurrency: 1,
          sampleSize: 1,
          averageLatencyMs: 0,
          sourceCount: 0,
          institutionalMode: this.config.institutionalMode,
        }),
        scalability: this.scalabilityAnalyzer.analyze({
          concurrency: 1,
          throughputPerSec: 0,
          targetThroughputPerSec: this.config.targetThroughputPerSec,
          cpuUsagePct: 0,
          memoryUsagePct: 0,
          p95LatencyMs: 0,
          targetLatencyMs: this.config.targetLatencyMs,
        }),
        capacity: this.capacityPlanner.plan({
          throughputPerSec: 0,
          targetThroughputPerSec: this.config.targetThroughputPerSec,
          cpuUsagePct: 0,
          memoryUsagePct: 0,
          safetyMarginPct: this.config.safetyMarginPct,
          concurrency: 1,
        }),
        healthScore: zeroScore(),
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
      };
    }
  }

  private selectSources(
    sources: PerformanceSourceDefinition[],
    options: BenchmarkRunOptions
  ): PerformanceSourceDefinition[] {
    if (options.sourceId) {
      return sources.filter((s) => s.sourceId === options.sourceId);
    }
    if (options.moduleId) {
      return sources.filter(
        (s) =>
          s.kind === options.moduleId ||
          s.sourceId.includes(String(options.moduleId))
      );
    }
    return sources;
  }

  private generateSamples(
    sources: PerformanceSourceDefinition[],
    mode: BenchmarkMode,
    sampleSize: number,
    concurrency: number
  ): number[] {
    const baseline =
      sources.length === 0
        ? this.config.targetLatencyMs
        : sources.reduce((sum, s) => sum + s.baselineLatencyMs * s.weight, 0) /
          Math.max(
            1,
            sources.reduce((sum, s) => sum + s.weight, 0)
          );

    const modeFactor: Record<BenchmarkMode, number> = {
      cold_start: 1.8,
      warm_start: 1.0,
      single: 0.95,
      batch: 1.15,
      pipeline: 1.35,
      module: 1.1,
      snapshot: 1.05,
      regression: 1.25,
    };

    const concurrencyPenalty = 1 + Math.max(0, concurrency - 4) * 0.04;
    const factor = (modeFactor[mode] ?? 1) * concurrencyPenalty;
    const samples: number[] = [];

    for (let i = 0; i < sampleSize; i++) {
      // Deterministic pseudo-variance (no Math.random) for stable advisory runs.
      const wave = Math.sin(i * 0.7) * 0.12 + Math.cos(i * 0.31) * 0.08;
      const jitter = ((i * 37) % 17) / 100;
      const value = Math.max(1, baseline * factor * (1 + wave + jitter));
      samples.push(round2(value));
    }

    if (mode === "cold_start" && samples.length > 0) {
      samples[0] = round2(samples[0]! * 1.6);
    }

    return samples;
  }

  private score(parts: Omit<PerformanceHealthScore, "overall">): PerformanceHealthScore {
    const w = this.config.scoreWeights;
    const overall = clamp(
      Math.round(
        parts.latency * w.latency +
          parts.throughput * w.throughput +
          parts.resourceEfficiency * w.resourceEfficiency +
          parts.scalability * w.scalability +
          parts.capacityPlanning * w.capacityPlanning +
          parts.regressionStability * w.regressionStability
      ),
      0,
      100
    );
    return { ...parts, overall };
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
