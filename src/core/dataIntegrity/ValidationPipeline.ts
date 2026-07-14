/**
 * Institutional Data Integrity Engine — modular validation pipeline.
 *
 * Flow: Schema → Null → Type → Range → Logical → Timestamp → Duplicate
 * → Score → Report → Approved Dataset
 *
 * CRITICAL failures terminate immediately.
 */

import type { IntegrityConfig } from "./IntegrityConfig";
import { createIssue, buildIntegrityResult } from "./IntegrityResult";
import type { IntegrityRuleRegistry } from "./IntegrityRuleRegistry";
import type { IntegrityLogger } from "./IntegrityLogger";
import type {
  DatasetType,
  IntegrityIssue,
  IntegrityResult,
  IntegrityRule,
  RuleValidationOutcome,
  ValidationContext,
} from "./IntegrityTypes";

export interface PipelineRunInput {
  data: unknown;
  datasetType: DatasetType;
  dataSource: string;
  config: IntegrityConfig;
  metadata?: Record<string, unknown>;
  registry: IntegrityRuleRegistry;
  logger: IntegrityLogger;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readNumber(
  obj: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    if (key in obj && isFiniteNumber(obj[key])) {
      return obj[key] as number;
    }
  }
  return undefined;
}

function readString(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) {
      return v;
    }
  }
  return undefined;
}

function asRecordArray(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) {
    return data.filter(isPlainObject) as Record<string, unknown>[];
  }
  if (isPlainObject(data) && Array.isArray(data.items)) {
    return (data.items as unknown[]).filter(isPlainObject) as Record<
      string,
      unknown
    >[];
  }
  if (isPlainObject(data) && Array.isArray(data.candles)) {
    return (data.candles as unknown[]).filter(isPlainObject) as Record<
      string,
      unknown
    >[];
  }
  if (isPlainObject(data) && Array.isArray(data.data)) {
    return (data.data as unknown[]).filter(isPlainObject) as Record<
      string,
      unknown
    >[];
  }
  return null;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Built-in foundational rules — generic, registry-driven. */
