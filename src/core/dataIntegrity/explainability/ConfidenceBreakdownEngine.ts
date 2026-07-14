/**
 * Confidence breakdown engine — overall / per-engine / per-rule / per-module.
 */

import type { DecisionTrace } from "./DecisionTraceEngine";
import type { RuleContributionReport } from "./RuleContributionAnalyzer";

export interface ConfidenceBucket {
  key: string;
  confidence: number;
  weight: number;
  share: number;
}

export interface ConfidenceBreakdown {
  decisionId: string;
  traceId: string;
  overallConfidence: number;
  perEngine: ConfidenceBucket[];
  perRule: ConfidenceBucket[];
  perModule: ConfidenceBucket[];
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
  trend: "improving" | "stable" | "degrading" | "unknown";
  coverageScore: number;
  warnings: string[];
  errors: string[];
}

export class ConfidenceBreakdownEngine {
  private history: number[] = [];

  breakdown(
    trace: DecisionTrace,
    contributions?: RuleContributionReport
  ): ConfidenceBreakdown {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const rules = [
        ...trace.executedRules,
        ...trace.failedRules,
        ...trace.criticalRules,
      ];
      const unique = new Map(rules.map((r) => [r.ruleId, r]));
      const list = [...unique.values()];

      const perRule: ConfidenceBucket[] = list.map((r) => {
        const contrib = contributions?.contributions.find(
          (c) => c.ruleId === r.ruleId
        );
        const weight = contrib?.weight ?? Math.max(0.1, r.confidence);
        return {
          key: r.ruleId,
          confidence: round2(r.confidence),
          weight: round2(weight),
          share: 0,
        };
      });
      normalizeShares(perRule);

      const perEngine = aggregateBy(list, (r) => r.engine);
      const perModule = aggregateBy(list, (r) => r.module);

      const overallConfidence = round2(
        trace.overallConfidence ||
          (list.length === 0
            ? 0
            : list.reduce((s, r) => s + r.confidence, 0) / list.length)
      );

      this.history.push(overallConfidence);
      if (this.history.length > 20) this.history.shift();

      const distribution = {
        high: list.filter((r) => r.confidence >= 0.75).length,
        medium: list.filter((r) => r.confidence >= 0.45 && r.confidence < 0.75)
          .length,
        low: list.filter((r) => r.confidence < 0.45).length,
      };

      const covered = list.filter((r) => r.confidence > 0).length;
      const coverageScore = clamp(
        Math.round((covered / Math.max(1, list.length)) * 100),
        0,
        100
      );

      if (list.length === 0) {
        warnings.push("No rule confidence observations available");
      }

      return {
        decisionId: trace.decisionId,
        traceId: trace.traceId,
        overallConfidence,
        perEngine,
        perRule,
        perModule,
        distribution,
        trend: computeTrend(this.history),
        coverageScore,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`confidence breakdown failed: ${String(err)}`);
      return {
        decisionId: trace.decisionId,
        traceId: trace.traceId,
        overallConfidence: 0,
        perEngine: [],
        perRule: [],
        perModule: [],
        distribution: { high: 0, medium: 0, low: 0 },
        trend: "unknown",
        coverageScore: 0,
        warnings,
        errors,
      };
    }
  }

  resetHistory(): void {
    this.history = [];
  }
}

function aggregateBy(
  rules: Array<{ confidence: number; engine: string; module: string }>,
  keyFn: (r: { engine: string; module: string }) => string
): ConfidenceBucket[] {
  const map = new Map<string, { sum: number; weight: number; n: number }>();
  for (const r of rules) {
    const key = keyFn(r);
    const cur = map.get(key) ?? { sum: 0, weight: 0, n: 0 };
    cur.sum += r.confidence;
    cur.weight += Math.max(0.1, r.confidence);
    cur.n += 1;
    map.set(key, cur);
  }
  const buckets = [...map.entries()].map(([key, v]) => ({
    key,
    confidence: round2(v.sum / Math.max(1, v.n)),
    weight: round2(v.weight),
    share: 0,
  }));
  normalizeShares(buckets);
  return buckets.sort((a, b) => b.confidence - a.confidence);
}

function normalizeShares(buckets: ConfidenceBucket[]): void {
  const total = buckets.reduce((s, b) => s + b.weight, 0);
  for (const b of buckets) {
    b.share = total === 0 ? 0 : round2(b.weight / total);
  }
}

function computeTrend(
  history: number[]
): ConfidenceBreakdown["trend"] {
  if (history.length < 2) return "unknown";
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const delta = last - first;
  if (delta >= 0.05) return "improving";
  if (delta <= -0.05) return "degrading";
  return "stable";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
