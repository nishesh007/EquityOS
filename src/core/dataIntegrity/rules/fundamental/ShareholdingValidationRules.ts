/**
 * Shareholding pattern validation.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asPeriods,
  configFromContext,
  fundFail,
  fundPass,
  isPlainObject,
  readNumber,
  readString,
  section,
  type FundamentalValidationConfig,
} from "./FundamentalRuleRegistry";

export function createShareholdingValidationRules(
  _config: FundamentalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "holding.pattern",
      name: "Shareholding Pattern",
      description:
        "Validate promoter/FII/DII/public/pledged holdings and continuity.",
      category: "FUNDAMENTAL",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["fundamental", "shareholding"],
      author: "equityos-fundamental",
      datasetTypes: ["FUNDAMENTAL_DATA"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data) && !Array.isArray(ctx.data)) {
          return fundPass();
        }
        const config = configFromContext(ctx);
        const holding = section(ctx.data, ["shareholding", "holdings"]);
        const hasHoldingKeys = [
          "promoter",
          "promoterHolding",
          "fii",
          "dii",
          "public",
          "pledged",
        ].some((k) => k in holding || k in (isPlainObject(ctx.data) ? ctx.data : {}));

        if (!hasHoldingKeys && !Array.isArray(ctx.data)) {
          // series of holdings?
          const periods = asPeriods(ctx.data).filter(
            (p) => "promoter" in p || "promoterHolding" in p
          );
          if (periods.length === 0) return fundPass();
        }

        const rows =
          asPeriods(ctx.data).filter(
            (p) =>
              "promoter" in p ||
              "promoterHolding" in p ||
              "fii" in p ||
              "public" in p
          ).length > 0
            ? asPeriods(ctx.data).filter(
                (p) =>
                  "promoter" in p ||
                  "promoterHolding" in p ||
                  "fii" in p ||
                  "public" in p
              )
            : [holding];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const promoter = readNumber(row, ["promoter", "promoterHolding"]);
          const fii = readNumber(row, ["fii", "FII", "fpi"]);
          const dii = readNumber(row, ["dii", "DII"]);
          const pub = readNumber(row, ["public", "publicHolding"]);
          const pledged = readNumber(row, ["pledged", "pledgedShares", "pledgedPct"]);

          for (const [field, value] of [
            ["promoter", promoter],
            ["fii", fii],
            ["dii", dii],
            ["public", pub],
            ["pledged", pledged],
          ] as const) {
            if (value === undefined) continue;
            if (!Number.isFinite(value) || value < 0 || value > 100) {
              return fundFail({
                field,
                message: `${field} holding % must be within 0–100.`,
                recommendation: "Normalize shareholding percentages.",
                path: `[${i}].${field}`,
                expected: { min: 0, max: 100 },
                actual: value,
              });
            }
          }

          if (
            promoter !== undefined &&
            fii !== undefined &&
            dii !== undefined &&
            pub !== undefined
          ) {
            const sum = promoter + fii + dii + pub;
            if (Math.abs(sum - 100) > config.holdingPctTolerance) {
              return fundFail({
                field: "shareholdingTotal",
                message: "Shareholding percentages must sum near 100%.",
                recommendation: "Reconcile promoter/FII/DII/public to 100%.",
                path: `[${i}]`,
                expected: 100,
                actual: sum,
              });
            }
          }

          if (
            pledged !== undefined &&
            promoter !== undefined &&
            pledged > promoter + config.holdingPctTolerance
          ) {
            return fundFail({
              field: "pledged",
              message: "Pledged shares cannot exceed promoter holding.",
              recommendation: "Correct pledged % from exchange disclosures.",
              path: `[${i}].pledged`,
              expected: `<= ${promoter}`,
              actual: pledged,
            });
          }
        }

        // quarter continuity: detect duplicate labels
        const labels = rows
          .map((r) => readString(r, ["period", "quarter", "asOf"]))
          .filter(Boolean) as string[];
        const seen = new Set<string>();
        for (const label of labels) {
          if (seen.has(label)) {
            return fundFail({
              field: "period",
              message: `Duplicate shareholding quarter: ${label}.`,
              recommendation: "Deduplicate shareholding history.",
              expected: "unique quarters",
              actual: label,
            });
          }
          seen.add(label);
        }

        return fundPass();
      },
    },
  ];
}
