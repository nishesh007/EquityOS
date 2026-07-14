/**
 * Advanced Rule Engine — dependency resolver.
 * Prevents circular dependencies and produces a valid execution order.
 */

import type { AdvancedRuleDefinition } from "./RuleTypes";
import { PRIORITY_BAND_RANK } from "./RuleTypes";

export class CircularDependencyError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Circular rule dependency detected: ${cycle.join(" -> ")}`);
    this.name = "CircularDependencyError";
  }
}

export class MissingDependencyError extends Error {
  constructor(
    public readonly ruleId: string,
    public readonly missingDependency: string
  ) {
    super(
      `Rule "${ruleId}" depends on missing rule "${missingDependency}"`
    );
    this.name = "MissingDependencyError";
  }
}

export class RuleDependencyResolver {
  /**
   * Topologically sort rules by dependencies, then by priority band.
   * Throws CircularDependencyError / MissingDependencyError on invalid graphs.
   */
  resolve(rules: AdvancedRuleDefinition[]): AdvancedRuleDefinition[] {
    const byId = new Map(rules.map((r) => [r.id, r]));

    for (const rule of rules) {
      for (const dep of rule.dependencies) {
        if (!byId.has(dep)) {
          throw new MissingDependencyError(rule.id, dep);
        }
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const order: string[] = [];
    const path: string[] = [];

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        const cycleStart = path.indexOf(id);
        throw new CircularDependencyError([
          ...path.slice(cycleStart),
          id,
        ]);
      }
      visiting.add(id);
      path.push(id);
      const rule = byId.get(id)!;
      for (const dep of rule.dependencies) {
        visit(dep);
      }
      path.pop();
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    // Visit in priority order so independent CRITICAL rules appear first
    // among equal dependency depth.
    const seed = [...rules].sort((a, b) => {
      const pr = PRIORITY_BAND_RANK[a.priority] - PRIORITY_BAND_RANK[b.priority];
      if (pr !== 0) return pr;
      return a.id.localeCompare(b.id);
    });

    for (const rule of seed) {
      visit(rule.id);
    }

    return order.map((id) => byId.get(id)!);
  }

  /** Returns true when the dependency graph is acyclic. */
  isAcyclic(rules: AdvancedRuleDefinition[]): boolean {
    try {
      this.resolve(rules);
      return true;
    } catch (err) {
      if (err instanceof CircularDependencyError) return false;
      throw err;
    }
  }
}
