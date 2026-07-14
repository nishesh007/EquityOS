/**
 * Dependency optimizer — unused, circular, duplicate, redundant, idle, dead paths.
 */

import type { OptimizationProbe } from "./OptimizationRegistry";
import {
  OptimizationStrategies,
  type OptimizationRecommendation,
} from "./OptimizationStrategies";

export interface DependencyOptimizationResult {
  dependencyHealth: number;
  unusedDependencies: Array<{ ruleId: string; dependency: string }>;
  circularDependencies: string[][];
  duplicateExecutions: string[];
  redundantRules: string[];
  idlePipelines: string[];
  deadPaths: string[];
  recommendations: OptimizationRecommendation[];
  warnings: string[];
  errors: string[];
}

export class DependencyOptimizer {
  analyze(probes: OptimizationProbe[]): DependencyOptimizationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: OptimizationRecommendation[] = [];
    const unusedDependencies: Array<{ ruleId: string; dependency: string }> = [];
    const circularDependencies: string[][] = [];
    const duplicateExecutions: string[] = [];
    const redundantRules: string[] = [];
    const idlePipelines: string[] = [];
    const deadPaths: string[] = [];

    try {
      const ruleIds = new Set(
        probes.map((p) => p.ruleId).filter((id): id is string => !!id)
      );
      const depGraph = new Map<string, string[]>();

      for (const probe of probes) {
        if (!probe.ruleId) continue;
        const deps = [...(probe.dependencies ?? [])];
        depGraph.set(probe.ruleId, deps);
        for (const dep of deps) {
          if (!ruleIds.has(dep) && !probes.some((p) => p.module === dep)) {
            unusedDependencies.push({ ruleId: probe.ruleId, dependency: dep });
            recommendations.push(
              OptimizationStrategies.removeUnusedDependency(probe.ruleId, dep)
            );
          }
        }
      }

      // Circular dependency detection (DFS)
      const visiting = new Set<string>();
      const visited = new Set<string>();
      const stack: string[] = [];
      const visit = (node: string): void => {
        if (visited.has(node)) return;
        if (visiting.has(node)) {
          const idx = stack.indexOf(node);
          const cycle = idx >= 0 ? [...stack.slice(idx), node] : [node];
          circularDependencies.push(cycle);
          recommendations.push(
            OptimizationStrategies.breakCircularDependency(cycle)
          );
          return;
        }
        visiting.add(node);
        stack.push(node);
        for (const next of depGraph.get(node) ?? []) {
          visit(next);
        }
        stack.pop();
        visiting.delete(node);
        visited.add(node);
      };
      for (const node of depGraph.keys()) visit(node);

      // Duplicate executions
      const seen = new Map<string, number>();
      for (const probe of probes) {
        const key = probe.ruleId ?? `${probe.module}:${probe.pipelineId ?? ""}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      for (const [key, count] of seen) {
        if (count > 1 && key) {
          duplicateExecutions.push(key);
          recommendations.push(OptimizationStrategies.dedupExecution(key));
        }
      }

      // Redundant rules: same deps + near-zero runtime variance with sibling
      const byDeps = new Map<string, string[]>();
      for (const [ruleId, deps] of depGraph) {
        const sig = deps.slice().sort().join(",");
        const list = byDeps.get(sig) ?? [];
        list.push(ruleId);
        byDeps.set(sig, list);
      }
      for (const [, rules] of byDeps) {
        if (rules.length > 1) {
          for (const ruleId of rules.slice(1)) {
            redundantRules.push(ruleId);
            recommendations.push(
              OptimizationStrategies.removeRedundantRule(ruleId)
            );
          }
        }
      }

      // Idle pipelines / dead paths
      const pipelines = new Map<string, OptimizationProbe[]>();
      for (const probe of probes) {
        const id = probe.pipelineId;
        if (!id) continue;
        const list = pipelines.get(id) ?? [];
        list.push(probe);
        pipelines.set(id, list);
      }
      for (const [pipelineId, list] of pipelines) {
        const totalRuntime = list.reduce((s, p) => s + (p.runtimeMs ?? 0), 0);
        if (totalRuntime === 0) {
          idlePipelines.push(pipelineId);
          recommendations.push(
            OptimizationStrategies.disableIdlePipeline(pipelineId)
          );
        }
        const unreachable = list.filter(
          (p) =>
            (p.successRate ?? 100) === 0 &&
            (p.runtimeMs ?? 0) === 0 &&
            (p.dependencies?.length ?? 0) > 0
        );
        for (const p of unreachable) {
          const pathId = `${pipelineId}:${p.ruleId ?? p.module}`;
          deadPaths.push(pathId);
          recommendations.push(OptimizationStrategies.pruneDeadPath(pathId));
        }
      }

      const issueCount =
        unusedDependencies.length +
        circularDependencies.length * 3 +
        duplicateExecutions.length +
        redundantRules.length +
        idlePipelines.length +
        deadPaths.length;
      const dependencyHealth = clamp(100 - issueCount * 8, 0, 100);

      if (circularDependencies.length > 0) {
        warnings.push(
          `${circularDependencies.length} circular dependency cycle(s) detected.`
        );
      }

      return {
        dependencyHealth: round2(dependencyHealth),
        unusedDependencies,
        circularDependencies,
        duplicateExecutions,
        redundantRules,
        idlePipelines,
        deadPaths,
        recommendations,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Dependency analysis failed: ${String(err)}`);
      return {
        dependencyHealth: 0,
        unusedDependencies,
        circularDependencies,
        duplicateExecutions,
        redundantRules,
        idlePipelines,
        deadPaths,
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