export function createBuiltInRules(): IntegrityRule[] {
  const createdAt = nowIso();

  const schemaPayload: IntegrityRule = {
    id: "schema.payload.exists",
    name: "Payload Exists",
    description: "Reject missing, null, or undefined payloads.",
    category: "SCHEMA",
    ruleLevel: "CRITICAL",
    priority: 1,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      if (ctx.data === null || ctx.data === undefined) {
        return {
          passed: false,
          message: "Missing object: payload is null or undefined.",
          actual: ctx.data,
        };
      }
      return { passed: true };
    },
  };

  const schemaStructure: IntegrityRule = {
    id: "schema.structure.valid",
    name: "Schema Structure",
    description: "Reject corrupted or unknown top-level structures.",
    category: "SCHEMA",
    ruleLevel: "CRITICAL",
    priority: 2,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const { data } = ctx;
      if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
        return {
          passed: false,
          message: "Unexpected schema: expected object or array payload.",
          actual: typeof data,
        };
      }
      if (typeof data === "function" || typeof data === "symbol") {
        return {
          passed: false,
          message: "Corrupted payload: unsupported JavaScript type.",
          actual: typeof data,
        };
      }
      return { passed: true };
    },
  };

  const nullSymbol: IntegrityRule = {
    id: "null.symbol",
    name: "Null Symbol Check",
    description: "Detect null or empty symbol fields when present.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 10,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: [
      "STOCK_QUOTE",
      "OHLC_CANDLE",
      "INTRADAY_CANDLE",
      "TECHNICAL_INDICATOR",
      "FUNDAMENTAL_DATA",
      "PORTFOLIO_POSITION",
      "WATCHLIST_ITEM",
      "NEWS",
      "CORPORATE_ACTION",
      "DIVIDEND",
      "SPLIT",
      "BONUS",
    ],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      if (!("symbol" in ctx.data) && !("ticker" in ctx.data)) {
        return { passed: true };
      }
      const symbol = readString(ctx.data, ["symbol", "ticker"]);
      if (!symbol) {
        return {
          passed: false,
          message: "Null symbol: symbol/ticker is null, empty, or missing.",
          field: "symbol",
          actual: ctx.data.symbol ?? ctx.data.ticker,
        };
      }
      return { passed: true };
    },
  };

  const nullExchange: IntegrityRule = {
    id: "null.exchange",
    name: "Null Exchange Check",
    description: "Detect null exchange when the field is present.",
    category: "NULL",
    ruleLevel: "WARNING",
    priority: 11,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      if (!("exchange" in ctx.data)) return { passed: true };
      const exchange = readString(ctx.data, ["exchange"]);
      if (!exchange) {
        return {
          passed: false,
          message: "Null exchange: exchange is null or empty.",
          field: "exchange",
          actual: ctx.data.exchange,
        };
      }
      return { passed: true };
    },
  };

  const nullTimestamp: IntegrityRule = {
    id: "null.timestamp",
    name: "Null Timestamp Check",
    description: "Detect null timestamps on time-series payloads.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 12,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: [
      "STOCK_QUOTE",
      "OHLC_CANDLE",
      "INTRADAY_CANDLE",
      "NEWS",
      "CORPORATE_ACTION",
      "DIVIDEND",
      "SPLIT",
      "BONUS",
      "HISTORICAL_DATASET",
      "BACKTEST_DATASET",
    ],
    validate: (ctx): RuleValidationOutcome => {
      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (
            !("timestamp" in row) &&
            !("time" in row) &&
            !("date" in row) &&
            !("datetime" in row)
          ) {
            continue;
          }
          const ts =
            row.timestamp ?? row.time ?? row.date ?? row.datetime ?? null;
          if (ts === null || ts === undefined || ts === "") {
            return {
              passed: false,
              message: `Null timestamp at index ${i}.`,
              field: "timestamp",
              path: `[${i}].timestamp`,
              actual: ts,
            };
          }
        }
        return { passed: true };
      }
      if (!isPlainObject(ctx.data)) return { passed: true };
      if (
        !("timestamp" in ctx.data) &&
        !("time" in ctx.data) &&
        !("date" in ctx.data) &&
        !("datetime" in ctx.data)
      ) {
        return { passed: true };
      }
      const ts =
        ctx.data.timestamp ??
        ctx.data.time ??
        ctx.data.date ??
        ctx.data.datetime ??
        null;
      if (ts === null || ts === undefined || ts === "") {
        return {
          passed: false,
          message: "Null timestamp: timestamp field is null or empty.",
          field: "timestamp",
          actual: ts,
        };
      }
      return { passed: true };
    },
  };

  const nullPrice: IntegrityRule = {
    id: "null.price",
    name: "Null Price Check",
    description: "Detect null price on quote-like payloads.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 13,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["STOCK_QUOTE", "PORTFOLIO_POSITION", "WATCHLIST_ITEM"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      if (
        !("price" in ctx.data) &&
        !("last" in ctx.data) &&
        !("close" in ctx.data)
      ) {
        return { passed: true };
      }
      const price = ctx.data.price ?? ctx.data.last ?? ctx.data.close;
      if (price === null || price === undefined) {
        return {
          passed: false,
          message: "Null price: price/last/close is null.",
          field: "price",
          actual: price,
        };
      }
      return { passed: true };
    },
  };

  const nullOhlc: IntegrityRule = {
    id: "null.ohlc",
    name: "Null OHLC Check",
    description: "Detect null OHLC values on candle payloads.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 14,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
    validate: (ctx): RuleValidationOutcome => {
      const checkRow = (
        row: Record<string, unknown>,
        path: string
      ): RuleValidationOutcome | null => {
        for (const field of ["open", "high", "low", "close"] as const) {
          if (!(field in row)) continue;
          if (row[field] === null || row[field] === undefined) {
            return {
              passed: false,
              message: `Null OHLC value: ${field} is null.`,
              field,
              path: `${path}.${field}`,
              actual: row[field],
            };
          }
        }
        return null;
      };

      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = checkRow(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return checkRow(ctx.data, "$") ?? { passed: true };
      }
      return { passed: true };
    },
  };

  const nullVolume: IntegrityRule = {
    id: "null.volume",
    name: "Null Volume Check",
    description: "Detect null volume when the field is present.",
    category: "NULL",
    ruleLevel: "WARNING",
    priority: 15,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const check = (
        row: Record<string, unknown>,
        path: string
      ): RuleValidationOutcome | null => {
        if (!("volume" in row)) return null;
        if (row.volume === null || row.volume === undefined) {
          return {
            passed: false,
            message: "Null volume: volume is null.",
            field: "volume",
            path: `${path}.volume`,
            actual: row.volume,
          };
        }
        return null;
      };
      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = check(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return check(ctx.data, "$") ?? { passed: true };
      }
      return { passed: true };
    },
  };

  const nullIndicators: IntegrityRule = {
    id: "null.indicators",
    name: "Null Indicators Check",
    description: "Detect null technical indicator values.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 16,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["TECHNICAL_INDICATOR"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      const values = ctx.data.values ?? ctx.data.indicators ?? ctx.data;
      if (!isPlainObject(values) && !Array.isArray(values)) {
        return { passed: true };
      }
      if (isPlainObject(values)) {
        for (const [key, val] of Object.entries(values)) {
          if (val === null || val === undefined) {
            return {
              passed: false,
              message: `Null indicator: ${key} is null.`,
              field: key,
              actual: val,
            };
          }
        }
      }
      return { passed: true };
    },
  };

  const nullFundamentals: IntegrityRule = {
    id: "null.fundamentals",
    name: "Null Fundamentals Check",
    description: "Detect null fundamental metric sections.",
    category: "NULL",
    ruleLevel: "ERROR",
    priority: 17,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) {
        return {
          passed: false,
          message: "Null fundamentals: expected object payload.",
          actual: ctx.data,
        };
      }
      return { passed: true };
    },
  };

  const typePrimitives: IntegrityRule = {
    id: "type.primitives",
    name: "Primitive Type Validation",
    description: "Reject NaN, Infinity, and undefined numeric values.",
    category: "TYPE",
    ruleLevel: "ERROR",
    priority: 20,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const visit = (
        value: unknown,
        path: string
      ): RuleValidationOutcome | null => {
        if (value === undefined) {
          return {
            passed: false,
            message: `Undefined value at ${path}.`,
            path,
            actual: undefined,
          };
        }
        if (typeof value === "number") {
          if (Number.isNaN(value)) {
            return {
              passed: false,
              message: `NaN rejected at ${path}.`,
              path,
              actual: value,
            };
          }
          if (!Number.isFinite(value)) {
            return {
              passed: false,
              message: `Infinity rejected at ${path}.`,
              path,
              actual: value,
            };
          }
        }
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const fail = visit(value[i], `${path}[${i}]`);
            if (fail) return fail;
          }
        } else if (isPlainObject(value)) {
          for (const [k, v] of Object.entries(value)) {
            const fail = visit(v, path === "$" ? k : `${path}.${k}`);
            if (fail) return fail;
          }
        }
        return null;
      };
      return visit(ctx.data, "$") ?? { passed: true };
    },
  };

  const rangeOhlc: IntegrityRule = {
    id: "range.ohlc",
    name: "OHLC Range Validation",
    description: "Validate High/Low relationships and open/close bounds.",
    category: "RANGE",
    ruleLevel: "CRITICAL",
    priority: 30,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
    validate: (ctx): RuleValidationOutcome => {
      const check = (
        row: Record<string, unknown>,
        path: string
      ): RuleValidationOutcome | null => {
        const open = readNumber(row, ["open", "o"]);
        const high = readNumber(row, ["high", "h"]);
        const low = readNumber(row, ["low", "l"]);
        const close = readNumber(row, ["close", "c"]);
        if (
          open === undefined ||
          high === undefined ||
          low === undefined ||
          close === undefined
        ) {
          return null;
        }
        if (high < low) {
          return {
            passed: false,
            message: `High < Low at ${path}.`,
            path,
            expected: "high >= low",
            actual: { high, low },
          };
        }
        if (open > high || open < low) {
          return {
            passed: false,
            message: `Open outside High/Low range at ${path}.`,
            path,
            field: "open",
            actual: { open, high, low },
          };
        }
        if (close > high || close < low) {
          return {
            passed: false,
            message: `Close outside High/Low range at ${path}.`,
            path,
            field: "close",
            actual: { close, high, low },
          };
        }
        return null;
      };

      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = check(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return check(ctx.data, "$") ?? { passed: true };
      }
      return { passed: true };
    },
  };

  const rangeVolume: IntegrityRule = {
    id: "range.volume.non_negative",
    name: "Non-Negative Volume",
    description: "Reject negative volume.",
    category: "RANGE",
    ruleLevel: "ERROR",
    priority: 31,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const check = (
        row: Record<string, unknown>,
        path: string
      ): RuleValidationOutcome | null => {
        const volume = readNumber(row, ["volume", "v"]);
        if (volume === undefined) return null;
        if (volume < 0) {
          return {
            passed: false,
            message: `Negative volume at ${path}.`,
            field: "volume",
            path,
            actual: volume,
          };
        }
        return null;
      };
      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = check(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return check(ctx.data, "$") ?? { passed: true };
      }
      return { passed: true };
    },
  };

  const rangeFundamentals: IntegrityRule = {
    id: "range.fundamentals",
    name: "Fundamental Range Validation",
    description:
      "Validate market cap, cash, revenue, equity, PE, PB, dividend yield bounds.",
    category: "RANGE",
    ruleLevel: "ERROR",
    priority: 32,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["FUNDAMENTAL_DATA", "FINANCIAL_STATEMENT", "STOCK_QUOTE"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      const limits = ctx.config.getRangeLimits();
      const allowNegativeEquity = ctx.config.get().allowNegativeEquity;

      const marketCap = readNumber(ctx.data, ["marketCap", "market_cap"]);
      if (marketCap !== undefined) {
        if (marketCap < limits.marketCapMin || marketCap > limits.marketCapMax) {
          return {
            passed: false,
            message: "Market Cap outside configured limits.",
            field: "marketCap",
            expected: { min: limits.marketCapMin, max: limits.marketCapMax },
            actual: marketCap,
          };
        }
        if (marketCap < 0) {
          return {
            passed: false,
            message: "Negative Market Cap is impossible.",
            field: "marketCap",
            actual: marketCap,
          };
        }
      }

      const cash = readNumber(ctx.data, ["cash", "cashAndEquivalents"]);
      if (cash !== undefined && cash < 0) {
        return {
          passed: false,
          message: "Negative Cash is invalid.",
          field: "cash",
          actual: cash,
        };
      }

      const revenue = readNumber(ctx.data, ["revenue", "totalRevenue"]);
      if (revenue !== undefined && revenue < 0) {
        return {
          passed: false,
          message: "Negative Revenue is invalid.",
          field: "revenue",
          actual: revenue,
        };
      }

      const equity = readNumber(ctx.data, [
        "equity",
        "shareholdersEquity",
        "bookValue",
      ]);
      if (equity !== undefined && equity < 0 && !allowNegativeEquity) {
        return {
          passed: false,
          message:
            "Negative Equity rejected (set allowNegativeEquity to support).",
          field: "equity",
          actual: equity,
        };
      }

      const pe = readNumber(ctx.data, ["pe", "peRatio", "trailingPE"]);
      if (pe !== undefined && (pe < limits.peMin || pe > limits.peMax)) {
        return {
          passed: false,
          message: "PE unrealistic relative to configured limits.",
          field: "pe",
          expected: { min: limits.peMin, max: limits.peMax },
          actual: pe,
        };
      }

      const pb = readNumber(ctx.data, ["pb", "pbRatio", "priceToBook"]);
      if (pb !== undefined && (pb < limits.pbMin || pb > limits.pbMax)) {
        return {
          passed: false,
          message: "PB invalid relative to configured limits.",
          field: "pb",
          expected: { min: limits.pbMin, max: limits.pbMax },
          actual: pb,
        };
      }

      const dy = readNumber(ctx.data, [
        "dividendYield",
        "dividend_yield",
        "yield",
      ]);
      if (
        dy !== undefined &&
        (dy < limits.dividendYieldMin || dy > limits.dividendYieldMax)
      ) {
        return {
          passed: false,
          message: "Dividend Yield impossible relative to configured limits.",
          field: "dividendYield",
          expected: {
            min: limits.dividendYieldMin,
            max: limits.dividendYieldMax,
          },
          actual: dy,
        };
      }

      return { passed: true };
    },
  };

  const rangeIndicators: IntegrityRule = {
    id: "range.indicators",
    name: "Technical Indicator Range Validation",
    description: "Validate RSI, ATR, ADX, MACD, EMA bounds.",
    category: "RANGE",
    ruleLevel: "ERROR",
    priority: 33,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["TECHNICAL_INDICATOR"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      const limits = ctx.config.getRangeLimits();
      const src = isPlainObject(ctx.data.values)
        ? (ctx.data.values as Record<string, unknown>)
        : ctx.data;

      const rsi = readNumber(src, ["rsi", "RSI"]);
      if (rsi !== undefined && (rsi < limits.rsiMin || rsi > limits.rsiMax)) {
        return {
          passed: false,
          message: `RSI out of range (${limits.rsiMin}-${limits.rsiMax}).`,
          field: "rsi",
          actual: rsi,
        };
      }

      const adx = readNumber(src, ["adx", "ADX"]);
      if (adx !== undefined && (adx < limits.adxMin || adx > limits.adxMax)) {
        return {
          passed: false,
          message: `ADX out of range (${limits.adxMin}-${limits.adxMax}).`,
          field: "adx",
          actual: adx,
        };
      }

      const atr = readNumber(src, ["atr", "ATR"]);
      if (atr !== undefined && atr < limits.atrMin) {
        return {
          passed: false,
          message: "ATR negative or below configured minimum.",
          field: "atr",
          actual: atr,
        };
      }

      const ema = readNumber(src, ["ema", "EMA"]);
      if (ema !== undefined && !Number.isFinite(ema)) {
        return {
          passed: false,
          message: "EMA infinite or non-finite.",
          field: "ema",
          actual: ema,
        };
      }

      const macd = src.macd ?? src.MACD;
      if (macd !== undefined && macd !== null) {
        if (typeof macd === "number" && !Number.isFinite(macd)) {
          return {
            passed: false,
            message: "MACD invalid (non-finite).",
            field: "macd",
            actual: macd,
          };
        }
        if (isPlainObject(macd)) {
          for (const key of ["macd", "signal", "histogram", "value"]) {
            const v = macd[key];
            if (typeof v === "number" && !Number.isFinite(v)) {
              return {
                passed: false,
                message: `MACD invalid at ${key}.`,
                field: `macd.${key}`,
                actual: v,
              };
            }
          }
        }
      }

      return { passed: true };
    },
  };

  const logicalOhlc: IntegrityRule = {
    id: "logical.ohlc.consistency",
    name: "OHLC Logical Consistency",
    description:
      "Open/Close between High/Low; High >= Open/Close; Low <= Open/Close.",
    category: "LOGICAL",
    ruleLevel: "ERROR",
    priority: 40,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["OHLC_CANDLE", "INTRADAY_CANDLE", "HISTORICAL_DATASET"],
    validate: (ctx): RuleValidationOutcome => {
      const check = (
        row: Record<string, unknown>,
        path: string
      ): RuleValidationOutcome | null => {
        const open = readNumber(row, ["open", "o"]);
        const high = readNumber(row, ["high", "h"]);
        const low = readNumber(row, ["low", "l"]);
        const close = readNumber(row, ["close", "c"]);
        if (
          open === undefined ||
          high === undefined ||
          low === undefined ||
          close === undefined
        ) {
          return null;
        }
        if (!(high >= open && high >= close)) {
          return {
            passed: false,
            message: `High must be >= Open and Close at ${path}.`,
            path,
            actual: { open, high, close },
          };
        }
        if (!(low <= open && low <= close)) {
          return {
            passed: false,
            message: `Low must be <= Open and Close at ${path}.`,
            path,
            actual: { open, low, close },
          };
        }
        return null;
      };
      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = check(rows[i], `[${i}]`);
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return check(ctx.data, "$") ?? { passed: true };
      }
      return { passed: true };
    },
  };

  const logicalDelivery: IntegrityRule = {
    id: "logical.delivery_volume",
    name: "Delivery Volume Consistency",
    description: "Delivery volume must be <= total volume.",
    category: "LOGICAL",
    ruleLevel: "ERROR",
    priority: 41,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };
      const delivery = readNumber(ctx.data, [
        "deliveryVolume",
        "delivery_volume",
      ]);
      const volume = readNumber(ctx.data, ["volume", "totalVolume"]);
      if (delivery === undefined || volume === undefined) return { passed: true };
      if (delivery > volume) {
        return {
          passed: false,
          message: "Delivery Volume exceeds Total Volume.",
          field: "deliveryVolume",
          expected: `<= ${volume}`,
          actual: delivery,
        };
      }
      return { passed: true };
    },
  };

  const logicalCorporateAction: IntegrityRule = {
    id: "logical.corporate_action",
    name: "Corporate Action Consistency",
    description: "Validate split ratio and dividend date consistency.",
    category: "LOGICAL",
    ruleLevel: "ERROR",
    priority: 42,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["CORPORATE_ACTION", "DIVIDEND", "SPLIT", "BONUS"],
    validate: (ctx): RuleValidationOutcome => {
      if (!isPlainObject(ctx.data)) return { passed: true };

      if (ctx.datasetType === "SPLIT" || ctx.data.type === "SPLIT") {
        const ratio = readNumber(ctx.data, ["ratio", "splitRatio"]);
        const numerator = readNumber(ctx.data, ["numerator", "fromFactor"]);
        const denominator = readNumber(ctx.data, ["denominator", "toFactor"]);
        if (ratio !== undefined && ratio <= 0) {
          return {
            passed: false,
            message: "Split ratio must be positive.",
            field: "ratio",
            actual: ratio,
          };
        }
        if (
          numerator !== undefined &&
          denominator !== undefined &&
          (numerator <= 0 || denominator <= 0)
        ) {
          return {
            passed: false,
            message: "Split ratio factors must be positive.",
            actual: { numerator, denominator },
          };
        }
      }

      if (ctx.datasetType === "DIVIDEND" || ctx.data.type === "DIVIDEND") {
        const exDate = parseTimestamp(
          ctx.data.exDate ?? ctx.data.ex_date ?? ctx.data.exDividendDate
        );
        const payDate = parseTimestamp(
          ctx.data.payDate ?? ctx.data.pay_date ?? ctx.data.paymentDate
        );
        if (exDate !== null && payDate !== null && payDate < exDate) {
          return {
            passed: false,
            message: "Dividend pay date cannot precede ex-date.",
            field: "payDate",
            actual: { exDate, payDate },
          };
        }
        const amount = readNumber(ctx.data, ["amount", "dividend", "value"]);
        if (amount !== undefined && amount < 0) {
          return {
            passed: false,
            message: "Dividend amount cannot be negative.",
            field: "amount",
            actual: amount,
          };
        }
      }

      return { passed: true };
    },
  };

  const logicalStatementChronology: IntegrityRule = {
    id: "logical.statement.chronology",
    name: "Financial Statement Chronology",
    description: "Reject out-of-order financial statement periods.",
    category: "LOGICAL",
    ruleLevel: "WARNING",
    priority: 43,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["FINANCIAL_STATEMENT", "FUNDAMENTAL_DATA"],
    validate: (ctx): RuleValidationOutcome => {
      const rows = asRecordArray(ctx.data);
      if (!rows || rows.length < 2) return { passed: true };
      let prev: number | null = null;
      for (let i = 0; i < rows.length; i++) {
        const ts = parseTimestamp(
          rows[i].periodEnd ??
            rows[i].date ??
            rows[i].fiscalDate ??
            rows[i].timestamp
        );
        if (ts === null) continue;
        if (prev !== null && ts < prev) {
          return {
            passed: false,
            message: `Financial statement chronology broken at index ${i}.`,
            path: `[${i}]`,
            actual: { previous: prev, current: ts },
          };
        }
        prev = ts;
      }
      return { passed: true };
    },
  };

  const timestampFuture: IntegrityRule = {
    id: "timestamp.not_future",
    name: "Future Timestamp Check",
    description: "Reject timestamps far in the future.",
    category: "TIMESTAMP",
    ruleLevel: "ERROR",
    priority: 50,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const skewMs = 5 * 60 * 1000;
      const now = Date.now() + skewMs;
      const check = (
        value: unknown,
        path: string
      ): RuleValidationOutcome | null => {
        const ts = parseTimestamp(value);
        if (ts === null) return null;
        if (ts > now) {
          return {
            passed: false,
            message: `Future timestamp at ${path}.`,
            path,
            actual: value,
          };
        }
        return null;
      };

      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const fail = check(
            row.timestamp ?? row.time ?? row.date ?? row.datetime,
            `[${i}].timestamp`
          );
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return (
          check(
            ctx.data.timestamp ??
              ctx.data.time ??
              ctx.data.date ??
              ctx.data.datetime,
            "timestamp"
          ) ?? { passed: true }
        );
      }
      return { passed: true };
    },
  };

  const timestampDuplicates: IntegrityRule = {
    id: "timestamp.no_duplicates",
    name: "Duplicate Timestamp Check",
    description: "Detect duplicate timestamps in series data.",
    category: "TIMESTAMP",
    ruleLevel: "WARNING",
    priority: 51,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: [
      "OHLC_CANDLE",
      "INTRADAY_CANDLE",
      "HISTORICAL_DATASET",
      "BACKTEST_DATASET",
    ],
    validate: (ctx): RuleValidationOutcome => {
      const rows = asRecordArray(ctx.data);
      if (!rows) return { passed: true };
      const seen = new Set<number>();
      for (let i = 0; i < rows.length; i++) {
        const ts = parseTimestamp(
          rows[i].timestamp ?? rows[i].time ?? rows[i].date ?? rows[i].datetime
        );
        if (ts === null) continue;
        if (seen.has(ts)) {
          return {
            passed: false,
            message: `Duplicate timestamp at index ${i}.`,
            path: `[${i}].timestamp`,
            actual: ts,
          };
        }
        seen.add(ts);
      }
      return { passed: true };
    },
  };

  const timestampWeekend: IntegrityRule = {
    id: "timestamp.weekend_consistency",
    name: "Weekend Consistency",
    description: "Warn on weekend timestamps for equity session datasets.",
    category: "TIMESTAMP",
    ruleLevel: "WARNING",
    priority: 52,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    datasetTypes: ["OHLC_CANDLE", "STOCK_QUOTE"],
    validate: (ctx): RuleValidationOutcome => {
      const allowWeekend = Boolean(ctx.metadata?.allowWeekend);
      if (allowWeekend) return { passed: true };

      const checkTs = (value: unknown, path: string): RuleValidationOutcome | null => {
        const ts = parseTimestamp(value);
        if (ts === null) return null;
        const day = new Date(ts).getUTCDay();
        if (day === 0 || day === 6) {
          return {
            passed: false,
            message: `Weekend timestamp inconsistency at ${path}.`,
            path,
            actual: value,
          };
        }
        return null;
      };

      const rows = asRecordArray(ctx.data);
      if (rows) {
        for (let i = 0; i < rows.length; i++) {
          const fail = checkTs(
            rows[i].timestamp ?? rows[i].time ?? rows[i].date,
            `[${i}].timestamp`
          );
          if (fail) return fail;
        }
        return { passed: true };
      }
      if (isPlainObject(ctx.data)) {
        return (
          checkTs(
            ctx.data.timestamp ?? ctx.data.time ?? ctx.data.date,
            "timestamp"
          ) ?? { passed: true }
        );
      }
      return { passed: true };
    },
  };

  const duplicateRecords: IntegrityRule = {
    id: "duplicate.records",
    name: "Duplicate Record Removal",
    description:
      "Detect and safely remove duplicate candles, quotes, news, and related records.",
    category: "DUPLICATE",
    ruleLevel: "WARNING",
    priority: 60,
    enabled: true,
    version: "1.0.0",
    createdAt,
    updatedAt: createdAt,
    validate: (ctx): RuleValidationOutcome => {
      const fingerprint = (row: Record<string, unknown>): string => {
        const symbol = row.symbol ?? row.ticker ?? "";
        const ts = row.timestamp ?? row.time ?? row.date ?? row.datetime ?? "";
        const id = row.id ?? row.uuid ?? "";
        const open = row.open ?? "";
        const close = row.close ?? "";
        const title = row.title ?? row.headline ?? "";
        return `${symbol}|${ts}|${id}|${open}|${close}|${title}`;
      };

      if (Array.isArray(ctx.data)) {
        const seen = new Set<string>();
        const unique: unknown[] = [];
        let removed = 0;
        for (const item of ctx.data) {
          if (!isPlainObject(item)) {
            unique.push(item);
            continue;
          }
          const key = fingerprint(item);
          if (seen.has(key)) {
            removed += 1;
            continue;
          }
          seen.add(key);
          unique.push(item);
        }
        if (removed > 0) {
          return {
            passed: false,
            message: `Removed ${removed} duplicate record(s).`,
            actual: removed,
            data: unique,
          };
        }
        return { passed: true, data: ctx.data };
      }

      if (isPlainObject(ctx.data)) {
        for (const key of ["items", "candles", "data", "entries"] as const) {
          if (!Array.isArray(ctx.data[key])) continue;
          const arr = ctx.data[key] as unknown[];
          const seen = new Set<string>();
          const unique: unknown[] = [];
          let removed = 0;
          for (const item of arr) {
            if (!isPlainObject(item)) {
              unique.push(item);
              continue;
            }
            const fp = fingerprint(item);
            if (seen.has(fp)) {
              removed += 1;
              continue;
            }
            seen.add(fp);
            unique.push(item);
          }
          if (removed > 0) {
            return {
              passed: false,
              message: `Removed ${removed} duplicate record(s) from ${key}.`,
              field: key,
              actual: removed,
              data: { ...ctx.data, [key]: unique },
            };
          }
        }
      }

      return { passed: true };
    },
  };

  return [
    schemaPayload,
    schemaStructure,
    nullSymbol,
    nullExchange,
    nullTimestamp,
    nullPrice,
    nullOhlc,
    nullVolume,
    nullIndicators,
    nullFundamentals,
    typePrimitives,
    rangeOhlc,
    rangeVolume,
    rangeFundamentals,
    rangeIndicators,
    logicalOhlc,
    logicalDelivery,
    logicalCorporateAction,
    logicalStatementChronology,
    timestampFuture,
    timestampDuplicates,
    timestampWeekend,
    duplicateRecords,
  ];
}

