/**
 * Institutional volume validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  configFromContext,
  isPlainObject,
  marketFail,
  marketPass,
  readNumber,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createVolumeValidationRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "volume.non_negative",
      name: "Volume Non-Negative",
      description: "Volume, delivery volume, and trades must be >= 0.",
      category: "VOLUME",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "volume"],
      author: "equityos-market",
      datasetTypes: [
        "STOCK_QUOTE",
        "OHLC_CANDLE",
        "INTRADAY_CANDLE",
        "HISTORICAL_DATASET",
      ],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const volume = readNumber(rows[i], ["volume", "v", "totalVolume"]);
          if (volume !== undefined && volume < 0) {
            return marketFail({
              message: `Negative volume at index ${i}.`,
              recommendation: "Reject dataset with negative volume.",
              field: "volume",
              path: `[${i}].volume`,
              expected: ">= 0",
              actual: volume,
            });
          }
          const delivery = readNumber(rows[i], [
            "deliveryVolume",
            "delivery_volume",
          ]);
          if (delivery !== undefined && delivery < 0) {
            return marketFail({
              message: `Negative delivery volume at index ${i}.`,
              recommendation: "Reject dataset with negative delivery volume.",
              field: "deliveryVolume",
              expected: ">= 0",
              actual: delivery,
            });
          }
          const trades = readNumber(rows[i], ["trades", "tradeCount", "numTrades"]);
          if (trades !== undefined && trades < 0) {
            return marketFail({
              message: `Negative trade count at index ${i}.`,
              recommendation: "Reject dataset with negative trades.",
              field: "trades",
              expected: ">= 0",
              actual: trades,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "volume.delivery_lte_total",
      name: "Delivery Volume <= Total",
      description: "Delivery volume must not exceed total volume.",
      category: "VOLUME",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "volume"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const delivery = readNumber(rows[i], [
            "deliveryVolume",
            "delivery_volume",
          ]);
          const volume = readNumber(rows[i], ["volume", "totalVolume", "v"]);
          if (delivery === undefined || volume === undefined) continue;
          if (delivery > volume) {
            return marketFail({
              message: `Delivery volume exceeds total volume at index ${i}.`,
              recommendation: "Reconcile delivery statistics with exchange feed.",
              field: "deliveryVolume",
              expected: `<= ${volume}`,
              actual: delivery,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "volume.avg_trade_turnover",
      name: "Average Trade Size And Turnover",
      description: "Average trade size and turnover must be consistent when present.",
      category: "VOLUME",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "volume"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE"],
      validate: (ctx) => {
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const volume = readNumber(rows[i], ["volume", "v"]);
          const trades = readNumber(rows[i], ["trades", "tradeCount"]);
          const avgTrade = readNumber(rows[i], [
            "averageTradeSize",
            "avgTradeSize",
          ]);
          if (
            volume !== undefined &&
            trades !== undefined &&
            trades > 0 &&
            avgTrade !== undefined
          ) {
            const expected = volume / trades;
            if (Math.abs(expected - avgTrade) / Math.max(expected, 1) > 0.05) {
              return marketFail({
                message: `Average trade size inconsistent at index ${i}.`,
                recommendation: "Recompute average trade size as volume / trades.",
                field: "averageTradeSize",
                expected,
                actual: avgTrade,
              });
            }
          }
          const turnover = readNumber(rows[i], ["turnover", "value"]);
          if (turnover !== undefined && turnover < 0) {
            return marketFail({
              message: `Negative turnover at index ${i}.`,
              recommendation: "Reject negative turnover values.",
              field: "turnover",
              expected: ">= 0",
              actual: turnover,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "volume.spike",
      name: "Volume Spike Detection",
      description: "Detect abnormal volume spikes versus average.",
      category: "VOLUME",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["market", "volume", "anomaly"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const rows = asRows(ctx.data);
        const volumes = rows
          .map((r) => readNumber(r, ["volume", "v"]))
          .filter((v): v is number => v !== undefined && v >= 0);
        if (volumes.length < 5) return marketPass();
        const avg =
          volumes.slice(0, -1).reduce((a, b) => a + b, 0) /
          Math.max(volumes.length - 1, 1);
        const last = volumes[volumes.length - 1];
        if (avg > 0 && last > avg * config.volumeSpikeMultiplier) {
          return marketFail({
            message: "Volume spike detected versus recent average.",
            recommendation:
              "Mark as suspicious; confirm corporate action or news catalyst.",
            field: "volume",
            expected: `<= ${avg * config.volumeSpikeMultiplier}`,
            actual: last,
          });
        }
        return marketPass();
      },
    },
    {
      id: "volume.zero_handling",
      name: "Zero Volume Handling",
      description: "Zero volume allowed only when configured.",
      category: "VOLUME",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["market", "volume"],
      author: "equityos-market",
      datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "STOCK_QUOTE"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        if (config.allowZeroVolume) return marketPass();
        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const volume = readNumber(rows[i], ["volume", "v"]);
          if (volume === 0) {
            return marketFail({
              message: `Zero volume not allowed by configuration at index ${i}.`,
              recommendation:
                "Enable allowZeroVolume or filter empty-session candles.",
              field: "volume",
              expected: "> 0",
              actual: 0,
            });
          }
        }
        if (isPlainObject(ctx.data)) {
          const volume = readNumber(ctx.data, ["volume", "v"]);
          if (volume === 0) {
            return marketFail({
              message: "Zero volume not allowed by configuration.",
              recommendation:
                "Enable allowZeroVolume or filter empty-session candles.",
              field: "volume",
              expected: "> 0",
              actual: 0,
            });
          }
        }
        return marketPass();
      },
    },
  ];
}
