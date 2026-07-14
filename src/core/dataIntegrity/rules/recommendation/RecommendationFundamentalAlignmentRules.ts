/**
 * Fundamental alignment rules for AI recommendations.
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

const FUND_FIELDS: Array<[string, string[]]> = [
  ["revenueGrowth", ["revenueGrowth", "salesGrowth"]],
  ["profitGrowth", ["profitGrowth", "patGrowth"]],
  ["cashFlow", ["cashFlow", "operatingCashFlow", "fcf"]],
  ["debt", ["debt", "totalDebt", "debtEquity"]],
  ["roe", ["roe"]],
  ["roce", ["roce"]],
  ["margins", ["margins", "netMargin", "operatingMargin"]],
  ["valuation", ["valuation", "pe", "pb"]],
  ["promoterHolding", ["promoterHolding", "promoterPct"]],
  ["quarterlyResults", ["quarterlyResults", "latestQuarter"]],
];

export function createRecommendationFundamentalAlignmentRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.fundamental.fields_present",
      name: "Fundamental Alignment Fields",
      description: "Check presence of key fundamental alignment inputs.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["recommendation", "fundamental"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const fund = section(ctx.data, ["fundamental", "fundamentals"]);
        if (Object.keys(fund).length === 0 && !ctx.data.supportingFundamentals) {
          return recFail({
            field: "fundamental",
            message: "Missing fundamental alignment block.",
            recommendation:
              "Attach fundamental snapshot or supportingFundamentals.",
            actual: null,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.fundamental.alignment_score",
      name: "Fundamental Alignment Score",
      description: "Reject when fundamental alignment score is below threshold.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "fundamental"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const fund = section(ctx.data, ["fundamental", "fundamentals"]);
        const score = readNumber(fund, ["score", "alignment", "alignmentScore"]);
        if (score === undefined) return recPass();
        if (score < cfg.alignmentThreshold) {
          return recFail({
            field: "fundamental.alignment",
            message: "Fundamental alignment below threshold.",
            recommendation: "Improve fundamentals thesis or lower action strength.",
            expected: `>= ${cfg.alignmentThreshold}`,
            actual: score,
          });
        }
        return recPass();
      },
    },
    {
      id: "rec.fundamental.action_alignment",
      name: "Action vs Fundamental Metrics",
      description:
        "Validate recommendation against revenue/profit growth, ROE/ROCE, margins, valuation, holdings.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["recommendation", "fundamental"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const cfg = configFromContext(ctx);
        const action = readAction(ctx.data);
        if (!action) return recPass();
        const bias = actionBias(action, cfg);
        const fund = section(ctx.data, ["fundamental", "fundamentals"]);

        const outlook = scoreDirection(fund.outlook ?? fund.bias ?? fund.trend);
        if (
          bias === "bullish" &&
          outlook === "bearish" &&
          action === "STRONG_BUY"
        ) {
          return recFail({
            field: "fundamental",
            message: "Strong Buy not aligned with bearish fundamental outlook.",
            recommendation: "Downgrade action or revise fundamental outlook.",
            expected: "bullish/neutral outlook",
            actual: outlook,
          });
        }
        if (
          bias === "bearish" &&
          outlook === "bullish" &&
          action === "STRONG_SELL"
        ) {
          return recFail({
            field: "fundamental",
            message: "Strong Sell not aligned with bullish fundamental outlook.",
            recommendation: "Upgrade action or revise fundamental outlook.",
            expected: "bearish/neutral outlook",
            actual: outlook,
          });
        }

        const rev = readNumber(fund, ["revenueGrowth", "salesGrowth"]);
        const profit = readNumber(fund, ["profitGrowth", "patGrowth"]);
        if (bias === "bullish" && rev !== undefined && profit !== undefined) {
          if (rev < -20 && profit < -20) {
            return recFail({
              field: "fundamental.growth",
              message: "Bullish call with sharply negative growth metrics.",
              recommendation: "Require turnaround evidence before Buy-side call.",
              actual: { revenueGrowth: rev, profitGrowth: profit },
            });
          }
        }

        // Soft presence check for institutional coverage — only when fund block exists
        if (Object.keys(fund).length > 0) {
          const present = FUND_FIELDS.filter(([, keys]) =>
            keys.some((k) => k in fund)
          ).length;
          if (present === 0 && !fund.score) {
            return recFail({
              field: "fundamental",
              message:
                "Fundamental block lacks growth/profitability/valuation fields.",
              recommendation:
                "Include revenueGrowth, profitGrowth, cashFlow, debt, ROE/ROCE, margins, valuation, promoterHolding, quarterlyResults.",
              expected: FUND_FIELDS.map(([f]) => f),
              actual: Object.keys(fund),
            });
          }
        }

        return recPass();
      },
    },
  ];
}
