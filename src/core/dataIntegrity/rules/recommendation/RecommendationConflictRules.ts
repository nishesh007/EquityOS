/**
 * Recommendation conflict detection rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  isPlainObject,
  normalizeAction,
  readAction,
  readString,
  recFail,
  recPass,
  scoreDirection,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationConflictRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.conflict.technical_vs_fundamental",
      name: "Technical vs Fundamental Conflict",
      description: "Detect opposing technical and fundamental biases.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "conflict"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        const tech = section(ctx.data, ["technical", "technicals"]);
        const fund = section(ctx.data, ["fundamental", "fundamentals"]);
        const t = scoreDirection(tech.trend ?? tech.overall ?? tech.bias);
        const f = scoreDirection(fund.outlook ?? fund.bias ?? fund.trend);
        if (!t || !f || t === "neutral" || f === "neutral") return recPass();
        if (t !== f) {
          if (ctx.data.conflictAcknowledged === true) return recPass();
          if (action && actionBias(action, cfg) === "neutral") return recPass();
          return recFail({
            field: "conflict",
            message: "Technical vs Fundamental conflict detected.",
            recommendation:
              "Acknowledge conflict, use HOLD/WATCH, or resolve opposing signals.",
            expected: "aligned technical and fundamental bias",
            actual: { technical: t, fundamental: f, action },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.conflict.momentum_vs_trend",
      name: "Momentum vs Trend Conflict",
      description: "Detect momentum fighting the primary trend.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "conflict"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const tech = section(ctx.data, ["technical", "technicals"]);
        const trend = scoreDirection(tech.trend);
        const momentum = scoreDirection(tech.momentum);
        if (!trend || !momentum || trend === "neutral" || momentum === "neutral") {
          return recPass();
        }
        if (trend !== momentum && ctx.data.conflictAcknowledged !== true) {
          return recFail({
            field: "momentum",
            message: "Momentum vs Trend conflict.",
            recommendation: "Wait for alignment or document counter-trend trade.",
            expected: "momentum agrees with trend",
            actual: { trend, momentum },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.conflict.vs_portfolio",
      name: "Recommendation vs Portfolio Conflict",
      description: "Detect conflicts with existing portfolio posture.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "conflict", "portfolio"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const portfolio = section(ctx.data, ["portfolio"]);
        if (portfolio.conflict === true || ctx.data.portfolioConflict === true) {
          return recFail({
            field: "portfolio",
            message: "Recommendation vs Portfolio conflict.",
            recommendation:
              "Reconcile with current holdings before publishing advice.",
            actual: portfolio,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.conflict.vs_previous",
      name: "Recommendation vs Previous Recommendation",
      description: "Detect abrupt flips without reasoning.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "conflict", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        const prev = section(ctx.data, [
          "previousRecommendation",
          "priorRecommendation",
        ]);
        const prevAction = normalizeAction(
          prev.action ?? prev.recommendation ?? prev.signal
        );
        if (!action || !prevAction) return recPass();
        const curBias = actionBias(action, cfg);
        const prevBias = actionBias(prevAction, cfg);
        if (
          curBias !== "neutral" &&
          prevBias !== "neutral" &&
          curBias !== prevBias &&
          !hasFlipReason(ctx.data, prev)
        ) {
          return recFail({
            field: "previousRecommendation",
            message: "Recommendation contradicts previous recommendation.",
            recommendation:
              "Document flip reasoning / invalidation of prior thesis.",
            expected: "consistent bias or explicit flip rationale",
            actual: { previous: prevAction, current: action },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.conflict.vs_watchlist",
      name: "Recommendation vs Existing Watchlist",
      description: "Detect conflicts with watchlist stance.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "conflict", "watchlist"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const watchlist = section(ctx.data, ["watchlist"]);
        if (watchlist.conflict === true || ctx.data.watchlistConflict === true) {
          return recFail({
            field: "watchlist",
            message: "Recommendation vs Existing watchlist conflict.",
            recommendation: "Update watchlist stance or adjust recommendation.",
            actual: watchlist,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.conflict.vs_earnings",
      name: "Recommendation vs Earnings Conflict",
      description: "Detect conflicts around earnings events.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "conflict", "earnings"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const earnings = section(ctx.data, ["earnings"]);
        if (earnings.conflict === true || ctx.data.earningsConflict === true) {
          return recFail({
            field: "earnings",
            message: "Recommendation vs Earnings conflict.",
            recommendation:
              "Defer directional call or size for event risk near earnings.",
            actual: earnings,
          });
        }
        const proximity = readString(earnings, [
          "proximity",
          "earningsProximity",
        ]);
        const action = readAction(ctx.data);
        if (
          proximity &&
          ["imminent", "today", "tomorrow", "this_week"].includes(
            proximity.toLowerCase()
          ) &&
          action &&
          (action === "STRONG_BUY" || action === "STRONG_SELL") &&
          ctx.data.eventRiskAcknowledged !== true
        ) {
          return recFail({
            field: "earnings",
            message: "Strong directional call into imminent earnings.",
            recommendation: "Acknowledge event risk or soften to WATCH/HOLD.",
            actual: { action, proximity },
          });
        }
        return recPass();
      },
    },
  ];
}

function hasFlipReason(
  data: Record<string, unknown>,
  prev: Record<string, unknown>
): boolean {
  return (
    Boolean(data.flipReason) ||
    Boolean(data.thesisChange) ||
    Boolean(prev.invalidated) ||
    Boolean(data.previousInvalidated)
  );
}
