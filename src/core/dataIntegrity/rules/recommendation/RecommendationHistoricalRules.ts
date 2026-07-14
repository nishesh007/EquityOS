/**
 * Historical recommendation consistency rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  normalizeAction,
  readAction,
  readNumber,
  readString,
  recFail,
  recPass,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationHistoricalRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.historical.previous_comparison",
      name: "Compare Against Previous Recommendations",
      description: "Validate continuity vs previous recommendation metadata.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const prev = section(ctx.data, [
          "previousRecommendation",
          "priorRecommendation",
        ]);
        if (Object.keys(prev).length === 0) return recPass();
        const prevAction = normalizeAction(
          prev.action ?? prev.recommendation
        );
        if (!prevAction) {
          return recFail({
            field: "previousRecommendation",
            message: "Previous recommendation missing action.",
            recommendation: "Include prior action for historical audit trail.",
            actual: prev,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.historical.accuracy_and_success",
      name: "Historical Accuracy And Success Rate",
      description: "Warn when historical accuracy/success rate is too low.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const hist = section(ctx.data, ["historical", "history"]);
        const accuracy = readNumber(hist, [
          "accuracy",
          "historicalAccuracy",
          "hitRate",
        ]);
        const success = readNumber(hist, [
          "successRate",
          "historicalSuccessRate",
        ]);
        const metric = success ?? accuracy;
        if (metric === undefined) return recPass();
        if (metric < cfg.alignmentThreshold) {
          return recFail({
            field: "historical",
            message: "Historical accuracy/success rate below threshold.",
            recommendation:
              "Reduce confidence or require human review for this source.",
            expected: `>= ${cfg.alignmentThreshold}`,
            actual: metric,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.historical.previous_conviction",
      name: "Previous Conviction Continuity",
      description: "Detect unexplained conviction jumps vs prior call.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const prev = section(ctx.data, ["previousRecommendation"]);
        const hist = section(ctx.data, ["historical"]);
        const prevConf =
          readNumber(prev, ["confidence", "conviction"]) ??
          readNumber(hist, ["previousConviction"]);
        const conf = readNumber(ctx.data, ["confidence", "conviction"]);
        if (prevConf === undefined || conf === undefined) return recPass();
        if (Math.abs(conf - prevConf) >= 40 && !ctx.data.convictionChangeReason) {
          return recFail({
            field: "confidence",
            message: "Large unexplained jump vs previous conviction.",
            recommendation: "Document convictionChangeReason.",
            expected: "delta < 40 or documented reason",
            actual: { previous: prevConf, current: conf },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.historical.previous_reasoning",
      name: "Previous Reasoning Continuity",
      description: "Require prior reasoning when historical context is supplied.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["recommendation", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const hist = section(ctx.data, ["historical"]);
        const prev = section(ctx.data, ["previousRecommendation"]);
        if (Object.keys(hist).length === 0 && Object.keys(prev).length === 0) {
          return recPass();
        }
        const priorReason =
          readString(prev, ["reason", "primaryReason", "reasoning"]) ??
          readString(hist, ["previousReasoning", "priorReason"]);
        if (!priorReason) {
          return recFail({
            field: "previousReasoning",
            message: "Historical context missing previous reasoning.",
            recommendation: "Store prior reasoning for auditability.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.historical.window_conflict",
      name: "Historical Window Conflict",
      description: "Flag opposing calls within configured historical window.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "historical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        const hist = section(ctx.data, ["historical"]);
        if (hist.recentOppositeConflict === true) {
          return recFail({
            field: "historical",
            message: "Opposite recommendation within historical window.",
            recommendation: `Reconcile calls within ${cfg.historicalConflictWindowDays} days.`,
            expected: "no opposite call in window",
            actual: hist,
          });
        }
        const prev = section(ctx.data, ["previousRecommendation"]);
        const prevAction = normalizeAction(prev.action ?? prev.recommendation);
        const prevTs = prev.timestamp ?? prev.ts;
        const curTs = ctx.data.timestamp ?? ctx.data.ts;
        if (!action || !prevAction || !prevTs || !curTs) return recPass();
        const prevMs =
          typeof prevTs === "number" ? prevTs : Date.parse(String(prevTs));
        const curMs =
          typeof curTs === "number" ? curTs : Date.parse(String(curTs));
        if (!Number.isFinite(prevMs) || !Number.isFinite(curMs)) return recPass();
        const days = Math.abs(curMs - prevMs) / (1000 * 60 * 60 * 24);
        const curBias = actionBiasSafe(action, cfg);
        const prevBias = actionBiasSafe(prevAction, cfg);
        if (
          days <= cfg.historicalConflictWindowDays &&
          curBias !== "neutral" &&
          prevBias !== "neutral" &&
          curBias !== prevBias &&
          !ctx.data.flipReason
        ) {
          return recFail({
            field: "historical",
            message: "Historical conflict within configured window.",
            recommendation: "Add flipReason or widen review window.",
            expected: `consistent within ${cfg.historicalConflictWindowDays}d`,
            actual: { days, previous: prevAction, current: action },
          });
        }
        return recPass();
      },
    },
  ];
}

function actionBiasSafe(
  action: NonNullable<ReturnType<typeof readAction>>,
  config: RecommendationValidationConfig
) {
  if (config.bullishActions.includes(action)) return "bullish";
  if (config.bearishActions.includes(action)) return "bearish";
  return "neutral";
}
