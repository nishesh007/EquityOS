/**
 * Execution optimizer — retries, queue depth, parallel opportunities (advisory).
 */

import type { OptimizationConfiguration } from "./OptimizationConfiguration";
import type { OptimizationProbe } from "./OptimizationRegistry";
import {
  OptimizationStrategies,
  type OptimizationRecommendation,
} from "./OptimizationStrategies";

export interface ExecutionOptimizationResult {
  executionSpeed: number;
  averageRuntimeMs: number;
  highRetryTargets: string[];
  congestedQueues: string[];
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
}

export class ExecutionOptimizer {
  constructor(private config: OptimizationConfiguration) {}

  setConfiguration(config: OptimizationConfiguration): void {
    this.config = config;
  }

  optimize(probes: OptimizationProbe[]): ExecutionOptimizationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];
    const highRetryTargets: string[] = [];
    const congestedQueues: string[] = [];

    try {
      const runtimes = probes.map((p) => p.runtimeMs ?? 0);
      const averageRuntimeMs =
        runtimes.length === 0
          ? 0
          : runtimes.reduce((a, b) => a + b, 0) / runtimes.length;

      for (const probe of probes) {
        const target = probe.ruleId ?? probe.pipelineId ?? probe.module;
        const retries = probe.retryCount ?? 0;
        if (retries >= this.config.retryFrequencyThreshold) {
          highRetryTargets.push(target);
          recommendations.push(
            OptimizationStrategies.reduceRetries(
              target,
              Math.min(30, retries * 3)
            )
          );
        }
        const depth = probe.queueDepth ?? 0;
        if (depth >= this.config.queueCongestionThreshold) {
          congestedQueues.push(target);
          recommendations.push(
            OptimizationStrategies.relieveQueue(target, depth)
          );
        }
      }

      const executionSpeed = clamp(
        100 -
          (averageRuntimeMs /
            Math.max(this.config.slowModuleThresholdMs, 1)) *
            35,
        0,
        100
      );

      return {
        executionSpeed: round2(executionSpeed),
        averageRuntimeMs: round2(averageRuntimeMs),
        highRetryTargets: unique(highRetryTargets),
        congestedQueues: unique(congestedQueues),
        recommendations,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Execution optimization failed: ${String(err)}`);
      return {
        executionSpeed: 0,
        averageRuntimeMs: 0,
        highRetryTargets,
        congestedQueues,
        recommendations,
        warnings,
        errors,
      };
    }
  }
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
