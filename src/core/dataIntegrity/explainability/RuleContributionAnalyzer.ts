/**
 * Rule contribution analyzer — weight, impact, and confidence/score contributions.
 */

import type { DecisionTrace, TraceRuleEvent } from "./DecisionTraceEngine";

export interface RuleContribution {
  ruleId: string;
  ruleName: string;
  module: string;
  engine: string;
  weight: number;
  impact: number;
  confidenceContribution: number;
  scoreContribution: number;
  warningContribution: number;
  failureContribution: number;
  criticalContribution: number;
}

export interface RuleContributionReport {
  decisionId: string;
  traceId: string;
  contributions: RuleContribution[];
  totalWeight: number;
  coverageScore: number;
  warnings: string[];
  errors: string[];
}

export class RuleContributionAnalyzer {
  analyze(trace: DecisionTrace): RuleContributionReport {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const all = [
        ...trace.executedRules,
        ...trace.skippedRules,
        ...trace.failedRules,
        ...trace.criticalRules,
      ];
      const unique = dedupeRules(all);
      if (unique.length === 0) {
        warnings.push("No rules available for contribution analysis");
      }

      const maxAbsScore = Math.max(
        1,
        ...unique.map((r) => Math.abs(r.scoreDelta))
      );
      const contributions = unique.map((r) => toContribution(r, maxAbsScore));
      const totalWeight = round2(
        contributions.reduce((s, c) => s + c.weight, 0)
      );
      const active = contributions.filter(
        (c) =>
          c.scoreContribution !== 0 ||
          c.failureContribution > 0 ||
          c.criticalContribution > 0
      );
      const coverageScore = clamp(
        Math.round((active.length / Math.max(1, contributions.length)) * 100),
        0,
        100
      );

      return {
        decisionId: trace.decisionId,
        traceId: trace.traceId,
        contributions,
        totalWeight,
        coverageScore,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`rule contribution analysis failed: ${String(err)}`);
      return {
        decisionId: trace.decisionId,
        traceId: trace.traceId,
        contributions: [],
        totalWeight: 0,
        coverageScore: 0,
        warnings,
        errors,
      };
    }
  }
}

function toContribution(
  rule: TraceRuleEvent,
  maxAbsScore: number
): RuleContribution {
  const weight = round2(
    Math.max(0.1, rule.confidence) *
      (rule.critical ? 1.5 : 1) *
      (rule.status === "skipped" ? 0.3 : 1)
  );
  const impact = round2(Math.abs(rule.scoreDelta) / maxAbsScore);
  const confidenceContribution = round2(rule.confidence * weight);
  const scoreContribution = round2(rule.scoreDelta);
  const warningContribution =
    rule.status === "executed" && rule.scoreDelta < 0 ? 1 : 0;
  const failureContribution = rule.status === "failed" ? 1 : 0;
  const criticalContribution = rule.critical ? 1 : 0;

  return {
    ruleId: rule.ruleId,
    ruleName: rule.ruleName,
    module: rule.module,
    engine: rule.engine,
    weight,
    impact,
    confidenceContribution,
    scoreContribution,
    warningContribution,
    failureContribution,
    criticalContribution,
  };
}

function dedupeRules(rules: TraceRuleEvent[]): TraceRuleEvent[] {
  const map = new Map<string, TraceRuleEvent>();
  for (const r of rules) {
    if (!map.has(r.ruleId)) map.set(r.ruleId, r);
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
