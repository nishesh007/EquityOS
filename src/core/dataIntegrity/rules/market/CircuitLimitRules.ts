/**
 * Institutional circuit limit validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  isPlainObject,
  marketFail,
  marketPass,
  readNumber,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createCircuitLimitRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "circuit.upper_gt_lower",
      name: "Upper Circuit > Lower Circuit",
      description: "Upper circuit must be greater than lower circuit.",
      category: "PRICE",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["market", "circuit"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const upper = readNumber(rows[i], [
            "upperCircuit",
            "upper_circuit",
            "priceBandUpper",
          ]);
          const lower = readNumber(rows[i], [
            "lowerCircuit",
            "lower_circuit",
            "priceBandLower",
          ]);
          if (upper === undefined || lower === undefined) continue;
          if (!(upper > lower)) {
            return marketFail({
              message: `Impossible circuit band at index ${i}: upper must be > lower.`,
              recommendation: "Reload exchange price-band file for the symbol.",
              path: `[${i}]`,
              expected: "upper > lower",
              actual: { upper, lower },
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "circuit.ohlc_within_limits",
      name: "OHLC Within Circuit Limits",
      description: "Open/High/Low/Close must remain within circuit limits.",
      category: "PRICE",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "circuit", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const upper = readNumber(rows[i], [
            "upperCircuit",
            "upper_circuit",
            "priceBandUpper",
          ]);
          const lower = readNumber(rows[i], [
            "lowerCircuit",
            "lower_circuit",
            "priceBandLower",
          ]);
          if (upper === undefined || lower === undefined) continue;

          const fields: Array<[string, number | undefined]> = [
            ["open", readNumber(rows[i], ["open", "o"])],
            ["high", readNumber(rows[i], ["high", "h"])],
            ["low", readNumber(rows[i], ["low", "l"])],
            ["close", readNumber(rows[i], ["close", "c", "price", "ltp", "last"])],
          ];

          for (const [field, value] of fields) {
            if (value === undefined) continue;
            if (value > upper || value < lower) {
              return marketFail({
                message: `${field} outside circuit limits at index ${i}.`,
                recommendation:
                  "Verify circuit bands and reject impossible traded prices.",
                field,
                path: `[${i}].${field}`,
                expected: { lower, upper },
                actual: value,
              });
            }
          }
        }
        return marketPass();
      },
    },
    {
      id: "circuit.impossible_values",
      name: "Impossible Circuit Values",
      description: "Detect non-finite or non-positive circuit values.",
      category: "PRICE",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "circuit"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        for (const field of [
          "upperCircuit",
          "lowerCircuit",
          "priceBandUpper",
          "priceBandLower",
        ] as const) {
          if (!(field in ctx.data)) continue;
          const value = readNumber(ctx.data, [field]);
          if (value === undefined || !Number.isFinite(value) || value <= 0) {
            return marketFail({
              message: `Impossible circuit value for ${field}.`,
              recommendation: "Replace with exchange-published circuit limits.",
              field,
              expected: "finite > 0",
              actual: ctx.data[field],
            });
          }
        }
        return marketPass();
      },
    },
  ];
}
