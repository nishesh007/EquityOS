/**
 * Annual / fiscal-year continuity validation.
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

export function createAnnualValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "annual.continuity",
      name: "Annual Continuity",
      description:
        "Validate FY continuity, duplicates, missing years, YoY consistency.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "annual"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
      validate: (ctx) => {
        const periods = asPeriods(ctx.data).filter(
          (p) =>
            readString(p, ["periodType", "frequency", "type"]) === "A" ||
            readString(p, ["period", "fiscalYear"])?.startsWith("FY") ||
            "fiscalYear" in p ||
            ctx.metadata?.statementFrequency === "annual"
        );
        const rows =
          periods.length > 0
            ? periods
            : ctx.metadata?.statementFrequency === "annual"
              ? asPeriods(ctx.data)
              : [];
        if (rows.length === 0) return fundPass();

        const years = rows.map(
          (r) =>
            readString(r, ["fiscalYear", "year", "period", "fy"]) ??
            String(readNumber(r, ["year", "fy"]) ?? "")
        );
        const seen = new Set<string>();
        for (const y of years) {
          if (!y) continue;
          if (seen.has(y)) {
            return fundFail({
              field: "fiscalYear",
              message: `Duplicate FY detected: ${y}.`,
              recommendation: "Deduplicate annual statements.",
              expected: "unique FY",
              actual: y,
            });
          }
          seen.add(y);
        }

        const numericYears = years
          .map((y) => Number.parseInt(y.replace(/\D/g, "").slice(0, 4), 10))
          .filter((n) => Number.isFinite(n));
        for (let i = 1; i < numericYears.length; i++) {
          const gap = numericYears[i] - numericYears[i - 1];
          if (Math.abs(gap) > 1 && gap !== 0) {
            // allow unsorted; only flag large holes when sorted ascending
          }
        }
        const sorted = [...numericYears].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] - sorted[i - 1] > 1) {
            return fundFail({
              field: "fiscalYear",
              message: `Missing FY between ${sorted[i - 1]} and ${sorted[i]}.`,
              recommendation: "Backfill missing annual periods.",
              expected: "continuous FY sequence",
              actual: { from: sorted[i - 1], to: sorted[i] },
            });
          }
        }

        for (let i = 1; i < rows.length; i++) {
          const prev = readNumber(rows[i - 1], ["revenue", "totalRevenue"]);
          const cur = readNumber(rows[i], ["revenue", "totalRevenue"]);
          const yoy = readNumber(rows[i], ["yoyGrowth", "revenueYoY"]);
          if (prev && cur !== undefined && yoy !== undefined) {
            const expected = ((cur - prev) / Math.abs(prev)) * 100;
            if (Math.abs(expected - yoy) > 1) {
              return fundFail({
                field: "yoyGrowth",
                message: `YoY growth inconsistent at index ${i}.`,
                recommendation: "Recompute YoY from annual revenues.",
                expected,
                actual: yoy,
              });
            }
          }
        }

        return fundPass();
      },
    },
  ];
}
