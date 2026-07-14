/**
 * Institutional quote consistency validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  isPlainObject,
  marketFail,
  marketPass,
  readNumber,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

export function createQuoteConsistencyRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "quote.ltp_bid_ask",
      name: "LTP Bid/Ask Consistency",
      description: "LTP should generally sit within the bid/ask spread.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "quote"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const ltp = readNumber(ctx.data, ["price", "last", "ltp"]);
        const bid = readNumber(ctx.data, ["bid", "bidPrice"]);
        const ask = readNumber(ctx.data, ["ask", "askPrice"]);
        if (ltp === undefined || bid === undefined || ask === undefined) {
          return marketPass();
        }
        if (ltp < bid || ltp > ask) {
          return marketFail({
            message: "LTP is outside the bid/ask spread.",
            recommendation: "Verify quote atomicity / snapshot timing.",
            field: "ltp",
            expected: { bid, ask },
            actual: ltp,
          });
        }
        return marketPass();
      },
    },
    {
      id: "quote.volume_turnover",
      name: "Volume Turnover Consistency",
      description: "Turnover should approximate volume * VWAP/LTP when present.",
      category: "VOLUME",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "quote", "volume"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const volume = readNumber(ctx.data, ["volume", "v"]);
        const turnover = readNumber(ctx.data, ["turnover", "value"]);
        const px = readNumber(ctx.data, ["vwap", "price", "last", "close"]);
        if (
          volume === undefined ||
          turnover === undefined ||
          px === undefined ||
          volume <= 0 ||
          px <= 0
        ) {
          return marketPass();
        }
        const expected = volume * px;
        const rel = Math.abs(expected - turnover) / expected;
        if (rel > 0.15) {
          return marketFail({
            message: "Turnover inconsistent with volume and price/VWAP.",
            recommendation: "Reconcile turnover against trade tape aggregates.",
            field: "turnover",
            expected,
            actual: turnover,
          });
        }
        return marketPass();
      },
    },
    {
      id: "quote.vwap_ohlc",
      name: "VWAP OHLC Consistency",
      description: "VWAP should lie within the High/Low range when OHLC present.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "quote", "vwap", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const vwap = readNumber(ctx.data, ["vwap", "VWAP"]);
        const high = readNumber(ctx.data, ["high", "h"]);
        const low = readNumber(ctx.data, ["low", "l"]);
        if (vwap === undefined || high === undefined || low === undefined) {
          return marketPass();
        }
        if (vwap > high || vwap < low) {
          return marketFail({
            message: "VWAP outside High/Low range.",
            recommendation: "Recalculate VWAP or verify OHLC integrity.",
            field: "vwap",
            expected: { low, high },
            actual: vwap,
          });
        }
        return marketPass();
      },
    },
    {
      id: "quote.previous_close_consistency",
      name: "Previous Close Consistency",
      description: "Change percent should match LTP vs previous close.",
      category: "PRICE",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["market", "quote"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const ltp = readNumber(ctx.data, ["price", "last", "ltp", "close"]);
        const prev = readNumber(ctx.data, ["previousClose", "prevClose"]);
        const changePct = readNumber(ctx.data, [
          "changePercent",
          "changePct",
          "pctChange",
        ]);
        if (ltp === undefined || prev === undefined || prev <= 0) {
          return marketPass();
        }
        if (changePct === undefined) return marketPass();
        const expected = ((ltp - prev) / prev) * 100;
        if (Math.abs(expected - changePct) > 0.25) {
          return marketFail({
            message: "Change percent inconsistent with LTP/previous close.",
            recommendation: "Recompute changePercent from LTP and previous close.",
            field: "changePercent",
            expected,
            actual: changePct,
          });
        }
        return marketPass();
      },
    },
    {
      id: "quote.ohlc_consistency",
      name: "Quote OHLC Consistency",
      description: "When a quote embeds OHLC, LTP should equal close.",
      category: "OHLC",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "quote", "ohlc"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const ltp = readNumber(ctx.data, ["price", "last", "ltp"]);
        const close = readNumber(ctx.data, ["close"]);
        if (ltp === undefined || close === undefined) return marketPass();
        if (Math.abs(ltp - close) > 1e-6) {
          return marketFail({
            message: "Quote LTP does not match close.",
            recommendation: "Ensure LTP and session close refer to the same print.",
            field: "ltp",
            expected: close,
            actual: ltp,
          });
        }
        return marketPass();
      },
    },
  ];
}
