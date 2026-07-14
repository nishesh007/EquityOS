/**
 * Risk insight engine — high-risk modules/rules/paths with confidence.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { InsightObservation } from "./InsightsRegistry";
import type { DetectedPattern } from "./PatternDetector";
import type { CorrelationResult } from "./CorrelationEngine";

export type RiskCategory =
  | "MODULE"
  | "RULE"
  | "PATH"
  | "CONFIGURATION"
  | "PERFORMANCE"
  | "RELIABILITY"
  | "OPERATIONAL";

export interface RiskInsight {
  riskId: string;
  category: RiskCategory;
  title: string;
  description: string;
  targetId: string;
  confidence: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string[];
}

export class RiskInsightEngine {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  analyze(input: {
    observations: InsightObservation[];
    patterns: DetectedPattern[];
    correlations: CorrelationResult[];
  }): {
    risks: RiskInsight[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const risks: RiskInsight[] = [];

    try {
      const byModule = new Map<string, InsightObservation[]>();
      for (const o of input.observations) {
        const list = byModule.get(o.module) ?? [];
        list.push(o);
        byModule.set(o.module, list);
      }

      for (const [module, rows] of byModule) {
        const failures = rows.reduce((s, r) => s + (r.failures ?? 0), 0);
        const health =
          avg(
            rows.map((r) => r.healthScore).filter((n): n is number => n != null)
          ) ?? 100;
        const availability =
          avg(
            rows.map((r) => r.availability).filter((n): n is number => n != null)
          ) ?? 100;
        const runtime =
          avg(
            rows.map((r) => r.runtimeMs).filter((n): n is number => n != null)
          ) ?? 0;

        if (failures >= 5 || health < 60) {
          risks.push(
            makeRisk(
              "MODULE",
              `High risk module: ${module}`,
              `Module shows elevated failure/health risk.`,
              module,
              clamp(0.55 + failures / 20 + (100 - health) / 200, 0, 1),
              health < 40 || failures >= 15 ? "CRITICAL" : "HIGH",
              [
                `failures=${failures}`,
                `health=${round2(health)}`,
                `availability=${round2(availability)}`,
              ]
            )
          );
        }

        if (runtime >= this.config.runtimeBottleneckMs) {
          risks.push(
            makeRisk(
              "PERFORMANCE",
              `Performance risk: ${module}`,
              `Runtime ${round2(runtime)}ms indicates performance risk.`,
              module,
              clamp(runtime / (this.config.runtimeBottleneckMs * 2), 0.5, 1),
              "MEDIUM",
              [`runtimeMs=${round2(runtime)}`]
            )
          );
        }

        const retries = rows.reduce((s, r) => s + (r.retries ?? 0), 0);
        const timeouts = rows.reduce((s, r) => s + (r.timeouts ?? 0), 0);
        if (retries + timeouts >= 5) {
          risks.push(
            makeRisk(
              "RELIABILITY",
              `Reliability risk: ${module}`,
              `Elevated retries/timeouts for ${module}.`,
              module,
              clamp(0.55 + (retries + timeouts) / 30, 0, 1),
              "HIGH",
              [`retries=${retries}`, `timeouts=${timeouts}`]
            )
          );
        }
      }

      for (const pattern of input.patterns) {
        if (
          pattern.kind === "RECURRING_RULE_VIOLATIONS" &&
          pattern.ruleId
        ) {
          risks.push(
            makeRisk(
              "RULE",
              `High risk rule: ${pattern.ruleId}`,
              pattern.description,
              pattern.ruleId,
              pattern.confidence,
              pattern.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
              pattern.evidence
            )
          );
        }
        if (pattern.kind === "EXECUTION_BOTTLENECK" && pattern.module) {
          risks.push(
            makeRisk(
              "PATH",
              `Critical validation path: ${pattern.module}`,
              pattern.description,
              pattern.module,
              pattern.confidence,
              "HIGH",
              pattern.evidence
            )
          );
        }
      }

      for (const corr of input.correlations) {
        if (corr.pair === "RETRY_TIMEOUT" && corr.strength !== "WEAK") {
          risks.push(
            makeRisk(
              "OPERATIONAL",
              "Operational retry/timeout coupling",
              corr.label,
              corr.pair,
              corr.confidence,
              "MEDIUM",
              corr.evidence
            )
          );
        }
        if (corr.pair === "MODULE_HEALTH" && corr.coefficient < 0) {
          risks.push(
            makeRisk(
              "CONFIGURATION",
              "Configuration/load health risk",
              "Higher load correlates with lower health.",
              corr.pair,
              corr.confidence,
              "MEDIUM",
              corr.evidence
            )
          );
        }
      }

      risks.sort((a, b) => b.confidence - a.confidence);
      if (risks.length > this.config.maxRiskInsights) {
        warnings.push(
          `Truncated risk insights to ${this.config.maxRiskInsights}.`
        );
        return {
          risks: risks.slice(0, this.config.maxRiskInsights),
          warnings,
          errors,
        };
      }
    } catch (err) {
      errors.push(`Risk insight analysis failed: ${String(err)}`);
    }

    return { risks, warnings, errors };
  }
}

function makeRisk(
  category: RiskCategory,
  title: string,
  description: string,
  targetId: string,
  confidence: number,
  severity: RiskInsight["severity"],
  evidence: string[]
): RiskInsight {
  return {
    riskId: `risk:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    category,
    title,
    description,
    targetId,
    confidence: round2(confidence),
    severity,
    evidence,
  };
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
