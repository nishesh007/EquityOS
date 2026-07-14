/**
 * Technical alignment rules for AI recommendations.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  isPlainObject,
  readAction,
  readNumber,
  recFail,
  recPass,
  scoreDirection,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

const TECH_KEYS = [
  "trend",
  "momentum",
  "volume",
  "breakout",
  "support",
  "resistance",
  "movingAverages",
  "rsi",
  "macd",
  "adx",
  "atr",
  "vwap",
  "supertrend",
  "ichimoku",
] as const;

export function createRecommendationTechnicalAlignmentRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.technical.fields_present",
      name: "Technical Alignment Fields",
      description: "Check presence of technical alignment inputs.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "technical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const tech = section(ctx.data, ["technical", "technicals"]);
        if (Object.keys(tech).length === 0 && !ctx.data.supportingIndicators) {
          return recFail({
            field: "technical",
            message: "Missing technical alignment block.",
            recommendation:
              "Attach technical snapshot or supportingIndicators.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.technical.alignment_score",
      name: "Technical Alignment Score",
      description: "Reject when technical alignment score is below threshold.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "technical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const tech = section(ctx.data, ["technical", "technicals"]);
        const score = readNumber(tech, ["score", "alignment", "alignmentScore"]);
        if (score === undefined) return recPass();
        if (score < cfg.alignmentThreshold) {
          return recFail({
            field: "technical.alignment",
            message: "Technical alignment below threshold.",
            recommendation: "Wait for better technical confirmation.",
            expected: `>= ${cfg.alignmentThreshold}`,
            actual: score,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.technical.indicator_alignment",
      name: "Action vs Technical Indicators",
      description:
        "Validate recommendation against trend, momentum, volume, breakout, S/R, MAs, RSI, MACD, ADX, ATR, VWAP, Supertrend, Ichimoku.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "technical"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action) return recPass();
        const bias = actionBias(action, cfg);
        const tech = section(ctx.data, ["technical", "technicals"]);
        if (Object.keys(tech).length === 0) return recPass();

        const directions = TECH_KEYS.map((k) => scoreDirection(tech[k])).filter(
          (d): d is "bullish" | "bearish" | "neutral" => d !== undefined
        );
        const bullishCount = directions.filter((d) => d === "bullish").length;
        const bearishCount = directions.filter((d) => d === "bearish").length;

        if (bias === "bullish" && bearishCount >= 4 && bullishCount === 0) {
          return recFail({
            field: "technical",
            message: "Buy-side call while majority of indicators are bearish.",
            recommendation: "Require indicator confirmation before publishing.",
            expected: "bullish/mixed indicators",
            actual: { bullishCount, bearishCount, action },
          });
        }
        if (bias === "bearish" && bullishCount >= 4 && bearishCount === 0) {
          return recFail({
            field: "technical",
            message: "Sell-side call while majority of indicators are bullish.",
            recommendation: "Require indicator confirmation before publishing.",
            expected: "bearish/mixed indicators",
            actual: { bullishCount, bearishCount, action },
          });
        }

        const rsi = readNumber(tech, ["rsi", "rsiValue"]);
        if (rsi !== undefined) {
          if (action === "STRONG_BUY" && rsi > 80) {
            return recFail({
              field: "rsi",
              message: "Strong Buy with overbought RSI.",
              recommendation: "Wait for RSI cool-off or downgrade.",
              expected: "RSI not extremely overbought",
              actual: rsi,
            });
          }
          if (action === "STRONG_SELL" && rsi < 20) {
            return recFail({
              field: "rsi",
              message: "Strong Sell with oversold RSI.",
              recommendation: "Avoid panic sell into extreme oversold.",
              expected: "RSI not extremely oversold",
              actual: rsi,
            });
          }
        }

        const trend = scoreDirection(tech.trend);
        const ma = scoreDirection(tech.movingAverages);
        if (
          bias === "bullish" &&
          trend === "bearish" &&
          ma === "bearish" &&
          scoreDirection(tech.supertrend) === "bearish"
        ) {
          return recFail({
            field: "technical.trend",
            message: "Bullish recommendation against trend/MA/supertrend stack.",
            recommendation: "Align with trend or use counter-trend disclaimer.",
            actual: { trend, movingAverages: ma, supertrend: tech.supertrend },
          });
        }

        return recPass();
      },
    },
  ];
}
