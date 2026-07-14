/**
 * Institutional Market Data Validation — unit tests (Prompt 9F.3).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerMarketRules,
  resetMarketRuleRegistrationState,
  resetMarketValidationMetrics,
  getMarketValidationMetrics,
  validateMarketData,
  validateOHLC,
  validateQuote,
  validateVolume,
  validateCorporateAdjustments,
  buildMarketRules,
  DEFAULT_MARKET_VALIDATION_CONFIG,
} from "./index";

function weekdayTs(hour = 10, minute = 0): string {
  // Fixed Monday 2024-06-03 in IST-friendly UTC morning
  return new Date(Date.UTC(2024, 5, 3, hour - 5, minute - 30)).toISOString();
}

describe("Market rule registration", () => {
  beforeEach(() => {
    resetMarketRuleRegistrationState();
    resetMarketValidationMetrics();
  });

  it("registers market rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerMarketRules({ engine });
    expect(first.registered).toBeGreaterThan(10);
    const second = registerMarketRules({ engine });
    expect(second.registered).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
    expect(buildMarketRules().length).toBe(first.total);
  });

  it("exposes configurable defaults", () => {
    expect(DEFAULT_MARKET_VALIDATION_CONFIG.maxOvernightGapPct).toBeGreaterThan(
      0
    );
    expect(DEFAULT_MARKET_VALIDATION_CONFIG.supportedIntervalsMinutes).toContain(
      15
    );
  });
});

describe("Normal datasets", () => {
  beforeEach(() => {
    resetMarketRuleRegistrationState();
    resetMarketValidationMetrics();
  });

  it("approves a clean quote", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const result = await validateQuote(
      {
        symbol: "RELIANCE",
        exchange: "NSE",
        currency: "INR",
        price: 2800,
        bid: 2799,
        ask: 2801,
        previousClose: 2780,
        volume: 100000,
        tickSize: 0.05,
        timestamp: weekdayTs(10, 30),
      },
      { engine, metadata: { exchange: "NSE" } }
    );
    expect(result.failedRules.filter((id) => id.startsWith("price."))).toEqual(
      []
    );
  });

  it("approves clean OHLC candles", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const result = await validateOHLC(
      [
        {
          open: 100,
          high: 105,
          low: 99,
          close: 104,
          volume: 1000,
          timestamp: weekdayTs(10, 0),
          interval: "15",
        },
        {
          open: 104,
          high: 106,
          low: 103,
          close: 105,
          volume: 1200,
          timestamp: weekdayTs(10, 15),
          interval: "15",
        },
      ],
      { engine, metadata: { allowWeekend: true, intervalMinutes: 15 } }
    );
    expect(result.failedRules).not.toContain("ohlc.relationships");
    expect(result.failedRules).not.toContain("timestamp.no_duplicates");
  });
});

describe("Corrupted / missing fields", () => {
  beforeEach(() => {
    resetMarketRuleRegistrationState();
  });

  it("rejects NaN and non-positive prices", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const nanResult = await validateQuote(
      { symbol: "X", price: Number.NaN, exchange: "NSE", currency: "INR" },
      { engine }
    );
    expect(nanResult.failedRules).toContain("price.finite");

    const neg = await validateQuote(
      { symbol: "X", price: -10, exchange: "NSE", currency: "INR" },
      { engine }
    );
    expect(neg.failedRules).toContain("price.positive");
  });

  it("rejects crossed bid/ask", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const result = await validateQuote(
      {
        symbol: "X",
        price: 100,
        bid: 101,
        ask: 99,
        exchange: "NSE",
        currency: "INR",
      },
      { engine }
    );
    expect(result.failedRules).toContain("price.bid_ask");
    const fail = result.results.find((r) => r.ruleId === "price.bid_ask");
    expect(fail?.outcome?.message).toContain("Recommendation:");
  });
});

describe("Invalid OHLC", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("rejects high < low and open outside range", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const result = await validateOHLC(
      {
        open: 110,
        high: 100,
        low: 105,
        close: 108,
        volume: 10,
        timestamp: weekdayTs(),
      },
      { engine, metadata: { allowWeekend: true } }
    );
    expect(result.failedRules).toContain("ohlc.relationships");
    expect(result.terminatedEarly).toBe(true);
  });
});

describe("Duplicate timestamps", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("rejects duplicate timestamps", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const ts = weekdayTs(11, 0);
    const result = await validateOHLC(
      [
        { open: 1, high: 2, low: 1, close: 1.5, volume: 1, timestamp: ts },
        { open: 1.5, high: 2, low: 1.4, close: 1.8, volume: 2, timestamp: ts },
      ],
      { engine, metadata: { allowWeekend: true } }
    );
    expect(result.failedRules).toContain("timestamp.no_duplicates");
  });
});

describe("Invalid circuits", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("rejects upper <= lower and prices outside bands", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const badBand = await validateQuote(
      {
        symbol: "X",
        price: 100,
        upperCircuit: 90,
        lowerCircuit: 110,
        exchange: "NSE",
        currency: "INR",
      },
      { engine }
    );
    expect(badBand.failedRules).toContain("circuit.upper_gt_lower");

    const outside = await validateQuote(
      {
        symbol: "X",
        price: 200,
        upperCircuit: 150,
        lowerCircuit: 100,
        exchange: "NSE",
        currency: "INR",
      },
      { engine }
    );
    expect(outside.failedRules).toContain("circuit.ohlc_within_limits");
  });
});

describe("Corporate actions", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("detects split ratio mismatch and dividend chronology errors", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });

    const split = await validateCorporateAdjustments(
      {
        type: "SPLIT",
        ratio: 3,
        numerator: 2,
        denominator: 1,
        symbol: "X",
      },
      { engine }
    );
    expect(split.failedRules).toContain("corp.split_ratio");

    const div = await validateCorporateAdjustments(
      {
        type: "DIVIDEND",
        amount: 5,
        exDate: "2024-06-10",
        payDate: "2024-06-01",
      },
      { engine }
    );
    expect(div.failedRules).toContain("corp.dividend_adjustment");
  });
});

describe("Gap detection", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("marks large overnight gaps as warnings by default", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const day1 = Date.UTC(2024, 5, 3, 10, 0);
    const day2 = Date.UTC(2024, 5, 4, 10, 0);
    const result = await validateOHLC(
      [
        {
          open: 100,
          high: 101,
          low: 99,
          close: 100,
          volume: 1,
          timestamp: new Date(day1).toISOString(),
        },
        {
          open: 130,
          high: 131,
          low: 129,
          close: 130,
          volume: 1,
          timestamp: new Date(day2).toISOString(),
        },
      ],
      { engine, metadata: { allowWeekend: true } }
    );
    expect(result.failedRules).toContain("gap.overnight");
    expect(result.terminatedEarly).toBe(false);
  });
});

describe("Volume anomalies", () => {
  beforeEach(() => resetMarketRuleRegistrationState());

  it("rejects negative volume and delivery > total", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const neg = await validateVolume(
      { volume: -1 },
      { engine, datasetType: "STOCK_QUOTE" }
    );
    expect(neg.failedRules).toContain("volume.non_negative");

    const delivery = await validateVolume(
      { volume: 100, deliveryVolume: 150 },
      { engine, datasetType: "STOCK_QUOTE" }
    );
    expect(delivery.failedRules).toContain("volume.delivery_lte_total");
  });

  it("detects volume spikes", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    const candles = Array.from({ length: 6 }, (_, i) => ({
      open: 10,
      high: 11,
      low: 9,
      close: 10,
      volume: i === 5 ? 100000 : 100,
      timestamp: new Date(Date.UTC(2024, 5, 3 + i, 10)).toISOString(),
    }));
    const result = await validateVolume(candles, {
      engine,
      datasetType: "OHLC_CANDLE",
    });
    expect(result.failedRules).toContain("volume.spike");
  });
});

describe("Market metrics and validateMarketData", () => {
  beforeEach(() => {
    resetMarketRuleRegistrationState();
    resetMarketValidationMetrics();
  });

  it("tracks validation metrics", async () => {
    const engine = new RuleEngine();
    registerMarketRules({ engine });
    await validateMarketData(
      { symbol: "X", price: -1, exchange: "NSE", currency: "INR" },
      { engine, datasetType: "STOCK_QUOTE" }
    );
    const metrics = getMarketValidationMetrics();
    expect(metrics.marketDatasetsValidated).toBe(1);
    expect(metrics.averageExecutionTime).toBeGreaterThanOrEqual(0);
  });
});
