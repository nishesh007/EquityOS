/**
 * Contradiction detection rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  hasNonEmptyText,
  isPlainObject,
  readAction,
  scoreDirection,
  section,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createContradictionDetectionRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.contradiction.explicit",
      name: "Explicit Contradiction Flag",
      description: "Reject outputs marked as contradictory.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "contradiction"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.contradiction === true ||
          ctx.data.hasContradiction === true ||
          (Array.isArray(ctx.data.contradictions) &&
            ctx.data.contradictions.length > 0)
        ) {
          return halFail({
            field: "contradictions",
            message: "Contradictory analysis detected.",
            recommendation: "Reconcile conflicting statements before publication.",
            actual: ctx.data.contradictions ?? true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.contradiction.reasoning_vs_conclusion",
      name: "Reasoning vs Conclusion",
      description:
        "Detect bullish reasoning with bearish conclusion and vice versa.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "contradiction"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const reasoningBias = scoreDirection(
          ctx.data.reasoningBias ??
            ctx.data.analysisBias ??
            section(ctx.data, ["reasoning", "analysis"]).bias
        );
        const conclusionBias = scoreDirection(
          ctx.data.conclusionBias ??
            ctx.data.conclusionTone ??
            section(ctx.data, ["conclusion"]).bias
        );
        if (
          reasoningBias &&
          conclusionBias &&
          reasoningBias !== "neutral" &&
          conclusionBias !== "neutral" &&
          reasoningBias !== conclusionBias
        ) {
          return halFail({
            field: "conclusion",
            message: "Reasoning bias contradicts conclusion bias.",
            recommendation: "Align conclusion with the evidence-backed reasoning.",
            expected: reasoningBias,
            actual: conclusionBias,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.contradiction.reasoning_vs_recommendation",
      name: "Reasoning vs Recommendation",
      description: "Detect bearish reasoning with Buy recommendation (and reverse).",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "contradiction", "recommendation"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const action = readAction(ctx.data);
        const bias = actionBias(action);
        const reasoningBias = scoreDirection(
          ctx.data.reasoningBias ??
            ctx.data.analysisBias ??
            section(ctx.data, ["reasoning", "analysis", "technical"]).trend ??
            section(ctx.data, ["technical"]).trend
        );
        if (
          bias &&
          reasoningBias &&
          bias !== "neutral" &&
          reasoningBias !== "neutral" &&
          bias !== reasoningBias
        ) {
          return halFail({
            field: "recommendation",
            message: `${action} recommendation contradicts ${reasoningBias} reasoning.`,
            recommendation: "Align recommendation with reasoning or revise both.",
            expected: `${reasoningBias} action`,
            actual: action,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.contradiction.earnings_explanation",
      name: "Earnings Explanation Consistency",
      description: "Positive earnings with negative explanation (and reverse).",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "contradiction", "earnings"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const earningsTone = scoreDirection(
          ctx.data.earningsTone ??
            ctx.data.earningsBias ??
            section(ctx.data, ["earnings"]).tone
        );
        const explanationTone = scoreDirection(
          ctx.data.earningsExplanationTone ??
            ctx.data.earningsExplanationBias ??
            section(ctx.data, ["earnings"]).explanationTone
        );
        if (
          earningsTone &&
          explanationTone &&
          earningsTone !== "neutral" &&
          explanationTone !== "neutral" &&
          earningsTone !== explanationTone
        ) {
          return halFail({
            field: "earnings",
            message: "Earnings result contradicts earnings explanation tone.",
            recommendation: "Reconcile earnings facts with narrative explanation.",
            expected: earningsTone,
            actual: explanationTone,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.contradiction.indicator_valuation_market",
      name: "Indicator Valuation Market Conflicts",
      description:
        "Detect conflicting indicator, valuation, or market-context interpretations.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "contradiction"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.conflictingIndicators === true ||
          ctx.data.conflictingValuation === true ||
          ctx.data.conflictingMarketContext === true
        ) {
          return halFail({
            field: "analysis",
            message: "Conflicting indicator/valuation/market interpretations.",
            recommendation: "Resolve conflicts or disclose and downgrade confidence.",
            actual: {
              conflictingIndicators: ctx.data.conflictingIndicators ?? false,
              conflictingValuation: ctx.data.conflictingValuation ?? false,
              conflictingMarketContext: ctx.data.conflictingMarketContext ?? false,
            },
          });
        }
        const tech = scoreDirection(
          section(ctx.data, ["technical", "indicators"]).overall ??
            section(ctx.data, ["technical"]).trend
        );
        const valuation = scoreDirection(
          section(ctx.data, ["valuation"]).bias ?? ctx.data.valuationBias
        );
        if (
          tech &&
          valuation &&
          tech !== "neutral" &&
          valuation !== "neutral" &&
          tech !== valuation &&
          hasNonEmptyText(ctx.data.unifiedThesis)
        ) {
          // Soft conflict only when a unified thesis claims alignment
          return halFail({
            field: "valuation",
            message: "Unified thesis claims alignment but tech vs valuation conflict.",
            recommendation: "Drop unifiedThesis or reconcile tech and valuation.",
            actual: { tech, valuation },
          });
        }
        return halPass();
      },
    },
  ];
}
