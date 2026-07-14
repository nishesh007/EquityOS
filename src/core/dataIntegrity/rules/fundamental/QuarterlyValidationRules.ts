/**
 * Quarterly statement continuity validation.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asPeriods,
  fundFail,
  fundPass,
  readNumber,
  readString,
  type FundamentalValidationConfig,
} from "./FundamentalRuleRegistry";

export function createQuarterlyValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "qtr.continuity",
      name: "Quarterly Continuity",
      description:
        "Validate sequential quarters, duplicates, missing quarters, QoQ anomalies.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "quarterly"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        const periods = asPeriods(ctx.data).filter(
          (p) =>
            readString(p, ["periodType", "frequency", "type"]) === "Q" ||
            readString(p, ["period", "quarter"])?.includes("Q") ||
            "quarter" in p ||
            ctx.metadata?.statementFrequency === "quarterly"
        );
        const rows =
          periods.length > 0
            ? periods
            : ctx.metadata?.statementFrequency === "quarterly"
              ? asPeriods(ctx.data)
              : [];
        if (rows.length === 0) return fundPass();

        const keys = rows.map(
          (r) =>
            readString(r, ["period", "quarter", "fiscalPeriod", "label"]) ??
            String(readNumber(r, ["periodEnd", "date"]) ?? "")
        );
        const seen = new Set<string>();
        for (const key of keys) {
          if (!key) continue;
          if (seen.has(key)) {
            return fundFail({
              field: "quarter",
              message: `Duplicate quarter detected: ${key}.`,
              recommendation: "Deduplicate quarterly statements.",
              expected: "unique quarters",
              actual: key,
            });
          }
          seen.add(key);
        }

        // Sequential QoQ growth sanity when provided
        for (let i = 1; i < rows.length; i++) {
          const prevRev = readNumber(rows[i - 1], ["revenue", "totalRevenue"]);
          const rev = readNumber(rows[i], ["revenue", "totalRevenue"]);
          const qoq = readNumber(rows[i], ["qoqGrowth", "revenueQoQ"]);
          if (prevRev !== undefined && prevRev !== 0 && rev !== undefined && qoq !== undefined) {
            const expected = ((rev - prevRev) / Math.abs(prevRev)) * 100;
            if (Math.abs(expected - qoq) > 1) {
              return fundFail({
                field: "qoqGrowth",
                message: `QoQ growth inconsistent at index ${i}.`,
                recommendation: "Recompute QoQ from sequential revenues.",
                expected,
                actual: qoq,
              });
            }
          }
        }

        return fundPass();
      },
    },
  ];
}
