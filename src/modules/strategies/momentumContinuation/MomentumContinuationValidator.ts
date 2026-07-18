/**
 * Momentum Continuation Validator — Sprint 11B.3F.
 */

import { isStrategyEligible } from "../StrategyUtils";
import {
  DEFAULT_MOMENTUM_CONTINUATION_CONFIG,
  MOMENTUM_CONTINUATION_STRATEGY_ID,
  type MomentumContinuationConfig,
} from "./MomentumContinuationConstants";
import type {
  MomentumContinuationDetectionContext,
  MomentumContinuationValidationResult,
} from "./MomentumContinuationTypes";
import {
  isValidMarketHours,
  resolveMomentumContinuationConfig,
} from "./MomentumContinuationUtils";

export class MomentumContinuationValidator {
  private readonly config: MomentumContinuationConfig;

  constructor(config?: Partial<MomentumContinuationConfig>) {
    this.config = resolveMomentumContinuationConfig(config);
  }

  validate(
    context: MomentumContinuationDetectionContext | null | undefined
  ): MomentumContinuationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context) {
      return {
        valid: false,
        errors: ["Momentum Continuation detection context is missing."],
        warnings: [],
      };
    }

    const data = context.input?.momentumContinuation;
    if (!data) {
      return {
        valid: false,
        errors: ["Missing Momentum Continuation market data payload."],
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
      MOMENTUM_CONTINUATION_STRATEGY_ID,
      context.eligibleStrategies ?? []
    );
    if (!eligible) {
      errors.push("Eligible Strategy gate failed for Momentum Continuation.");
    }

    const probeTime =
      context.timestamp ?? candles[candles.length - 1]?.timestamp ?? null;
    if (probeTime && !isValidMarketHours(probeTime, this.config)) {
      errors.push("Market Hours invalid for Momentum Continuation detection.");
    }

    if (
      context.regime?.regime &&
      this.config.blockedRegimes.includes(context.regime.regime)
    ) {
      errors.push(
        `Compatible Regime failed — ${context.regime.regime} blocked for momentum continuation.`
      );
    }

    const vol = context.marketContext?.volatility?.score;
    if (Number.isFinite(vol) && vol! > this.config.maxVolatilityScore) {
      errors.push("Volatility too high for momentum continuation.");
    }

    if (
      data.relativeVolume !== null &&
      Number.isFinite(data.relativeVolume) &&
      data.relativeVolume < this.config.minRelativeVolume
    ) {
      warnings.push("Low relative volume.");
    }

    if (data.adx === null || data.adx === undefined) {
      warnings.push("ADX missing — will reject during detection if unresolved.");
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

export function createMomentumContinuationValidator(
  config?: Partial<MomentumContinuationConfig>
): MomentumContinuationValidator {
  return new MomentumContinuationValidator(
    config ?? DEFAULT_MOMENTUM_CONTINUATION_CONFIG
  );
}
