/**
 * Institutional price validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  marketFail,
  marketPass,
  readNumber,
  readString,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

function alignedToTick(price: number, tick: number): boolean {
  if (tick <= 0) return false;
  const ratio = price / tick;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

export function createPriceValidationRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "price.positive",
      name: "Price Positive",
      description: "Price must be greater than zero.",
      category: "PRICE",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["market", "price"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "WATCHLIST_ITEM", "PORTFOLIO_POSITION"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const price = readNumber(ctx.data, ["price", "last", "ltp", "close"]);
        if (price === undefined) return marketPass();
        if (!(price > 0)) {
          return marketFail({
            message: "Price must be > 0.",
            recommendation: "Reject quote and request a fresh market snapshot.",
            field: "price",
            expected: "> 0",
            actual: price,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.finite",
      name: "Price Finite",
      description: "Price must be a finite number (not NaN/Infinity).",
      category: "PRICE",
      priority: "CRITICAL",
      ruleLevel: "CRITICAL",
      tags: ["market", "price"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "WATCHLIST_ITEM", "PORTFOLIO_POSITION"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const raw = ctx.data.price ?? ctx.data.last ?? ctx.data.ltp ?? ctx.data.close;
        if (raw === undefined || raw === null) return marketPass();
        if (typeof raw === "number" && Number.isNaN(raw)) {
          return marketFail({
            message: "Price is NaN.",
            recommendation: "Discard corrupted quote payload.",
            field: "price",
            expected: "finite number",
            actual: raw,
          });
        }
        if (typeof raw === "number" && !Number.isFinite(raw)) {
          return marketFail({
            message: "Price is not finite.",
            recommendation: "Discard corrupted quote payload.",
            field: "price",
            expected: "finite number",
            actual: raw,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.bid_ask",
      name: "Bid Ask Consistency",
      description: "Bid must be <= Ask and spread must not be negative.",
      category: "PRICE",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "price", "quote"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const bid = readNumber(ctx.data, ["bid", "bidPrice"]);
        const ask = readNumber(ctx.data, ["ask", "askPrice"]);
        if (bid === undefined || ask === undefined) return marketPass();
        if (bid > ask) {
          return marketFail({
            message: "Bid exceeds Ask (negative spread).",
            recommendation: "Reject crossed book quote.",
            field: "bid",
            expected: `bid <= ${ask}`,
            actual: { bid, ask, spread: bid - ask },
          });
        }
        const config = configFromContext(ctx);
        const mid = (bid + ask) / 2;
        if (mid > 0) {
          const spreadPct = ((ask - bid) / mid) * 100;
          if (spreadPct > config.maxSpreadPct) {
            return marketFail({
              message: "Bid/Ask spread exceeds configured maximum.",
              recommendation: "Flag illiquid or stale quote for review.",
              field: "spread",
              expected: `<= ${config.maxSpreadPct}%`,
              actual: spreadPct,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "price.ltp_exists",
      name: "Last Traded Price Exists",
      description: "Last traded price must exist on quote payloads.",
      category: "PRICE",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "price"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        if (
          !("price" in ctx.data) &&
          !("last" in ctx.data) &&
          !("ltp" in ctx.data) &&
          !("close" in ctx.data)
        ) {
          return marketPass();
        }
        const ltp = readNumber(ctx.data, ["price", "last", "ltp", "close"]);
        if (ltp === undefined) {
          return marketFail({
            message: "Last traded price is missing.",
            recommendation: "Require LTP before publishing quote to consumers.",
            field: "ltp",
            expected: "number",
            actual: null,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.previous_close",
      name: "Previous Close Exists",
      description: "Previous close should exist when referenced.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["market", "price"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        if (!("previousClose" in ctx.data) && !("prevClose" in ctx.data)) {
          return marketPass();
        }
        const prev = readNumber(ctx.data, ["previousClose", "prevClose"]);
        if (prev === undefined || !(prev > 0)) {
          return marketFail({
            message: "Previous close is missing or invalid.",
            recommendation: "Backfill previous close from official session data.",
            field: "previousClose",
            expected: "> 0",
            actual: prev ?? null,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.vwap_valid",
      name: "VWAP Valid",
      description: "VWAP must be positive and finite when present.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "price", "vwap"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const vwap = readNumber(ctx.data, ["vwap", "VWAP"]);
        if (vwap === undefined) return marketPass();
        if (!Number.isFinite(vwap) || !(vwap > 0)) {
          return marketFail({
            message: "VWAP is invalid.",
            recommendation: "Recalculate VWAP from trade tape.",
            field: "vwap",
            expected: "finite > 0",
            actual: vwap,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.average_settlement",
      name: "Average And Settlement Price Valid",
      description: "Average and settlement prices must be valid when present.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "price"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        for (const field of ["averagePrice", "avgPrice", "settlementPrice", "settlement"] as const) {
          const value = readNumber(ctx.data, [field]);
          if (value === undefined) continue;
          if (!Number.isFinite(value) || !(value > 0)) {
            return marketFail({
              message: `${field} is invalid.`,
              recommendation: "Replace with exchange-published settlement/average.",
              field,
              expected: "finite > 0",
              actual: value,
            });
          }
        }
        return marketPass();
      },
    },
    {
      id: "price.circuit_bounds_present",
      name: "Circuit Bounds Present Validity",
      description: "Upper/lower circuit values must be valid when present.",
      category: "PRICE",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "price", "circuit"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const upper = readNumber(ctx.data, [
          "upperCircuit",
          "upper_circuit",
          "priceBandUpper",
        ]);
        const lower = readNumber(ctx.data, [
          "lowerCircuit",
          "lower_circuit",
          "priceBandLower",
        ]);
        if (upper !== undefined && (!(upper > 0) || !Number.isFinite(upper))) {
          return marketFail({
            message: "Upper circuit is invalid.",
            recommendation: "Reload exchange circuit band file.",
            field: "upperCircuit",
            expected: "finite > 0",
            actual: upper,
          });
        }
        if (lower !== undefined && (!(lower > 0) || !Number.isFinite(lower))) {
          return marketFail({
            message: "Lower circuit is invalid.",
            recommendation: "Reload exchange circuit band file.",
            field: "lowerCircuit",
            expected: "finite > 0",
            actual: lower,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.currency_supported",
      name: "Currency Supported",
      description: "Quote currency must be in the supported set.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "price", "currency"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        if (!("currency" in ctx.data)) return marketPass();
        const currency = readString(ctx.data, ["currency", "ccy"]);
        const config = configFromContext(ctx);
        if (!currency || !config.supportedCurrencies.includes(currency.toUpperCase())) {
          return marketFail({
            message: "Currency is missing or unsupported.",
            recommendation: "Map provider currency codes to the supported list.",
            field: "currency",
            expected: config.supportedCurrencies,
            actual: currency ?? null,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.exchange_exists",
      name: "Exchange Exists",
      description: "Exchange must be a known venue when provided.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "price", "exchange"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        if (!("exchange" in ctx.data)) return marketPass();
        const exchange = readString(ctx.data, ["exchange", "venue"]);
        const config = configFromContext(ctx);
        if (
          !exchange ||
          !config.knownExchanges.map((e) => e.toUpperCase()).includes(exchange.toUpperCase())
        ) {
          return marketFail({
            message: "Exchange is missing or unknown.",
            recommendation: "Normalize exchange codes before ingestion.",
            field: "exchange",
            expected: config.knownExchanges,
            actual: exchange ?? null,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.tick_size",
      name: "Tick Size Valid",
      description: "Tick size must be within configured bounds.",
      category: "PRICE",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "price", "tick"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        if (!("tickSize" in ctx.data) && !("tick" in ctx.data)) return marketPass();
        const tick = readNumber(ctx.data, ["tickSize", "tick"]);
        const config = configFromContext(ctx);
        if (
          tick === undefined ||
          tick < config.minTickSize ||
          tick > config.maxTickSize
        ) {
          return marketFail({
            message: "Tick size is outside configured limits.",
            recommendation: "Use exchange tick-size table for the symbol.",
            field: "tickSize",
            expected: { min: config.minTickSize, max: config.maxTickSize },
            actual: tick ?? null,
          });
        }
        return marketPass();
      },
    },
    {
      id: "price.tick_alignment",
      name: "Tick Alignment Valid",
      description: "Price must align to tick size when both are present.",
      category: "PRICE",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["market", "price", "tick"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return marketPass();
        const tick = readNumber(ctx.data, ["tickSize", "tick"]);
        const price = readNumber(ctx.data, ["price", "last", "ltp", "close"]);
        if (tick === undefined || price === undefined) return marketPass();
        if (!alignedToTick(price, tick)) {
          return marketFail({
            message: "Price is not aligned to tick size.",
            recommendation: "Round price to the nearest valid tick.",
            field: "price",
            expected: `multiple of ${tick}`,
            actual: price,
          });
        }
        return marketPass();
      },
    },
  ];
}
