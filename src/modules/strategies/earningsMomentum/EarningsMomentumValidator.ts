/**
 * Earnings Momentum Validator — Sprint 11B.3T.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_EARNINGS_MOMENTUM_CONFIG,
  EARNINGS_MOMENTUM_STRATEGY_ID,
  type EarningsMomentumConfig,
} from "./EarningsMomentumConstants";
import type {
  EarningsMomentumDetectionContext,
  EarningsMomentumValidationResult,
} from "./EarningsMomentumTypes";
import {
  isValidMarketHours,
  resolveEarningsMomentumConfig,
} from "./EarningsMomentumUtils";

export class EarningsMomentumValidator {
  private readonly config: EarningsMomentumConfig;

  constructor(config?: Partial<EarningsMomentumConfig>) {
    this.config = resolveEarningsMomentumConfig(config);
  }

  validate(
    context: EarningsMomentumDetectionContext | null | undefined
  ): EarningsMomentumValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Earnings Momentum detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.earningsMomentum;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Earnings Momentum market data payload."],
        warnings: [],
      };
    }

    if ((data.candlesDaily ?? []).length < this.config.minimumDailyCandles) {
      errors.push("Enough Candles missing — insufficient daily OHLC sample.");
    }
    if (!data.fundamentals) {
      errors.push("Earnings fundamentals missing.");
    }
    if (data.ema20 === null || !Number.isFinite(data.ema20)) {
      errors.push("EMA20 missing.");
    }
    if (data.ema50 === null || !Number.isFinite(data.ema50)) {
      errors.push("EMA50 missing.");
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
      EARNINGS_MOMENTUM_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Earnings Momentum.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for Earnings Momentum.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for Earnings Momentum.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for Earnings Momentum.");
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

export function createEarningsMomentumValidator(
  config?: Partial<EarningsMomentumConfig>
): EarningsMomentumValidator {
  return new EarningsMomentumValidator(
    config ?? DEFAULT_EARNINGS_MOMENTUM_CONFIG
  );
}
