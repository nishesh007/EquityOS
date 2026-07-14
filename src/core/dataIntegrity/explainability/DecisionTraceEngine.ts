/**
 * Decision trace engine — captures validation flow, rule order, and timeline.
 */

import type { ExplainabilityConfiguration } from "./ExplainabilityConfiguration";
import type { ExplainabilitySourceDefinition } from "./ExplainabilityRegistry";

export type RuleExecutionStatus =
  | "executed"
  | "skipped"
  | "failed"
  | "critical";

export interface TraceRuleEvent {
  ruleId: string;
  ruleName: string;
  module: string;
  engine: string;
  status: RuleExecutionStatus;
  order: number;
  durationMs: number;
  confidence: number;
  scoreDelta: number;
  dependencies: string[];
  critical: boolean;
  message?: string;
}

export interface DecisionTraceInput {
  decisionId?: string;
  validationType?: string;
  symbol?: string;
  outcome?: "pass" | "fail" | "warning" | "unknown";
  overallConfidence?: number;
  rules?: Array<Partial<TraceRuleEvent> & { ruleId: string; ruleName?: string }>;
  timelineMs?: number[];
}

export interface DecisionTrace {
  traceId: string;
  decisionId: string;
  validationType: string;
  symbol?: string;
  outcome: "pass" | "fail" | "warning" | "unknown";
  overallConfidence: number;
  flow: string[];
  executionOrder: string[];
  executedRules: TraceRuleEvent[];
  skippedRules: TraceRuleEvent[];
  failedRules: TraceRuleEvent[];
  criticalRules: TraceRuleEvent[];
  dependencies: string[];
  timeline: Array<{ atMs: number; ruleId: string; status: RuleExecutionStatus }>;
  completenessScore: number;
  generatedAt: string;
  warnings: string[];
  errors: string[];
}

export class DecisionTraceEngine {
  private config: ExplainabilityConfiguration;
  private seq = 0;

  constructor(config: ExplainabilityConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ExplainabilityConfiguration): void {
    this.config = config;
  }

  trace(
    sources: ExplainabilitySourceDefinition[],
    input: DecisionTraceInput = {}
  ): DecisionTrace {
    const warnings: string[] = [];
    const errors: string[] = [];
    this.seq += 1;
    const traceId = `trace:${this.seq}:${Date.now()}`;
    const decisionId = input.decisionId ?? `decision:${this.seq}`;

    try {
      const rules = this.resolveRules(sources, input);
      const limited = rules.slice(0, this.config.maxTraceNodes);

      if (rules.length > this.config.maxTraceNodes) {
        warnings.push(
          `Trace truncated to maxTraceNodes (${this.config.maxTraceNodes})`
        );
      }

      const executedRules = limited.filter((r) => r.status === "executed");
      const skippedRules = limited.filter((r) => r.status === "skipped");
      const failedRules = limited.filter((r) => r.status === "failed");
      const criticalRules = limited.filter(
        (r) => r.critical || r.status === "critical"
      );

      if (!this.config.includeSkippedRules && skippedRules.length > 0) {
        // retained in collections for metrics but flagged
        warnings.push("Skipped rules captured for completeness scoring");
      }

      const dependencies = this.config.includeDependencies
        ? [...new Set(limited.flatMap((r) => r.dependencies))]
        : [];

      const timeline = this.buildTimeline(limited, input.timelineMs);
      const flow = [
        "intake",
        ...[...new Set(limited.map((r) => r.engine))],
        "aggregate",
        "decision",
      ].slice(0, this.config.traceDepth);

      const expectedStatuses = limited.length;
      const observed =
        executedRules.length +
        skippedRules.length +
        failedRules.length +
        criticalRules.filter((r) => r.status === "critical").length;
      const completenessScore = clamp(
        Math.round(
          (Math.min(observed, expectedStatuses) /
            Math.max(1, expectedStatuses)) *
            100
        ),
        0,
        100
      );

      const overallConfidence =
        input.overallConfidence ??
        (limited.length === 0
          ? 0
          : round2(
              limited.reduce((s, r) => s + r.confidence, 0) / limited.length
            ));

      return {
        traceId,
        decisionId,
        validationType: input.validationType ?? "validation",
        symbol: input.symbol,
        outcome: input.outcome ?? inferOutcome(failedRules, criticalRules),
        overallConfidence,
        flow,
        executionOrder: limited.map((r) => r.ruleId),
        executedRules,
        skippedRules: this.config.includeSkippedRules ? skippedRules : [],
        failedRules,
        criticalRules,
        dependencies,
        timeline,
        completenessScore,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`decision trace failed: ${String(err)}`);
      return {
        traceId,
        decisionId,
        validationType: input.validationType ?? "validation",
        symbol: input.symbol,
        outcome: "unknown",
        overallConfidence: 0,
        flow: [],
        executionOrder: [],
        executedRules: [],
        skippedRules: [],
        failedRules: [],
        criticalRules: [],
        dependencies: [],
        timeline: [],
        completenessScore: 0,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }

  private resolveRules(
    sources: ExplainabilitySourceDefinition[],
    input: DecisionTraceInput
  ): TraceRuleEvent[] {
    if (input.rules?.length) {
      return input.rules.map((r, i) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName ?? r.ruleId,
        module: r.module ?? "unknown",
        engine: r.engine ?? "rule_engine",
        status: r.status ?? "executed",
        order: r.order ?? i + 1,
        durationMs: r.durationMs ?? 5 + (i % 7),
        confidence: clamp(r.confidence ?? 0.8, 0, 1),
        scoreDelta: r.scoreDelta ?? (r.status === "failed" ? -8 : 2),
        dependencies: r.dependencies ?? [],
        critical: r.critical ?? r.status === "critical",
        message: r.message,
      }));
    }

    // Synthetic advisory trace from registered sources (read-only).
    return sources.map((s, i) => {
      const status: RuleExecutionStatus =
        i % 11 === 0 ? "skipped" : i % 13 === 0 ? "failed" : "executed";
      return {
        ruleId: `${s.kind}-rule-${i + 1}`,
        ruleName: `${s.label} Rule ${i + 1}`,
        module: s.module,
        engine: s.kind,
        status,
        order: i + 1,
        durationMs: round2(4 + s.weight * 3 + (i % 5)),
        confidence: clamp(s.defaultConfidence * (status === "failed" ? 0.5 : 1), 0, 1),
        scoreDelta: status === "failed" ? -10 : status === "skipped" ? 0 : 3,
        dependencies:
          i > 0 ? [`${sources[Math.max(0, i - 1)]!.kind}-rule-${i}`] : [],
        critical: status === "failed" && s.weight >= 1,
        message:
          status === "failed"
            ? `${s.label} advisory failure signal`
            : undefined,
      };
    });
  }

  private buildTimeline(
    rules: TraceRuleEvent[],
    timelineMs?: number[]
  ): DecisionTrace["timeline"] {
    let cursor = 0;
    return rules.map((r, i) => {
      cursor += timelineMs?.[i] ?? r.durationMs;
      return { atMs: round2(cursor), ruleId: r.ruleId, status: r.status };
    });
  }
}

function inferOutcome(
  failed: TraceRuleEvent[],
  critical: TraceRuleEvent[]
): DecisionTrace["outcome"] {
  if (critical.length > 0 || failed.length > 0) return "fail";
  return "pass";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
