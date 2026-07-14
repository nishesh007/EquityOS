/**
 * Performance optimizer — slow rules/pipelines/modules, memory, retries, bottlenecks.
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationProbe } from "./OptimizationRegistry";
import {
  OptimizationStrategies,
  type OptimizationRecommendation,
} from "./OptimizationStrategies";

export interface PerformanceAnalysisResult {
  memoryEfficiency: number;
  slowRules: Array<{ ruleId: string; runtimeMs: number }>;
  slowPipelines: Array<{ pipelineId: string; runtimeMs: number }>;
  slowModules: Array<{ module: string; runtimeMs: number }>;
  highMemoryConsumers: Array<{ module: string; memoryBytes: number }>;
  frequentRetries: Array<{ targetId: string; retryCount: number }>;
  bottlenecks: string[];
  queueCongestion: Array<{ targetId: string; queueDepth: number }>;
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
}

export class PerformanceOptimizer {
  constructor(private config: OptimizationConfiguration) {}

  setConfiguration(config: OptimizationConfiguration): void {
    this.config = config;
  }

  analyze(probes: OptimizationProbe[]): PerformanceAnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];
    const slowRules: PerformanceAnalysisResult["slowRules"] = [];
    const slowPipelines: PerformanceAnalysisResult["slowPipelines"] = [];
    const slowModules: PerformanceAnalysisResult["slowModules"] = [];
    const highMemoryConsumers: PerformanceAnalysisResult["highMemoryConsumers"] =
      [];
    const frequentRetries: PerformanceAnalysisResult["frequentRetries"] = [];
    const bottlenecks: string[] = [];
    const queueCongestion: PerformanceAnalysisResult["queueCongestion"] = [];

    try {
      for (const probe of probes) {
        const runtime = probe.runtimeMs ?? 0;
        if (probe.ruleId && runtime >= this.config.slowRuleThresholdMs) {
          slowRules.push({ ruleId: probe.ruleId, runtimeMs: runtime });
          bottlenecks.push(probe.ruleId);
          recommendations.push(
            OptimizationStrategies.reorderPipeline(
              probe.pipelineId ?? probe.module,
              Math.min(25, runtime / 10),
              `Slow rule ${probe.ruleId} (${runtime}ms).`
            )
          );
        }
        if (probe.pipelineId && runtime >= this.config.slowPipelineThresholdMs) {
          slowPipelines.push({
            pipelineId: probe.pipelineId,
            runtimeMs: runtime,
          });
          bottlenecks.push(probe.pipelineId);
        }
        if (runtime >= this.config.slowModuleThresholdMs) {
          slowModules.push({ module: probe.module, runtimeMs: runtime });
          bottlenecks.push(probe.module);
        }
        const mem = probe.memoryBytes ?? 0;
        if (mem >= this.config.highMemoryThresholdBytes) {
          highMemoryConsumers.push({
            module: probe.module,
            memoryBytes: mem,
          });
          recommendations.push(
            OptimizationStrategies.reduceMemory(probe.module, mem)
          );
        }
        const retries = probe.retryCount ?? 0;
        if (retries >= this.config.retryFrequencyThreshold) {
          const targetId = probe.ruleId ?? probe.module;
          frequentRetries.push({ targetId, retryCount: retries });
          recommendations.push(
            OptimizationStrategies.reduceRetries(targetId, retries * 2)
          );
        }
        const depth = probe.queueDepth ?? 0;
        if (depth >= this.config.queueCongestionThreshold) {
          const targetId = probe.pipelineId ?? probe.module;
          queueCongestion.push({ targetId, queueDepth: depth });
          recommendations.push(
            OptimizationStrategies.relieveQueue(targetId, depth)
          );
        }
      }

      const memoryTotal = probes.reduce(
        (s, p) => s + (p.memoryBytes ?? 0),
        0
      );
      const memoryEfficiency = clamp(
        100 -
          (memoryTotal /
            Math.max(this.config.highMemoryThresholdBytes, 1)) *
            20,
        0,
        100
      );

      if (slowRules.length > 0) {
        warnings.push(`${slowRules.length} slow rule(s) detected.`);
      }
      if (bottlenecks.length > 0) {
        warnings.push(`${unique(bottlenecks).length} bottleneck target(s).`);
      }

      return {
        memoryEfficiency: round2(memoryEfficiency),
        slowRules: sortByRuntime(slowRules),
        slowPipelines: sortByRuntime(slowPipelines),
        slowModules: sortByRuntime(slowModules),
        highMemoryConsumers: highMemoryConsumers
          .sort((a, b) => b.memoryBytes - a.memoryBytes)
          .slice(0, 10),
        frequentRetries,
        bottlenecks: unique(bottlenecks),
        queueCongestion,
        recommendations,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Performance analysis failed: ${String(err)}`);
      return {
        memoryEfficiency: 0,
        slowRules,
        slowPipelines,
        slowModules,
        highMemoryConsumers,
        frequentRetries,
        bottlenecks,
        queueCongestion,
        recommendations,
        warnings,
        errors,
      };
    }
  }
}

function sortByRuntime<T extends { runtimeMs: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.runtimeMs - a.runtimeMs).slice(0, 10);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
