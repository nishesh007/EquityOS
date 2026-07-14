/**
 * Growth metric validation + outlier detection hooks.
 */

import type { CreateRuleInput } from "../RuleTypes";
import type { RuleSeverity } from "../../IntegrityTypes";
import {
  configFromContext,
  fundFail,
  fundPass,
  isPlainObject,
  readNumber,
  section,
  type FundamentalValidationConfig,
} from "./FundamentalRuleRegistry";

export function createGrowthValidationRules(
  config: FundamentalValidationConfig
): CreateRuleInput[] {
  const outlierLevel: RuleSeverity = config.rejectOnOutlierDetection
    ? "ERROR"
    : "WARNING";

  return [
    {
      id: "growth.bounds",
      name: "Growth Bounds",
      description: "Detect impossible growth / CAGR values.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "growth"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const cfg = configFromContext(ctx);
        const growth = section(ctx.data, ["growth", "cagr"]);

        const fields: Array<[string, string[]]> = [
          ["revenueGrowth", ["revenueGrowth", "salesGrowth"]],
          ["profitGrowth", ["profitGrowth", "patGrowth", "netIncomeGrowth"]],
          ["epsGrowth", ["epsGrowth"]],
          ["cashFlowGrowth", ["cashFlowGrowth", "ocfGrowth"]],
          ["bookValueGrowth", ["bookValueGrowth"]],
          ["salesCagr", ["salesCagr", "revenueCagr", "cagr5ySales"]],
          ["epsCagr", ["epsCagr", "cagr5yEps"]],
          ["growth5y", ["growth5y", "fiveYearGrowth"]],
          ["growth10y", ["growth10y", "tenYearGrowth"]],
        ];

        for (const [field, keys] of fields) {
          if (
            !keys.some((k) => k in growth) &&
            !keys.some((k) => k in (ctx.data as object))
          ) {
            continue;
          }
          const value =
            readNumber(growth, keys) ??
            readNumber(ctx.data as Record<string, unknown>, keys);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: `Recalculate ${field}.`,
              actual: value ?? null,
            });
          }
          const isCagr = field.toLowerCase().includes("cagr");
          const max = isCagr ? cfg.maxCagrPct : cfg.maxGrowthPct;
          if (value < cfg.minGrowthPct || value > max) {
            return fundFail({
              field,
              message: `${field} outside configured growth bounds.`,
              recommendation: "Reject impossible growth before AI consumption.",
              expected: { min: cfg.minGrowthPct, max },
              actual: value,
            });
          }
        }
        return fundPass();
      },
    },
    {
      id: "outlier.fundamental_spikes",
      name: "Fundamental Outlier Spikes",
      description:
        "Detect sudden revenue spikes, profit collapse, debt explosion, margin collapse.",
      category: "FUNDAMENTAL",
      priority: "MEDIUM",
      ruleLevel: outlierLevel,
      tags: ["fundamental", "outlier"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const cfg = configFromContext(ctx);
        const cur = section(ctx.data, ["current", "latest"]);
        const prev = section(ctx.data, ["previous", "prior"]);

        const rev = readNumber(cur, ["revenue", "totalRevenue"]);
        const prevRev = readNumber(prev, ["revenue", "totalRevenue"]);
        if (rev !== undefined && prevRev !== undefined && prevRev > 0) {
          if (rev > prevRev * cfg.revenueSpikeMultiplier) {
            return fundFail({
              field: "revenue",
              message: "Sudden revenue spike detected.",
              recommendation: cfg.rejectOnOutlierDetection
                ? "Reject pending filing review."
                : "Mark as accounting anomaly warning.",
              expected: `<= ${prevRev * cfg.revenueSpikeMultiplier}`,
              actual: rev,
            });
          }
        }

        const pat = readNumber(cur, ["pat", "netIncome"]);
        const prevPat = readNumber(prev, ["pat", "netIncome"]);
        if (pat !== undefined && prevPat !== undefined && prevPat > 0) {
          if (pat < 0 && prevPat > 0) {
            return fundFail({
              field: "pat",
              message: "Profit collapse to loss detected.",
              recommendation: cfg.rejectOnOutlierDetection
                ? "Reject pending review."
                : "Warn on profit collapse.",
              actual: { pat, prevPat },
            });
          }
        }

        const debt = readNumber(cur, ["totalDebt", "debt"]);
        const prevDebt = readNumber(prev, ["totalDebt", "debt"]);
        if (debt !== undefined && prevDebt !== undefined && prevDebt > 0) {
          if (debt > prevDebt * cfg.debtExplosionMultiplier) {
            return fundFail({
              field: "totalDebt",
              message: "Debt explosion detected.",
              recommendation: cfg.rejectOnOutlierDetection
                ? "Reject pending capital-structure review."
                : "Warn on debt explosion.",
              expected: `<= ${prevDebt * cfg.debtExplosionMultiplier}`,
              actual: debt,
            });
          }
        }

        const margin = readNumber(cur, ["netMargin", "operatingMargin"]);
        const prevMargin = readNumber(prev, ["netMargin", "operatingMargin"]);
        if (margin !== undefined && prevMargin !== undefined) {
          if (prevMargin - margin >= cfg.marginCollapsePts) {
            return fundFail({
              field: "margin",
              message: "Margin collapse detected.",
              recommendation: cfg.rejectOnOutlierDetection
                ? "Reject pending profitability review."
                : "Warn on margin collapse.",
              expected: `drop < ${cfg.marginCollapsePts} pts`,
              actual: { margin, prevMargin },
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
