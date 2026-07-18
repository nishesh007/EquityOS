/**
 * Cup & Handle Validator — Sprint 11B.3Q.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_CUP_HANDLE_CONFIG,
  CUP_HANDLE_STRATEGY_ID,
  type CupHandleConfig,
} from "./CupHandleConstants";
import type {
  CupHandleDetectionContext,
  CupHandleValidationResult,
} from "./CupHandleTypes";
import { isValidMarketHours, resolveCupHandleConfig } from "./CupHandleUtils";

export class CupHandleValidator {
  private readonly config: CupHandleConfig;

  constructor(config?: Partial<CupHandleConfig>) {
    this.config = resolveCupHandleConfig(config);
  }

  validate(
    context: CupHandleDetectionContext | null | undefined
  ): CupHandleValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Cup & Handle detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.cupHandle;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Cup & Handle market data payload."],
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
      CUP_HANDLE_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Cup & Handle.");
    }

    const probeTime =
      context.timestamp ??
      data.candlesDaily[data.candlesDaily.length - 1]?.timestamp ??
      null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      warnings.push("Market Hours soft-check failed for Cup & Handle.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for Cup & Handle.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for Cup & Handle.");
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

export function createCupHandleValidator(
  config?: Partial<CupHandleConfig>
): CupHandleValidator {
  return new CupHandleValidator(config ?? DEFAULT_CUP_HANDLE_CONFIG);
}
