/**
 * Recommendation generator — advisory priorities with reason/evidence/confidence/impact.
 */

import type { InsightsConfiguration } from "./InsightsConfiguration";
import type { DetectedPattern } from "./PatternDetector";
import type { CorrelationResult } from "./CorrelationEngine";
import type { RiskInsight } from "./RiskInsightEngine";
import type { DetectedOpportunity } from "./OpportunityDetector";

export type RecommendationCategory =
  | "PRIORITY"
  | "HEALTH"
  | "RELIABILITY"
  | "OPTIMIZATION"
  | "GOVERNANCE"
  | "OBSERVABILITY"
  | "IMPROVEMENT"
  | (string & {});

export interface IntelligentRecommendation {
  recommendationId: string;
  category: RecommendationCategory;
  title: string;
  reason: string;
  evidence: string[];
  confidence: number;
  expectedImpact: string;
  expectedImpactPct: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  targetId?: string;
  advisoryOnly: true;
}

export class RecommendationGenerator {
  constructor(private config: InsightsConfiguration) {}

  setConfiguration(config: InsightsConfiguration): void {
    this.config = config;
  }

  generate(input: {
    patterns: DetectedPattern[];
    correlations: CorrelationResult[];
    risks: RiskInsight[];
    opportunities: DetectedOpportunity[];
  }): {
    recommendations: IntelligentRecommendation[];
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: IntelligentRecommendation[] = [];

    try {
      for (const risk of input.risks) {
        if (risk.confidence < this.config.confidenceThreshold) continue;
        recommendations.push(
          makeRec(
            risk.severity === "CRITICAL" || risk.severity === "HIGH"
              ? "PRIORITY"
              : "IMPROVEMENT",
            risk.title,
            risk.description,
            risk.evidence,
            risk.confidence,
            `Mitigate ${risk.category.toLowerCase()} risk`,
            risk.severity === "CRITICAL" ? 30 : 18,
            risk.severity === "CRITICAL"
              ? "CRITICAL"
              : risk.severity === "HIGH"
                ? "HIGH"
                : "MEDIUM",
            risk.targetId
          )
        );
      }

      for (const opp of input.opportunities) {
        if (opp.confidence < this.config.confidenceThreshold) continue;
        const category: RecommendationCategory =
          opp.kind === "MONITORING"
            ? "OBSERVABILITY"
            : opp.kind === "CONFIGURATION"
              ? "GOVERNANCE"
              : opp.kind === "OPTIMIZATION" ||
                  opp.kind === "CACHING" ||
                  opp.kind === "PARALLELIZATION"
                ? "OPTIMIZATION"
                : opp.kind === "PERFORMANCE"
                  ? "HEALTH"
                  : "IMPROVEMENT";
        recommendations.push(
          makeRec(
            category,
            opp.title,
            opp.description,
            opp.evidence,
            opp.confidence,
            `Estimated impact ~${opp.expectedImpactPct}%`,
            opp.expectedImpactPct,
            opp.expectedImpactPct >= 20 ? "HIGH" : "MEDIUM",
            opp.targetId
          )
        );
      }

      for (const pattern of input.patterns) {
        if (pattern.confidence < this.config.confidenceThreshold) continue;
        if (
          pattern.kind === "TRUST_DEGRADATION" ||
          pattern.kind === "INTEGRITY_DRIFT"
        ) {
          recommendations.push(
            makeRec(
              "HEALTH",
              `Address ${pattern.kind.toLowerCase().replace(/_/g, " ")}`,
              pattern.description,
              pattern.evidence,
              pattern.confidence,
              "Stabilize trust/integrity posture",
              15,
              "HIGH",
              pattern.module
            )
          );
        }
        if (pattern.kind === "VALIDATION_INSTABILITY") {
          recommendations.push(
            makeRec(
              "RELIABILITY",
              "Stabilize validation execution",
              pattern.description,
              pattern.evidence,
              pattern.confidence,
              "Reduce error-rate spikes",
              14,
              "HIGH",
              pattern.module
            )
          );
        }
      }

      for (const corr of input.correlations) {
        if (corr.confidence < this.config.confidenceThreshold) continue;
        if (corr.pair === "RETRY_TIMEOUT") {
          recommendations.push(
            makeRec(
              "RELIABILITY",
              "Tune retry/timeout policy",
              corr.label,
              corr.evidence,
              corr.confidence,
              "Reduce coupled retry/timeout pressure",
              12,
              "MEDIUM",
              corr.pair
            )
          );
        }
        if (corr.pair === "RUNTIME_FAILURE" && corr.coefficient > 0) {
          recommendations.push(
            makeRec(
              "OPTIMIZATION",
              "Investigate runtime-linked failures",
              corr.label,
              corr.evidence,
              corr.confidence,
              "Lower failure rate via runtime reduction",
              16,
              "HIGH",
              corr.pair
            )
          );
        }
      }

      // Top priorities — keep highest severity first
      recommendations.sort((a, b) => {
        const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        if (rank[a.priority] !== rank[b.priority]) {
          return rank[a.priority] - rank[b.priority];
        }
        return b.confidence - a.confidence;
      });

      if (recommendations.length > this.config.recommendationLimit) {
        warnings.push(
          `Truncated recommendations to ${this.config.recommendationLimit}.`
        );
        return {
          recommendations: recommendations.slice(
            0,
            this.config.recommendationLimit
          ),
          warnings,
          errors,
        };
      }
    } catch (err) {
      errors.push(`Recommendation generation failed: ${String(err)}`);
    }

    return { recommendations, warnings, errors };
  }
}

function makeRec(
  category: RecommendationCategory,
  title: string,
  reason: string,
  evidence: string[],
  confidence: number,
  expectedImpact: string,
  expectedImpactPct: number,
  priority: IntelligentRecommendation["priority"],
  targetId?: string
): IntelligentRecommendation {
  return {
    recommendationId: `irec:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    category,
    title,
    reason,
    evidence: [...evidence],
    confidence: Math.round(confidence * 100) / 100,
    expectedImpact,
    expectedImpactPct: Math.round(expectedImpactPct * 100) / 100,
    priority,
    targetId,
    advisoryOnly: true,
  };
}
