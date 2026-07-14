/**
 * Recommendation risk assessment validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readNumber,
  readString,
  recFail,
  recPass,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

function riskSource(data: Record<string, unknown>): Record<string, unknown> {
  const nested = section(data, ["risk", "riskAssessment"]);
  return { ...data, ...nested };
}

export function createRecommendationRiskRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.risk.level_required",
      name: "Risk Level Required",
      description: "Every recommendation must include risk level.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const src = riskSource(ctx.data);
        if (
          !hasNonEmptyText(src.riskLevel) &&
          readNumber(src, ["riskLevel"]) === undefined
        ) {
          return recFail({
            field: "riskLevel",
            message: "Missing risk level.",
            recommendation: "Set riskLevel (e. g. LOW/MEDIUM/HIGH or 0–100).",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.risk.expected_and_downside",
      name: "Expected Risk And Downside",
      description: "Expected risk and downside must be present.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const src = riskSource(ctx.data);
        const expectedRisk = readNumber(src, ["expectedRisk", "riskPct"]);
        const downside = readNumber(src, ["downside", "downsidePct"]);
        if (expectedRisk === undefined) {
          return recFail({
            field: "expectedRisk",
            message: "Missing expected risk.",
            recommendation: "Provide expectedRisk as a numeric percentage.",
            actual: null,
          });
        }
        if (downside === undefined) {
          return recFail({
            field: "downside",
            message: "Missing downside.",
            recommendation: "Provide downside as a numeric percentage.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.risk.upside_and_rr",
      name: "Upside And Risk Reward",
      description: "Upside and risk/reward must be present and coherent.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const src = riskSource(ctx.data);
        const upside = readNumber(src, ["upside", "upsidePct"]);
        const rr = readNumber(src, ["riskReward", "rr", "rewardRisk"]);
        if (upside === undefined) {
          return recFail({
            field: "upside",
            message: "Missing upside.",
            recommendation: "Provide upside as a numeric percentage.",
            actual: null,
          });
        }
        if (rr === undefined) {
          return recFail({
            field: "riskReward",
            message: "Missing risk reward.",
            recommendation: "Provide riskReward ratio.",
            actual: null,
          });
        }
        if (rr < cfg.minRiskReward) {
          return recFail({
            field: "riskReward",
            message: "Risk reward below configured minimum.",
            recommendation: `Improve setup until RR >= ${cfg.minRiskReward}.`,
            expected: `>= ${cfg.minRiskReward}`,
            actual: rr,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.risk.max_loss_and_holding",
      name: "Maximum Loss And Holding Period",
      description: "Maximum loss and expected holding period required.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const src = riskSource(ctx.data);
        const maxLoss = readNumber(src, ["maximumLoss", "maxLoss", "stopLoss"]);
        const holding =
          readString(src, [
            "expectedHoldingPeriod",
            "holdingPeriod",
            "horizon",
          ]) ?? readNumber(src, ["expectedHoldingPeriod", "holdingPeriod"]);
        if (maxLoss === undefined) {
          return recFail({
            field: "maximumLoss",
            message: "Missing maximum loss.",
            recommendation: "Provide maximumLoss / stop loss.",
            actual: null,
          });
        }
        if (holding === undefined || holding === "") {
          return recFail({
            field: "expectedHoldingPeriod",
            message: "Missing expected holding period.",
            recommendation: "Provide expectedHoldingPeriod (e.g. '2W', 14).",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.risk.threshold",
      name: "Risk Threshold Check",
      description: "Reject when expected risk exceeds configured threshold.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const src = riskSource(ctx.data);
        const expectedRisk = readNumber(src, ["expectedRisk", "riskPct"]);
        if (expectedRisk === undefined) return recPass();
        if (expectedRisk > cfg.riskThreshold) {
          return recFail({
            field: "expectedRisk",
            message: "Expected risk exceeds risk threshold.",
            recommendation: "Reduce size, tighten stops, or reject publication.",
            expected: `<= ${cfg.riskThreshold}`,
            actual: expectedRisk,
          });
        }
        return recPass();
      },
    },
  ];
}
