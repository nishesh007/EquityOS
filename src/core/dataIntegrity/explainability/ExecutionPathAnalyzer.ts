/**
 * Execution path analyzer — validates path integrity and dependency visibility.
 */

import type { DecisionTrace } from "./DecisionTraceEngine";

export interface ExecutionPathAnalysis {
  pathLength: number;
  uniqueEngines: number;
  uniqueModules: number;
  dependencyCount: number;
  dependencyVisibilityScore: number;
  brokenDependencies: string[];
  timelineGaps: number;
  warnings: string[];
  errors: string[];
}

export class ExecutionPathAnalyzer {
  analyze(trace: DecisionTrace): ExecutionPathAnalysis {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const rules = [
        ...trace.executedRules,
        ...trace.skippedRules,
        ...trace.failedRules,
        ...trace.criticalRules,
      ];
      const ids = new Set(rules.map((r) => r.ruleId));
      const brokenDependencies: string[] = [];
      for (const r of rules) {
        for (const dep of r.dependencies) {
          if (!ids.has(dep) && !trace.dependencies.includes(dep)) {
            brokenDependencies.push(`${r.ruleId}->${dep}`);
          }
        }
      }

      let timelineGaps = 0;
      for (let i = 1; i < trace.timeline.length; i++) {
        const prev = trace.timeline[i - 1]!;
        const cur = trace.timeline[i]!;
        if (cur.atMs < prev.atMs) timelineGaps += 1;
      }
      if (timelineGaps > 0) {
        warnings.push("Timeline contains non-monotonic gaps");
      }
      if (brokenDependencies.length > 0) {
        warnings.push(
          `${brokenDependencies.length} dependency reference(s) not resolved in trace`
        );
      }

      const uniqueEngines = new Set(rules.map((r) => r.engine)).size;
      const uniqueModules = new Set(rules.map((r) => r.module)).size;
      const dependencyCount = trace.dependencies.length;
      const resolved =
        dependencyCount === 0
          ? 100
          : Math.round(
              ((dependencyCount - brokenDependencies.length) /
                Math.max(1, dependencyCount)) *
                100
            );
      const dependencyVisibilityScore = clamp(resolved, 0, 100);

      return {
        pathLength: trace.executionOrder.length,
        uniqueEngines,
        uniqueModules,
        dependencyCount,
        dependencyVisibilityScore,
        brokenDependencies,
        timelineGaps,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`execution path analysis failed: ${String(err)}`);
      return {
        pathLength: 0,
        uniqueEngines: 0,
        uniqueModules: 0,
        dependencyCount: 0,
        dependencyVisibilityScore: 0,
        brokenDependencies: [],
        timelineGaps: 0,
        warnings,
        errors,
      };
    }
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
