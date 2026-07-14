/**
 * Builds ordered execution plans with dependency resolution and cycle detection.
 */

import type {
  ValidationConfiguration,
  ValidationEngineId,
} from "./ValidationConfiguration";
import { getValidationEngine } from "./ValidationRegistry";

export class CircularDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Circular validation engine dependency: ${cycle.join(" -> ")}`);
    this.name = "CircularDependencyError";
  }
}

export interface ValidationExecutionPlan {
  engines: ValidationEngineId[];
  pipelineId?: string;
  mode: string;
  waves: ValidationEngineId[][];
}

export function buildExecutionPlan(input: {
  config: ValidationConfiguration;
  requested: ValidationEngineId[];
  pipelineId?: string;
  mode: string;
  parallel?: boolean;
}): ValidationExecutionPlan {
  const resolved = resolveDependencies(
    input.requested,
    input.config.engineDependencies
  );

  const waves = input.parallel
    ? buildParallelWaves(resolved, input.config.engineDependencies)
    : resolved.map((e) => [e]);

  return {
    engines: resolved,
    pipelineId: input.pipelineId,
    mode: input.mode,
    waves,
  };
}

/** Topological sort with cycle detection — orders `requested` only (no expansion). */
export function resolveDependencies(
  requested: ValidationEngineId[],
  dependencyMap: Record<string, ValidationEngineId[]>
): ValidationEngineId[] {
  const needed = new Set<ValidationEngineId>(requested);
  const sorted: ValidationEngineId[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  const visit = (id: ValidationEngineId) => {
    if (!needed.has(id)) return;
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new CircularDependencyError([...path, id]);
    }
    visiting.add(id);
    path.push(id);
    const deps = [
      ...(dependencyMap[id] ?? []),
      ...(getValidationEngine(id)?.dependsOn ?? []),
    ].filter((d) => needed.has(d));
    for (const dep of deps) visit(dep);
    path.pop();
    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
  };

  for (const id of requested) visit(id);
  return sorted;
}

function buildParallelWaves(
  ordered: ValidationEngineId[],
  dependencyMap: Record<string, ValidationEngineId[]>
): ValidationEngineId[][] {
  const waves: ValidationEngineId[][] = [];
  const placed = new Set<string>();

  const remaining = [...ordered];
  while (remaining.length > 0) {
    const wave: ValidationEngineId[] = [];
    for (const id of remaining) {
      const deps = [
        ...(dependencyMap[id] ?? []),
        ...(getValidationEngine(id)?.dependsOn ?? []),
      ].filter((d) => ordered.includes(d));
      if (deps.every((d) => placed.has(d))) {
        wave.push(id);
      }
    }
    if (wave.length === 0) {
      // Safety: break cycles by taking next sequentially
      wave.push(remaining[0]!);
    }
    for (const id of wave) {
      placed.add(id);
      const idx = remaining.indexOf(id);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    waves.push(wave);
  }
  return waves;
}

/** Detect circular dependencies in a dependency map without executing. */
export function detectCircularDependencies(
  dependencyMap: Record<string, ValidationEngineId[]>
): string[] | null {
  try {
    const ids = Object.keys(dependencyMap) as ValidationEngineId[];
    resolveDependencies(ids, dependencyMap);
    return null;
  } catch (err) {
    if (err instanceof CircularDependencyError) return err.cycle;
    throw err;
  }
}