export class ValidationPipeline {
  async run(input: PipelineRunInput): Promise<IntegrityResult> {
    const started = performance.now();
    const { registry, logger, config } = input;
    let currentData = input.data;
    const errors: IntegrityIssue[] = [];
    const warnings: IntegrityIssue[] = [];
    const passedRules: string[] = [];
    const failedRules: string[] = [];
    let terminatedEarly = false;

    logger.logValidationStart({
      datasetType: input.datasetType,
      dataSource: input.dataSource,
    });

    try {
      const rules = registry.getExecutableRules(input.datasetType, (rule) =>
        config.isRuleEnabled(rule.id, rule.enabled)
      );

      logger.logRulesExecuted({
        count: rules.length,
        ruleIds: rules.map((r) => r.id),
      });

      const ctxBase: Omit<ValidationContext, "data"> = {
        datasetType: input.datasetType,
        dataSource: input.dataSource,
        config,
        metadata: input.metadata,
      };

      for (const rule of rules) {
        const ctx: ValidationContext = { ...ctxBase, data: currentData };
        let outcome: RuleValidationOutcome;
        try {
          outcome = await Promise.resolve(rule.validate(ctx));
        } catch (err) {
          outcome = {
            passed: false,
            message: `Rule execution error: ${
              err instanceof Error ? err.message : String(err)
            }`,
          };
        }

        if (outcome.data !== undefined) {
          currentData = outcome.data;
        }

        if (outcome.passed) {
          passedRules.push(rule.id);
          continue;
        }

        failedRules.push(rule.id);
        const issue = createIssue(
          rule.id,
          rule.name,
          rule.category,
          rule.ruleLevel,
          outcome.message ?? `Rule ${rule.id} failed.`,
          {
            field: outcome.field,
            path: outcome.path,
            expected: outcome.expected,
            actual: outcome.actual,
          }
        );

        if (rule.ruleLevel === "INFO" || rule.ruleLevel === "WARNING") {
          warnings.push(issue);
        } else {
          errors.push(issue);
        }

        if (rule.ruleLevel === "CRITICAL") {
          terminatedEarly = true;
          break;
        }
      }

      const executionTime = Math.round((performance.now() - started) * 100) / 100;
      const result = buildIntegrityResult({
        datasetType: input.datasetType,
        dataSource: input.dataSource,
        data: currentData,
        errors,
        warnings,
        passedRules,
        failedRules,
        executionTime,
        terminatedEarly,
        scoreThreshold: config.get().scoreThreshold,
      });

      logger.logFailures({
        count: errors.length,
        failures: errors.map((e) => ({ ruleId: e.ruleId, message: e.message })),
      });
      logger.logWarnings({
        count: warnings.length,
        warnings: warnings.map((w) => ({
          ruleId: w.ruleId,
          message: w.message,
        })),
      });
      logger.logScore({
        integrityScore: result.integrityScore,
        scoreBand: result.scoreBand,
        confidence: result.confidence,
      });
      logger.logValidationEnd({
        datasetType: input.datasetType,
        dataSource: input.dataSource,
        executionTime,
        status: result.status,
      });

      if (result.status === "REJECTED") {
        logger.logRejected(result);
      } else {
        logger.logApproved(result);
      }

      return result;
    } catch (err) {
      const executionTime = Math.round((performance.now() - started) * 100) / 100;
      const message =
        err instanceof Error ? err.message : "Unknown pipeline failure";
      logger.error("Pipeline crashed; returning structured rejection", {
        error: message,
      });

      return buildIntegrityResult({
        datasetType: input.datasetType,
        dataSource: input.dataSource,
        data: currentData,
        errors: [
          createIssue(
            "pipeline.internal",
            "Pipeline Internal Error",
            "SCHEMA",
            "CRITICAL",
            `Validation aborted safely: ${message}`
          ),
        ],
        warnings: [],
        passedRules,
        failedRules: [...failedRules, "pipeline.internal"],
        executionTime,
        terminatedEarly: true,
        scoreThreshold: config.get().scoreThreshold,
      });
    }
  }
}
