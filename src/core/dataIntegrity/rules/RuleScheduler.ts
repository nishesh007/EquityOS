/**
 * Advanced Rule Engine — scheduler.
 * Groups resolved rules by priority and execution mode.
 */

import type { AdvancedRuleDefinition, RuleExecutionMode } from "./RuleTypes";
import { PRIORITY_BAND_RANK } from "./RuleTypes";

export interface ScheduleWave {
  /** Rules that may run together in this wave. */
  rules: AdvancedRuleDefinition[];
  mode: RuleExecutionMode;
}

export class RuleScheduler {
  /**
   * Build execution waves from a dependency-resolved list.
   * - PARALLEL / BATCH rules at the same priority with satisfied deps form a wave
   * - SEQUENTIAL / CONDITIONAL / LAZY run as single-rule waves
   */
  schedule(resolvedRules: AdvancedRuleDefinition[]): ScheduleWave[] {
    const waves: ScheduleWave[] = [];
    let i = 0;

    while (i < resolvedRules.length) {
      const rule = resolvedRules[i];
      const mode = rule.executionMode;

      if (mode === "PARALLEL" || mode === "BATCH") {
        const group: AdvancedRuleDefinition[] = [rule];
        let j = i + 1;
        while (j < resolvedRules.length) {
          const next = resolvedRules[j];
          if (
            next.executionMode === mode &&
            next.priority === rule.priority &&
            !dependsOnAny(next, group)
          ) {
            group.push(next);
            j += 1;
          } else {
            break;
          }
        }
        waves.push({ rules: group, mode });
        i = j;
      } else {
        waves.push({ rules: [rule], mode });
        i += 1;
      }
    }

    return waves;
  }

  /** Sort rules by priority band without resolving dependencies. */
  sortByPriority(rules: AdvancedRuleDefinition[]): AdvancedRuleDefinition[] {
    return [...rules].sort((a, b) => {
      const pr = PRIORITY_BAND_RANK[a.priority] - PRIORITY_BAND_RANK[b.priority];
      if (pr !== 0) return pr;
      return a.id.localeCompare(b.id);
    });
  }
}

function dependsOnAny(
  rule: AdvancedRuleDefinition,
  group: AdvancedRuleDefinition[]
): boolean {
  const ids = new Set(group.map((r) => r.id));
  return rule.dependencies.some((d) => ids.has(d));
}
