/**
 * Market context validation rules for AI outputs.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readNumber,
  section,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createMarketContextRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.market.context_present",
      name: "Market Context Present",
      description: "AI research outputs should consider market context.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "market"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.missingMarketContext === true) {
          return halFail({
            field: "marketContext",
            message: "Market context missing.",
            recommendation:
              "Include sector/index trend, volatility, and macro notes.",
            actual: true,
          });
        }
        const cfg = configFromContext(ctx);
        const market = section(ctx.data, ["market", "marketContext", "context"]);
        const hasAny =
          hasNonEmptyText(market.sectorTrend ?? ctx.data.sectorTrend) ||
          hasNonEmptyText(market.indexTrend ?? ctx.data.indexTrend) ||
          readNumber({ ...ctx.data, ...market }, ["volatility"]) !== undefined ||
          hasNonEmptyText(market.macro ?? ctx.data.macroEnvironment) ||
          hasNonEmptyText(market.news ?? ctx.data.recentNews);
        if (!hasAny && cfg.mode === "strict") {
          return halFail({
            field: "marketContext",
            message: "No market context fields in strict mode.",
            recommendation:
              "Provide sectorTrend, indexTrend, volatility, or macroEnvironment.",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.market.sector_index",
      name: "Sector And Index Trends",
      description: "Prefer both sector and index trend coverage.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "market"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        const market = section(ctx.data, ["market", "marketContext"]);
        const sector = hasNonEmptyText(market.sectorTrend ?? ctx.data.sectorTrend);
        const index = hasNonEmptyText(market.indexTrend ?? ctx.data.indexTrend);
        if (!sector || !index) {
          return halFail({
            field: "marketContext",
            message: "Missing sector or index trend in market context.",
            recommendation: "Include both sectorTrend and indexTrend.",
            actual: { sector, index },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.market.events_coverage",
      name: "Events Coverage",
      description: "Consider corporate actions, earnings, or recent news when relevant.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "market", "events"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        const market = section(ctx.data, ["market", "marketContext"]);
        const needsEvents =
          ctx.data.hasUpcomingEarnings === true ||
          ctx.data.hasCorporateActions === true ||
          ctx.data.requireEventContext === true;
        if (!needsEvents) return halPass();
        const covered =
          hasNonEmptyText(market.upcomingEarnings ?? ctx.data.upcomingEarnings) ||
          hasNonEmptyText(market.corporateActions ?? ctx.data.corporateActions) ||
          hasNonEmptyText(market.news ?? ctx.data.recentNews);
        if (!covered) {
          return halFail({
            field: "marketContext",
            message: "Event-sensitive setup missing earnings/news/corporate action context.",
            recommendation: "Document upcoming earnings, corporate actions, or recent news.",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.market.volatility_noted",
      name: "Volatility Noted",
      description: "Volatility should be acknowledged for actionable outputs.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["hallucination", "market", "volatility"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        const actionable =
          ctx.data.action !== undefined ||
          ctx.data.recommendation !== undefined;
        if (!actionable) return halPass();
        const market = section(ctx.data, ["market", "marketContext"]);
        const vol = readNumber({ ...ctx.data, ...market }, [
          "volatility",
          "hv",
          "atrPercent",
        ]);
        if (vol === undefined && !hasNonEmptyText(market.volatilityNote)) {
          return halFail({
            field: "volatility",
            message: "Actionable AI output missing volatility context.",
            recommendation: "Include volatility / ATR / HV note.",
            actual: null,
          });
        }
        return halPass();
      },
    },
  ];
}
