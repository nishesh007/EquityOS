/**
 * Recommendation reasoning completeness rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  hasNonEmptyText,
  isPlainObject,
  recFail,
  recPass,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

function requireField(
  data: Record<string, unknown>,
  field: string,
  aliases: string[]
) {
  for (const key of [field, ...aliases]) {
    if (hasNonEmptyText(data[key])) return null;
  }
  return recFail({
    field,
    message: `Empty or missing ${field}.`,
    recommendation: `Provide non-empty ${field}.`,
    actual: data[field] ?? null,
  });
}

export function createRecommendationReasoningRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.reasoning.primary_reason",
      name: "Primary Reason Required",
      description: "Every recommendation must include a primary reason.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "primaryReason", ["reason", "thesis"]) ??
          recPass()
        );
      },
    },
    {
      id: "rec.reasoning.supporting_factors",
      name: "Supporting Factors Required",
      description: "Supporting factors must be present and non-empty.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "supportingFactors", ["factors", "bulls"]) ??
          recPass()
        );
      },
    },
    {
      id: "rec.reasoning.risk_factors",
      name: "Risk Factors Required",
      description: "Risk factors must be present and non-empty.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "riskFactors", ["risks", "bears"]) ??
          recPass()
        );
      },
    },
    {
      id: "rec.reasoning.invalidation_criteria",
      name: "Invalidation Criteria Required",
      description: "Invalidation criteria must be present.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "invalidationCriteria", [
            "invalidation",
            "killCriteria",
          ]) ?? recPass()
        );
      },
    },
    {
      id: "rec.reasoning.supporting_indicators",
      name: "Supporting Indicators Required",
      description: "Supporting technical indicators must be present.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "supportingIndicators", [
            "indicators",
            "technicalEvidence",
          ]) ?? recPass()
        );
      },
    },
    {
      id: "rec.reasoning.supporting_fundamentals",
      name: "Supporting Fundamentals Required",
      description: "Supporting fundamentals must be present.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        return (
          requireField(ctx.data, "supportingFundamentals", [
            "fundamentals",
            "fundamentalEvidence",
          ]) ?? recPass()
        );
      },
    },
    {
      id: "rec.reasoning.market_context",
      name: "Market Context Required",
      description: "Market context must be present in reasoning.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "reasoning"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        if (
          hasNonEmptyText(ctx.data.marketContext) ||
          hasNonEmptyText(ctx.data.market)
        ) {
          return recPass();
        }
        return recFail({
          field: "marketContext",
          message: "Empty reasoning market context.",
          recommendation: "Include sector/index/volatility context.",
          actual: null,
        });
      },
    },
  ];
}
