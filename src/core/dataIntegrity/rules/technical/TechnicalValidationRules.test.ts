/**
 * Technical Indicator Validation — unit tests (Prompt 9F.4).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../RuleEngine";
import {
  registerTechnicalRules,
  resetTechnicalRuleRegistrationState,
  resetTechnicalValidationMetrics,
  getTechnicalValidationMetrics,
  buildTechnicalRules,
  validateTechnicalIndicators,
  validateRSI,
  validateMACD,
  validateMovingAverages,
  validateBollingerBands,
  validateADX,
  validateATR,
  validateVWAP,
  validateIchimoku,
  DEFAULT_TECHNICAL_VALIDATION_CONFIG,
} from "./index";

describe("Technical rule registration", () => {
  beforeEach(() => {
    resetTechnicalRuleRegistrationState();
    resetTechnicalValidationMetrics();
  });

  it("registers technical rules idempotently", () => {
    const engine = new RuleEngine();
    const first = registerTechnicalRules({ engine });
    expect(first.registered).toBeGreaterThan(10);
    const second = registerTechnicalRules({ engine });
    expect(second.registered).toBe(0);
    expect(buildTechnicalRules().length).toBe(first.total);
    expect(DEFAULT_TECHNICAL_VALIDATION_CONFIG.rsiMax).toBe(100);
  });
});

describe("Valid indicators", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("accepts valid RSI/MACD/MA/BB/ADX/ATR/VWAP/Ichimoku", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });

    expect(
      (await validateRSI({ rsi: 55, period: 14 }, { engine })).failedRules
    ).toEqual([]);

    expect(
      (
        await validateMACD(
          { macd: 1.2, signal: 0.8, histogram: 0.4 },
          { engine }
        )
      ).failedRules
    ).toEqual([]);

    expect(
      (await validateMovingAverages({ sma: 100, ema: 101, period: 20 }, { engine }))
        .failedRules
    ).toEqual([]);

    expect(
      (
        await validateBollingerBands(
          { upper: 110, middle: 100, lower: 90, width: 20 },
          { engine }
        )
      ).failedRules
    ).toEqual([]);

    expect(
      (
        await validateADX(
          { adx: 25, plusDI: 30, minusDI: 18, trend: 1 },
          { engine }
        )
      ).failedRules
    ).toEqual([]);

    expect((await validateATR({ atr: 2.5, period: 14 }, { engine })).failedRules).toEqual(
      []
    );

    expect(
      (await validateVWAP({ vwap: 100, price: 101 }, { engine })).failedRules
    ).toEqual([]);

    expect(
      (
        await validateIchimoku(
          {
            tenkan: 100,
            kijun: 98,
            spanA: 99,
            spanB: 97,
            lagging: 101,
          },
          { engine }
        )
      ).failedRules
    ).toEqual([]);
  });
});

describe("Corrupted calculations", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("rejects NaN / Infinity RSI and MACD", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });

    const nanRsi = await validateRSI({ rsi: Number.NaN }, { engine });
    expect(nanRsi.failedRules).toContain("rsi.exists_numeric");

    const infMacd = await validateMACD(
      { macd: Number.POSITIVE_INFINITY, signal: 1, histogram: Infinity },
      { engine }
    );
    expect(infMacd.failedRules).toContain("macd.components_finite");
  });

  it("rejects RSI outside bounds and MACD histogram mismatch", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });

    const rsi = await validateRSI({ rsi: 150 }, { engine });
    expect(rsi.failedRules).toContain("rsi.bounds");

    const macd = await validateMACD(
      { macd: 2, signal: 1, histogram: 5 },
      { engine }
    );
    expect(macd.failedRules).toContain("macd.histogram_identity");
  });
});

describe("Extreme values and missing periods", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("flags extreme RSI and invalid period", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });
    const extreme = await validateRSI({ rsi: 2, period: 14 }, { engine });
    expect(extreme.failedRules).toContain("rsi.extremes_jumps_continuity");

    const period = await validateRSI({ rsi: 50, period: 1 }, { engine });
    expect(period.failedRules).toContain("rsi.extremes_jumps_continuity");
  });
});

describe("Historical continuity", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("detects frozen indicator series", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });
    const series = Array.from({ length: 10 }, () => ({ value: 42 }));
    const result = await validateTechnicalIndicators(series, { engine });
    expect(
      result.failedRules.some(
        (id) => id === "osc.outliers_frozen" || id === "ind.historical_continuity"
      )
    ).toBe(true);
  });
});

describe("Cross validation", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("warns on RSI/Stochastic disagreement and BB/ATR mismatch", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });

    const cross = await validateTechnicalIndicators(
      { rsi: 85, stochastic: 15 },
      { engine }
    );
    expect(cross.failedRules).toContain("cross.rsi_stochastic");

    const bbAtr = await validateTechnicalIndicators(
      { atr: 1, bollinger: { upper: 200, middle: 100, lower: 0, width: 200 } },
      { engine }
    );
    expect(bbAtr.failedRules).toContain("cross.bb_atr");
  });
});

describe("Multi-timeframe validation", () => {
  beforeEach(() => resetTechnicalRuleRegistrationState());

  it("rejects unsupported timeframe and invalid byTimeframe RSI", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });

    const tf = await validateTechnicalIndicators(
      { rsi: 50 },
      { engine, metadata: { timeframe: "7m" } }
    );
    expect(tf.failedRules).toContain("osc.multi_timeframe");

    const multi = await validateTechnicalIndicators(
      { byTimeframe: { "15": { rsi: 120 } } },
      { engine }
    );
    expect(multi.failedRules).toContain("osc.multi_timeframe");
  });
});

describe("Metrics", () => {
  beforeEach(() => {
    resetTechnicalRuleRegistrationState();
    resetTechnicalValidationMetrics();
  });

  it("tracks indicator validation metrics", async () => {
    const engine = new RuleEngine();
    registerTechnicalRules({ engine });
    await validateRSI({ rsi: 200 }, { engine });
    const metrics = getTechnicalValidationMetrics();
    expect(metrics.indicatorsValidated).toBe(1);
    expect(metrics.failedIndicators).toBe(1);
  });
});
