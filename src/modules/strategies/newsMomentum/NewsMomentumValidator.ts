/**
 * News Momentum Validator — Sprint 11B.3K.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_NEWS_MOMENTUM_CONFIG,
  NEWS_MOMENTUM_STRATEGY_ID,
  type NewsMomentumConfig,
} from "./NewsMomentumConstants";
import type {
  NewsMomentumDetectionContext,
  NewsMomentumValidationResult,
} from "./NewsMomentumTypes";
import {
  isValidMarketHours,
  resolveNewsMomentumConfig,
} from "./NewsMomentumUtils";

export class NewsMomentumValidator {
  private readonly config: NewsMomentumConfig;

  constructor(config?: Partial<NewsMomentumConfig>) {
    this.config = resolveNewsMomentumConfig(config);
  }

  validate(
    context: NewsMomentumDetectionContext | null | undefined
  ): NewsMomentumValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["News Momentum detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.newsMomentum;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing News Momentum market data payload."],
        warnings: [],
      };
    }

    const candles = data.candles5m ?? [];
    if (candles.length < this.config.minimumSessionCandles) {
      errors.push("Enough Candles missing — insufficient 5-minute OHLC sample.");
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

    if (!Array.isArray(data.newsEvents)) {
      errors.push("News events array missing.");
    } else if (data.newsEvents.length === 0) {
      warnings.push("No news events supplied — detection will reject.");
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
      NEWS_MOMENTUM_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for News Momentum.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for News Momentum detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for news momentum.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! < this.config.minVolatilityScore) {
      errors.push("Volatility too low for news momentum.");
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolume
    ) {
      warnings.push("Low relative volume.");
    }

    const invalidBar = candles.find(
      (c) =>
        !Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close)
    );
    if (invalidBar) {
      errors.push("Data quality failure — invalid OHLC values present.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function createNewsMomentumValidator(
  config?: Partial<NewsMomentumConfig>
): NewsMomentumValidator {
  return new NewsMomentumValidator(config ?? DEFAULT_NEWS_MOMENTUM_CONFIG);
}
