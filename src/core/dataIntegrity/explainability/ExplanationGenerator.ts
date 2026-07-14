/**
 * Explanation generator — human-readable summaries of validation decisions.
 */

import type {
  ExplainabilityConfiguration,
  ExplanationStyle,
} from "./ExplainabilityConfiguration";
import type { DecisionTrace } from "./DecisionTraceEngine";
import type { RuleContributionReport } from "./RuleContributionAnalyzer";
import type { ConfidenceBreakdown } from "./ConfidenceBreakdownEngine";

export interface GeneratedExplanation {
  explanationId: string;
  decisionId: string;
  traceId: string;
  style: ExplanationStyle;
  humanReadable: string;
  ruleSummary: string;
  validationSummary: string;
  riskSummary: string;
  confidenceSummary: string;
  decisionSummary: string;
  recommendationSummary: string;
  qualityScore: number;
  generatedAt: string;
  warnings: string[];
  errors: string[];
}

export class ExplanationGenerator {
  private config: ExplainabilityConfiguration;
  private seq = 0;

  constructor(config: ExplainabilityConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ExplainabilityConfiguration): void {
    this.config = config;
  }

  generate(input: {
    trace: DecisionTrace;
    contributions: RuleContributionReport;
    confidence: ConfidenceBreakdown;
    style?: ExplanationStyle;
  }): GeneratedExplanation {
    const warnings: string[] = [...input.trace.warnings];
    const errors: string[] = [];
    this.seq += 1;
    const explanationId = `expl:${this.seq}:${Date.now()}`;
    const style = input.style ?? this.config.explanationStyle;

    try {
      const executed = input.trace.executedRules.length;
      const failed = input.trace.failedRules.length;
      const critical = input.trace.criticalRules.length;
      const topRules = input.contributions.contributions
        .slice()
        .sort((a, b) => b.impact - a.impact)
        .slice(0, style === "concise" ? 3 : 6);

      const ruleSummary = `Executed ${executed} rule(s); skipped ${input.trace.skippedRules.length}; failed ${failed}; critical ${critical}. Top contributors: ${
        topRules.map((r) => r.ruleName).join(", ") || "none"
      }.`;

      const validationSummary = `Validation type ${input.trace.validationType}${
        input.trace.symbol ? ` for ${input.trace.symbol}` : ""
      } completed with outcome ${input.trace.outcome.toUpperCase()} across flow [${input.trace.flow.join(" → ")}].`;

      const riskSummary =
        failed + critical > 0
          ? `Risk elevated: ${failed} failure(s) and ${critical} critical signal(s) detected in the decision path.`
          : "No critical failure signals observed in the traced decision path.";

      const confidenceSummary = `Overall confidence ${(
        input.confidence.overallConfidence * 100
      ).toFixed(0)}% (trend: ${input.confidence.trend}). Distribution — high: ${
        input.confidence.distribution.high
      }, medium: ${input.confidence.distribution.medium}, low: ${
        input.confidence.distribution.low
      }.`;

      const decisionSummary = `Decision ${input.trace.decisionId} is explained as ${input.trace.outcome} with trace completeness ${input.trace.completenessScore}/100.`;

      const recommendationSummary =
        input.trace.outcome === "fail"
          ? "Review failed and critical rules before relying on this validation output."
          : input.trace.outcome === "warning"
            ? "Accept with caution; investigate warning contributors and confidence lows."
            : "Decision path is coherent; continue monitoring confidence trend.";

      const humanReadable = composeNarrative(style, {
        validationSummary,
        ruleSummary,
        riskSummary,
        confidenceSummary,
        decisionSummary,
        recommendationSummary,
        institutional: this.config.institutionalMode,
      });

      const qualityScore = scoreQuality({
        style,
        verbosity: this.config.verbosity,
        hasRules: executed + failed > 0,
        hasConfidence: input.confidence.overallConfidence > 0,
        hasDependencies: input.trace.dependencies.length > 0,
        narrativeLength: humanReadable.length,
      });

      return {
        explanationId,
        decisionId: input.trace.decisionId,
        traceId: input.trace.traceId,
        style,
        humanReadable,
        ruleSummary,
        validationSummary,
        riskSummary,
        confidenceSummary,
        decisionSummary,
        recommendationSummary,
        qualityScore,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`explanation generation failed: ${String(err)}`);
      return {
        explanationId,
        decisionId: input.trace.decisionId,
        traceId: input.trace.traceId,
        style,
        humanReadable: "Explanation unavailable due to generation failure.",
        ruleSummary: "",
        validationSummary: "",
        riskSummary: "",
        confidenceSummary: "",
        decisionSummary: "",
        recommendationSummary: "",
        qualityScore: 0,
        generatedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }
}

function composeNarrative(
  style: ExplanationStyle,
  parts: {
    validationSummary: string;
    ruleSummary: string;
    riskSummary: string;
    confidenceSummary: string;
    decisionSummary: string;
    recommendationSummary: string;
    institutional: boolean;
  }
): string {
  const prefix =
    style === "institutional" || parts.institutional
      ? "Institutional decision trace: "
      : style === "technical"
        ? "Technical decision trace: "
        : "";

  if (style === "concise") {
    return `${prefix}${parts.decisionSummary} ${parts.recommendationSummary}`;
  }
  if (style === "technical") {
    return `${prefix}${parts.validationSummary} ${parts.ruleSummary} ${parts.confidenceSummary} ${parts.riskSummary}`;
  }
  return `${prefix}${parts.validationSummary} ${parts.ruleSummary} ${parts.riskSummary} ${parts.confidenceSummary} ${parts.decisionSummary} ${parts.recommendationSummary}`;
}

function scoreQuality(input: {
  style: ExplanationStyle;
  verbosity: string;
  hasRules: boolean;
  hasConfidence: boolean;
  hasDependencies: boolean;
  narrativeLength: number;
}): number {
  let score = 40;
  if (input.hasRules) score += 20;
  if (input.hasConfidence) score += 15;
  if (input.hasDependencies) score += 10;
  if (input.narrativeLength >= 120) score += 10;
  if (input.verbosity === "verbose") score += 5;
  if (input.style === "institutional") score += 5;
  return Math.max(0, Math.min(100, score));
}
