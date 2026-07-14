/**
 * Rule effectiveness analytics — read-only measurement of rule performance.
 */

import type { AnalyticsConfiguration } from "./AnalyticsConfiguration";
import type { AnalyticsObservation } from "./AnalyticsRegistry";
import { clampScore, rate } from "./AnalyticsCalculator";

export interface RuleEffectivenessRow {
  ruleId: string;
  triggers: number;
  failures: number;
  successes: number;
  falsePositives: number;
  falseNegatives: number;
  averageExecutionTime: number;
  failureRate: number;
  successRate: number;
  reliabilityScore: number;
}

export interface RuleEffectivenessReport {
  rules: RuleEffectivenessRow[];
  mostTriggered: RuleEffectivenessRow[];
  leastTriggered: RuleEffectivenessRow[];
  averageReliability: number;
  ruleCount: number;
}

export class AnalyticsRuleEffectiveness {
  constructor(private readonly config: AnalyticsConfiguration) {}

  analyze(observations: AnalyticsObservation[]): RuleEffectivenessReport {
    const byRule = new Map<
      string,
      {
        triggers: number;
        failures: number;
        successes: number;
        falsePositives: number;
        falseNegatives: number;
        runtimeSum: number;
        runtimeCount: number;
      }
    >();

    for (const o of observations) {
      if (!o.ruleId) continue;
      const row = byRule.get(o.ruleId) ?? {
        triggers: 0,
        failures: 0,
        successes: 0,
        falsePositives: 0,
        falseNegatives: 0,
        runtimeSum: 0,
        runtimeCount: 0,
      };
      if (o.ruleTriggered) row.triggers += 1;
      if (o.ruleFailed) {
        row.failures += 1;
      } else if (o.ruleTriggered) {
        row.successes += 1;
      }
      if (o.falsePositive) row.falsePositives += 1;
      if (o.falseNegative) row.falseNegatives += 1;
      if (typeof o.averageRuntimeMs === "number") {
        row.runtimeSum += o.averageRuntimeMs;
        row.runtimeCount += 1;
      }
      byRule.set(o.ruleId, row);
    }

    const rules: RuleEffectivenessRow[] = [...byRule.entries()].map(
      ([ruleId, r]) => {
        const total = r.successes + r.failures || r.triggers;
        const failureRate = rate(r.failures, total);
        const successRate = rate(r.successes, total);
        const fpRate = rate(r.falsePositives, Math.max(total, 1));
        const fnRate = rate(r.falseNegatives, Math.max(total, 1));
        const reliabilityScore = clampScore(
          successRate -
            fpRate * this.config.falsePositiveWeight -
            fnRate * this.config.falseNegativeWeight
        );
        return {
          ruleId,
          triggers: r.triggers,
          failures: r.failures,
          successes: r.successes,
          falsePositives: r.falsePositives,
          falseNegatives: r.falseNegatives,
          averageExecutionTime:
            r.runtimeCount === 0 ? 0 : round2(r.runtimeSum / r.runtimeCount),
          failureRate,
          successRate,
          reliabilityScore,
        };
      }
    );

    const sortedByTriggers = [...rules].sort((a, b) => b.triggers - a.triggers);
    const avgReliability =
      rules.length === 0
        ? 100
        : clampScore(
            rules.reduce((a, r) => a + r.reliabilityScore, 0) / rules.length
          );

    return {
      rules,
      mostTriggered: sortedByTriggers.slice(0, 10),
      leastTriggered: [...sortedByTriggers].reverse().slice(0, 10),
      averageReliability: avgReliability,
      ruleCount: rules.length,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
