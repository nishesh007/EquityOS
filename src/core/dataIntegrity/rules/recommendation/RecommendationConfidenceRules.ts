/**
 * Recommendation confidence validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import type { RuleSeverity } from "../../IntegrityTypes";
import {
  actionBias,
  configFromContext,
  isPlainObject,
  readAction,
  readNumber,
  recFail,
  recPass,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationConfidenceRules(
  config: RecommendationValidationConfig
): CreateRuleInput[] {
  const inflatedLevel: RuleSeverity =
    config.mode === "strict" ? "ERROR" : "WARNING";

  return [
    {
      id: "rec.confidence.exists_numeric",
      name: "Confidence Exists And Numeric",
      description: "Confidence must exist and be numeric.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        if (
          !("confidence" in ctx.data) &&
          !("conviction" in ctx.data) &&
          !("confidenceScore" in ctx.data)
        ) {
          return recFail({
            field: "confidence",
            message: "Confidence does not exist.",
            recommendation: "Set confidence (0–100).",
            actual: null,
          });
        }
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) {
          return recFail({
            field: "confidence",
            message: "Confidence is not numeric.",
            recommendation: "Provide a finite number between 0 and 100.",
            actual:
              ctx.data.confidence ??
              ctx.data.conviction ??
              ctx.data.confidenceScore,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.confidence.bounds",
      name: "Confidence Bounds 0–100",
      description: "Confidence must be between configured min and max.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) return recPass();
        if (conf < cfg.minConfidence || conf > cfg.maxConfidence) {
          return recFail({
            field: "confidence",
            message: "Confidence outside allowed bounds.",
            recommendation: `Clamp confidence to ${cfg.minConfidence}–${cfg.maxConfidence}.`,
            expected: { min: cfg.minConfidence, max: cfg.maxConfidence },
            actual: conf,
          });
        }
        if (!Number.isFinite(conf) || Number.isNaN(conf)) {
          return recFail({
            field: "confidence",
            message: "Impossible confidence value.",
            recommendation: "Replace NaN/Infinity with a valid score.",
            actual: conf,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.confidence.matches_action",
      name: "Confidence Matches Recommendation",
      description: "Strong actions require adequately high confidence.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        const conf = readNumber(ctx.data, ["confidence", "conviction"]);
        if (!action || conf === undefined) return recPass();

        if (
          (action === "STRONG_BUY" || action === "STRONG_SELL") &&
          conf < cfg.strongBuyMinConfidence
        ) {
          return recFail({
            field: "confidence",
            message: `${action} confidence is too low for a strong call.`,
            recommendation: `Raise confidence to >= ${cfg.strongBuyMinConfidence} or downgrade action.`,
            expected: `>= ${cfg.strongBuyMinConfidence}`,
            actual: conf,
          });
        }

        if (action === "WATCH" && conf > cfg.inflatedConfidenceThreshold) {
          return recFail({
            field: "confidence",
            message: "WATCH with near-certain confidence is inconsistent.",
            recommendation: "Use HOLD/BUY/SELL or lower confidence.",
            expected: `< ${cfg.inflatedConfidenceThreshold}`,
            actual: conf,
          });
        }

        return recPass();
      },
    },
    {
      id: "rec.confidence.matches_evidence",
      name: "Confidence Matches Supporting Evidence",
      description: "High confidence requires supporting evidence density.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const conf = readNumber(ctx.data, ["confidence", "conviction"]);
        if (conf === undefined) return recPass();
        if (conf < cfg.inflatedConfidenceThreshold) return recPass();

        const factors = ctx.data.supportingFactors;
        const indicators = ctx.data.supportingIndicators;
        const fundamentals = ctx.data.supportingFundamentals;
        const factorCount =
          (Array.isArray(factors) ? factors.length : factors ? 1 : 0) +
          (Array.isArray(indicators) ? indicators.length : indicators ? 1 : 0) +
          (Array.isArray(fundamentals)
            ? fundamentals.length
            : fundamentals
              ? 1
              : 0);

        if (factorCount < 2) {
          return recFail({
            field: "confidence",
            message: "Inflated confidence without sufficient supporting evidence.",
            recommendation:
              "Add supporting factors/indicators/fundamentals or reduce confidence.",
            expected: ">= 2 evidence items for high confidence",
            actual: { confidence: conf, evidenceItems: factorCount },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.confidence.inflated",
      name: "Detect Inflated Confidence",
      description: "Flag impossible or inflated confidence vs action bias.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: inflatedLevel,
      tags: ["recommendation", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        const conf = readNumber(ctx.data, ["confidence", "conviction"]);
        if (!action || conf === undefined) return recPass();
        const bias = actionBias(action, cfg);

        if (conf === 100 && bias === "neutral") {
          return recFail({
            field: "confidence",
            message: "Impossible confidence of 100 on a neutral recommendation.",
            recommendation: "Cap confidence for HOLD/WATCH below certainty.",
            expected: `< 100 for ${action}`,
            actual: conf,
          });
        }

        if (
          conf >= cfg.inflatedConfidenceThreshold &&
          bias === "neutral" &&
          cfg.mode === "strict"
        ) {
          return recFail({
            field: "confidence",
            message: "Inflated confidence for neutral recommendation.",
            recommendation: "Lower confidence or upgrade action with evidence.",
            expected: `< ${cfg.inflatedConfidenceThreshold}`,
            actual: conf,
          });
        }

        return recPass();
      },
    },
  ];
}
