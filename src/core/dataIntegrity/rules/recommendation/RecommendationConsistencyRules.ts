/**
 * Recommendation consistency rules — action vs evidence coherence.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readAction,
  readNumber,
  recFail,
  recPass,
  scoreDirection,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationConsistencyRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.consistency.supported_action",
      name: "Supported Recommendation Action",
      description: "Recommendation must be a supported institutional action.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return recFail({
            field: "action",
            message: "Recommendation payload must be an object.",
            recommendation: "Provide a structured recommendation object.",
            actual: typeof ctx.data,
          });
        }
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action) {
          return recFail({
            field: "action",
            message: "Missing or unsupported recommendation action.",
            recommendation:
              "Use BUY, STRONG_BUY, ACCUMULATE, HOLD, WATCH, REDUCE, SELL, or STRONG_SELL.",
            expected: cfg.supportedActions,
            actual: ctx.data.action ?? ctx.data.recommendation ?? null,
          });
        }
        if (!cfg.supportedActions.includes(action)) {
          return recFail({
            field: "action",
            message: "Unsupported recommendation action.",
            recommendation: "Map to a supported institutional action.",
            expected: cfg.supportedActions,
            actual: action,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.timestamp_required",
      name: "Recommendation Timestamp Required",
      description: "Every recommendation must include a timestamp.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const ts = ctx.data.timestamp ?? ctx.data.ts ?? ctx.data.generatedAt;
        if (ts === undefined || ts === null || ts === "") {
          return recFail({
            field: "timestamp",
            message: "Recommendation without timestamp.",
            recommendation: "Attach ISO timestamp or epoch millis.",
            actual: null,
          });
        }
        if (typeof ts === "number" && !Number.isFinite(ts)) {
          return recFail({
            field: "timestamp",
            message: "Timestamp is non-finite.",
            recommendation: "Use a valid numeric epoch or ISO string.",
            actual: ts,
          });
        }
        if (typeof ts === "string" && Number.isNaN(Date.parse(ts))) {
          const asNum = Number(ts);
          if (!Number.isFinite(asNum)) {
            return recFail({
              field: "timestamp",
              message: "Timestamp is not parseable.",
              recommendation: "Use ISO-8601 or epoch millis.",
              actual: ts,
            });
          }
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.reason_required",
      name: "Recommendation Reason Required",
      description: "Reject recommendations without a primary reason.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        if (!hasNonEmptyText(ctx.data.primaryReason ?? ctx.data.reason)) {
          return recFail({
            field: "primaryReason",
            message: "Recommendation without reason.",
            recommendation: "Provide a non-empty primaryReason.",
            actual: ctx.data.primaryReason ?? ctx.data.reason ?? null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.confidence_required",
      name: "Recommendation Confidence Required",
      description: "Reject recommendations without confidence.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) {
          return recFail({
            field: "confidence",
            message: "Recommendation without confidence.",
            recommendation: "Provide numeric confidence in 0–100.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.action_vs_technical",
      name: "Action vs Technical Consistency",
      description:
        "Reject Strong Buy / Buy with bearish technicals and Sell with bullish technicals.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency", "technical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action) return recPass();
        const bias = actionBias(action, cfg);
        const tech = section(ctx.data, ["technical", "technicals"]);
        const trend = scoreDirection(
          tech.trend ?? tech.overall ?? tech.bias ?? ctx.data.technicalBias
        );
        const momentum = scoreDirection(tech.momentum);
        const allBearish =
          trend === "bearish" &&
          (momentum === "bearish" || momentum === undefined) &&
          scoreDirection(tech.breakout) !== "bullish";

        if (
          (action === "STRONG_BUY" || action === "BUY") &&
          (trend === "bearish" || allBearish)
        ) {
          return recFail({
            field: "action",
            message: `${action} with bearish technicals is contradictory.`,
            recommendation:
              "Downgrade action or wait for technical confirmation.",
            expected: "bullish or neutral technicals",
            actual: { action, trend, momentum },
          });
        }

        if (
          (action === "STRONG_SELL" || action === "SELL") &&
          trend === "bullish"
        ) {
          return recFail({
            field: "action",
            message: `${action} with bullish technicals is contradictory.`,
            recommendation:
              "Upgrade to HOLD/WATCH or revise technical assessment.",
            expected: "bearish or neutral technicals",
            actual: { action, trend },
          });
        }

        if (bias === "bullish" && allBearish) {
          return recFail({
            field: "action",
            message: "Buy-side recommendation while every indicator is bearish.",
            recommendation: "Do not publish until indicators improve.",
            expected: "mixed or bullish indicators",
            actual: { action, trend, momentum },
          });
        }

        return recPass();
      },
    },
    {
      id: "rec.consistency.action_vs_fundamentals",
      name: "Action vs Fundamental Consistency",
      description:
        "Reject Strong Sell with improving fundamentals and Strong Buy with collapsing fundamentals.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency", "fundamental"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const action = readAction(ctx.data);
        if (!action) return recPass();
        const fund = section(ctx.data, ["fundamental", "fundamentals"]);
        const improving =
          fund.improving === true ||
          scoreDirection(fund.outlook ?? fund.bias ?? fund.trend) ===
            "bullish";
        const deteriorating =
          fund.improving === false ||
          scoreDirection(fund.outlook ?? fund.bias ?? fund.trend) ===
            "bearish";

        if (action === "STRONG_SELL" && improving) {
          return recFail({
            field: "action",
            message: "Strong Sell with improving fundamentals.",
            recommendation:
              "Use REDUCE/HOLD or document overriding risk thesis.",
            expected: "deteriorating or mixed fundamentals",
            actual: { action, improving: true },
          });
        }
        if (action === "STRONG_BUY" && deteriorating) {
          return recFail({
            field: "action",
            message: "Strong Buy with deteriorating fundamentals.",
            recommendation: "Downgrade until fundamentals stabilize.",
            expected: "stable or improving fundamentals",
            actual: { action, deteriorating: true },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.target_achieved_hold",
      name: "Hold While Target Achieved",
      description: "Reject Hold when price target is already achieved.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const action = readAction(ctx.data);
        if (action !== "HOLD") return recPass();
        const target = section(ctx.data, ["target", "priceTarget"]);
        const achieved =
          target.achieved === true ||
          ctx.data.targetAchieved === true;
        const targetPrice = readNumber(
          { ...ctx.data, ...target },
          ["targetPrice", "price", "target"]
        );
        const current = readNumber(
          { ...ctx.data, ...target },
          ["currentPrice", "price", "last"]
        );
        const hit =
          achieved ||
          (targetPrice !== undefined &&
            current !== undefined &&
            current >= targetPrice);

        if (hit) {
          return recFail({
            field: "action",
            message: "Hold while target already achieved.",
            recommendation: "Book profits, upgrade to REDUCE, or set new target.",
            expected: "HOLD only when target not yet achieved",
            actual: { targetPrice, current, achieved: hit },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.consistency.sell_high_conviction",
      name: "Sell With Extreme Bullish Conviction",
      description: "Reject Sell paired with extremely high bullish conviction.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "consistency", "confidence"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action || !cfg.bearishActions.includes(action)) return recPass();
        const conf = readNumber(ctx.data, ["confidence", "conviction"]);
        const tech = section(ctx.data, ["technical", "technicals"]);
        const bullishTech =
          scoreDirection(tech.trend ?? tech.overall) === "bullish";
        if (
          conf !== undefined &&
          conf >= cfg.inflatedConfidenceThreshold &&
          bullishTech
        ) {
          return recFail({
            field: "confidence",
            message: `Sell with ${conf} conviction against bullish technicals.`,
            recommendation: "Reconcile action, confidence, and evidence.",
            expected: `confidence < ${cfg.inflatedConfidenceThreshold} or bearish technicals`,
            actual: { action, confidence: conf, bullishTech },
          });
        }
        return recPass();
      },
    },
  ];
}
