/**
 * EMA Pullback Validator — Sprint 11B.3P.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_EMA_PULLBACK_CONFIG,
  EMA_PULLBACK_STRATEGY_ID,
  type EMAPullbackConfig,
} from "./EMAPullbackConstants";
import type {
  EMAPullbackDetectionContext,
  EMAPullbackValidationResult,
} from "./EMAPullbackTypes";
import {
  isValidMarketHours,
  resolveEMAPullbackConfig,
} from "./EMAPullbackUtils";

export class EMAPullbackValidator {
  private readonly config: EMAPullbackConfig;

  constructor(config?: Partial<EMAPullbackConfig>) {
    this.config = resolveEMAPullbackConfig(config);
  }

  validate(
    context: EMAPullbackDetectionContext | null | undefined
  ): EMAPullbackValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["EMA Pullback detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.emaPullback;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing EMA Pullback market data payload."],
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
    if (data.ema100 === null || !Number.isFinite(data.ema100)) {
      errors.push("EMA100 missing.");
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
      EMA_PULLBACK_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for EMA Pullback.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for EMA Pullback.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for EMA Pullback.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for EMA Pullback.");
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

export function createEMAPullbackValidator(
  config?: Partial<EMAPullbackConfig>
): EMAPullbackValidator {
  return new EMAPullbackValidator(config ?? DEFAULT_EMA_PULLBACK_CONFIG);
}
