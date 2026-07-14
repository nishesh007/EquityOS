/**
 * Institutional corporate-action adjustment validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  isPlainObject,
  marketFail,
  marketPass,
  parseTimestamp,
  readNumber,
  readString,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createCorporateActionAdjustmentRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "corp.split_ratio",
      name: "Split Adjustment Consistency",
      description: "Detect split-ratio / adjustment mismatches.",
      category: "CORPORATE_ACTION",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "corporate-action", "split"],
      author: "equityos-market",
      datasetTypes: ["CORPORATE_ACTION", "SPLIT", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const type = (
            readString(row, ["type", "action", "corporateAction"]) ?? ""
          ).toUpperCase();
          if (
            ctx.datasetType !== "SPLIT" &&
            type &&
            type !== "SPLIT" &&
            type !== "BONUS"
          ) {
            continue;
          }
          if (ctx.datasetType !== "SPLIT" && !type && !("ratio" in row)) {
            continue;
          }

          const ratio = readNumber(row, ["ratio", "splitRatio", "adjustmentFactor"]);
          const from = readNumber(row, ["numerator", "fromFactor", "from"]);
          const to = readNumber(row, ["denominator", "toFactor", "to"]);

          if (ratio !== undefined && !(ratio > 0)) {
            return marketFail({
              message: `Invalid split/bonus ratio at index ${i}.`,
              recommendation: "Correct corporate-action ratio from exchange notice.",
              field: "ratio",
              expected: "> 0",
              actual: ratio,
            });
          }
          if (from !== undefined && to !== undefined) {
            if (!(from > 0) || !(to > 0)) {
              return marketFail({
                message: `Invalid split factors at index ${i}.`,
                recommendation: "Use positive from/to factors.",
                actual: { from, to },
              });
            }
            if (ratio !== undefined && Math.abs(ratio - from / to) > 1e-6) {
              return marketFail({
                message: `Split-adjustment mismatch at index ${i}.`,
                recommendation: "Align ratio with from/to factors.",
                field: "ratio",
                expected: from / to,
                actual: ratio,
              });
            }
          }

          const pre = readNumber(row, ["priceBefore", "unadjustedPrice"]);
          const post = readNumber(row, ["priceAfter", "adjustedPrice"]);
          if (pre !== undefined && post !== undefined && ratio !== undefined) {
            const expected = pre / ratio;
            if (Math.abs(expected - post) / Math.max(expected, 1e-9) > 0.02) {
              return marketFail({
                message: `Adjusted price inconsistency after split at index ${i}.`,
                recommendation: "Rebuild adjusted history using official factor.",
                field: "adjustedPrice",
                expected,
                actual: post,
              });
            }
          }
        }
        return marketPass();
      },
    },
    {
      id: "corp.dividend_adjustment",
      name: "Dividend Adjustment Consistency",
      description: "Detect dividend adjustment / date mismatches.",
      category: "CORPORATE_ACTION",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "corporate-action", "dividend"],
      author: "equityos-market",
      datasetTypes: ["CORPORATE_ACTION", "DIVIDEND"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const type = (
            readString(row, ["type", "action"]) ?? ""
          ).toUpperCase();
          if (
            ctx.datasetType !== "DIVIDEND" &&
            type &&
            type !== "DIVIDEND"
          ) {
            continue;
          }
          if (
            ctx.datasetType !== "DIVIDEND" &&
            !type &&
            !("amount" in row) &&
            !("dividend" in row)
          ) {
            continue;
          }

          const amount = readNumber(row, ["amount", "dividend", "cashAmount"]);
          if (amount !== undefined && amount < 0) {
            return marketFail({
              message: `Negative dividend amount at index ${i}.`,
              recommendation: "Correct dividend cash amount.",
              field: "amount",
              expected: ">= 0",
              actual: amount,
            });
          }

          const ex = parseTimestamp(
            row.exDate ?? row.ex_date ?? row.exDividendDate
          );
          const pay = parseTimestamp(
            row.payDate ?? row.pay_date ?? row.paymentDate
          );
          if (ex !== null && pay !== null && pay < ex) {
            return marketFail({
              message: `Dividend pay date precedes ex-date at index ${i}.`,
              recommendation: "Fix corporate-action chronology.",
              field: "payDate",
              expected: `>= exDate`,
              actual: { ex, pay },
            });
          }

          const closeBefore = readNumber(row, ["closeBeforeEx", "prevClose"]);
          const closeAfter = readNumber(row, ["closeAfterEx", "adjustedClose"]);
          if (
            amount !== undefined &&
            closeBefore !== undefined &&
            closeAfter !== undefined
          ) {
            const expected = closeBefore - amount;
            if (Math.abs(expected - closeAfter) > Math.max(0.05 * amount, 0.5)) {
              return marketFail({
                message: `Dividend adjustment mismatch at index ${i}.`,
                recommendation: "Verify cash dividend adjustment on close.",
                field: "adjustedClose",
                expected,
                actual: closeAfter,
              });
            }
          }
        }
        return marketPass();
      },
    },
    {
      id: "corp.face_value_continuity",
      name: "Face Value And Historical Continuity",
      description: "Detect face-value mismatches and broken historical continuity.",
      category: "CORPORATE_ACTION",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "corporate-action"],
      author: "equityos-market",
      datasetTypes: ["CORPORATE_ACTION", "HISTORICAL_DATASET", "BONUS"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const face = readNumber(rows[i], ["faceValue", "face_value", "parValue"]);
          if (face !== undefined && !(face > 0)) {
            return marketFail({
              message: `Invalid face value at index ${i}.`,
              recommendation: "Correct face value from exchange master.",
              field: "faceValue",
              expected: "> 0",
              actual: face,
            });
          }
        }

        if (isPlainObject(ctx.data) && Array.isArray(ctx.data.history)) {
          const history = ctx.data.history as unknown[];
          let prevClose: number | undefined;
          for (let i = 0; i < history.length; i++) {
            const bar = history[i];
            if (!isPlainObject(bar)) continue;
            const close = readNumber(bar, ["close", "adjustedClose"]);
            const factor = readNumber(bar, ["adjustmentFactor"]) ?? 1;
            if (close === undefined) continue;
            if (prevClose !== undefined && factor > 0) {
              const jump = Math.abs(close - prevClose / factor) / Math.max(prevClose, 1);
              if (jump > 0.5) {
                return marketFail({
                  message: `Historical continuity break at history index ${i}.`,
                  recommendation:
                    "Re-apply corporate-action adjustments across the series.",
                  path: `history[${i}]`,
                  expected: "continuous adjusted series",
                  actual: { prevClose, close, factor },
                });
              }
            }
            prevClose = close;
          }
        }
        return marketPass();
      },
    },
  ];
}
