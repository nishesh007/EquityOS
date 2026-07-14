/**
 * Opportunity detector — advisory optimization/caching/parallelization opportunities.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { InsightObservation } from "./InsightsRegistry";
import type { DetectedPattern } from "./PatternDetector";

export type OpportunityKind =
  | "OPTIMIZATION"
  | "CACHING"
  | "PARALLELIZATION"
  | "RULE_CONSOLIDATION"
  | "CONFIGURATION"
  | "PERFORMANCE"
  | "MONITORING"
  | (string & {});

export interface DetectedOpportunity {
  opportunityId: string;
  kind: OpportunityKind;
  title: string;
  description: string;
  targetId: string;
  confidence: number;
  expectedImpactPct: number;
  evidence: string[];
  advisoryOnly: true;
}

export class OpportunityDetector {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  detect(input: {
    observations: InsightObservation[];
    patterns: DetectedPattern[];
  }): {
    opportunities: DetectedOpportunity[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const opportunities: DetectedOpportunity[] = [];

    try {
      const byModule = new Map<string, InsightObservation[]>();
      for (const o of input.observations) {
        const list = byModule.get(o.module) ?? [];
        list.push(o);
        byModule.set(o.module, list);
      }

      for (const [module, rows] of byModule) {
        const runtime =
          avg(
            rows.map((r) => r.runtimeMs).filter((n): n is number => n != null)
          ) ?? 0;
        const cacheHit =
          avg(
            rows
              .map((r) => r.cacheHitRate)
              .filter((n): n is number => n != null)
          ) ?? null;
        const parallel =
          avg(
            rows
              .map((r) => r.parallelSlots)
              .filter((n): n is number => n != null)
          ) ?? null;

        if (runtime >= this.config.runtimeBottleneckMs) {
          opportunities.push(
            makeOpp(
              "PERFORMANCE",
              `Improve performance for ${module}`,
              `Reduce average runtime of ${round2(runtime)}ms.`,
              module,
              0.7,
              Math.min(30, runtime / 20),
              [`runtimeMs=${round2(runtime)}`]
            )
          );
          opportunities.push(
            makeOpp(
              "OPTIMIZATION",
              `Optimize execution path for ${module}`,
              "Pipeline/rule optimization may reduce latency.",
              module,
              0.65,
              15,
              [`module=${module}`]
            )
          );
        }

        if (cacheHit != null && cacheHit < 70) {
          opportunities.push(
            makeOpp(
              "CACHING",
              `Improve caching for ${module}`,
              `Cache hit rate ${round2(cacheHit)}% is below target.`,
              module,
              0.72,
              Math.min(25, 70 - cacheHit),
              [`cacheHitRate=${round2(cacheHit)}`]
            )
          );
        }

        if (parallel != null && parallel < 4 && runtime > 100) {
          opportunities.push(
            makeOpp(
              "PARALLELIZATION",
              `Parallelize work in ${module}`,
              `Low parallel slots (${round2(parallel)}) with elevated runtime.`,
              module,
              0.68,
              12,
              [`parallelSlots=${round2(parallel)}`]
            )
          );
        }
      }

      const ruleFailures = new Map<string, number>();
      for (const o of input.observations) {
        if (!o.ruleId) continue;
        ruleFailures.set(
          o.ruleId,
          (ruleFailures.get(o.ruleId) ?? 0) + (o.failures ?? 0)
        );
      }
      const hotRules = [...ruleFailures.entries()]
        .filter(([, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1]);
      if (hotRules.length >= 2) {
        opportunities.push(
          makeOpp(
            "RULE_CONSOLIDATION",
            "Consolidate frequently failing rules",
            `${hotRules.length} rules show repeated failures.`,
            hotRules[0]![0],
            0.6,
            10,
            hotRules.slice(0, 5).map(([id, n]) => `${id}:${n}`)
          )
        );
      }

      for (const pattern of input.patterns) {
        if (pattern.kind === "MODULE_HEALTH_TREND") {
          opportunities.push(
            makeOpp(
              "MONITORING",
              `Enhance monitoring for ${pattern.module ?? "module"}`,
              "Declining health trend suggests monitoring improvements.",
              pattern.module ?? "unknown",
              pattern.confidence,
              8,
              pattern.evidence
            )
          );
        }
        if (pattern.kind === "VALIDATION_INSTABILITY") {
          opportunities.push(
            makeOpp(
              "CONFIGURATION",
              `Review configuration for ${pattern.module ?? "module"}`,
              "Instability may be mitigated by configuration tuning.",
              pattern.module ?? "unknown",
              pattern.confidence,
              10,
              pattern.evidence
            )
          );
        }
      }

      opportunities.sort((a, b) => b.expectedImpactPct - a.expectedImpactPct);
      if (opportunities.length > this.config.maxOpportunities) {
        warnings.push(
          `Truncated opportunities to ${this.config.maxOpportunities}.`
        );
        return {
          opportunities: opportunities.slice(0, this.config.maxOpportunities),
          warnings,
          errors,
        };
      }
    } catch (err) {
      errors.push(`Opportunity detection failed: ${String(err)}`);
    }

    return { opportunities, warnings, errors };
  }
}

function makeOpp(
  kind: OpportunityKind,
  title: string,
  description: string,
  targetId: string,
  confidence: number,
  expectedImpactPct: number,
  evidence: string[]
): DetectedOpportunity {
  return {
    opportunityId: `opp:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    description,
    targetId,
    confidence: round2(confidence),
    expectedImpactPct: round2(expectedImpactPct),
    evidence,
    advisoryOnly: true,
  };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
