/**
 * 52-Week High Validator — Sprint 11B.3S.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG,
  FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
  type FiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighConstants";
import type {
  FiftyTwoWeekHighDetectionContext,
  FiftyTwoWeekHighValidationResult,
} from "./FiftyTwoWeekHighTypes";
import {
  isValidMarketHours,
  resolveFiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighUtils";

export class FiftyTwoWeekHighValidator {
  private readonly config: FiftyTwoWeekHighConfig;

  constructor(config?: Partial<FiftyTwoWeekHighConfig>) {
    this.config = resolveFiftyTwoWeekHighConfig(config);
  }

  validate(
    context: FiftyTwoWeekHighDetectionContext | null | undefined
  ): FiftyTwoWeekHighValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["52-Week High detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.fiftyTwoWeekHigh;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing 52-Week High market data payload."],
        warnings: [],
      };
    }

    if ((data.candlesDaily ?? []).length < this.config.minimumDailyCandles) {
      errors.push("Enough Candles missing — insufficient daily OHLC sample.");
    }
    if (data.ema20 === null || !Number.isFinite(data.ema20)) {
      errors.push("EMA20 missing.");
    }
    if (data.ema50 === null || !Number.isFinite(data.ema50)) {
      errors.push("EMA50 missing.");
    }
    if (data.ema150 === null || !Number.isFinite(data.ema150)) {
      errors.push("EMA150 missing.");
    }
    if (data.ema200 === null || !Number.isFinite(data.ema200)) {
      errors.push("EMA200 missing.");
    }
    if (!Number.isFinite(data.vwap) || data.vwap <= 0) {
      errors.push("Valid VWAP missing.");
    }
    if (!context.marketContext) {
      errors.push("Valid Context missing — market context absent.");
    }
    if (!context.regime?.regime) {
      errors.push("Compatible Regime missing — market regime absent.");
    }
    if (!context.confidence || !Number.isFinite(context.confidence.score)) {
      errors.push("Valid Context incomplete — regime confidence missing.");
    }

    const eligible = isStrategyEligible(
      FIFTY_TWO_WEEK_HIGH_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for 52-Week High.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for 52-Week High.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for 52-Week High.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for 52-Week High.");
    }

    const invalidBar = (data.candlesDaily ?? []).find(
      (c) =>
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close)
    );
    if (invalidBar) {
      errors.push("Data quality failure — invalid OHLC values present.");
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export function createFiftyTwoWeekHighValidator(
  config?: Partial<FiftyTwoWeekHighConfig>
): FiftyTwoWeekHighValidator {
  return new FiftyTwoWeekHighValidator(
    config ?? DEFAULT_FIFTY_TWO_WEEK_HIGH_CONFIG
  );
}
