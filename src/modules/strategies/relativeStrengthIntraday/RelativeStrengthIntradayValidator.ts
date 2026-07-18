/**
 * Relative Strength Intraday Validator — Sprint 11B.3G.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG,
  RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
  type RelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayConstants";
import type {
  RelativeStrengthIntradayDetectionContext,
  RelativeStrengthIntradayValidationResult,
} from "./RelativeStrengthIntradayTypes";
import {
  isValidMarketHours,
  resolveRelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayUtils";

export class RelativeStrengthIntradayValidator {
  private readonly config: RelativeStrengthIntradayConfig;

  constructor(config?: Partial<RelativeStrengthIntradayConfig>) {
    this.config = resolveRelativeStrengthIntradayConfig(config);
  }

  validate(
    context: RelativeStrengthIntradayDetectionContext | null | undefined
  ): RelativeStrengthIntradayValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Relative Strength Intraday detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.relativeStrengthIntraday;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Relative Strength Intraday market data payload."],
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
      RELATIVE_STRENGTH_INTRADAY_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Relative Strength Intraday.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for Relative Strength Intraday detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for relative strength.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for relative strength intraday.");
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolume
    ) {
      warnings.push("Low relative volume.");
    }

    if (
      data.stockRelativeStrength === null ||
      data.sectorRelativeStrength === null ||
      data.benchmarkRelativeStrength === null
    ) {
      warnings.push(
        "Relative strength scores missing — will reject during detection if unresolved."
      );
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

export function createRelativeStrengthIntradayValidator(
  config?: Partial<RelativeStrengthIntradayConfig>
): RelativeStrengthIntradayValidator {
  return new RelativeStrengthIntradayValidator(
    config ?? DEFAULT_RELATIVE_STRENGTH_INTRADAY_CONFIG
  );
}
