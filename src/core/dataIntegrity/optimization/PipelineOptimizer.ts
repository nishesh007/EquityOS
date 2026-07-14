/**
 * Pipeline optimizer — advisory reordering, parallelism, batching (no correctness changes).
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationProbe } from "./OptimizationRegistry";
import {
  OptimizationStrategies,
  type OptimizationRecommendation,
} from "./OptimizationStrategies";

export interface PipelineOptimizationResult {
  pipelineEfficiency: number;
  suggestedOrder: Array<{ pipelineId: string; runtimeMs: number; rank: number }>;
  parallelCandidates: string[];
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
}

export class PipelineOptimizer {
  constructor(private config: OptimizationConfiguration) {}

  setConfiguration(config: OptimizationConfiguration): void {
    this.config = config;
  }

  optimize(probes: OptimizationProbe[]): PipelineOptimizationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];

    try {
      const byPipeline = new Map<string, OptimizationProbe[]>();
      for (const probe of probes) {
        const id = probe.pipelineId ?? probe.module;
        const list = byPipeline.get(id) ?? [];
        list.push(probe);
        byPipeline.set(id, list);
      }

      const suggestedOrder = [...byPipeline.entries()]
        .map(([pipelineId, list]) => {
          const runtimeMs =
            list.reduce((s, p) => s + (p.runtimeMs ?? 0), 0) / Math.max(1, list.length);
          return { pipelineId, runtimeMs };
        })
        .sort((a, b) => a.runtimeMs - b.runtimeMs)
        .map((row, rank) => ({ ...row, rank }));

      const parallelCandidates: string[] = [];
      for (const [pipelineId, list] of byPipeline) {
        const avgRuntime =
          list.reduce((s, p) => s + (p.runtimeMs ?? 0), 0) / Math.max(1, list.length);
        const hasDeps = list.some((p) => (p.dependencies?.length ?? 0) > 0);
        const parallelSlots = Math.max(
          ...list.map((p) => p.parallelSlots ?? 1),
          1
        );

        if (avgRuntime >= this.config.slowPipelineThresholdMs) {
          recommendations.push(
            OptimizationStrategies.reorderPipeline(
              pipelineId,
              Math.min(30, avgRuntime / 20),
              `Pipeline ${pipelineId} averages ${round2(avgRuntime)}ms.`
            )
          );
        }

        if (!hasDeps && parallelSlots < this.config.parallelMaxConcurrency) {
          parallelCandidates.push(pipelineId);
          recommendations.push(
            OptimizationStrategies.increaseParallelism(
              pipelineId,
              Math.min(25, (this.config.parallelMaxConcurrency - parallelSlots) * 3)
            )
          );
        }

        const avgBatch =
          list.reduce((s, p) => s + (p.batchSize ?? 1), 0) / Math.max(1, list.length);
        if (avgBatch < 2 && list.length > 3) {
          recommendations.push(
            OptimizationStrategies.batchExecution(pipelineId, 10)
          );
        }

        if (list.every((p) => (p.runtimeMs ?? 0) === 0) && list.length > 0) {
          recommendations.push(
            OptimizationStrategies.disableIdlePipeline(pipelineId)
          );
        }
      }

      const runtimes = suggestedOrder.map((s) => s.runtimeMs);
      const avg =
        runtimes.length === 0
          ? 0
          : runtimes.reduce((a, b) => a + b, 0) / runtimes.length;
      const pipelineEfficiency = clamp(
        100 - (avg / Math.max(this.config.slowPipelineThresholdMs, 1)) * 40,
        0,
        100
      );

      return {
        pipelineEfficiency: round2(pipelineEfficiency),
        suggestedOrder,
        parallelCandidates,
        recommendations,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Pipeline optimization failed: ${String(err)}`);
      return {
        pipelineEfficiency: 0,
        suggestedOrder: [],
        parallelCandidates: [],
        recommendations,
        warnings,
        errors,
      };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
