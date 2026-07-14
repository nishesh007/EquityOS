/**
 * Market context alignment rules for recommendations.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readAction,
  readNumber,
  readString,
  recFail,
  recPass,
  scoreDirection,
  section,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationMarketContextRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.market.context_present",
      name: "Market Context Present",
      description: "Recommendation must include market context fields.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["recommendation", "market"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const market = section(ctx.data, ["market", "marketContext"]);
        const hasAny =
          hasNonEmptyText(market.sectorTrend) ||
          hasNonEmptyText(market.indexTrend) ||
          hasNonEmptyText(ctx.data.marketContext) ||
          readNumber(market, ["score"]) !== undefined;
        if (!hasAny) {
          return recFail({
            field: "marketContext",
            message: "Missing market context.",
            recommendation:
              "Include sectorTrend, indexTrend, volatility, or event risk.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.market.sector_index_alignment",
      name: "Sector And Index Trend Alignment",
      description: "Align recommendation with sector/index trend when provided.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "market"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action) return recPass();
        const market = section(ctx.data, ["market", "marketContext"]);
        const sector = scoreDirection(market.sectorTrend);
        const index = scoreDirection(market.indexTrend);
        const bias = actionBias(action, cfg);
        if (bias === "bullish" && sector === "bearish" && index === "bearish") {
          return recFail({
            field: "market",
            message: "Bullish recommendation against bearish sector and index.",
            recommendation: "Downgrade or document idiosyncratic thesis.",
            expected: "supportive sector/index trend",
            actual: { action, sector, index },
          });
        }
        if (bias === "bearish" && sector === "bullish" && index === "bullish") {
          return recFail({
            field: "market",
            message: "Bearish recommendation against bullish sector and index.",
            recommendation: "Upgrade to HOLD/WATCH or justify short thesis.",
            expected: "weak sector/index trend",
            actual: { action, sector, index },
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.market.volatility_and_events",
      name: "Volatility And Event Risk",
      description: "Validate volatility, event risk, earnings proximity, news.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "market", "risk"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const market = section(ctx.data, ["market", "marketContext"]);
        const vol = readNumber(market, ["volatility", "marketVolatility", "vix"]);
        const eventRisk =
          readString(market, ["eventRisk"]) ??
          (market.eventRisk === true ? "high" : undefined);
        const earningsProximity = readString(market, [
          "earningsProximity",
          "proximity",
        ]);
        const corp = market.corporateActions;
        const news = market.highImpactNews;

        if (
          vol !== undefined &&
          vol > cfg.riskThreshold &&
          ctx.data.eventRiskAcknowledged !== true
        ) {
          return recFail({
            field: "volatility",
            message: "Market volatility above risk threshold.",
            recommendation: "Acknowledge event risk or reduce conviction.",
            expected: `<= ${cfg.riskThreshold}`,
            actual: vol,
          });
        }

        if (
          (eventRisk === "high" ||
            earningsProximity === "imminent" ||
            news === true ||
            (Array.isArray(corp) && corp.length > 0)) &&
          ctx.data.eventRiskAcknowledged !== true
        ) {
          const action = readAction(ctx.data);
          if (action === "STRONG_BUY" || action === "STRONG_SELL") {
            return recFail({
              field: "eventRisk",
              message: "High-impact market event near strong recommendation.",
              recommendation: "Set eventRiskAcknowledged or soften action.",
              actual: {
                eventRisk,
                earningsProximity,
                highImpactNews: news,
                corporateActions: corp,
              },
            });
          }
        }
        return recPass();
      },
    },
  ];
}
