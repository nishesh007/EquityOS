/**
 * TTM (trailing twelve months) validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  fundFail,
  fundPass,
  isPlainObject,
  readNumber,
  section,
  type FundamentalValidationConfig,
} from "./FundamentalRuleRegistry";

export function createTTMValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ttm.core",
      name: "TTM Core Consistency",
      description:
        "Validate TTM Revenue/EPS/EBITDA/PAT/Cash Flow presence and consistency.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "ttm"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return fundPass();
        const data = ctx.data;
        if (!("ttm" in data) && !("TTM" in data)) {
          // also allow flat ttm* keys
          const flatKeys = [
            "ttmRevenue",
            "ttmEps",
            "ttmEbitda",
            "ttmPat",
            "ttmCashFlow",
          ];
          if (!flatKeys.some((k) => k in data)) return fundPass();
        }

        const ttm = section(data, ["ttm", "TTM"]);
        const fields: Array<[string, string[]]> = [
          ["ttmRevenue", ["revenue", "ttmRevenue", "totalRevenue"]],
          ["ttmEps", ["eps", "ttmEps"]],
          ["ttmEbitda", ["ebitda", "ttmEbitda"]],
          ["ttmPat", ["pat", "netIncome", "ttmPat"]],
          ["ttmCashFlow", ["operatingCashFlow", "ttmCashFlow", "ocf"]],
        ];

        for (const [field, keys] of fields) {
          const present =
            keys.some((k) => k in ttm) ||
            keys.some((k) => k in data) ||
            field in data;
          if (!present) continue;
          const value =
            readNumber(ttm, keys) ??
            readNumber(data, [field, ...keys]);
          if (value === undefined || !Number.isFinite(value)) {
            return fundFail({
              field,
              message: `${field} is missing or non-finite.`,
              recommendation: "Recompute TTM from last four quarters.",
              expected: "finite number",
              actual: value ?? null,
            });
          }
        }

        // Optional: TTM revenue should equal sum of quarterly revenues if provided
        const quarters = Array.isArray(data.quarters)
          ? (data.quarters as unknown[])
          : null;
        const ttmRevenue =
          readNumber(ttm, ["revenue", "ttmRevenue"]) ??
          readNumber(data, ["ttmRevenue"]);
        if (quarters && quarters.length >= 4 && ttmRevenue !== undefined) {
          const last4 = quarters.slice(-4);
          let sum = 0;
          let ok = true;
          for (const q of last4) {
            if (!isPlainObject(q)) {
              ok = false;
              break;
            }
            const rev = readNumber(q, ["revenue", "totalRevenue"]);
            if (rev === undefined) {
              ok = false;
              break;
            }
            sum += rev;
          }
          if (ok && Math.abs(sum - ttmRevenue) > Math.max(1, Math.abs(sum) * 0.02)) {
            return fundFail({
              field: "ttmRevenue",
              message: "TTM Revenue inconsistent with last 4 quarters.",
              recommendation: "Set TTM Revenue = sum of last four quarter revenues.",
              expected: sum,
              actual: ttmRevenue,
            });
          }
        }

        return fundPass();
      },
    },
  ];
}
