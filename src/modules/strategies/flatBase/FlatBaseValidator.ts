/**
 * Flat Base Validator — Sprint 11B.3R.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_FLAT_BASE_CONFIG,
  FLAT_BASE_STRATEGY_ID,
  type FlatBaseConfig,
} from "./FlatBaseConstants";
import type {
  FlatBaseDetectionContext,
  FlatBaseValidationResult,
} from "./FlatBaseTypes";
import { isValidMarketHours, resolveFlatBaseConfig } from "./FlatBaseUtils";

export class FlatBaseValidator {
  private readonly config: FlatBaseConfig;

  constructor(config?: Partial<FlatBaseConfig>) {
    this.config = resolveFlatBaseConfig(config);
  }

  validate(
    context: FlatBaseDetectionContext | null | undefined
  ): FlatBaseValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Flat Base detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.flatBase;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Flat Base market data payload."],
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
      FLAT_BASE_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Flat Base.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for Flat Base.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for Flat Base.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for Flat Base.");
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

export function createFlatBaseValidator(
  config?: Partial<FlatBaseConfig>
): FlatBaseValidator {
  return new FlatBaseValidator(config ?? DEFAULT_FLAT_BASE_CONFIG);
}
